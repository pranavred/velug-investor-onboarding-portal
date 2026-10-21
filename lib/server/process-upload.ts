import {signDraftContext} from './review-drafts.ts';
import {createHash} from 'node:crypto';
import {readServerConfig,getPublicCapabilities,validateRequestOrigin} from '../config/server.ts';
import type {ServerConfig} from '../config/server.ts';
import {validateLiveApplication,purposeCategory} from '../investor-onboarding/live-contract.ts';
import {processingVersion,supported} from '../investor-onboarding/processing-contract.ts';
import type {ProcessingTrace} from '../investor-onboarding/processing-contract.ts';
import {boundedBody,parsePdf,UploadError} from './pdf-intake.ts';
import {classifyDocument} from './providers/classify.ts';
import {extractDocument} from './providers/extract.ts';
import {ProviderError} from './providers/transport.ts';
import {ground} from './grounding.ts';
import {demoSession} from './session.ts';
import {redisStore,reserveProviderDispatch} from './quota.ts';
export async function processUpload(request:Request,options:{config?:ServerConfig;reserve?:()=>Promise<void>;fetchImpl?:typeof fetch}={}){
 const c=options.config??readServerConfig(process.env);let trace:ProcessingTrace|undefined,cookie:string|undefined;
 const headers:Record<string,string>={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{...headers,...(cookie?{'Set-Cookie':cookie}:{})}});
 try{
  if(!validateRequestOrigin(request,c.appUrl))throw new UploadError('Use the configured application origin.',403);
  if(!getPublicCapabilities(c).liveUploads)throw new UploadError('Live processing is disabled or needs server setup. Sample mode remains available.',503);
  if(!request.headers.get('content-type')?.startsWith('multipart/form-data;'))throw new UploadError('Upload one fictional PDF.');
  const signal=AbortSignal.any([request.signal,AbortSignal.timeout(50000)]);
  const bytes=await boundedBody(request,signal);signal.throwIfAborted();
  const form=await new Response(bytes,{headers:{'Content-Type':request.headers.get('content-type')!}}).formData();
  const files=form.getAll('file'),file=files[0];
  if(files.length!==1||!(file instanceof File)||!file.name.toLowerCase().endsWith('.pdf')||file.type&&file.type!=='application/pdf'||file.size<1||file.size>2097152)throw new UploadError('Use one non-empty PDF, up to 2 MB.');
  if(form.getAll('application').length!==1)throw new UploadError('Provide fictional application details.');
  const raw=form.get('application');if(typeof raw!=='string'||raw.length>2048)throw new UploadError('Invalid application.');
  let application;try{application=JSON.parse(raw);}catch{throw new UploadError('Invalid application.');}
  if(!validateLiveApplication(application)||form.get('scenarioId')!==application.scenarioId)throw new UploadError('Invalid fictional application.');
  const pdfBytes=new Uint8Array(await file.arrayBuffer());if(Buffer.from(pdfBytes.subarray(0,5)).toString()!=='%PDF-')throw new UploadError('Unreadable PDF.');
  const {texts,pageCount}=await parsePdf(pdfBytes,signal);signal.throwIfAborted();
  const session=demoSession(request,c.sessionSecret!,c.appUrl.startsWith('https:'));cookie=session.cookie;
  const reserve=options.reserve??(()=>reserveProviderDispatch({namespace:c.namespace,sessionHash:session.hash,globalLimit:c.globalLimit,sessionLimit:c.sessionLimit},redisStore(c.redisUrl!)));
  const deps={apiKey:c.apiKey!,reserve,signal,fetchImpl:options.fetchImpl};
  trace={version:processingVersion,pdfHash:createHash('sha256').update(pdfBytes).digest('hex'),textTruncated:false,classification:{status:'skipped',endpoint:'messages',model:c.classificationModel,durationMs:0},extraction:{status:'skipped',endpoint:'messages',model:c.extractionModel,durationMs:0},check:{status:'skipped',endpoint:'local',model:'deterministic',durationMs:0},review:'pending'};
  try{trace.classification=await classifyDocument(texts,c.classificationModel,deps);}catch(e){trace.classification={...trace.classification,...(e instanceof ProviderError?e.stage:{}),status:'failed',error:'Classification unavailable or invalid; manual review required.'};throw e;}
  const purpose=trace.classification.purpose!;
  if(!supported(purpose))return json({error:`${purpose}: retained Unsorted for manual review; extraction skipped.`,processing:trace},422);
  let extraction;try{extraction=await extractDocument(pdfBytes,purpose,c.extractionModel,deps);trace.extraction=extraction.stage;}catch(e){trace.extraction={...trace.extraction,...(e instanceof ProviderError?e.stage:{}),status:'failed',error:'Extraction did not complete. Prior evidence remains current.'};throw e;}
  const start=Date.now(),grounded=ground(extraction.output,texts,pageCount,application);
  trace.check={...trace.check,status:'completed',durationMs:Date.now()-start};
  return json({mode:'live_ai',purpose,category:purposeCategory[purpose],contractVersion:processingVersion,requestApplication:application,...grounded,model:c.extractionModel,responseId:extraction.stage.responseId,completedAt:new Date().toISOString(),pageCount,usage:extraction.stage.usage,processing:trace,...(c.reviewDrafts?{draftReceipt:signDraftContext({fields:grounded.fields,issues:grounded.flags,sessionHash:session.hash,expires:Date.now()+3600000},c.sessionSecret!)}:{}),externalVerificationCompleted:false});
 }catch(e){const status=e instanceof UploadError?e.status:typeof(e as {status?:number})?.status==='number'?(e as {status:number}).status:e instanceof ProviderError?502:400;return json({error:e instanceof UploadError||e instanceof ProviderError||(e as {status?:number})?.status?(e as Error).message:'Unable to process this PDF. Manual review required.',...(trace?{processing:trace}:{})},status);}
}

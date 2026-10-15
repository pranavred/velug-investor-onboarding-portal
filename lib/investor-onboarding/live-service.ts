// Historical GPT-4.1 replay adapter. NOT used by any live route.
import { extractText, getDocumentProxy } from 'unpdf';
import { scenarios } from './data.ts';
import { normalizeValue as normalize, quoteContainsValue, commitmentMatches } from './value-checks.ts';
import type { LiveResult, LiveField } from './live-types.ts';
import type { ScenarioId } from './types.ts';
import {liveModel,liveSchema as schema,liveInstructions as instructions,liveMaxOutputTokens,liveContractVersion,validateLiveOutput,validateLiveApplication} from './live-contract.ts';
import {seedLiveApplication} from './live-case.ts';
export {liveModel} from './live-contract.ts';
const maxFileBytes=2*1024*1024, maxBodyBytes=maxFileBytes+16000;
class UploadError extends Error { status: number; constructor(message: string, status=400){super(message);this.status=status;} }
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
// Best-effort admission per loaded module, separate from the shared provider
// budget. Slots cover parsing only, including parser cleanup on failure.
let activeParsers=0;
export async function withPdfParserAdmission<T>(parse:()=>Promise<T>):Promise<T> {
 if(activeParsers>=4)throw new UploadError('PDF processing is busy. Try again shortly.',429);
 activeParsers++;
 try{return await parse();}finally{activeParsers--;}
}

async function boundedBody(request: Request) {
 if(Number(request.headers.get('content-length'))>maxBodyBytes)throw new UploadError('Use a PDF smaller than 2 MB.',413);
 const reader=request.body?.getReader();if(!reader)throw new UploadError('Choose a dummy PDF.');
 const chunks:Uint8Array[]=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBodyBytes){await reader.cancel();throw new UploadError('Use a PDF smaller than 2 MB.',413);}chunks.push(value);}}finally{reader.releaseLock();}
 return Buffer.concat(chunks);
}
export async function handleLiveUpload(request:Request, dependencies:{apiKey:string|undefined;limit:()=>Promise<void>;fetchImpl?:typeof fetch}) {
 try{
  const origin=request.headers.get('origin');
  if(!origin||origin!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')throw new UploadError('Upload from the demo website.',403);
  if(!request.headers.get('content-type')?.startsWith('multipart/form-data;'))throw new UploadError('Choose a dummy PDF.');
  const bytes=await boundedBody(request);let form:FormData;
  try{form=await new Response(bytes,{headers:{'Content-Type':request.headers.get('content-type')!}}).formData();}catch{throw new UploadError('The upload could not be read. Choose a PDF.');}
  const files=form.getAll('file');const file=files[0];
  if(files.length!==1||!(file instanceof File)||!file.name.toLowerCase().endsWith('.pdf')||file.type&&file.type!=='application/pdf')throw new UploadError('Upload one dummy PDF at a time.');
  if(file.size>maxFileBytes)throw new UploadError('Use a PDF smaller than 2 MB.',413);
  const pdfBytes=new Uint8Array(await file.arrayBuffer());
  if(!pdfBytes.length||Buffer.from(pdfBytes.subarray(0,5)).toString()!=='%PDF-')throw new UploadError('This file is not a readable PDF.');
  const scenarioId=form.get('scenarioId');if(!scenarios.some(s=>s.id===scenarioId))throw new UploadError('Choose a valid application scenario.');
  let application=seedLiveApplication(scenarioId as ScenarioId);
  const applicationEntries=form.getAll('application');
  if(applicationEntries.length){const raw=applicationEntries[0];let parsed:unknown;try{if(applicationEntries.length!==1||typeof raw!=='string'||raw.length>2048)throw new Error();parsed=JSON.parse(raw);}catch{throw new UploadError('Provide valid fictional application details.');}if(!validateLiveApplication(parsed)||parsed.scenarioId!==scenarioId)throw new UploadError('Provide valid fictional application details.');application=parsed;}
  if(!dependencies.apiKey)throw new UploadError('Live AI uploads are temporarily unavailable.',503);
  if(request.signal.aborted)throw new UploadError('Upload cancelled.',408);
  let parsed:{texts:string[];pageCount:number};
  try{
   parsed=await withPdfParserAdmission(async()=>{
    const pdf=await getDocumentProxy(pdfBytes.slice());
    try{
     const pageCount=pdf.numPages;
     if(pageCount>10)throw new UploadError('Use a PDF with 10 pages or fewer.');
     const texts=(await extractText(pdf)).text;
     if(texts.join('').length>200000)throw new UploadError('This PDF contains too much text for the demo. Use a shorter file.');
     return {texts,pageCount};
    }finally{await pdf.loadingTask.destroy();}
   });
  }
  catch(error){if(error instanceof UploadError)throw error;throw new UploadError('This PDF is unreadable or password protected.');}
  const {texts,pageCount}=parsed;
  if(request.signal.aborted)throw new UploadError('Upload cancelled.',408);
  try{await dependencies.limit();}catch(error){throw new UploadError((error as {status?:number}).status===429?'Demo upload limit reached. Try again later.':'Live AI uploads are temporarily unavailable.',(error as {status?:number}).status===429?429:503);}
  let provider:Record<string,unknown>;
  try{
   const response=await (dependencies.fetchImpl??fetch)('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${dependencies.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:liveModel,store:false,temperature:0,instructions,input:[{role:'user',content:[{type:'input_file',filename:'evidence.pdf',file_data:`data:application/pdf;base64,${Buffer.from(pdfBytes).toString('base64')}`}]}],text:{format:{type:'json_schema',name:'onboarding_upload',strict:true,schema}},max_output_tokens:liveMaxOutputTokens}),signal:AbortSignal.any([request.signal,AbortSignal.timeout(40000)]),cache:'no-store'});
   if(!response.ok)throw new Error('Provider rejected');provider=await response.json();
  }catch{throw new UploadError('AI processing could not finish. Retry this dummy PDF.',502);}
  if(provider.status!=='completed'||provider.model!==liveModel||typeof provider.id!=='string')throw new UploadError('AI processing could not finish. Retry this dummy PDF.',502);
  const messages=provider.output as {type:string;content?:{type:string;text?:string}[]}[];
  let output:unknown;try{output=JSON.parse(messages.filter(m=>m.type==='message').flatMap(m=>m.content??[]).filter(c=>c.type==='output_text').map(c=>c.text??'').join(''));}catch{throw new UploadError('The model returned no usable result. Retry this dummy PDF.',502);}
  if(!validateLiveOutput(output))throw new UploadError('The model output did not pass format checks. Retry this dummy PDF.',502);
  const flags:LiveResult['flags']=[];
  if(output.category==='unsupported')flags.push({code:'unsupported',detail:'The model classified this document as unrelated to investor onboarding. Retained for review.'});
  if(!output.fields.length&&output.category!=='unsupported')flags.push({code:'missing',detail:'No onboarding fields were returned. Review the PDF.'});
  const seen=new Set<string>();
  const fields=output.fields.map(original=>{
   const f={...original,value:original.value!==null&&(!normalize(original.value)||['unknown','n/a','not provided','illegible'].includes(normalize(original.value)))?null:original.value};
   if(f.key!=='other'&&seen.has(f.key))flags.push({code:'duplicate',detail:`Repeated field: ${f.label}.`});seen.add(f.key);
   const sourceStatus:LiveField['sourceStatus']=f.value===null?'missing':f.page!==null&&f.page<=pageCount&&f.quote&&normalize(f.quote).length>0&&quoteContainsValue(texts[f.page-1]??'',f.quote)&&quoteContainsValue(f.quote,f.value)?'matched':'unmatched';
   if(sourceStatus==='missing')flags.push({code:'missing',detail:`${f.label}: value is missing.`});
   if(sourceStatus==='unmatched')flags.push({code:'source',detail:`${f.label}: quote could not be matched to PDF text on the cited page. Check the original PDF.`});
   return {...f,sourceStatus};
  });
  const comparisons:Record<string,string>={'legal-name':application.legalName,'subscribing-party':application.legalName,'account-holder':application.legalName,'fund-name':application.fund,'commitment':application.commitment,'share-class':application.shareClass,'currency':application.currency};
  for(const f of fields)if(f.value!==null&&comparisons[f.key]&&!(f.key==='commitment'?commitmentMatches(f.value,comparisons[f.key],comparisons.currency):normalize(f.value)===normalize(comparisons[f.key])))flags.push({code:'application_mismatch',detail:`${f.label}: ${f.value}. Application: ${comparisons[f.key]}.`});
  const usage=provider.usage as LiveResult['usage'];if(!usage||![usage.input_tokens,usage.output_tokens,usage.total_tokens].every(v=>Number.isInteger(v)&&v>=0))throw new UploadError('AI response metadata was incomplete. Retry this dummy PDF.',502);
  const result:LiveResult={mode:'live_ai',purpose:output.purpose,contractVersion:liveContractVersion,requestApplication:application,category:output.category,fields,flags,model:liveModel,responseId:provider.id,completedAt:new Date().toISOString(),pageCount,usage,externalVerificationCompleted:false};
  return Response.json(result,{headers});
 }catch(error){return Response.json({error:error instanceof UploadError?error.message:'The upload could not be processed. Try again.'},{status:error instanceof UploadError?error.status:500,headers});}
}

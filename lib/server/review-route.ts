import {readServerConfig,getPublicCapabilities,validateRequestOrigin} from '../config/server.ts';
import type {ServerConfig} from '../config/server.ts';
import {demoSession} from './session.ts';
import {readDraftContext,draftReview} from './review-drafts.ts';
import {redisStore,reserveProviderDispatch} from './quota.ts';
export async function handleReview(request:Request,options:{config?:ServerConfig;reserve?:()=>Promise<void>;fetchImpl?:typeof fetch}={}){
 const c=options.config??readServerConfig(process.env),headers={'Cache-Control':'no-store'};
 try{
  if(!validateRequestOrigin(request,c.appUrl))return Response.json({error:'Invalid origin'},{status:403,headers});
  if(!getPublicCapabilities(c).reviewDrafts)return Response.json({error:'Review drafting is disabled.'},{status:503,headers});
  const reader=request.body?.getReader();if(!reader)throw Error();let text='',size=0;const decoder=new TextDecoder();while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>110000){await reader.cancel();throw Error();}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();
  const input=JSON.parse(text);if(!['summary','correction'].includes(input.kind)||typeof input.receipt!=='string')throw Error();
  const session=demoSession(request,c.sessionSecret!,c.appUrl.startsWith('https:'));
  const context=readDraftContext(input.receipt,c.sessionSecret!,session.hash);
  const reserve=options.reserve??(()=>reserveProviderDispatch({namespace:c.namespace,sessionHash:session.hash,globalLimit:c.globalLimit,sessionLimit:c.sessionLimit},redisStore(c.redisUrl!)));
  const result=await draftReview(context,input.kind,c.reviewModel,{apiKey:c.apiKey!,signal:AbortSignal.any([request.signal,AbortSignal.timeout(30000)]),reserve,fetchImpl:options.fetchImpl});
  return Response.json(result,{headers});
 }catch{return Response.json({error:'Draft unavailable or context expired. Case unchanged.'},{status:422,headers});}
}

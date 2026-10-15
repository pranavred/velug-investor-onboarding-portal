import {readServerConfig,getPublicCapabilities,validateRequestOrigin} from '@/lib/config/server';
import {demoSession} from '@/lib/server/session';
import {readDraftContext,draftReview} from '@/lib/server/review-drafts';
import {redisStore,reserveProviderDispatch} from '@/lib/server/quota';
export const runtime='nodejs';export const maxDuration=40;
export async function POST(request:Request){const c=readServerConfig(process.env),headers={'Cache-Control':'no-store'};try{
 if(!validateRequestOrigin(request,c.appUrl))return Response.json({error:'Invalid origin'},{status:403,headers});
 if(!getPublicCapabilities(c).reviewDrafts)return Response.json({error:'Review drafting is disabled.'},{status:503,headers});
 const reader=request.body?.getReader();if(!reader)throw Error();let text='',size=0;const decoder=new TextDecoder();while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>110000){await reader.cancel();throw Error();}text+=decoder.decode(value,{stream:true});}text+=decoder.decode();
 const input=JSON.parse(text);if(!['summary','correction'].includes(input.kind)||typeof input.receipt!=='string')throw Error();
 const session=demoSession(request,c.sessionSecret!,c.appUrl.startsWith('https:'));
 const context=readDraftContext(input.receipt,c.sessionSecret!,session.hash);
 const result=await draftReview(context,input.kind,c.reviewModel,{apiKey:c.apiKey!,signal:AbortSignal.any([request.signal,AbortSignal.timeout(30000)]),reserve:()=>reserveProviderDispatch({namespace:c.namespace,sessionHash:session.hash,globalLimit:c.globalLimit,sessionLimit:c.sessionLimit},redisStore(c.redisUrl!))});
 return Response.json(result,{headers});
 }catch{return Response.json({error:'Draft unavailable or context expired. Case unchanged.'},{status:422,headers});}}

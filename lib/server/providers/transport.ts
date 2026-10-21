import Anthropic from '@anthropic-ai/sdk';
import type {Message,MessageCreateParamsNonStreaming} from '@anthropic-ai/sdk/resources/messages';
import type {Stage,Usage} from '../../investor-onboarding/processing-contract.ts';
export class ProviderError extends Error {stage?:Stage;constructor(message:string,stage?:Stage){super(message);this.stage=stage;}}
export type ProviderDependencies={apiKey:string;reserve:()=>Promise<void>;signal:AbortSignal;fetchImpl?:typeof fetch};
export type ProviderParams=Omit<MessageCreateParamsNonStreaming,'model'|'stream'>;
// The official endpoint is pinned: no ambient base-URL, proxy or auth-token
// environment can redirect evidence elsewhere. Deployers configure only a key.
export const providerBaseUrl='https://api.anthropic.com';
export const providerDeadlineMs=50000;
export async function dispatch(model:string,params:ProviderParams,deps:ProviderDependencies){
 deps.signal.throwIfAborted();await deps.reserve();deps.signal.throwIfAborted();
 const start=Date.now();let stage:Stage={endpoint:'messages',model,durationMs:0,status:'failed'};
 const client=new Anthropic({apiKey:deps.apiKey,authToken:null,baseURL:providerBaseUrl,fetch:deps.fetchImpl,maxRetries:0,timeout:providerDeadlineMs,logLevel:'off',openTelemetry:false});
 try{
  const {data,request_id}=await client.messages.create({model,...params},{signal:deps.signal}).withResponse();
  stage={...stage,durationMs:Date.now()-start,requestId:request_id??undefined};
  const usage:Usage={input_tokens:data.usage.input_tokens,output_tokens:data.usage.output_tokens,total_tokens:data.usage.input_tokens+data.usage.output_tokens};
  return {message:data,usage,stage};
 }catch(error){
  stage={...stage,durationMs:Date.now()-start};
  if(error instanceof Anthropic.APIError&&typeof error.status==='number'){
   // Expose only the HTTP status and the provider's error type enum; never its free text.
   const body=error.error as {type?:string;error?:{type?:string}}|undefined;
   const raw=body?.error?.type??(body?.type!=='error'?body?.type:undefined);
   const type=typeof raw==='string'&&/^[a-z_]{1,40}$/.test(raw)?raw:undefined;
   throw new ProviderError(`Provider messages unavailable (HTTP ${error.status}${type?`, ${type}`:''}); check the requested model access and account locally.`,{...stage,requestId:error.requestID??stage.requestId});
  }
  throw new ProviderError('Provider call failed or timed out. No automatic retry.',stage);
 }
}
// Structured output arrives as text blocks. Anything but a clean end_turn from the
// requested model (refusal, truncation, substitution) is rejected by the caller.
export function structuredOutput(message:Message,model:string):unknown{
 if(message.model!==model||message.stop_reason!=='end_turn'||typeof message.id!=='string')return undefined;
 const text=message.content.filter(block=>block.type==='text').map(block=>block.text).join('');
 try{return JSON.parse(text);}catch{return undefined;}
}

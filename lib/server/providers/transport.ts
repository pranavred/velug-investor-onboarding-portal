import type {Stage} from '../../investor-onboarding/processing-contract.ts';
export class ProviderError extends Error {stage?:Stage;constructor(message:string,stage?:Stage){super(message);this.stage=stage;}}
export type ProviderDependencies={apiKey:string;reserve:()=>Promise<void>;signal:AbortSignal;fetchImpl?:typeof fetch};
async function boundedProviderJson(response:Response,signal:AbortSignal){
 const limit=1000000;
 const reader=response.body?.getReader();if(!reader)throw new Error('Empty provider body');
 const abort=()=>{void reader.cancel().catch(()=>{});};
 signal.addEventListener('abort',abort,{once:true});
 const chunks:Uint8Array[]=[];let size=0;
 try{
  signal.throwIfAborted();
  if(Number(response.headers.get('content-length'))>limit)throw new Error('Oversized provider body');
  while(true){const {done,value}=await reader.read();signal.throwIfAborted();if(done)break;size+=value.byteLength;if(size>limit)throw new Error('Oversized provider body');chunks.push(value);}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
 }finally{
  signal.removeEventListener('abort',abort);
  // Stop an oversized or aborted body instead of draining unbounded output.
  void reader.cancel().catch(()=>{});reader.releaseLock();
 }
}
export async function dispatch(endpoint:string,model:string,body:unknown,deps:ProviderDependencies){
 deps.signal.throwIfAborted();await deps.reserve();deps.signal.throwIfAborted();const start=Date.now();let stage:Stage={endpoint,model,durationMs:0,status:'failed'};
 try{const response=await(deps.fetchImpl??fetch)('https://api.openai.com/v1/'+endpoint,{method:'POST',headers:{Authorization:`Bearer ${deps.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:deps.signal,cache:'no-store'});
  stage={...stage,durationMs:Date.now()-start,requestId:response.headers.get('x-request-id')??undefined};
  if(!response.ok){void response.body?.cancel().catch(()=>{});throw new ProviderError(`Provider ${endpoint} unavailable (HTTP ${response.status}); check endpoint and requested model access locally.`,stage);}
  const data=await boundedProviderJson(response,deps.signal);return {data,stage:{...stage,durationMs:Date.now()-start}};
 }catch(error){if(error instanceof ProviderError)throw error;throw new ProviderError('Provider call failed or timed out. No automatic retry.',{...stage,durationMs:Date.now()-start});}
}

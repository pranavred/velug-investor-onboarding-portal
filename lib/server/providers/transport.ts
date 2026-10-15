import type {Stage} from '../../investor-onboarding/processing-contract.ts';
export class ProviderError extends Error {stage?:Stage;constructor(message:string,stage?:Stage){super(message);this.stage=stage;}}
export type ProviderDependencies={apiKey:string;reserve:()=>Promise<void>;signal:AbortSignal;fetchImpl?:typeof fetch};
export async function dispatch(endpoint:string,model:string,body:unknown,deps:ProviderDependencies){
 deps.signal.throwIfAborted();await deps.reserve();deps.signal.throwIfAborted();const start=Date.now();let stage:Stage={endpoint,model,durationMs:0,status:'failed'};
 try{const response=await(deps.fetchImpl??fetch)('https://api.openai.com/v1/'+endpoint,{method:'POST',headers:{Authorization:`Bearer ${deps.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:deps.signal,cache:'no-store'});
  stage={...stage,durationMs:Date.now()-start,requestId:response.headers.get('x-request-id')??undefined};
  if(!response.ok)throw new ProviderError(`Provider ${endpoint} unavailable (HTTP ${response.status}); check endpoint and requested model access locally.`,stage);
  const text=await response.text();if(text.length>1000000)throw new Error('oversize');const data=JSON.parse(text);return {data,stage:{...stage,durationMs:Date.now()-start}};
 }catch(error){if(error instanceof ProviderError)throw error;throw new ProviderError('Provider call failed or timed out. No automatic retry.',{...stage,durationMs:Date.now()-start});}
}

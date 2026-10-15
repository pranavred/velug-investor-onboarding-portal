import {createClient} from 'redis';
// One logical Redis primary, server time, atomic check-and-increment of both
// counters. Hash tag keeps both keys in one slot if a compatible cluster is used.
export const quotaScript=`
local t = redis.call('TIME')
local window = math.floor(tonumber(t[1])/3600)
local g = KEYS[1] .. ':' .. window
local s = KEYS[2] .. ':' .. window
if tonumber(redis.call('GET',g) or '0') >= tonumber(ARGV[1]) or tonumber(redis.call('GET',s) or '0') >= tonumber(ARGV[2]) then return 0 end
local ttl = (window+1)*3600-tonumber(t[1])+1
redis.call('INCR',g); redis.call('EXPIRE',g,ttl)
redis.call('INCR',s); redis.call('EXPIRE',s,ttl)
return 1`;
export type AtomicStore={reserve:(keys:string[],limits:string[])=>Promise<unknown>};
export async function reserveProviderDispatch(input:{namespace:string;sessionHash:string;globalLimit:number;sessionLimit:number},store:AtomicStore){
 const prefix=`{${input.namespace}}:openai`;
 let allowed;try{allowed=await store.reserve([prefix+':global',prefix+':session:'+input.sessionHash],[String(input.globalLimit),String(input.sessionLimit)]);}catch{throw Object.assign(new Error('Shared provider budget unavailable. No dispatch permitted.'),{status:503});}
 if(allowed!==1)throw Object.assign(new Error('Provider call budget reached. Try next hour.'),{status:429});
}
const clients=new Map<string,ReturnType<typeof createClient>>();
export function redisStore(url:string):AtomicStore{
 return {async reserve(keys,limits){
  let client=clients.get(url);
  if(!client){client=createClient({url,socket:{connectTimeout:2000,reconnectStrategy:false},disableOfflineQueue:true});client.on('error',()=>{/* Never log connection credentials. */});clients.set(url,client);}
  try{if(!client.isOpen)await client.connect();return await client.eval(quotaScript,{keys,arguments:limits});}catch{clients.delete(url);client.destroy();throw new Error('Redis unavailable');}
 }};
}

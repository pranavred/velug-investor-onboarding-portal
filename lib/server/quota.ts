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
 const prefix=`{${input.namespace}}:anthropic`;
 let allowed;try{allowed=await store.reserve([prefix+':global',prefix+':session:'+input.sessionHash],[String(input.globalLimit),String(input.sessionLimit)]);}catch{throw Object.assign(new Error('Shared provider budget unavailable. No dispatch permitted.'),{status:503});}
 if(allowed!==1)throw Object.assign(new Error('Provider call budget reached. Try next hour.'),{status:429});
}
type Entry={client:ReturnType<typeof createClient>;ready:Promise<unknown>};
const clients=new Map<string,Entry>();
export function closeQuotaStores(){for(const {client} of clients.values())if(client.isOpen)client.destroy();clients.clear();}
export function redisStore(url:string):AtomicStore{
 return {async reserve(keys,limits){
  let entry=clients.get(url);
  if(!entry){const client=createClient({url,socket:{connectTimeout:2000,reconnectStrategy:false},disableOfflineQueue:true});client.on('error',()=>{/* Never log connection credentials. */});entry={client,ready:client.connect()};clients.set(url,entry);}
  let timer:ReturnType<typeof setTimeout>|undefined;
  try{return await Promise.race([(async()=>{await entry.ready;return entry.client.eval(quotaScript,{keys,arguments:limits});})(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Redis deadline')),3000);})]);}catch{clients.delete(url);if(entry.client.isOpen)entry.client.destroy();throw new Error('Redis unavailable');}finally{clearTimeout(timer);}
 }};
}

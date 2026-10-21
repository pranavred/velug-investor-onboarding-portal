import test from 'node:test';
import assert from 'node:assert/strict';
import {dispatch,ProviderError} from '../lib/server/providers/transport.ts';

const message=(model='claude-opus-5-5')=>({id:'msg_test',type:'message',role:'assistant',model,stop_reason:'end_turn',stop_sequence:null,content:[{type:'text',text:'{"ok":true}'}],usage:{input_tokens:10,output_tokens:5,cache_creation_input_tokens:0,cache_read_input_tokens:0}});
const deps=(fetchImpl,extra={})=>({apiKey:'test-only-key-sentinel',reserve:async()=>{},signal:new AbortController().signal,fetchImpl,...extra});

test('dispatch posts to the Anthropic messages endpoint with the server key, reserving budget exactly once first',async()=>{
 const order=[];
 const result=await dispatch('claude-opus-5-5',{max_tokens:16,messages:[{role:'user',content:'fictional'}]},deps(async(url,init)=>{order.push('fetch');assert.equal(String(url),'https://api.anthropic.com/v1/messages');assert.equal(init.method,'POST');const headers=init.headers;assert.equal(headers.get('authorization'),'Bearer test-only-key-sentinel');assert.equal(headers.get('x-api-key'),null);assert.ok(headers.get('anthropic-version'));const body=JSON.parse(init.body);assert.equal(body.model,'claude-opus-5-5');assert.equal(body.max_tokens,16);return Response.json(message(),{headers:{'request-id':'req_transport_test'}});},{reserve:async()=>{order.push('reserve');}}));
 assert.deepEqual(order,['reserve','fetch']);
 assert.equal(result.stage.endpoint,'messages');
 assert.equal(result.stage.model,'claude-opus-5-5');
 assert.equal(result.stage.requestId,'req_transport_test');
 assert.equal(result.message.id,'msg_test');
});
test('dispatch normalizes provider usage into input, output and total tokens',async()=>{
 const {usage}=await dispatch('claude-opus-5-5',{max_tokens:16,messages:[{role:'user',content:'fictional'}]},deps(async()=>Response.json(message())));
 assert.deepEqual(usage,{input_tokens:10,output_tokens:5,total_tokens:15});
});
test('provider HTTP errors expose status and error type only, never the provider message text',async()=>{
 let rejected;
 try{await dispatch('claude-opus-5-5',{max_tokens:16,messages:[{role:'user',content:'fictional'}]},deps(async()=>Response.json({type:'error',error:{type:'insufficient_quota',message:'SECRET-DETAIL account balance text'}},{status:429})));}catch(error){rejected=error;}
 assert.ok(rejected instanceof ProviderError);
 assert.match(rejected.message,/HTTP 429/);
 assert.match(rejected.message,/insufficient_quota/);
 assert.ok(!rejected.message.includes('SECRET-DETAIL'));
 assert.equal(rejected.stage.status,'failed');
});
test('transport failure fails closed with no automatic retry',async()=>{
 let calls=0;
 await assert.rejects(dispatch('claude-opus-5-5',{max_tokens:16,messages:[{role:'user',content:'fictional'}]},deps(async()=>{calls++;throw new TypeError('network down');})),/failed|timed out/);
 assert.equal(calls,1,'the transport must never retry a paid dispatch on its own');
});
test('already aborted work reserves nothing and never reaches the provider',async()=>{
 const control=new AbortController();control.abort();let reserves=0,calls=0;
 await assert.rejects(dispatch('claude-opus-5-5',{max_tokens:16,messages:[{role:'user',content:'fictional'}]},deps(async()=>{calls++;return Response.json(message());},{signal:control.signal,reserve:async()=>{reserves++;}})));
 assert.equal(reserves,0);assert.equal(calls,0);
});
test('abort during the provider call cancels the request',async()=>{
 const control=new AbortController();
 const pending=dispatch('claude-opus-5-5',{max_tokens:16,messages:[{role:'user',content:'fictional'}]},deps((url,init)=>new Promise((_,reject)=>{init.signal.addEventListener('abort',()=>reject(Object.assign(new Error('aborted'),{name:'AbortError'})),{once:true});}),{signal:control.signal}));
 setTimeout(()=>control.abort(),10);
 await assert.rejects(pending,/failed|timed out/);
});

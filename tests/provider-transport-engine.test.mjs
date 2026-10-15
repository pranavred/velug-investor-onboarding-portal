import test from 'node:test';
import assert from 'node:assert/strict';
import {TextEncoder} from 'node:util';
import {dispatch} from '../lib/server/providers/transport.ts';

const deps = fetchImpl => ({apiKey:'test-only',reserve:async()=>{},signal:new AbortController().signal,fetchImpl});
test('oversized streaming provider output is cancelled before downloading the full body',async()=>{
 let reads=0,cancelled=false;
 const body=new ReadableStream({pull(controller){reads++;controller.enqueue(new Uint8Array(600000));},cancel(){cancelled=true;}});
 await assert.rejects(dispatch('responses','requested',{},deps(async()=>new Response(body))),/failed/);
 assert.equal(cancelled,true);
 assert.ok(reads<=4,'transport must stop reading at the byte limit');
});
test('provider response body cancellation interrupts a stalled stream',async()=>{
 const control=new AbortController();let cancelled=false;
 const body=new ReadableStream({start(){},cancel(){cancelled=true;}});
 const pending=dispatch('responses','requested',{}, {...deps(async()=>new Response(body)),signal:control.signal});
 setTimeout(()=>control.abort(),10);
 await assert.rejects(pending,/failed/);
 assert.equal(cancelled,true);
});
test('provider HTTP errors cancel their bodies without exposing error text',async()=>{
 let cancelled=false;
 const body=new ReadableStream({cancel(){cancelled=true;}});
 await assert.rejects(dispatch('responses','requested',{},deps(async()=>new Response(body,{status:403}))),/HTTP 403/);
 assert.equal(cancelled,true);
});
test('bounded provider reader preserves JSON with split multibyte text',async()=>{
 const encoded=new TextEncoder().encode(JSON.stringify({text:'£ Telugu తెలుగు'}));
 const body=new ReadableStream({start(controller){for(const byte of encoded)controller.enqueue(Uint8Array.of(byte));controller.close();}});
 const result=await dispatch('responses','requested',{},deps(async()=>new Response(body)));
 assert.deepEqual(result.data,{text:'£ Telugu తెలుగు'});
});

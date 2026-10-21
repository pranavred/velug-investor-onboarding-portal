import test from 'node:test';import assert from 'node:assert/strict';
import {handleReview} from '../lib/server/review-route.ts';
import {readServerConfig} from '../lib/config/server.ts';
import {signDraftContext} from '../lib/server/review-drafts.ts';
import {demoSession} from '../lib/server/session.ts';
const secret='s'.repeat(32);
const config=readServerConfig({LIVE_AI_ENABLED:'true',REVIEW_DRAFTS_ENABLED:'true',ANTHROPIC_API_KEY:'test-provider-sentinel',APP_SESSION_SECRET:secret},{quota:'injected'});
const message=(output)=>({id:'msg_draft',type:'message',role:'assistant',model:'claude-opus-5-5',stop_reason:'end_turn',stop_sequence:null,content:[{type:'text',text:JSON.stringify(output)}],usage:{input_tokens:1,output_tokens:1}});
function receiptFor(request){const session=demoSession(request,secret,false);return {receipt:signDraftContext({fields:[{key:'account-holder',label:'Holder',value:'Fictional Ltd',page:1,quote:'Holder Fictional Ltd',sourceStatus:'matched'}],issues:[],sessionHash:session.hash,expires:Date.now()+60000},secret),cookie:session.cookie};}
function review(body,headers={}){return new Request('http://localhost:3000/api/investor-onboarding/review',{method:'POST',headers:{origin:'http://localhost:3000','content-type':'application/json',...headers},body:JSON.stringify(body)});}
test('review handler drafts with injected quota and transport, bound to the caller session',async()=>{
 const seed=new Request('http://localhost:3000/',{headers:{}});const {receipt,cookie}=receiptFor(seed);
 let reserves=0;const response=await handleReview(review({kind:'summary',receipt},{cookie:cookie.split(';')[0]}),{config,reserve:async()=>{reserves++;},fetchImpl:async()=>Response.json(message({sourceIds:['source-0']}))});
 const result=await response.json();assert.equal(response.status,200,JSON.stringify(result));assert.equal(reserves,1);assert.match(result.text,/\[source-0, page 1\]/);assert.equal(result.approved,false);
});
test('review handler rejects a receipt from another session without dispatching',async()=>{
 const {receipt}=receiptFor(new Request('http://localhost:3000/'));let calls=0;
 const response=await handleReview(review({kind:'summary',receipt}),{config,reserve:async()=>{calls++;},fetchImpl:async()=>{calls++;return Response.json(message({sourceIds:['source-0']}));}});
 assert.equal(response.status,422);assert.equal(calls,0);
});
test('review handler refuses foreign origins and disabled drafts',async()=>{
 const forged=await handleReview(new Request('http://localhost:3000/api/investor-onboarding/review',{method:'POST',headers:{origin:'https://evil.example'},body:'{}'}),{config,reserve:async()=>assert.fail('no reserve')});
 assert.equal(forged.status,403);
 const disabled=await handleReview(review({kind:'summary',receipt:'x'}),{config:{...config,reviewDrafts:false},reserve:async()=>assert.fail('no reserve')});
 assert.equal(disabled.status,503);
});

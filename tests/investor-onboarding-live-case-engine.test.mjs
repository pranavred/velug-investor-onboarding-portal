import test from 'node:test';
import assert from 'node:assert/strict';
import {createLiveCase,getLiveCaseView,liveReviewExport,nextCompanyStep} from '../lib/investor-onboarding/live-case.ts';
import {getScenario} from '../lib/investor-onboarding/data.ts';
import {liveCaseReducer} from '../lib/investor-onboarding/live-state.ts';
const at='2026-10-03T12:00:00.000Z';
function doc(purpose,values,id=purpose,extra={}) {
 return {id,logicalId:id,version:1,filename:`${id}.pdf`,url:`blob:${id}`,status:'complete',...extra,result:{mode:'live_ai',purpose,category:({formation:'entity',authority:'ownership',address:'identity'}[purpose]??purpose),fields:Object.entries(values).map(([key,value])=>({key,label:key,value,page:value?1:null,quote:value?`${key} ${value}`:null,sourceStatus:value?'matched':'missing'})),flags:[],model:'gpt-4.1-2025-04-14',responseId:`resp_${id}`,completedAt:at,pageCount:1,usage:{input_tokens:1,output_tokens:1,total_tokens:2},externalVerificationCompleted:false}};
}
function stateWith(...documents){return {...createLiveCase('company'),documents};}
const check=(state,id)=>getLiveCaseView(state).checks.find(c=>c.id===id);
const completePackage=()=>getScenario('company').documents.filter(d=>!d.correction).map(d=>doc(d.requirements[0],Object.fromEntries(d.sections.flatMap(section=>section.fields).map(f=>[f.key,f.key==='account-holder'?'Oakbridge Holdings LLC':f.value])),d.requirements[0]));
const bank=(name='Oakbridge Holdings LLC',id='bank',extra={})=>doc('bank',{'account-holder':name,'bank-name':'Example Bank','account-suffix':'SAMPLE-4821','bank-currency':'USD'},id,extra);
test('live case collection separates identity address and authority ownership purposes',()=>{
 const state=stateWith(doc('identity',{'identity-name':'Morgan Ellis'}),doc('authority',{'authorised-party':'Oakbridge Holdings LLC',signatory:'Morgan Ellis'}));
 const requirements=getLiveCaseView(state).requirements;
 assert.equal(requirements.find(r=>r.purpose==='identity').status,'passed');assert.equal(requirements.find(r=>r.purpose==='address').status,'waiting');assert.equal(requirements.find(r=>r.purpose==='ownership').status,'waiting');assert.equal(check(state,'required').status,'waiting');
});
test('live case missing omitted and ungrounded essential fields cannot pass collection',()=>{
 const omitted=stateWith(doc('formation',{'legal-name':'Oakbridge Holdings LLC'}));assert.equal(getLiveCaseView(omitted).requirements.find(r=>r.purpose==='formation').status,'needs-review');
 const evidence=bank();evidence.result.fields[0].sourceStatus='unmatched';assert.equal(check(stateWith(evidence),'bank').status,'needs-review');assert.equal(check(stateWith(evidence),'sources').status,'needs-review');
});
test('live case conflicting current signer and duplicate evidence never uses first match wins',()=>{
 const state=stateWith(doc('authority',{'authorised-party':'Oakbridge Holdings LLC',signatory:'Wrong Person'}),doc('identity',{'identity-name':'Morgan Ellis'}),doc('address',{'address-subject':'Morgan Ellis','residential-address':'Example Lane'}),bank(),bank('Different LLC','second-bank'));
 assert.equal(check(state,'signer').status,'needs-review');assert.equal(check(state,'bank').status,'needs-review');assert.ok(check(state,'bank').sources.some(s=>s.documentId==='second-bank'));
 const duplicate=bank();duplicate.result.fields.push({...duplicate.result.fields[0],value:'Different LLC'});assert.equal(check(stateWith(duplicate),'bank').status,'needs-review');
});
test('live case subscription compares amount and explicit currencies against editable application',()=>{
 const sub=doc('subscription',{'subscribing-party':'Oakbridge Holdings LLC','fund-name':'Asteria Private Credit Fund I','share-class':'Class A',commitment:'1000000.00',currency:'USD'});
 const state=stateWith(sub);assert.equal(check(state,'terms').status,'passed');
 const changed=liveCaseReducer(state,{type:'application',application:{...state.application,currency:'EUR'},at});assert.equal(check(changed,'terms').status,'needs-review');assert.deepEqual(changed.documents,state.documents);
 sub.result.fields.find(f=>f.key==='commitment').value='USD 1000000';assert.equal(check(changed,'terms').status,'needs-review');
 const original=JSON.stringify(sub.result);const edited=liveCaseReducer(state,{type:'application',application:{...state.application,fund:'New Fund'},at});assert.equal(check(edited,'terms').status,'needs-review');assert.equal(JSON.stringify(edited.documents[0].result),original);
});
test('live case unsupported documents satisfy nothing and unknown ownership remains review',()=>{
 const unsupported=stateWith(doc('unsupported',{}));assert.ok(getLiveCaseView(unsupported).requirements.every(r=>r.status==='waiting'));assert.equal(check(unsupported,'sources').status,'needs-review');
 const ownership=doc('ownership',{'owner-1':'Holding Ltd','owner-1-interest':'60%','owner-2':'Morgan Ellis','owner-2-interest':'40%','intermediate-owner':'Someone','intermediate-interest':null});assert.equal(check(stateWith(ownership),'ownership').status,'needs-review');
 assert.equal(check(createLiveCase('individual'),'ownership').status,'not-applicable');
});
test('live case pending failed and arbitrary uploads retain original discrepancy',()=>{
 const original=bank('Wrong LLC');const pending={...bank('Oakbridge Holdings LLC','v2',{logicalId:'bank',version:2,replacesId:'bank'}),status:'processing',result:undefined};
 assert.equal(check(stateWith(original,pending),'bank').status,'needs-review');pending.status='error';assert.equal(check(stateWith(original,pending),'bank').status,'needs-review');
 assert.equal(check(stateWith(original,bank('Oakbridge Holdings LLC','unlinked')),'bank').status,'needs-review');
});
test('live case explicit successful replacement retains original history and invalidates confirmations',()=>{
 const original={...bank('Wrong LLC'),confirmed:{0:true}};let state=stateWith(original);
 state=liveCaseReducer(state,{type:'request',request:{id:'request',issueId:'bank',documentId:'bank',reason:'Correct account holder',at}});
 const replacement={...bank('Oakbridge Holdings LLC','v2',{logicalId:'bank',version:2,replacesId:'bank'}),status:'processing',result:undefined};state=liveCaseReducer(state,{type:'add',document:replacement,at});
 state=liveCaseReducer(state,{type:'complete',id:'v2',result:bank().result,at});const view=getLiveCaseView(state);
 assert.equal(check(state,'bank').status,'passed');assert.deepEqual(view.currentDocuments.map(d=>d.id),['v2']);assert.equal(state.documents.length,2);assert.ok(!state.documents[0].confirmed?.[0]);assert.ok(!state.documents[1].confirmed?.[0]);assert.equal(view.requests[0].resolved,true);
 const exported=liveReviewExport(state);assert.equal(exported.documents[0].url,undefined);assert.equal(exported.documents.length,2);assert.match(exported.summary,/External verification.*pending/i);
});
test('live confirmation preserves substantive issues and reset clears case memory',()=>{
 let state=stateWith(bank('Wrong LLC'));state=liveCaseReducer(state,{type:'confirm',id:'bank',index:0,at});assert.equal(state.documents[0].confirmed[0],true);assert.equal(check(state,'bank').status,'needs-review');
 state=liveCaseReducer(state,{type:'reset',scenarioId:'individual'});assert.equal(state.application.scenarioId,'individual');assert.deepEqual(state.documents,[]);assert.deepEqual(state.requests,[]);assert.deepEqual(state.events,[]);
});
test('company guidance advances only after real source correction replacement and export actions',()=>{
 assert.equal(nextCompanyStep({uploaded:false,inspected:false,requested:false,replaced:false,exported:false}),'upload');assert.equal(nextCompanyStep({uploaded:true,inspected:false,requested:false,replaced:false,exported:false}),'inspect');assert.equal(nextCompanyStep({uploaded:true,inspected:true,requested:true,replaced:false,exported:false}),'replace');assert.equal(nextCompanyStep({uploaded:true,inspected:true,requested:true,replaced:true,exported:false}),'export');assert.equal(nextCompanyStep({uploaded:true,inspected:true,requested:true,replaced:true,exported:true}),'done');
});
test('wrong-purpose or unsupported replacement cannot supersede valid original evidence',()=>{for(const purpose of ['formation','unsupported']){const state=stateWith(bank('Wrong LLC'),doc(purpose,{},'v2',{logicalId:'bank',version:2,replacesId:'bank'}));assert.ok(getLiveCaseView(state).currentDocuments.some(d=>d.id==='bank'));assert.equal(check(state,'bank').status,'needs-review');}});
test('conflicting ownership declarations require review even when each totals one hundred percent',()=>{const original=doc('ownership',{'owner-1':'Morgan Ellis','owner-1-interest':'100%'}),conflicting=doc('ownership',{'owner-1':'Different Owner','owner-1-interest':'100%'},'different-ownership');assert.equal(check(stateWith(original,conflicting),'ownership').status,'needs-review');});
test('superseded transcription confirmations remain in review history',()=>{const original={...bank('Wrong LLC'),confirmed:{0:true}};let state=stateWith(original,{...bank('Oakbridge Holdings LLC','v2',{logicalId:'bank',version:2,replacesId:'bank'}),status:'processing',result:undefined});state=liveCaseReducer(state,{type:'complete',id:'v2',result:bank().result,at});assert.equal(liveReviewExport(state).documents[0].confirmationHistory[0],true);});
test('insufficient same-purpose replacement preserves confirmations on the still-current original',()=>{
 for(const failure of ['missing-essential','ungrounded','other-field']){
  const original={...bank(),confirmed:{0:true}},replacement={...bank('Oakbridge Holdings LLC','v2',{logicalId:'bank',version:2,replacesId:'bank'}),status:'processing',result:undefined};
  const result={...bank().result,processing:{extraction:{status:'completed'}}};
  if(failure==='missing-essential')result.fields=result.fields.slice(0,1);
  if(failure==='ungrounded')result.fields[0].sourceStatus='unmatched';
  if(failure==='other-field')result.fields.push({...result.fields[0],key:'other'});
  const next=liveCaseReducer(stateWith(original,replacement),{type:'complete',id:'v2',result,at});
  assert.ok(getLiveCaseView(next).currentDocuments.some(d=>d.id==='bank'),failure);
  assert.deepEqual(next.documents[0].confirmed,{0:true},failure);
  assert.equal(next.documents[0].confirmationHistory,undefined,failure);
 }
});
test('application amount ISO currency must agree with its separately declared currency',()=>{const sub=doc('subscription',{'subscribing-party':'Oakbridge Holdings LLC','fund-name':'Asteria Private Credit Fund I','share-class':'Class A',commitment:'1000000',currency:'USD'});const state=stateWith(sub);state.application.commitment='EUR 1000000';assert.equal(check(state,'terms').status,'needs-review');});
test('malformed or out-of-range intermediate ownership interests require review',()=>{for(const value of ['150%','not stated','-5%']){const ownership=doc('ownership',{'owner-1':'Holding Ltd','owner-1-interest':'100%','intermediate-owner':'Person','intermediate-interest':value});assert.equal(check(stateWith(ownership),'ownership').status,'needs-review',value);}});
test('incompatible replacement cannot resolve a correction request against an otherwise passing check',()=>{const state=stateWith(bank(),doc('formation',{},'v2',{logicalId:'bank',version:2,replacesId:'bank'}));state.requests=[{id:'request',issueId:'bank',documentId:'bank',reason:'Replace source',at}];assert.equal(getLiveCaseView(state).requests[0].resolved,false);});
test('company journey requires a fresh export after the evidence review changes',()=>{const actions={uploaded:true,inspected:true,requested:true,replaced:true,exported:true,exportedReview:'bank-v1-reviewed',currentReview:'bank-v2-reviewed'};assert.equal(nextCompanyStep(actions),'export');assert.equal(nextCompanyStep({...actions,exportedReview:'bank-v2-reviewed'}),'done');});
test('ownership interests require unique grounded named owners and complete pairs',()=>{
 const invalid=[
  {'owner-1':'A','owner-1-interest':'60%','owner-2-interest':'40%'},
  {'owner-1':'A','owner-1-interest':'100%','owner-2':'B'},
  {'owner-1':'A','owner-1-interest':'100%','intermediate-interest':'40%'},
  {'owner-1':'A','owner-1-interest':'100%','intermediate-owner':'B'},
  {'owner-1':'A','owner-1-interest':'60%','owner-2':'A','owner-2-interest':'40%'},
  {'owner-1':'A','owner-1-interest':'100%',other:'Unexplained relationship'},
 ];
 for(const values of invalid){const state=stateWith(doc('ownership',values));assert.equal(check(state,'ownership').status,'needs-review',JSON.stringify(values));assert.equal(getLiveCaseView(state).requirements.find(r=>r.purpose==='ownership').status,'needs-review');const full=stateWith(...completePackage().filter(d=>d.result.purpose!=='ownership'),...state.documents);assert.ok(getLiveCaseView(full).issues.length>0);assert.ok(!getLiveCaseView(full).checks.every(c=>c.status==='passed'));}
 for(const key of ['owner-2','owner-2-interest','intermediate-owner','intermediate-interest']){
  const evidence=doc('ownership',{'owner-1':'A','owner-1-interest':'60%','owner-2':'B','owner-2-interest':'40%','intermediate-owner':'C','intermediate-interest':'100%'});
  evidence.result.fields.find(f=>f.key===key).sourceStatus='unmatched';assert.equal(check(stateWith(evidence),'ownership').status,'needs-review');
  const duplicate=doc('ownership',{'owner-1':'A','owner-1-interest':'60%','owner-2':'B','owner-2-interest':'40%','intermediate-owner':'C','intermediate-interest':'100%'});duplicate.result.fields.push({...duplicate.result.fields.find(f=>f.key===key)});assert.equal(check(stateWith(duplicate),'ownership').status,'needs-review');
 }
 const complete=doc('ownership',{'owner-1':'A','owner-1-interest':'60%','owner-2':'B','owner-2-interest':'40%','intermediate-owner':'C','intermediate-interest':'100%'});assert.equal(check(stateWith(complete),'ownership').status,'passed');
});
test('conflicting current essential fields require review with both document sources',()=>{
 for(const [purpose,values,key,other] of [
  ['address',{'address-subject':'Morgan Ellis','residential-address':'Example Lane'},'residential-address','Different Lane'],
  ['bank',{'account-holder':'Oakbridge Holdings LLC','bank-name':'Example Bank','account-suffix':'SAMPLE-4821','bank-currency':'USD'},'bank-name','Another Bank'],
  ['bank',{'account-holder':'Oakbridge Holdings LLC','bank-name':'Example Bank','account-suffix':'SAMPLE-4821','bank-currency':'USD'},'account-suffix','SAMPLE-7190'],
  ['formation',{'legal-name':'Oakbridge Holdings LLC','formation-jurisdiction':'Delaware'},'formation-jurisdiction','New York'],
  ['tax',{'tax-owner':'Oakbridge Holdings LLC','tax-form':'W-9'},'tax-form','W-8'],
 ]){const state=stateWith(doc(purpose,values,'first'),doc(purpose,{...values,[key]:other},'second'));const required=check(state,'required');assert.equal(required.status,'needs-review',key);assert.equal(getLiveCaseView(state).requirements.find(r=>r.purpose===purpose).status,'needs-review');assert.deepEqual(new Set(required.sources.filter(s=>s.key===key).map(s=>s.documentId)),new Set(['first','second']));assert.ok(required.targets.some(t=>t.documentId==='first'));assert.ok(required.targets.some(t=>t.documentId==='second'));const full=stateWith(...completePackage().filter(d=>d.result.purpose!==purpose),...state.documents);assert.ok(getLiveCaseView(full).issues.length>0);assert.ok(!getLiveCaseView(full).checks.every(c=>c.status==='passed'));}
 const values={'subscribing-party':'Oakbridge Holdings LLC','fund-name':'Asteria Private Credit Fund I','share-class':'Class A',commitment:'$1,000,000',currency:'USD'};
 const equivalent=stateWith(doc('subscription',values,'first'),doc('subscription',{...values,commitment:'USD 1000000.00'},'second'));assert.equal(getLiveCaseView(equivalent).requirements.find(r=>r.purpose==='subscription').status,'passed');
 const differing=stateWith(doc('subscription',values,'first'),doc('subscription',{...values,commitment:'USD 2000000'},'second'));assert.equal(check(differing,'required').status,'needs-review');
 const replacement=stateWith(bank(),{...bank('Oakbridge Holdings LLC','v2',{logicalId:'bank',version:2,replacesId:'bank'}),result:{...bank().result,fields:bank().result.fields.map(f=>f.key==='bank-name'?{...f,value:'Replacement Bank'}:f)}});assert.equal(getLiveCaseView(replacement).requirements.find(r=>r.purpose==='bank').status,'passed');
});

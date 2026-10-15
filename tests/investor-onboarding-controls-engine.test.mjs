import assert from 'node:assert/strict';
import test from 'node:test';
import { createDemoState, demoReducer, getCaseView, buildReviewExport } from '../lib/investor-onboarding/engine.ts';
import { getCaseChecks } from '../lib/investor-onboarding/controls.ts';
import { scenarios } from '../lib/investor-onboarding/data.ts';
const at = '2026-10-01T20:00:00Z';
function submitted(scenarioId, ids) {
  let state = createDemoState(scenarioId);
  state = demoReducer(state,{type:'UPLOAD',ids:ids ?? scenarios.find(s=>s.id===scenarioId).documents.filter(d=>!d.correction).map(d=>d.id),at});
  return demoReducer(state,{type:'PROCESS',epoch:state.epoch,at});
}
test('empty and processing cases never show case checks as passed',()=>{
  let state=createDemoState();
  assert.ok(getCaseChecks(getCaseView(state)).every(c=>c.status==='waiting'));
  state=demoReducer(state,{type:'UPLOAD',ids:['company-bank'],at});
  assert.ok(getCaseChecks(getCaseView(state)).every(c=>c.status==='waiting'));
});
test('company case exposes bank conflict while passing evidence comparisons with source references',()=>{
  const checks=getCaseChecks(getCaseView(submitted('company')));
  assert.equal(checks.find(c=>c.id==='bank-holder').status,'attention');
  assert.equal(checks.find(c=>c.id==='bank-holder').sources[0].documentId,'company-bank');
  for(const id of ['collection','subscriber','signatory','investment','ownership','provenance']) assert.equal(checks.find(c=>c.id===id).status,'passed',id);
  assert.ok(checks.every(c=>c.scope.length>0));
});
test('partial bank correction passes name comparison without completing missing evidence',()=>{
  let state=submitted('company',['company-bank']);
  state=demoReducer(state,{type:'REQUEST_CORRECTION',issueId:'bank-holder',at});
  state=demoReducer(state,{type:'UPLOAD',ids:['company-bank-corrected'],at});
  state=demoReducer(state,{type:'PROCESS',epoch:state.epoch,at});
  const checks=getCaseChecks(getCaseView(state));
  assert.equal(checks.find(c=>c.id==='bank-holder').status,'passed');
  assert.equal(checks.find(c=>c.id==='bank-holder').sources[0].documentId,'company-bank-corrected');
  assert.equal(checks.find(c=>c.id==='collection').status,'waiting');
  assert.equal(checks.find(c=>c.id==='signatory').status,'waiting');
});
test('layered ownership remains unresolved even when direct interests total 100%',()=>{
  const checks=getCaseChecks(getCaseView(submitted('complex')));
  assert.equal(checks.find(c=>c.id==='ownership').status,'attention');
  assert.equal(checks.find(c=>c.id==='ownership').sources.some(s=>s.fieldKey==='intermediate-interest'),true);
});
test('individual case has an explicit not-applicable ownership result',()=>{
  const checks=getCaseChecks(getCaseView(submitted('individual')));
  assert.equal(checks.find(c=>c.id==='ownership').status,'not_applicable');
  assert.equal(checks.filter(c=>c.status==='passed').length,6);
});
test('mismatching subscription and signer values cannot pass consistency checks',()=>{
  const view=getCaseView(submitted('company'));
  const changed={...view,fields:view.fields.map(f=>f.key==='subscribing-party'||f.key==='identity-name'?{...f,value:'Different party'}:f)};
  const checks=getCaseChecks(changed);
  assert.equal(checks.find(c=>c.id==='subscriber').status,'attention');
  assert.equal(checks.find(c=>c.id==='signatory').status,'attention');
});
test('provenance verification rejects an altered value, section or version',()=>{
  const view=getCaseView(submitted('individual'));
  for(const change of [{value:'Invented value'},{sectionId:'missing'},{version:99}]) {
    const checks=getCaseChecks({...view,fields:view.fields.map((f,i)=>i===0?{...f,...change}:f)});
    assert.equal(checks.find(c=>c.id==='provenance').status,'attention');
  }
});
test('JSON review record includes scoped case-check evidence and keeps verification pending',()=>{
  const record=buildReviewExport(submitted('company'),at);
  assert.equal(record.caseChecks.find(c=>c.id==='bank-holder').status,'attention');
  assert.ok(record.caseChecks.every(c=>c.scope && c.rule));
  const bank=record.caseChecks.find(c=>c.id==='bank-holder');
  assert.equal(bank.sources[0].documentId,'company-bank');
  assert.equal(bank.sources[0].fieldKey,'account-holder');
  assert.equal(bank.sources[0].version,1);
  assert.ok(record.providerChecks.every(c=>c.status==='pending'));
});

test('confirming every available field leaves verification pending and the case unaccepted',()=>{
  for(const scenarioId of ['company','individual','complex']) {
    let state=submitted(scenarioId);
    for(const field of getCaseView(state).fields) state=demoReducer(state,{type:'CONFIRM_FIELD',fieldId:field.id,at});
    const view=getCaseView(state);
    assert.ok(view.providerChecks.every(c=>c.status==='pending'));
    assert.notEqual(view.status,'Accepted');
    assert.ok(view.fields.filter(f=>f.value==='Unknown').every(f=>!f.confirmed));
    assert.ok(view.fields.filter(f=>f.value!=='Unknown').every(f=>f.confirmed));
  }
});
test('missing and unprocessed field IDs cannot be confirmed',()=>{
  let state=createDemoState();
  assert.deepEqual(demoReducer(state,{type:'CONFIRM_FIELD',fieldId:'company-formation:legal-name',at}),state);
  state=demoReducer(state,{type:'UPLOAD',ids:['company-formation'],at});
  assert.deepEqual(demoReducer(state,{type:'CONFIRM_FIELD',fieldId:'company-formation:legal-name',at}),state);
});

test('conflicting commitment fund share class or currency cannot pass subscription terms',()=>{
  const view=getCaseView(submitted('company'));
  for(const key of ['commitment','fund-name','share-class','currency']) {
    const changed={...view,fields:view.fields.map(f=>f.key===key?{...f,value:'Conflicting term'}:f)};
    assert.equal(getCaseChecks(changed).find(c=>c.id==='investment').status,'attention',key);
  }
});
test('missing malformed and non-total ownership interests never pass completeness',()=>{
  const view=getCaseView(submitted('company'));
  for(const value of ['Unknown','sixty percent','61%']) {
    const changed={...view,fields:view.fields.map(f=>f.key==='owner-1-interest'?{...f,value}:f)};
    assert.equal(getCaseChecks(changed).find(c=>c.id==='ownership').status,'attention',value);
  }
  const missing={...view,fields:view.fields.filter(f=>f.key!=='owner-1-interest')};
  assert.equal(getCaseChecks(missing).find(c=>c.id==='ownership').status,'waiting');
});

test('recorded AI extra fields stay flagged without creating an investor correction request',()=>{
  let state=submitted('individual');
  const view=getCaseView(state);
  const issue=view.issues.find(i=>i.kind==='ai_output_review');
  assert.ok(issue);
  assert.equal(issue.documentId,'individual-address');
  assert.equal(demoReducer(state,{type:'REQUEST_CORRECTION',issueId:issue.id,at}),state);
  for(const field of view.fields)state=demoReducer(state,{type:'CONFIRM_FIELD',fieldId:field.id,at});
  assert.ok(getCaseView(state).issues.some(i=>i.id===issue.id));
});
test('portal fields replay the recorded model values quotes and run identity',async()=>{
  const { default: replay }=await import('../lib/investor-onboarding/ai-replay.json',{with:{type:'json'}});
  const view=getCaseView(submitted('company'));
  for(const field of view.fields) {
    const recorded=replay[field.documentId].fields.find(f=>f.key===field.key);
    assert.equal(field.value,recorded.value??'Unknown');
    assert.equal(field.sourceQuote,recorded.quote??undefined);
    assert.equal(field.runId,replay[field.documentId].runId);
    assert.equal(field.model,replay[field.documentId].model);
  }
});

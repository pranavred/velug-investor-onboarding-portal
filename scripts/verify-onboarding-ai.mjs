import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { scenarios } from '../lib/investor-onboarding/data.ts';
import { gradeDocument } from '../lib/investor-onboarding/ai-evaluation.ts';
const read=path=>JSON.parse(readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const report=read('lib/investor-onboarding/ai-report.json');
assert.deepEqual(report,read('public/investor-onboarding/ai-report.json'));
const raw=read('public/investor-onboarding/ai-run-records.json');
const replay=read('lib/investor-onboarding/ai-replay.json');
const texts=read('public/investor-onboarding/ai-source-text.json');
const responses=[...raw.records,...raw.caseRecords];
assert.equal(raw.runId,report.runId);
assert.equal(report.requestCount,responses.length);
assert.equal(responses.length,31);
assert.equal(new Set(responses.map(r=>r.responseId)).size,responses.length);
assert.equal(report.runId,hash(responses.map(r=>r.responseId).join('')).slice(0,16));
assert.equal(report.sourceFingerprint,hash(readFileSync(new URL('../scripts/run-onboarding-ai.mjs',import.meta.url))+readFileSync(new URL('../lib/investor-onboarding/ai-evaluation.ts',import.meta.url))+JSON.stringify(report.documents.map(r=>({id:r.id,pdfHash:r.pdfHash,expected:r.expected})))+JSON.stringify({casePrompt:raw.casePrompt,checkSchema:raw.caseSchema})));
for(const response of responses) {
  assert.match(response.responseId,/^resp_/);
  assert.equal(response.returnedModel,report.requestedModel);
  assert.ok(response.usage.total_tokens>0);
  assert.ok(Date.parse(response.completed)>=Date.parse(response.started));
  assert.deepEqual(JSON.parse(response.outputText),response.output);
}
const samples=report.documents.filter(d=>d.kind==='sample');
assert.equal(samples.length,report.documentCount);
assert.equal(Object.keys(replay).length,samples.length);
for(const document of report.documents) {
  const response=raw.records.find(r=>r.id===document.id);
  assert.ok(response,document.id);
  assert.equal(hash(readFileSync(new URL(`../${document.path}`,import.meta.url))),document.pdfHash,document.id);
  assert.equal(response.pdfHash,document.pdfHash);
  assert.deepEqual(response.output,document.actual);
  assert.equal(response.responseId,document.responseId);
  assert.deepEqual(gradeDocument(document.expected,response.output,texts[document.id]),document.grade,document.id);
  if(document.kind==='sample') {
    const source=scenarios.flatMap(s=>s.documents).find(d=>d.id===document.id);
    assert.deepEqual(document.expected,{category:source.category,fields:source.sections.flatMap(s=>s.fields).map(({key,value})=>({key,value}))});
    assert.deepEqual(replay[document.id],{...response.output,model:response.returnedModel,runId:report.runId});
  }
}
for(const test of report.cases) {
  const response=raw.caseRecords.find(r=>r.id===test.id);
  assert.deepEqual(response.output,test.actual);
  assert.equal(response.responseId,test.responseId);
  assert.equal(test.passed,Object.entries(test.expected).every(([key,value])=>test.actual.checks[key]===value)&&test.actual.decision===test.expectedDecision&&test.actual.externalVerificationCompleted===false);
}
const fields=samples.flatMap(d=>d.grade.fields),known=fields.filter(f=>!f.unknown);
const expectedMetrics={classification:[samples.filter(d=>d.grade.classificationCorrect).length,samples.length],extraction:[fields.filter(f=>f.correct).length,fields.length],precision:[fields.filter(f=>f.correct).length,samples.reduce((n,d)=>n+d.actual.fields.length,0)],sources:[known.filter(f=>f.sourceCorrect).length,known.length],exceptions:[report.cases.filter(c=>c.passed).length,report.cases.length],injection:[report.documents.filter(d=>d.kind==='injection'&&d.grade.passed).length+Number(report.cases.find(c=>c.id==='company-injected').passed),3],abstention:[report.documents.filter(d=>['missing','unsupported'].includes(d.kind)&&d.grade.passed).length,2]};
for(const metric of report.metrics) assert.deepEqual([metric.correct,metric.total],expectedMetrics[metric.id],metric.id);
console.log(`Verified ${responses.length} recorded AI responses, PDF hashes, grades, metrics, and replay integrity. No model calls made.`);

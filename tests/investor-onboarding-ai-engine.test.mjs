import test from 'node:test';
import assert from 'node:assert/strict';
import { gradeDocument, validateDocumentOutput } from '../lib/investor-onboarding/ai-evaluation.ts';
const expected={category:'bank',fields:[{key:'account-holder',value:'Oakbridge Holdings LLC'}]};
const source='Account holder\nOakbridge Holdings LLC';
const output={category:'bank',fields:[{key:'account-holder',value:'Oakbridge Holdings LLC',page:1,quote:'Oakbridge Holdings LLC'}]};
test('AI scoring requires correct values and a quote on the actual PDF page',()=>{
  assert.equal(gradeDocument(expected,output,source).passed,true);
  for(const change of [{value:'Different LLC'},{page:2},{quote:'Invented quote'}]) assert.equal(gradeDocument(expected,{...output,fields:[{...output.fields[0],...change}]},source).passed,false);
});
test('AI scoring fails missing duplicate and extra fields rather than hiding them',()=>{
  assert.equal(gradeDocument(expected,{category:'bank',fields:[]},source).passed,false);
  assert.equal(gradeDocument(expected,{...output,fields:[...output.fields,...output.fields]},source).passed,false);
  assert.equal(gradeDocument(expected,{...output,fields:[...output.fields,{key:'bank-name',value:'Invented',quote:'Invented',page:1}]},source).passed,false);
});
test('missing evidence accepts abstention but never an inferred percentage',()=>{
  const missing={category:'ownership',fields:[{key:'intermediate-interest',value:'Unknown'}]};
  const result={category:'ownership',fields:[{key:'intermediate-interest',value:null,page:1,quote:'Unknown'}]};
  assert.equal(gradeDocument(missing,result,'Unknown').passed,true);
  assert.equal(gradeDocument(missing,{...result,fields:[{...result.fields[0],value:'60%'}]},'Unknown').passed,false);
});
test('AI output validation rejects unsupported shape keys and page types',()=>{
  assert.equal(validateDocumentOutput(output,['account-holder']),true);
  for(const value of [null,{}, {...output,category:'invented'}, {...output,fields:[{...output.fields[0],page:'1'}]}]) assert.equal(validateDocumentOutput(value,['account-holder']),false);
  assert.equal(validateDocumentOutput(output,['different-key']),false);
});

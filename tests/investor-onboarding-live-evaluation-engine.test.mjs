import test from 'node:test';
import assert from 'node:assert/strict';
import {gradeLiveDocument,liveEvaluationMetrics,gradeLiveCase} from '../lib/investor-onboarding/live-evaluation.ts';
const expected={purpose:'bank',category:'bank',fields:[{key:'account-holder',value:'Elmshore Ventures LLC',page:1},{key:'account-suffix',value:'SYNTH-4821',page:2}]};
const pages=['Account holder: Elmshore Ventures LLC','Account reference: SYNTH-4821'];
const output={purpose:'bank',category:'bank',fields:[{key:'account-holder',label:'Account holder',value:'Elmshore Ventures LLC',page:1,quote:pages[0]},{key:'account-suffix',label:'Account reference',value:'SYNTH-4821',page:2,quote:pages[1]}]};
const clone=()=>structuredClone(output);
test('live evaluation grades precise purpose category missing extra and duplicate fields',()=>{
 assert.equal(gradeLiveDocument(expected,output,pages).passed,true);
 for(const key of ['purpose','category']){const bad=clone();bad[key]='identity';assert.equal(gradeLiveDocument(expected,bad,pages).classificationCorrect,false);}
 assert.equal(gradeLiveDocument(expected,{purpose:'bank',category:'bank',fields:'invalid'},pages).passed,false);assert.equal(gradeLiveDocument(expected,null,pages).passed,false);
 const malformed=clone();malformed.fields[0].extra='unvalidated';assert.equal(gradeLiveDocument(expected,malformed,pages).formatValid,false);
 const missing=clone();missing.fields.pop();assert.equal(gradeLiveDocument(expected,missing,pages).fields[1].correct,false);
 const extra=clone();extra.fields.push({key:'other',value:'Invented',page:1,quote:'Invented'});assert.equal(gradeLiveDocument(expected,extra,pages).extras.length,1);assert.equal(gradeLiveDocument(expected,extra,pages).passed,false);
 const duplicate=clone();duplicate.fields.push({...duplicate.fields[0]});const grade=gradeLiveDocument(expected,duplicate,pages);assert.deepEqual(grade.duplicates,['account-holder']);assert.equal(grade.fields[0].correct,false);assert.equal(grade.passed,false);
});
test('live evaluation rejects wrong page invented quote and truncated numeric source spans',()=>{
 const wrongPage=clone();wrongPage.fields[1].page=1;assert.equal(gradeLiveDocument(expected,wrongPage,pages).fields[1].sourceCorrect,false);
 const wrongQuote=clone();wrongQuote.fields[0].quote='Not visible';assert.equal(gradeLiveDocument(expected,wrongQuote,pages).fields[0].sourceCorrect,false);
 const numeric={purpose:'bank',category:'bank',fields:[{key:'account-suffix',value:'482',page:1}]};const fabricated={purpose:'bank',category:'bank',fields:[{key:'account-suffix',value:'482',page:1,quote:'482'}]};assert.equal(gradeLiveDocument(numeric,fabricated,['Account reference SYNTH-4821']).fields[0].sourceCorrect,false);
 const positive={purpose:'subscription',category:'subscription',fields:[{key:'commitment',value:'1,000,000',page:1}]};assert.equal(gradeLiveDocument(positive,{...positive,fields:[{...positive.fields[0],quote:'Commitment -$1,000,000'}]},['Commitment -$1,000,000']).fields[0].sourceCorrect,false);
});
test('live evaluation accepts explicit null unknown abstention but rejects inferred values',()=>{
 const blank={purpose:'ownership',category:'ownership',fields:[{key:'intermediate-interest',value:null,page:1}]};
 for(const value of [null,'Unknown'])assert.equal(gradeLiveDocument(blank,{purpose:'ownership',category:'ownership',fields:[{key:'intermediate-interest',label:'Intermediate interest',value,page:null,quote:null}]},['Interest: Unknown']).passed,true);
 const guess=gradeLiveDocument(blank,{purpose:'ownership',category:'ownership',fields:[{key:'intermediate-interest',value:'100%',page:1,quote:'Interest: Unknown'}]},['Interest: Unknown']);assert.equal(guess.passed,false);
});
test('live evaluation measures recall precision source correctness exceptions and false clears separately',()=>{
 const passed=gradeLiveDocument(expected,output,pages);const bad=clone();bad.fields.push({key:'other',value:'Extra',page:1,quote:'Extra'});const extra=gradeLiveDocument(expected,bad,pages);
 const cases=[{expectedDecision:'needs_review',actual:{decision:'ready_for_review'},passed:false},{expectedDecision:'needs_review',actual:{decision:'needs_review'},passed:true}];
 const metrics=liveEvaluationMetrics([{grade:passed,actual:output},{grade:extra,actual:bad}],cases);
 const metric=id=>metrics.find(m=>m.id===id);assert.deepEqual([metric('extraction').correct,metric('extraction').total],[4,4]);assert.deepEqual([metric('precision').correct,metric('precision').total],[4,5]);assert.deepEqual([metric('sources').correct,metric('sources').total],[4,4]);assert.deepEqual([metric('exceptions').correct,metric('exceptions').total],[1,2]);assert.deepEqual([metric('false-clears').correct,metric('false-clears').total],[1,2]);
});
test('live evaluation case grades retain conflicting evidence and never treat readiness as acceptance',()=>{
 const application={scenarioId:'company',legalName:'Elmshore Ventures LLC',signatory:'Dana Mercer',fund:'Juniper Income Fund IV',commitment:'$1,250,000',shareClass:'Class Q',currency:'USD'};
 const document={id:'bank',logicalId:'bank',version:1,filename:'bank.pdf',url:'',status:'complete',result:{mode:'live_ai',purpose:'bank',category:'bank',fields:[{key:'account-holder',label:'Account holder',value:'Different LLC',page:1,quote:'Different LLC',sourceStatus:'matched'}],flags:[],externalVerificationCompleted:false}};
 const grade=gradeLiveCase({application,documents:[document],requests:[],events:[]},{bank:'needs-review',required:'needs-review'},'needs_review');assert.equal(grade.passed,true);assert.equal(grade.actual.accepted,false);assert.equal(grade.actual.externalVerificationCompleted,false);
 assert.equal(gradeLiveCase({application,documents:[document],requests:[],events:[]},{bank:'passed'},'ready_for_review').passed,false);
});

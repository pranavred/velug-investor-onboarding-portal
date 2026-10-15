import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { handleLiveUpload } from '../lib/investor-onboarding/live-service.ts';
import { liveReducer } from '../lib/investor-onboarding/live-state.ts';
const pdf=readFileSync('public/investor-onboarding/documents/company-bank.pdf');
const field={key:'account-holder',label:'Account holder',value:'Oakbridge Management LLC',page:1,quote:'Account holder Oakbridge Management LLC'};
function request(bytes=pdf,options={}) {
 const form=new FormData();form.set('file',new Blob([bytes],{type:options.mime??'application/pdf'}),options.name??'dummy.pdf');form.set('scenarioId',options.scenarioId??'company');if(options.application!==undefined)form.set('application',typeof options.application==='string'?options.application:JSON.stringify(options.application));
 return new Request('https://velug.ai/api/investor-onboarding/process',{method:'POST',body:form,headers:{origin:options.origin??'https://velug.ai'}});
}
function provider(output={category:'bank',fields:[field]}) {
 return {id:'resp_live_test',model:'gpt-4.1-2025-04-14',status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({...output,purpose:output.purpose??({entity:'formation',identity:'identity',ownership:'ownership'}[output.category]??output.category)})}]}],usage:{input_tokens:200,output_tokens:40,total_tokens:240}};
}
function dependencies(body=provider()) {
 let calls=0;return {apiKey:'private-test-key',limit:async()=>{},fetchImpl:async(url,options)=>{calls++;assert.equal(url,'https://api.openai.com/v1/responses');const input=JSON.parse(options.body);assert.equal(input.store,false);assert.equal(input.model,'gpt-4.1-2025-04-14');assert.equal(input.tools,undefined);assert.equal(input.input[0].content[0].file_data,`data:application/pdf;base64,${pdf.toString('base64')}`);return Response.json(body);},get calls(){return calls;}};
}
test('live upload processes actual PDF bytes and flags an application mismatch',async()=>{
 const d=dependencies(),r=await handleLiveUpload(request(),d);assert.equal(r.status,200);const result=await r.json();assert.equal(result.mode,'live_ai');assert.equal(result.category,'bank');assert.equal(result.responseId,'resp_live_test');assert.equal(result.fields[0].sourceStatus,'matched');assert.equal(result.fields[0].value,'Oakbridge Management LLC');assert.ok(result.flags.some(f=>f.code==='application_mismatch'));assert.equal(result.externalVerificationCompleted,false);assert.equal(d.calls,1);
});
test('live intake rejects invalid, empty, oversized, non-PDF and cross-site files before a model call',async()=>{
 for(const [bytes,options,status] of [[Buffer.from('not pdf'),{},400],[Buffer.alloc(0),{},400],[Buffer.alloc(2*1024*1024+1),{},413],[pdf,{name:'dummy.txt',mime:'text/plain'},400],[pdf,{origin:'https://elsewhere.test'},403]]) {const d=dependencies();assert.equal((await handleLiveUpload(request(bytes,options),d)).status,status);assert.equal(d.calls,0);}
});
test('live API rejects oversized streamed bodies and multiple files before processing',async()=>{
 const d=dependencies();const r=await handleLiveUpload(new Request('https://velug.ai/api/investor-onboarding/process',{method:'POST',headers:{origin:'https://velug.ai','content-type':'multipart/form-data; boundary=a'},body:'x'.repeat(2*1024*1024+20000)}),d);assert.equal(r.status,413);assert.equal(d.calls,0);
 const form=new FormData();form.append('file',new Blob([pdf]),'a.pdf');form.append('file',new Blob([pdf]),'b.pdf');form.set('scenarioId','company');assert.equal((await handleLiveUpload(new Request('https://velug.ai/api/investor-onboarding/process',{method:'POST',body:form,headers:{origin:'https://velug.ai'}}),d)).status,400);
});
test('unsupported dummy PDF gets a real model outcome and remains in review',async()=>{
 const d=dependencies(provider({category:'unsupported',fields:[]})),r=await handleLiveUpload(request(),d),v=await r.json();assert.equal(r.status,200);assert.equal(v.category,'unsupported');assert.ok(v.flags.some(f=>f.code==='unsupported'));assert.equal(v.fields.length,0);assert.equal(d.calls,1);
});
test('live source checks flag wrong quotes, wrong pages, blank values and duplicate keys',async()=>{
 const d=dependencies(provider({category:'bank',fields:[{...field,quote:'This was never in the PDF'},{...field,page:99},{key:'other',label:'Ownership',value:null,page:null,quote:null}]}));const v=await(await handleLiveUpload(request(),d)).json();assert.equal(v.fields[0].sourceStatus,'unmatched');assert.equal(v.fields[1].sourceStatus,'unmatched');assert.equal(v.fields[2].sourceStatus,'missing');assert.ok(v.flags.some(f=>f.code==='duplicate'));assert.ok(v.flags.some(f=>f.code==='source'));assert.ok(v.flags.some(f=>f.code==='missing'));
});
test('malformed, oversized and unexpected-key model output cannot become live fields',async()=>{
 for(const output of [{category:'bank',fields:[{...field,key:'execute-code'}]},{category:'bank',fields:[{...field,value:'x'.repeat(1001)}]},{category:'accept-investor',fields:[]},{category:'bank',fields:[{...field,page:'1'}]}]) {const d=dependencies(provider(output)),r=await handleLiveUpload(request(),d);assert.equal(r.status,502);assert.ok(!(await r.text()).includes('private-test-key'));}
});
test('provider failure, refusal, truncation and wrong model never fall back to replay',async()=>{
 for(const body of [{error:{message:'private-test-key'}},{...provider(),status:'incomplete'},{...provider(),model:'another-model'},{...provider(),output:[{type:'message',content:[{type:'refusal',refusal:'Cannot process'}]}]}]) {const d=dependencies(body);if(body.error)d.fetchImpl=async()=>Response.json(body,{status:429});const r=await handleLiveUpload(request(),d);assert.equal(r.status,502);assert.ok(!(await r.text()).includes('private-test-key'));}
});
test('live provider calls stop when quota, configuration or limit service is unavailable',async()=>{
 for(const [change,status] of [[{apiKey:''},503],[{limit:async()=>{throw Object.assign(new Error('quota'),{status:429});}},429],[{limit:async()=>{throw new Error('secret upstream error');}},503]]) {const d=Object.assign(dependencies(),change),r=await handleLiveUpload(request(),d);assert.equal(r.status,status);assert.equal(d.calls,0);assert.ok(!(await r.text()).includes('secret upstream error'));}
});
test('cleared live uploads reject stale completions and block confirmation of unknown or ungrounded fields',()=>{
 const pending={id:'a',filename:'a.pdf',url:'blob:test',status:'processing'};let s=liveReducer([],{type:'add',document:pending});s=liveReducer(s,{type:'reset'});assert.deepEqual(liveReducer(s,{type:'complete',id:'a',result:{fields:[]}}),[]);
 s=liveReducer([],{type:'add',document:pending});s=liveReducer(s,{type:'complete',id:'a',result:{fields:[{...field,sourceStatus:'matched'},{...field,value:null,sourceStatus:'missing'},{...field,sourceStatus:'unmatched'},{...field,value:'Unknown',sourceStatus:'matched'}],flags:[{code:'source'}]}});
 s=liveReducer(s,{type:'confirm',id:'a',index:1});assert.ok(!s[0].confirmed?.[1]);s=liveReducer(s,{type:'confirm',id:'a',index:2});assert.ok(!s[0].confirmed?.[2]);s=liveReducer(s,{type:'confirm',id:'a',index:3});assert.ok(!s[0].confirmed?.[3]);s=liveReducer(s,{type:'confirm',id:'a',index:0});assert.equal(s[0].confirmed[0],true);assert.equal(s[0].result.flags.length,1);
});
test('PDFs over the page limit are rejected before model processing',async()=>{
 const d=dependencies(),r=await handleLiveUpload(request(readFileSync('tests/fixtures/onboarding-live-eleven-pages.pdf')),d);assert.equal(r.status,400);assert.match(await r.text(),/10 pages/);assert.equal(d.calls,0);
});
test('cancelled requests and provider timeouts cannot produce successful live results',async()=>{
 const d=dependencies();const base=request();const abort=new AbortController();abort.abort();const r=await handleLiveUpload(new Request(base,{signal:abort.signal}),d);assert.equal(r.status,408);assert.equal(d.calls,0);
 const timed=dependencies();timed.fetchImpl=async()=>{throw new DOMException('timed out','TimeoutError');};assert.equal((await handleLiveUpload(request(),timed)).status,502);
});
test('live subscription subscriber uses the extracted subscribing-party key for mismatch review',async()=>{
 const d=dependencies(provider({category:'subscription',fields:[{...field,key:'subscribing-party',label:'Subscribing party'}]}));const v=await(await handleLiveUpload(request(),d)).json();assert.equal(v.fields[0].sourceStatus,'matched');assert.ok(v.flags.some(f=>f.code==='application_mismatch'&&f.detail.includes('Oakbridge Holdings LLC')));
});
test('whitespace-only model values are missing and cannot be confirmed',async()=>{
 const d=dependencies(provider({category:'bank',fields:[{...field,value:'   '}]}));const v=await(await handleLiveUpload(request(),d)).json();assert.equal(v.fields[0].sourceStatus,'missing');assert.equal(v.fields[0].value,null);assert.ok(v.flags.some(f=>f.code==='missing'));
 const s=[{id:'blank',status:'complete',result:{fields:[{...field,value:'   ',sourceStatus:'matched'}],flags:[]}}];assert.deepEqual(liveReducer(s,{type:'confirm',id:'blank',index:0}),s);
});

// A real, uncompressed one-page PDF keeps parser behavior in these tests.
function textPdf(lines,overlay=false) {
 const text=lines.map(line=>`(${line.replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)')}) Tj ${overlay?'1 0 0 1 40 750 Tm':'T*'}`).join('\n');
 const stream=`BT /F1 10 Tf 12 TL 40 750 Td ${text} ET`;
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
 let output='%PDF-1.4\n';const offsets=[0];
 objects.forEach((object,index)=>{offsets.push(Buffer.byteLength(output));output+=`${index+1} 0 obj\n${object}\nendobj\n`;});
 const xref=Buffer.byteLength(output);output+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset=>`${String(offset).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return Buffer.from(output);
}
async function resultForFields(fields,bytes=pdf) {
 const d=dependencies(provider({category:'subscription',fields}));
 d.fetchImpl=async()=>Response.json(provider({category:'subscription',fields}));
 const response=await handleLiveUpload(request(bytes),d);assert.equal(response.status,200);return response.json();
}
test('partial identifiers cannot be grounded or confirmed from a longer quoted reference',async()=>{
 const value='482',quote='Account reference SAMPLE-XXXX-4821';
 const result=await resultForFields([{key:'account-suffix',label:'Account reference',value,page:1,quote}]);
 assert.equal(result.fields[0].sourceStatus,'unmatched');assert.equal(result.fields[0].value,value);assert.equal(result.fields[0].quote,quote);assert.ok(result.flags.some(f=>f.code==='source'));
 const shortened=[];
 for(const partialQuote of ['482','SAMPLE-XXXX-482']) {
  const truncated=await resultForFields([{key:'account-suffix',label:'Account reference',value:'482',page:1,quote:partialQuote}]);
  shortened.push(truncated.fields[0].sourceStatus);
 }
 const shortName=await resultForFields([{...field,value:'Oakbridge Management LL',quote:'Oakbridge Management LL'}]);
 shortened.push(shortName.fields[0].sourceStatus);
 assert.deepEqual(shortened,['unmatched','unmatched','unmatched']);
 const state=[{id:'partial',status:'complete',result}];assert.deepEqual(liveReducer(state,{type:'confirm',id:'partial',index:0}),state);
});
test('partial numeric tokens cannot be grounded inside decimal thousands percent or identifier values',async()=>{
 const cases=[['482','4821'],['482','1482'],['482','482.1'],['482','482,100'],['50','50%'],['50','50.0%'],['482','ID-482'],['482','482-REF'],['1,000','1,000,000'],['000','1 000'],['482','482 / 1'],['482','+482'],['482',"1'482"]];
 for(const [value,full] of cases){const quote=`Value ${full}`,result=await resultForFields([{key:'other',label:'Value',value,page:1,quote}],textPdf([quote]));assert.equal(result.fields[0].sourceStatus,'unmatched',full);}
});
test('complete quoted values retain original text with case whitespace and Unicode normalization',async()=>{
 const value='oakbridge   management llc',quote='Account HOLDER  Oakbridge Management LLC';
 const result=await resultForFields([{...field,value,quote},{key:'account-suffix',label:'Account reference',value:'ＳＡＭＰＬＥ-ＸＸＸＸ-４８２１',page:1,quote:'Account reference SAMPLE-XXXX-4821'},{key:'statement-date',label:'Statement date',value:'September 30, 2026',page:1,quote:'Statement date September 30, 2026'}]);
 assert.ok(result.fields.every(f=>f.sourceStatus==='matched'));assert.equal(result.fields[0].value,value);assert.equal(result.fields[0].quote,quote);
});
test('unambiguous equivalent commitment formats compare amounts without inventing currency',async()=>{
 for(const value of ['1,000,000','$1,000,000','$ 1,000,000','USD $ 1,000,000','1000000.00','USD 1,000,000.00','1,000,000 USD']) {
  const result=await resultForFields([{key:'commitment',label:'Commitment',value,page:1,quote:`Commitment ${value}`}],textPdf([`Commitment ${value}`]));
  assert.equal(result.fields[0].sourceStatus,'matched');assert.ok(!result.flags.some(f=>f.code==='application_mismatch'),value);assert.equal(result.fields[0].value,value);
 }
});
test('different currencies values and ambiguous commitment formats remain application mismatches',async()=>{
 for(const value of ['999,999','$1,000,000.01','EUR 1,000,000','CAD 1,000,000','1.000.000','1.000.000,00','1,00,000','1e6','1,000,000 million','-1,000,000','1,000,000.000','USD EUR 1,000,000','']) {
  const result=await resultForFields([{key:'commitment',label:'Commitment',value,page:1,quote:`Commitment ${value}`}],textPdf([`Commitment ${value}`]));
  assert.ok(result.flags.some(f=>f.code===(value?'application_mismatch':'missing')),value);
 }
 const result=await resultForFields([{key:'commitment',label:'Commitment',value:'1,000,000',page:1,quote:'Commitment 1,000,000'},{key:'currency',label:'Currency',value:'EUR',page:1,quote:'Currency EUR'}],textPdf(['Commitment 1,000,000','Currency EUR']));
 assert.equal(result.flags.filter(f=>f.code==='application_mismatch').length,1);assert.match(result.flags.find(f=>f.code==='application_mismatch').detail,/Currency/);
});
test('unreadable page-limited text-limited and cancelled PDFs spend no provider quota',async()=>{
 const abort=new AbortController();abort.abort();
 const cases=[request(Buffer.from('%PDF-unreadable')),request(readFileSync('tests/fixtures/onboarding-live-eleven-pages.pdf')),request(textPdf(Array.from({length:2500},()=> 'a'.repeat(100)),true)),new Request(request(),{signal:abort.signal})];
 const spent=[];
 for(const [index,input] of cases.entries()){
  let quotaCalls=0;const d=dependencies();d.limit=async()=>{quotaCalls++;};
  const response=await handleLiveUpload(input,d);assert.equal(response.status,index===3?408:400);spent.push(quotaCalls);assert.equal(d.calls,0);
 }
 assert.deepEqual(spent,[0,0,0,0]);
});
test('provider failures spend one dispatched-call quota after valid parsing',async()=>{
 let quotaCalls=0;const d=dependencies();d.limit=async()=>{quotaCalls++;};d.fetchImpl=async()=>Response.json({error:'failed'},{status:502});
 assert.equal((await handleLiveUpload(request(),d)).status,502);assert.equal(quotaCalls,1);
});
test('parser admission denies excess concurrency and releases slots after parse errors',async()=>{
 const {withPdfParserAdmission}=await import('../lib/investor-onboarding/live-service.ts');
 assert.equal(typeof withPdfParserAdmission,'function');
 const release=[];const active=Array.from({length:4},()=>withPdfParserAdmission(()=>new Promise(resolve=>release.push(resolve))));
 try {await assert.rejects(withPdfParserAdmission(async()=>{assert.fail('denied parser ran');}),error=>error.status===429);}
 finally {release.forEach(resolve=>resolve());await Promise.all(active);}
 await assert.rejects(withPdfParserAdmission(async()=>{throw new Error('parse failed');}),/parse failed/);
 assert.equal(await withPdfParserAdmission(async()=>'parsed'),'parsed');
 // A fresh upload following parser failure must still reach its provider gate.
 const d=dependencies();assert.equal((await handleLiveUpload(request(Buffer.from('%PDF-broken')),d)).status,400);
 assert.equal((await handleLiveUpload(request(),d)).status,200);
});
test('parser admission denial consumes no provider quota',async()=>{
 const {withPdfParserAdmission}=await import('../lib/investor-onboarding/live-service.ts');
 assert.equal(typeof withPdfParserAdmission,'function');
 const release=[];const active=Array.from({length:4},()=>withPdfParserAdmission(()=>new Promise(resolve=>release.push(resolve))));
 let quotaCalls=0;const d=dependencies();d.limit=async()=>{quotaCalls++;};
 try {const response=await handleLiveUpload(request(),d);assert.equal(response.status,429);assert.equal(quotaCalls,0);assert.equal(d.calls,0);}
 finally {release.forEach(resolve=>resolve());await Promise.all(active);}
});

test('signed or accounting amount fragments cannot become positive grounded commitments',async()=>{
 for(const quote of ['Commitment -$1,000,000','Commitment -USD 1,000,000','Commitment ($1,000,000)']) {
  const result=await resultForFields([{key:'commitment',label:'Commitment',value:'1,000,000',page:1,quote}],textPdf([quote]));assert.equal(result.fields[0].sourceStatus,'unmatched',quote);
 }
 const result=await resultForFields([{key:'commitment',label:'Commitment',value:'-$1,000,000',page:1,quote:'Commitment -$1,000,000'}],textPdf(['Commitment -$1,000,000']));assert.equal(result.fields[0].sourceStatus,'matched');assert.ok(result.flags.some(f=>f.code==='application_mismatch'));
});
test('live contract requires a consistent precise purpose and folder category',async()=>{
 for(const output of [{category:'bank',purpose:'formation',fields:[field]},{category:'bank',purpose:'unknown',fields:[field]}]) assert.equal((await handleLiveUpload(request(),dependencies(provider(output)))).status,502);
 const raw=provider();raw.output[0].content[0].text=JSON.stringify({category:'bank',fields:[field]});assert.equal((await handleLiveUpload(request(),dependencies(raw))).status,502);
 const d=dependencies(provider({category:'identity',purpose:'address',fields:[]}));const result=await(await handleLiveUpload(request(),d)).json();assert.equal(result.purpose,'address');assert.ok(result.contractVersion);
});
test('live application JSON is bounded validated and never sent as expected answers to provider',async()=>{
 const application={scenarioId:'company',legalName:'Oakbridge Management LLC',signatory:'Morgan Ellis',fund:'Fictional Fund',commitment:'1000000',shareClass:'Class A',currency:'USD'};
 const d=dependencies();const fetchImpl=d.fetchImpl;d.fetchImpl=async(url,options)=>{assert.ok(!options.body.includes('Fictional Fund'));return fetchImpl(url,options);};
 const response=await handleLiveUpload(request(pdf,{application}),d);assert.equal(response.status,200);const result=await response.json();assert.ok(!result.flags.some(f=>f.code==='application_mismatch'));assert.deepEqual(result.requestApplication,application);
 for(const invalid of [null,[],{...application,unknown:true},{...application,legalName:''},{...application,currency:'US'},{...application,scenarioId:'individual'},{...application,fund:'a'.repeat(201)},'x'.repeat(2049),'not json']){const dependency=dependencies();assert.equal((await handleLiveUpload(request(pdf,{application:invalid}),dependency)).status,400);assert.equal(dependency.calls,0);}
});
test('live contract rejects extra output keys array shapes and fields on unsupported documents',async()=>{for(const output of [{category:'bank',purpose:'bank',fields:[field],secret:'unexpected'},{category:'bank',purpose:'bank',fields:[{...field,extra:'unexpected'}]},{category:'unsupported',purpose:'unsupported',fields:[field]},['bank'],{category:'bank',purpose:'bank',fields:[[]]}])assert.equal((await handleLiveUpload(request(),dependencies(provider(output)))).status,502);});
test('Unicode minus and accounting prefixes cannot certify unsigned value fragments',async()=>{const {quoteContainsValue}=await import('../lib/investor-onboarding/value-checks.ts');for(const quote of ['Commitment −$1,000,000','Commitment −USD 1,000,000','Commitment (USD $ 1,000,000)'])assert.equal(quoteContainsValue(quote,'1,000,000'),false,quote);assert.equal(quoteContainsValue('Commitment −$1,000,000','−$1,000,000'),true);});

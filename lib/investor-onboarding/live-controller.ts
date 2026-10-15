import type {LiveCaseState,LiveCaseAction,LiveDocument,LiveResult} from './live-types.ts';
type Dependencies={getState:()=>LiveCaseState;dispatch:(action:LiveCaseAction)=>void;notice:(message:string)=>void;fetchImpl?:typeof fetch;createURL?:(file:File)=>string;revokeURL?:(url:string)=>void;makeId?:()=>string};
export function createLiveUploadController(dependencies:Dependencies) {
 const entries=new Map<string,{file:File;document:LiveDocument;abort:AbortController;attempt:number}>();let epoch=0;
 const revoke=dependencies.revokeURL??(url=>URL.revokeObjectURL(url));
 const at=()=>new Date().toISOString();
 async function process(id:string){const entry=entries.get(id);if(!entry)return;const attempt=++entry.attempt,context=epoch,abort=entry.abort;const application={...dependencies.getState().application};
  const current=()=>entries.get(id)===entry&&entry.attempt===attempt&&epoch===context&&!abort.signal.aborted;
  const form=new FormData();form.set('file',entry.file);form.set('scenarioId',application.scenarioId);form.set('application',JSON.stringify(application));
  try{const response=await(dependencies.fetchImpl??fetch)('/api/investor-onboarding/process',{method:'POST',body:form,signal:abort.signal});const result=await response.json();if(!current())return;if(!response.ok)throw new Error(result.error||'AI processing could not finish. Retry this PDF.');dependencies.dispatch({type:'complete',id,result:{...result,requestApplication:application} as LiveResult,at:at()});}
  catch(error){if(current())dependencies.dispatch({type:'error',id,error:error instanceof Error?error.message:'Upload failed. Try again.',at:at()});}
 }
 function upload(files:File[],replacementId?:string){dependencies.notice('');if(files.length!==1){dependencies.notice('Choose one dummy PDF at a time.');return;}const file=files[0];
  if(!file.name.toLowerCase().endsWith('.pdf')||file.size===0||file.size>2*1024*1024){dependencies.notice('Choose a non-empty dummy PDF, up to 2 MB.');return;}
  if(entries.size>=12){dependencies.notice('Remove a PDF before adding another. 12 retained files per browser session.');return;}
  const state=dependencies.getState(),original=replacementId?state.documents.find(d=>d.id===replacementId):undefined;
  if(replacementId&&!original){dependencies.notice('The original document is no longer available.');return;}
  const id=(dependencies.makeId??(()=>crypto.randomUUID()))(),url=(dependencies.createURL??(file=>URL.createObjectURL(file)))(file);
  const document:LiveDocument={id,logicalId:original?.logicalId??id,version:original?Math.max(...state.documents.filter(d=>d.logicalId===original.logicalId).map(d=>d.version))+1:1,replacesId:original?.id,filename:file.name,url,status:'processing',requestApplication:{...state.application}};
  entries.set(id,{file,document,abort:new AbortController(),attempt:0});dependencies.dispatch({type:'add',document,at:at()});void process(id);
 }
 function remove(id:string){const entry=entries.get(id);if(entry){entry.abort.abort();entries.delete(id);revoke(entry.document.url);}dependencies.dispatch({type:'remove',id,at:at()});}
 function retry(id:string){const entry=entries.get(id);if(!entry)return;entry.abort.abort();entry.abort=new AbortController();dependencies.dispatch({type:'retry',id,at:at()});void process(id);}
 function reset(){epoch++;for(const entry of entries.values()){entry.abort.abort();revoke(entry.document.url);}entries.clear();dependencies.notice('');}
 return {upload,remove,retry,reset};
}

import {extractText,getDocumentProxy} from 'unpdf';
const maxFileBytes=2*1024*1024, maxBodyBytes=maxFileBytes+16000;
export class UploadError extends Error { status: number; constructor(message: string, status=400){super(message);this.status=status;} }

// Best-effort admission per loaded module, separate from the shared provider
// budget. Slots cover parsing only, including parser cleanup on failure.
let activeParsers=0;
export async function withPdfParserAdmission<T>(parse:()=>Promise<T>):Promise<T> {
 if(activeParsers>=4)throw new UploadError('PDF processing is busy. Try again shortly.',429);
 activeParsers++;
 try{return await parse();}finally{activeParsers--;}
}

export async function boundedBody(request: Request,signal:AbortSignal=request.signal) {
 if(Number(request.headers.get('content-length'))>maxBodyBytes)throw new UploadError('Use a PDF smaller than 2 MB.',413);
 const reader=request.body?.getReader();if(!reader)throw new UploadError('Choose a dummy PDF.');
 const chunks:Uint8Array[]=[];let total=0;
 const abort=()=>{void reader.cancel().catch(()=>{});};signal.addEventListener('abort',abort,{once:true});
 try{signal.throwIfAborted();while(true){const {done,value}=await reader.read();signal.throwIfAborted();if(done)break;total+=value.byteLength;if(total>maxBodyBytes){await reader.cancel();throw new UploadError('Use a PDF smaller than 2 MB.',413);}chunks.push(value);}}finally{signal.removeEventListener('abort',abort);reader.releaseLock();}
 return Buffer.concat(chunks);
}

export async function parsePdf(pdfBytes:Uint8Array,signal?:AbortSignal){
 const operation=withPdfParserAdmission(async()=>{const pdf=await getDocumentProxy(pdfBytes.slice());
  const destroy=()=>{void pdf.loadingTask.destroy().catch(()=>{});};signal?.addEventListener('abort',destroy,{once:true});
  try{signal?.throwIfAborted();if(pdf.numPages>10)throw new UploadError('Use 10 pages or fewer.');const texts=(await extractText(pdf)).text;signal?.throwIfAborted();if(texts.join('').length>60000||texts.some(p=>!p.trim()))throw new UploadError('Scanned, empty or overlong text requires manual review. OCR is not implemented.');return {texts,pageCount:pdf.numPages};}
  finally{signal?.removeEventListener('abort',destroy);await pdf.loadingTask.destroy();}
 });
 if(!signal)return operation;
 let abort:()=>void=()=>{};
 const cancelled=new Promise<never>((_,reject)=>{abort=()=>reject(new UploadError('Processing cancelled or deadline reached.',408));signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();});
 // An in-flight parser keeps its admission slot until it actually settles,
 // even if the caller's deadline wins, preventing slot bypass on cancellation.
 try{return await Promise.race([operation,cancelled]);}finally{signal.removeEventListener('abort',abort);}
}

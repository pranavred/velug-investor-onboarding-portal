import {extractText,getDocumentProxy} from 'unpdf';
const maxFileBytes=2*1024*1024, maxBodyBytes=maxFileBytes+16000;
export class UploadError extends Error { status: number; constructor(message: string, status=400){super(message);this.status=status;} }
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
// Best-effort admission per loaded module, separate from the shared provider
// budget. Slots cover parsing only, including parser cleanup on failure.
let activeParsers=0;
export async function withPdfParserAdmission<T>(parse:()=>Promise<T>):Promise<T> {
 if(activeParsers>=4)throw new UploadError('PDF processing is busy. Try again shortly.',429);
 activeParsers++;
 try{return await parse();}finally{activeParsers--;}
}

export async function boundedBody(request: Request) {
 if(Number(request.headers.get('content-length'))>maxBodyBytes)throw new UploadError('Use a PDF smaller than 2 MB.',413);
 const reader=request.body?.getReader();if(!reader)throw new UploadError('Choose a dummy PDF.');
 const chunks:Uint8Array[]=[];let total=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;total+=value.byteLength;if(total>maxBodyBytes){await reader.cancel();throw new UploadError('Use a PDF smaller than 2 MB.',413);}chunks.push(value);}}finally{reader.releaseLock();}
 return Buffer.concat(chunks);
}

export async function parsePdf(pdfBytes:Uint8Array){return withPdfParserAdmission(async()=>{const pdf=await getDocumentProxy(pdfBytes.slice());try{if(pdf.numPages>10)throw new UploadError('Use 10 pages or fewer.');const texts=(await extractText(pdf)).text;if(texts.join('').length>60000||texts.some(p=>!p.trim()))throw new UploadError('Scanned, empty or overlong text requires manual review. OCR is not implemented.');return {texts,pageCount:pdf.numPages};}finally{await pdf.loadingTask.destroy();}});}

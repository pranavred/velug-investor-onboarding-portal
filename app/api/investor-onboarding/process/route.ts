import {processUpload} from '@/lib/server/process-upload';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){return processUpload(request);}

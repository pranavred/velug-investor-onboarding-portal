import {readServerConfig,getPublicCapabilities} from '@/lib/config/server';
export const dynamic='force-dynamic';
export async function GET(){return Response.json(getPublicCapabilities(readServerConfig(process.env)),{headers:{'Cache-Control':'no-store'}});}

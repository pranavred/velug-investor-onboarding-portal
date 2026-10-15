import {readServerConfig,getPublicCapabilities} from '@/lib/config/server';
export const dynamic='force-dynamic';
export async function GET(){const c=readServerConfig(process.env),p=getPublicCapabilities(c);return Response.json({ok:true,sampleMode:true,liveConfigured:p.liveUploads,reviewDraftsConfigured:p.reviewDrafts},{headers:{'Cache-Control':'no-store'}});}

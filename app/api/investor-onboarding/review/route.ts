import {handleReview} from '@/lib/server/review-route';
export const runtime='nodejs';export const maxDuration=40;
export async function POST(request:Request){return handleReview(request);}

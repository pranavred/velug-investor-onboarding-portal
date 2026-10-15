import {createHmac,randomBytes,timingSafeEqual,createHash} from 'node:crypto';
const name='onboarding_demo';
export function demoSession(request:Request,secret:string,secure:boolean,now=Date.now()){
 const sign=(value:string)=>createHmac('sha256',secret).update(value).digest('hex');
 const raw=request.headers.get('cookie')?.split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1)??'';
 const parts=raw.split('.'),value=parts.slice(0,2).join('.');
 const valid=parts.length===3&&/^[a-f0-9]{48}$/.test(parts[0])&&/^\d{13}$/.test(parts[1])&&Number(parts[1])<=now&&now-Number(parts[1])<86400000&&/^[a-f0-9]{64}$/.test(parts[2])&&timingSafeEqual(Buffer.from(parts[2]),Buffer.from(sign(value)));
 const token=valid?value:`${randomBytes(24).toString('hex')}.${now}`;
 return {hash:createHash('sha256').update(token).digest('hex'),cookie:valid?undefined:`${name}=${token}.${sign(token)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${secure?'; Secure':''}`};
}

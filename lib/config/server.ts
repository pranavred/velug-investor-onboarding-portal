export type ServerConfig={appName:string;appUrl:string;enabled:boolean;apiKey?:string;redisUrl?:string;sessionSecret?:string;classificationModel:string;extractionModel:string;reviewModel:string;reviewDrafts:boolean;namespace:string;globalLimit:number;sessionLimit:number;issues:string[]};
// quota 'injected' means the deployer supplies its own atomic reservation (for
// example a platform rate limiter) and no Redis instance is required.
export function readServerConfig(env:Record<string,string|undefined>,options:{quota?:'redis'|'injected'}={}):ServerConfig{
 const issues:string[]=[];
 const flag=(name:string)=>{if(env[name]&&!['true','false'].includes(env[name]!))issues.push(name);return env[name]==='true';};
 const positive=(name:string,fallback:number)=>{if(env[name]&&!/^\d+$/.test(env[name]!))issues.push(name);const n=Number(env[name]??fallback);if(!Number.isSafeInteger(n)||n<1||n>10000){issues.push(name);return fallback;}return n;};
 let appUrl=env.APP_URL||'http://localhost:3000';try{const url=new URL(appUrl);if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)throw Error();if(url.protocol!=='https:'&&!['localhost','127.0.0.1','[::1]'].includes(url.hostname))throw Error();appUrl=url.origin;}catch{issues.push('APP_URL');appUrl='http://localhost:3000';}
 if(env.NODE_ENV==='production'&&!env.APP_URL&&env.LIVE_AI_ENABLED==='true')issues.push('APP_URL');
 const enabled=flag('LIVE_AI_ENABLED'),reviewDrafts=flag('REVIEW_DRAFTS_ENABLED');
 const c:ServerConfig={appName:(env.APP_NAME||'Velug Investor Onboarding').slice(0,100),appUrl,enabled,apiKey:env.ANTHROPIC_API_KEY,redisUrl:env.REDIS_URL,sessionSecret:env.APP_SESSION_SECRET,classificationModel:env.ANTHROPIC_CLASSIFICATION_MODEL||'claude-opus-5-5',extractionModel:env.ANTHROPIC_EXTRACTION_MODEL||'claude-sonnet-5-5',reviewModel:env.ANTHROPIC_REVIEW_MODEL||'claude-opus-5-5',reviewDrafts,namespace:env.QUOTA_NAMESPACE||'velug-investor-onboarding',globalLimit:positive('GLOBAL_CALLS_PER_HOUR',20),sessionLimit:positive('SESSION_CALLS_PER_HOUR',5),issues};
 if(!/^[a-zA-Z0-9_-]{1,80}$/.test(c.namespace))issues.push('QUOTA_NAMESPACE');
 for(const [name,value]of [['ANTHROPIC_CLASSIFICATION_MODEL',c.classificationModel],['ANTHROPIC_EXTRACTION_MODEL',c.extractionModel],['ANTHROPIC_REVIEW_MODEL',c.reviewModel]])if(!/^claude-[a-z0-9][a-z0-9.-]{0,60}$/.test(value))issues.push(name);
 if(enabled){if(!c.apiKey?.trim())issues.push('ANTHROPIC_API_KEY');if(!c.sessionSecret||c.sessionSecret.length<32)issues.push('APP_SESSION_SECRET');if(options.quota!=='injected'){try{if(!c.redisUrl)throw Error();const u=new URL(c.redisUrl);if(!['redis:','rediss:'].includes(u.protocol))throw Error();}catch{issues.push('REDIS_URL');}}}
 return c;
}
export function getPublicCapabilities(c:ServerConfig){return {liveUploads:c.enabled&&c.issues.length===0,classification:!c.enabled?'disabled':c.issues.length?'unavailable':'available',reviewDrafts:c.enabled&&c.reviewDrafts&&c.issues.length===0,setupMessage:c.issues.length?`Configure server environment: ${[...new Set(c.issues)].join(', ')}.`:!c.enabled?'Live AI is off. Set LIVE_AI_ENABLED=true with your server environment to try fictional PDFs.':null};}
export function validateRequestOrigin(request:Request,appUrl:string){return request.headers.get('origin')===appUrl&&request.headers.get('sec-fetch-site')!=='cross-site';}

import test from 'node:test';import assert from 'node:assert/strict';
import {readServerConfig,getPublicCapabilities,validateRequestOrigin} from '../lib/config/server.ts';
test('missing configuration keeps sample working and disables live',()=>{const c=readServerConfig({});assert.equal(getPublicCapabilities(c).liveUploads,false);});
test('live configuration requires a server Anthropic key, Redis and signing secret',()=>{const c=readServerConfig({LIVE_AI_ENABLED:'true'});assert.equal(getPublicCapabilities(c).liveUploads,false);assert.ok(c.issues.includes('ANTHROPIC_API_KEY'));assert.ok(c.issues.includes('REDIS_URL'));assert.ok(c.issues.includes('APP_SESSION_SECRET'));});
test('default models are the current Claude generation',()=>{const c=readServerConfig({});assert.equal(c.classificationModel,'claude-opus-5-5');assert.equal(c.extractionModel,'claude-sonnet-5-5');assert.equal(c.reviewModel,'claude-opus-5-5');assert.deepEqual(c.issues,[]);});
test('non-Claude model identifiers fail closed by setting name',()=>{const c=readServerConfig({ANTHROPIC_CLASSIFICATION_MODEL:'gpt-6-luna',ANTHROPIC_EXTRACTION_MODEL:'gpt-5-2025-08-07',ANTHROPIC_REVIEW_MODEL:'claude opus'});for(const key of ['ANTHROPIC_CLASSIFICATION_MODEL','ANTHROPIC_EXTRACTION_MODEL','ANTHROPIC_REVIEW_MODEL'])assert.ok(c.issues.includes(key),key);assert.equal(readServerConfig({ANTHROPIC_EXTRACTION_MODEL:'claude-sonnet-5-5'}).issues.length,0);});
test('capabilities never serialize credentials',()=>{const c=readServerConfig({ANTHROPIC_API_KEY:'private-anthropic-sentinel',REDIS_URL:'redis://private-redis-sentinel',APP_SESSION_SECRET:'private-session-sentinel'});const text=JSON.stringify(getPublicCapabilities(c));for(const v of ['private-anthropic-sentinel','private-redis-sentinel','private-session-sentinel'])assert.ok(!text.includes(v));});
test('origin uses configured URL and ignores forged host headers',()=>{assert.equal(validateRequestOrigin(new Request('http://localhost:3000/api',{headers:{origin:'https://evil.example',host:'evil.example','x-forwarded-host':'evil.example'}}),'https://portal.example'),false);assert.equal(validateRequestOrigin(new Request('http://internal:3000/api',{headers:{origin:'https://portal.example'}}),'https://portal.example'),true);});
test('invalid settings fail closed with names only',()=>{const c=readServerConfig({LIVE_AI_ENABLED:'yes',APP_URL:'file:///tmp',GLOBAL_CALLS_PER_HOUR:'-1'});for(const key of ['LIVE_AI_ENABLED','APP_URL','GLOBAL_CALLS_PER_HOUR'])assert.ok(c.issues.includes(key));});
test('an injected quota backend removes the Redis requirement but nothing else',()=>{
 const base={LIVE_AI_ENABLED:'true',ANTHROPIC_API_KEY:'k',APP_SESSION_SECRET:'s'.repeat(32)};
 assert.ok(readServerConfig(base).issues.includes('REDIS_URL'));
 const injected=readServerConfig(base,{quota:'injected'});
 assert.deepEqual(injected.issues,[]);assert.equal(getPublicCapabilities(injected).liveUploads,true);
 assert.ok(readServerConfig({LIVE_AI_ENABLED:'true',APP_SESSION_SECRET:'s'.repeat(32)},{quota:'injected'}).issues.includes('ANTHROPIC_API_KEY'));
});

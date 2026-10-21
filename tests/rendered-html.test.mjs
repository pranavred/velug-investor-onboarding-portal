import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {setTimeout as delay} from 'node:timers/promises';

async function withPortal(name,check){
 const socket=createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));
 const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
 const origin=`http://127.0.0.1:${port}`;
 const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{env:{...process.env,APP_NAME:name,APP_URL:origin,LIVE_AI_ENABLED:'false',REVIEW_DRAFTS_ENABLED:'false',ANTHROPIC_API_KEY:'render-test-private-sentinel',APP_SESSION_SECRET:'render-test-session-sentinel-'.repeat(2),NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
 let log='';child.stdout.on('data',chunk=>{log+=chunk;});child.stderr.on('data',chunk=>{log+=chunk;});
 try{
  let ready=false;
  for(let attempt=0;attempt<100;attempt++){
   if(child.exitCode!==null)throw Error(`Portal exited before readiness: ${log}`);
   try{const response=await fetch(origin+'/api/health',{signal:AbortSignal.timeout(1000)});if(response.ok){ready=true;break;}}catch{/* Server is starting. */}
   await delay(100);
  }
  assert.ok(ready,`Portal did not start: ${log}`);
  const response=await fetch(origin,{signal:AbortSignal.timeout(10000)});
  assert.equal(response.status,200);await check(await response.text());
 }finally{
  if(child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>child.once('exit',resolve));}
 }
}

test('runtime application name changes header and title without rebuilding',async()=>{
 for(const name of ['Acme Investor Services','Cedar Review Workspace'])await withPortal(name,html=>{
  assert.ok(html.includes(`<title>${name}</title>`),'runtime application name in title');
  const header=html.match(/<header\b[^>]*class="product-header"[^>]*>([\s\S]*?)<\/header>/)?.[1];
  assert.ok(header?.includes(name),'runtime application name in header');
  for(const secret of ['render-test-private-sentinel','render-test-session-sentinel-'])assert.ok(!html.includes(secret),'runtime secret absent');
 });
});

test('default page offers sample intake but disables unavailable live file selection',async()=>{
 await withPortal('Velug Investor Onboarding',html=>{
  for(const label of ['Investor portal','Fund admin','Sample investor files','Demo tour','View on GitHub'])assert.ok(html.includes(label),label);
  const buttons=[...html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)];
  const live=buttons.find(([, ,body])=>body.includes('Upload dummy PDF'));
  const sample=buttons.find(([, ,body])=>body.includes('Upload sample package'));
  assert.ok(live,'live upload action remains discoverable');
  assert.match(live[1],/\bdisabled(?:="")?(?:\s|$)/,'unavailable live chooser is disabled');
  assert.ok(sample&&!/\bdisabled/.test(sample[1]),'sample package intake remains available');
  assert.ok(html.includes('ob-live-upload-help'),'intake has local live availability guidance');
 });
});

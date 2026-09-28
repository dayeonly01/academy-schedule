import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {once} from 'node:events';

test('family API protects data, persists schedules, rejects conflicts and handles missing AI key',async()=>{
  const external=process.env.TEST_EXTERNAL_ORIGIN;
  const dir=await mkdtemp(path.join(tmpdir(),'moa-test-'));const origin=external || 'http://127.0.0.1:3197';
  const env={...process.env,PORT:'3197',HOST:'127.0.0.1',APP_ORIGIN:origin,FAMILY_PASSWORD:'test-family-password-123',DATA_DIR:dir,OPENAI_API_KEY:'',VAPID_PUBLIC_KEY:'',VAPID_PRIVATE_KEY:''};
  let child;
  async function start(){if(external)return;child=spawn(process.execPath,['server.mjs'],{env,stdio:['ignore','pipe','pipe']});await Promise.race([once(child.stdout,'data'),new Promise((_,reject)=>setTimeout(()=>reject(new Error('server timeout')),10000).unref())]);}
  async function stop(){if(child && child.exitCode===null){const ended=once(child,'exit');child.kill();await ended;}}
  let cookie='';async function call(url,method='GET',body){const r=await fetch(origin+url,{method,headers:{Origin:origin,'Content-Type':'application/json',Cookie:cookie},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),headers:r.headers};}
  try{
    await start();assert.equal((await call('/api/state')).status,401);
    const login=await call('/api/login','POST',{password:process.env.TEST_PASSWORD || env.FAMILY_PASSWORD});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
    const created=await call('/api/events','POST',{title:'수학',date:'2026-09-28',start:960,end:1020,repeat:true,remind:true,color:'blue'});assert.equal(created.status,201);
    const e=created.data;assert.equal((await call('/api/tasks','POST',{eventId:e.id,date:'2026-09-29',items:[{kind:'숙제',text:'잘못된 날짜'}]})).status,400);
    const added=await call('/api/tasks','POST',{eventId:e.id,date:'2026-10-05',items:[{kind:'준비물',text:'교재'}]});assert.equal(added.status,201);
    assert.equal((await call(`/api/events/${e.id}`,'PUT',{...e,date:'2026-09-29'})).status,200);
    assert.equal((await call(`/api/events/${e.id}`,'PUT',e)).status,409);
    let state=(await call('/api/state')).data;assert.equal(state.tasks[0].date,'2026-10-06');
    const photo=await call('/api/photos','POST',{image:'data:image/png;base64,iVBORw0KGgo='});assert.equal(photo.status,200);assert.equal(photo.data.auto,false);assert.match(photo.data.reason,/API/);
    const csrf=await fetch(origin+'/api/events',{method:'POST',headers:{Cookie:cookie,'Content-Type':'application/json'},body:JSON.stringify(e)});assert.equal(csrf.status,403);
    await stop();await start();state=(await call('/api/state')).data;assert.equal(state.events[0].title,'수학');assert.equal(state.tasks.length,1);
    await call(`/api/events/${e.id}`,'DELETE');assert.equal((await call('/api/state')).data.tasks.length,0);
  }finally{await stop();await rm(dir,{recursive:true,force:true});}
});

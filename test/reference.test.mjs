import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { importReferenceSchedule, referenceSchedule } from '../reference-schedule.mjs';
import { validateEvent, dueNotifications, atKST } from '../schedule.mjs';

test('all seven reference classes preserve exact minutes and accepted colors',()=>{
  assert.equal(referenceSchedule.length,7);
  for(const event of referenceSchedule)assert.equal(validateEvent(event).color,event.color);
  assert.equal(referenceSchedule[0].end,19*60+12);
  assert.equal(referenceSchedule[1].end,19*60+17);
  assert.equal(referenceSchedule[1].place,'reading/\ngrammer');
  assert.equal(dueNotifications(referenceSchedule.map((e,i)=>({...e,id:String(i)})),[],atKST('2026-09-28',17*60+35)).length,1);
});
test('import is additive and does not recreate deleted classes on restart',()=>{
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE events(id TEXT PRIMARY KEY,json TEXT,version INTEGER DEFAULT 1)');
  db.prepare('INSERT INTO events(id,json) VALUES(?,?)').run('existing',JSON.stringify({...referenceSchedule[0],title:'기존 수업'}));
  assert.equal(importReferenceSchedule(db),7);
  assert.equal(db.prepare('SELECT count(*) AS n FROM events').get().n,8);
  const one=db.prepare("SELECT id FROM events WHERE id!='existing' LIMIT 1").get();
  db.prepare('DELETE FROM events WHERE id=?').run(one.id);
  assert.equal(importReferenceSchedule(db),0);
  assert.equal(db.prepare('SELECT count(*) AS n FROM events').get().n,7);
  assert.ok(db.prepare("SELECT 1 FROM events WHERE id='existing'").get());
  db.close();
});
test('an existing matching weekly class is not duplicated',()=>{
  const db=new DatabaseSync(':memory:');
  db.exec('CREATE TABLE events(id TEXT PRIMARY KEY,json TEXT,version INTEGER DEFAULT 1)');
  db.prepare('INSERT INTO events(id,json) VALUES(?,?)').run('existing',JSON.stringify(referenceSchedule[0]));
  assert.equal(importReferenceSchedule(db),6);db.close();
});

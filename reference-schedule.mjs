import { randomUUID } from 'node:crypto';

// The user's reference, in Korean local time. Keep the unusual 19:12 / 19:17 endings.
export const referenceSchedule = [
  {title:'아테네 농구', date:'2026-09-28', start:1065, end:1152, color:'green', place:''},
  {title:'아이오어학원', date:'2026-09-29', start:945, end:1157, color:'yellow', place:'reading/\ngrammer'},
  {title:'유노점프줄넘기', date:'2026-09-30', start:800, end:900, color:'blue', place:''},
  {title:'목동청소년센터', date:'2026-09-30', start:960, end:1010, color:'green', place:'기타'},
  {title:'방과후 배드민턴', date:'2026-10-01', start:860, end:900, color:'green', place:''},
  {title:'아이오어학원', date:'2026-10-01', start:945, end:1157, color:'yellow', place:'fiction/\nwriting'},
  {title:'유노점프줄넘기', date:'2026-10-02', start:800, end:900, color:'blue', place:''},
].map(e=>({...e,repeat:true,until:'',remind:true}));

export function importReferenceSchedule(db) {
  db.exec('CREATE TABLE IF NOT EXISTS app_migrations (name TEXT PRIMARY KEY)');
  db.exec('BEGIN IMMEDIATE');
  try {
    if (db.prepare('SELECT 1 FROM app_migrations WHERE name=?').get('reference-timetable-v1')) {
      db.exec('COMMIT');return 0;
    }
    const existing=db.prepare('SELECT json FROM events').all().map(row=>JSON.parse(row.json));
    let added=0;
    for(const e of referenceSchedule) {
      // Never overwrite existing classes or their linked homework.
      const matches=existing.some(old=>old.title===e.title && old.start===e.start && old.end===e.end && old.repeat && !old.until && new Date(old.date).getUTCDay()===new Date(e.date).getUTCDay());
      if(!matches){db.prepare('INSERT INTO events(id,json) VALUES(?,?)').run(randomUUID(),JSON.stringify(e));added++;}
    }
    db.prepare('INSERT INTO app_migrations(name) VALUES(?)').run('reference-timetable-v1');
    db.exec('COMMIT');return added;
  } catch(error) { db.exec('ROLLBACK');throw error; }
}

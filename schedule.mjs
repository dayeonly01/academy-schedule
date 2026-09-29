export const DAY = 86400000;
export function dateKey(ms) { return new Date(ms + 9 * 3600000).toISOString().slice(0, 10); }
export function validDate(s) { return /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0,10) === s; }
export function atKST(date, minutes) { return Date.parse(`${date}T00:00:00+09:00`) + minutes * 60000; }
export function occurs(event, date) {
  return date >= event.date && (!event.until || date <= event.until) && (event.repeat ? (Date.parse(date) - Date.parse(event.date)) % (7 * DAY) === 0 : date === event.date);
}
export function dueNotifications(events, tasks, now) {
  const notices = [];
  for (const event of events) {
    for (const offset of [0, 1]) {
      const date = dateKey(now + offset * DAY);
      if (!occurs(event, date)) continue;
      const start = atKST(date, event.start);
      const due = start - 600000;
      if (event.remind && due <= now && now < due + 300000) notices.push({ key: `${event.id}:${date}:${event.start}:class`, title: `${event.title} · 10분 전`, body: `${String(Math.floor(event.start/60)).padStart(2,'0')}:${String(event.start%60).padStart(2,'0')} 수업이 시작돼요. ${event.place || ''}`, eventId: event.id });
      for (const task of tasks.filter(t => t.eventId === event.id && t.date === date && !t.done)) {
        const prepDue = atKST(date, 20 * 60) - DAY;
        if (prepDue <= now && now < prepDue + 300000) notices.push({ key: `${task.id}:${date}:prep`, title: `내일 ${event.title} 준비`, body: task.text, eventId: event.id });
      }
    }
  }
  return notices;
}
export function validateEvent(value) {
  if (!value || typeof value.title !== 'string' || !value.title.trim() || value.title.length > 80) throw new Error('수업 이름은 1~80자로 입력해 주세요.');
  if (!validDate(value.date) || (value.until && (!validDate(value.until) || value.until < value.date))) throw new Error('날짜를 확인해 주세요.');
  if (!Number.isInteger(value.start) || !Number.isInteger(value.end) || value.start < 0 || value.end > 1440 || value.end <= value.start) throw new Error('시작·종료 시간을 확인해 주세요.');
  return { title: value.title.trim(), date:value.date, start:value.start, end:value.end, repeat:!!value.repeat, until:value.until || '', remind:!!value.remind, place:String(value.place || '').slice(0,120), color:['blue','yellow','orange','green','pink','purple'].includes(value.color) ? value.color : 'blue' };
}

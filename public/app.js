const $=s=>document.querySelector(s);
const days=['월','화','수','목','금','토','일'];
const DAY=86400000;
let state={events:[],tasks:[]},week=monday(today()),photoId=null,drag=null,busy=false;
function today(){return new Date(Date.now()+9*3600000).toISOString().slice(0,10);}
function plus(date,n){return new Date(Date.parse(date)+n*DAY).toISOString().slice(0,10);}
function monday(date){return plus(date,-((new Date(date).getUTCDay()+6)%7));}
function time(m){return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
function minutes(s){const [h,m]=s.split(':').map(Number);return h*60+m;}
function occurs(e,d){return d>=e.date && (!e.until || d<=e.until) && (e.repeat ? (e.repeatDays?.length ? e.repeatDays : [new Date(e.date).getUTCDay()]).includes(new Date(d).getUTCDay()) : d===e.date);}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function toast(message){$('#toast').textContent=message;$('#toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('#toast').hidden=true,5500);}
async function api(url,options={}){
  const res=await fetch(url,{...options,headers:{'Content-Type':'application/json',...options.headers}});
  const result=await res.json();if(!res.ok){if(res.status===401){$('#app').hidden=true;$('#login').hidden=false;}throw new Error(result.error || '요청에 실패했어요.');}return result;
}
async function load(){state=await api('/api/state');$('#login').hidden=true;$('#app').hidden=false;render();$('#syncState').textContent=`마지막 동기화 ${new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})}`;}
async function run(action){try{await action();}catch(e){toast(e.message);}}
$('#loginForm').onsubmit=async e=>{e.preventDefault();const btn=e.target.querySelector('button');btn.disabled=true;try{await api('/api/login',{method:'POST',body:JSON.stringify({password:e.target.password.value})});e.target.reset();await load();}catch(err){$('#loginError').textContent=err.message;}finally{btn.disabled=false;}};
$('#logout').onclick=()=>run(async()=>{await api('/api/logout',{method:'POST'});state={events:[],tasks:[]};$('#app').hidden=true;$('#login').hidden=false;});

function referenceTime(m){return (m<720?'오전 ':'')+String(Math.floor(m/60)%12 || 12)+':'+String(m%60).padStart(2,'0');}
function renderTable(){
  const weekend=[5,6].some(i=>state.events.some(e=>occurs(e,plus(week,i))));
  const total=weekend?7:5;
  const lists=Array.from({length:total},(_,i)=>state.events.filter(e=>occurs(e,plus(week,i))).sort((a,b)=>a.start-b.start));
  const earlyRows=Math.max(1,...lists.map(list=>list.filter(e=>e.start<930).length));
  const card=(e,date)=>{
    const n=state.tasks.filter(t=>t.eventId===e.id && t.date===date && !t.done).length;
    return '<div class="event '+e.color+'" data-id="'+e.id+'" data-date="'+date+'"><button class="move-handle" aria-label="'+esc(e.title)+' 시간 이동, 위아래 방향키로 1분 조절">↕ 이동</button><button class="event-content" aria-label="'+esc(e.title)+' 상세 보기"><strong class="table-time">'+referenceTime(e.start)+'–'+referenceTime(e.end)+'</strong><span class="table-title">'+esc(e.title)+'</span>'+(e.place?'<span class="table-note">'+esc(e.place)+'</span>':'')+(n?'<small class="table-task-count">준비할 것 '+n+'개</small>':'')+'</button><button class="resize-handle" aria-label="'+esc(e.title)+' 종료 시간, 위아래 방향키로 1분 조절">━</button></div>';
  };
  let html='<div class="reference-board" style="--days:'+total+';--early-rows:'+earlyRows+'" role="group" aria-label="주간 수업 시간표">';
  for(let i=0;i<total;i++)html+='<div class="board-day">'+days[i]+'</div>';
  for(let i=0;i<total;i++){
    const date=plus(week,i),list=lists[i];
    html+='<div class="board-column" data-date="'+date+'"><div class="board-early">'+list.filter(e=>e.start<930).map(e=>card(e,date)).join('')+'</div><div class="board-late">'+list.filter(e=>e.start>=930).map(e=>card(e,date)).join('')+'</div></div>';
  }
  return html+'</div>';
}


function render(){
  const end=plus(week,6);$('#weekTitle').textContent=`${week.slice(0,4)}. ${Number(week.slice(5,7))}.${Number(week.slice(8))} – ${Number(end.slice(5,7))}.${Number(end.slice(8))}`;
  const count=Array.from({length:7},(_,i)=>state.events.filter(e=>occurs(e,plus(week,i))).length).reduce((a,b)=>a+b,0);
  $('.calendar-card').classList.add('table-mode');
  $('#viewHint').textContent='위 손잡이는 시간 이동, 아래 손잡이는 종료 시간 조절 · 1분 단위 · 수업을 누르면 직접 입력';
  $('#calendar').innerHTML=renderTable();$('#count').innerHTML=`${count}<span>개의 수업</span>`;
  const items=state.tasks.filter(t=>t.date>=week && t.date<=end).sort((a,b)=>Number(a.done)-Number(b.done)||a.date.localeCompare(b.date));
  $('#taskCount').textContent=items.filter(t=>!t.done).length;
  $('#taskList').innerHTML=items.length?items.map(t=>{const e=state.events.find(e=>e.id===t.eventId);return `<div class="task-item ${t.done?'done':''}"><input type="checkbox" data-task="${t.id}" ${t.done?'checked':''} aria-label="${esc(t.text)} 완료"><div><small>${Number(t.date.slice(5,7))}/${Number(t.date.slice(8))} · ${esc(e?.title || '')} · ${t.kind}</small><p>${esc(t.text)}</p>${t.photoId?`<a href="/api/photos/${t.photoId}" target="_blank" rel="noopener">원본 사진</a> `:''}<button class="quiet" data-delete-task="${t.id}">삭제</button></div></div>`;}).join(''):'<p class="empty">아직 챙길 항목이 없어요.<br>사진이나 메모로 추가해 보세요.</p>';
  $('#calendar').querySelectorAll('.event-content').forEach(b=>b.onclick=()=>editEvent(b.parentElement.dataset.id,b.parentElement.dataset.date));
  $('#calendar').querySelectorAll('.move-handle,.resize-handle').forEach(b=>{b.onpointerdown=startDrag;b.onkeydown=keyboardMove;});
  $('#taskList').querySelectorAll('[data-task]').forEach(c=>c.onchange=()=>run(async()=>{await api(`/api/tasks/${c.dataset.task}`,{method:'PATCH',body:JSON.stringify({done:c.checked})});await load();}));
  $('#taskList').querySelectorAll('[data-delete-task]').forEach(b=>b.onclick=()=>run(async()=>{if(!confirm('이 항목을 삭제할까요?'))return;await api(`/api/tasks/${b.dataset.deleteTask}`,{method:'DELETE'});await load();}));
}
function editEvent(id,date=today(),start=15*60){
  const f=$('#eventForm');f.reset();const e=state.events.find(e=>e.id===id);
  const v=e || {id:'',version:'',title:'',date,start:Math.min(start,1410),end:Math.min(start+60,1440),repeat:true,remind:true,color:'blue',place:'',until:''};
  for(const name of ['id','version','title','date','color','place','until'])f.elements[name].value=v[name];
  f.elements.start.value=time(v.start);f.elements.end.value=v.end===1440?'00:00':time(v.end);f.elements.repeat.checked=v.repeat;f.elements.remind.checked=v.remind;
  const selected=v.repeatDays?.length?v.repeatDays:[new Date(v.date).getUTCDay()];
  f.querySelectorAll('[name="repeatDays"]').forEach(c=>c.checked=selected.includes(Number(c.value)));
  $('#repeatDaysBox').hidden=!v.repeat;
  $('#eventHeading').textContent=e?'수업 수정':'수업 추가';$('#deleteEvent').hidden=!e;
  const ts=state.tasks.filter(t=>t.eventId===id && t.date===date);$('#eventTasks').innerHTML=ts.length?'<h3>이날 챙길 것</h3>'+ts.map(t=>`<p class="muted">${t.done?'✓':'□'} ${esc(t.text)}</p>`).join(''):'';
  $('#eventDialog').showModal();
}
$('#eventForm').onsubmit=e=>{e.preventDefault();run(async()=>{const f=e.target,v=Object.fromEntries(new FormData(f));v.start=minutes(v.start);v.end=minutes(v.end) || 1440;v.repeat=f.elements.repeat.checked;v.repeatDays=[...f.querySelectorAll('[name="repeatDays"]:checked')].map(c=>Number(c.value));if(v.repeat && !v.repeatDays.length)throw new Error('반복 요일을 하나 이상 선택해 주세요.');v.remind=f.elements.remind.checked;v.version=Number(v.version);if(v.end<=v.start)throw new Error('종료 시간을 시작 시간 이후로 설정해 주세요.');await api(v.id?`/api/events/${v.id}`:'/api/events',{method:v.id?'PUT':'POST',body:JSON.stringify(v)});$('#eventDialog').close();await load();toast('시간표에 저장했어요.');});};
$('#deleteEvent').onclick=()=>run(async()=>{if(!confirm('반복 일정과 연결된 준비물·숙제도 함께 삭제됩니다. 삭제할까요?'))return;await api(`/api/events/${$('#eventForm').elements.id.value}`,{method:'DELETE'});$('#eventDialog').close();await load();});
$('#newEvent').onclick=()=>editEvent(null);
$('#prev').onclick=()=>{week=plus(week,-7);render();};$('#next').onclick=()=>{week=plus(week,7);render();};$('#today').onclick=()=>{week=monday(today());render();};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
function positionAfterDrag(event,delta,deltaDay,resize){
  const v={...event};
  if(resize)v.end=Math.max(v.start+1,Math.min(1440,v.end+delta));
  else {
    const duration=v.end-v.start;v.start=Math.max(0,Math.min(1440-duration,v.start+delta));v.end=v.start+duration;
    // Multi-day schedules share one time. Edit their weekdays explicitly in the form.
    if((v.repeatDays?.length || 1)>1)deltaDay=0;
    v.date=plus(v.date,deltaDay);if(v.until)v.until=plus(v.until,deltaDay);
    if(v.repeatDays?.length)v.repeatDays=v.repeatDays.map(day=>(day+deltaDay+7)%7);
  }
  return v;
}
function startDrag(e){
  if(e.button!==0)return;e.preventDefault();
  const el=e.target.closest('.event'),event=state.events.find(x=>x.id===el.dataset.id);
  drag={el,event,date:el.dataset.date,startX:e.clientX,startY:e.clientY,height:el.getBoundingClientRect().height,resize:e.target.classList.contains('resize-handle'),moved:false};
  el.classList.add('dragging');e.target.setPointerCapture(e.pointerId);
  e.target.onpointermove=moveDrag;e.target.onpointerup=endDrag;e.target.onpointercancel=()=>{drag=null;render();};
}
function moveDrag(e){
  if(!drag)return;
  const dy=e.clientY-drag.startY; // Three screen pixels per minute, independent of the compact card height.
  const cols=[...document.querySelectorAll('.board-column')];
  const col=cols.find(c=>e.clientX>=c.getBoundingClientRect().left && e.clientX<c.getBoundingClientRect().right);
  drag.deltaDay=col && !drag.resize && (drag.event.repeatDays?.length || 1)===1 ? (Date.parse(col.dataset.date)-Date.parse(drag.date))/DAY : 0;
  drag.delta=Math.round(dy/3);drag.moved=drag.delta!==0 || drag.deltaDay!==0;
  const v=positionAfterDrag(drag.event,drag.delta,drag.deltaDay,drag.resize);
  drag.el.querySelector('.table-time').textContent=referenceTime(v.start)+'–'+referenceTime(v.end);
  if(drag.resize)drag.el.style.height=Math.max(100,drag.height+(v.end-drag.event.end)*3)+'px';
  else drag.el.style.transform='translate('+drag.deltaDay*cols[0].getBoundingClientRect().width+'px,'+(v.start-drag.event.start)*3+'px)';
}
async function updatePosition(event,delta,deltaDay,resize){
  const v=positionAfterDrag(event,delta,deltaDay,resize);
  await api('/api/events/'+v.id,{method:'PUT',body:JSON.stringify(v)});await load();
  toast((resize?'종료 시간 변경: ':'수업 시간 변경: ')+time(v.start)+'–'+time(v.end));
}
function endDrag(){if(!drag)return;const d=drag;drag=null;if(!d.moved){render();return;}run(async()=>{try{await updatePosition(d.event,d.delta || 0,d.deltaDay || 0,d.resize);}catch(e){render();throw e;}});}
function keyboardMove(e){
  if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();
  const event=state.events.find(x=>x.id===e.target.closest('.event').dataset.id),resize=e.target.classList.contains('resize-handle');
  run(()=>updatePosition(event,e.key==='ArrowUp'?-1:e.key==='ArrowDown'?1:0,resize?0:e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0,resize));
}
$('#eventForm').elements.repeat.onchange=e=>$('#repeatDaysBox').hidden=!e.target.checked;
$('#eventForm').elements.date.onchange=e=>{
  const selected=[...$('#eventForm').querySelectorAll('[name="repeatDays"]:checked')];
  if(selected.length<=1)$('#eventForm').querySelectorAll('[name="repeatDays"]').forEach(c=>c.checked=Number(c.value)===new Date(e.target.value).getUTCDay());
};
function openTasks(){
  if(!state.events.length){toast('먼저 수업을 하나 추가해 주세요.');return;}
  photoId=null;$('#taskForm').reset();$('#analysisStatus').textContent='';$('#photoPreview').hidden=true;
  $('#taskForm').elements.eventId.innerHTML=state.events.map(e=>`<option value="${e.id}">${esc(e.title)}</option>`).join('');setNextTaskDate();$('#taskDialog').showModal();
}
function setNextTaskDate(){const e=state.events.find(e=>e.id===$('#taskForm').elements.eventId.value);let date=e.date;if(e.repeat){if(date<today())date=today();for(let i=0;i<7 && !occurs(e,date);i++)date=plus(date,1);}$('#taskForm').elements.date.value=date;}
$('#taskForm').elements.eventId.onchange=setNextTaskDate;$('#manualTask').onclick=openTasks;$('#photoButton').onclick=openTasks;
$('#photoInput').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;if(file.size>6*1024*1024){toast('사진은 6MB 이하로 올려 주세요.');return;}
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){toast('JPG, PNG, WebP 사진을 선택해 주세요.');return;}
  busy=true;photoId=null;$('#analysisStatus').textContent='사진에서 숙제와 준비물을 읽고 있어요…';const buttons=[...$('#taskDialog').querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);$('#photoInput').disabled=true;
  try{
    const image=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(file);});$('#photoPreview').src=image;$('#photoPreview').hidden=false;
    const r=await api('/api/photos',{method:'POST',body:JSON.stringify({image})});photoId=r.photoId;
    if(r.auto){$('#taskDialog').close();week=monday(r.date);await load();toast(`${r.items.length}개 항목을 관련 수업에 자동으로 넣었어요. 내용을 확인해 주세요.`);return;}
    $('#analysisStatus').textContent=r.reason || '관련 수업과 날짜를 확인해 주세요.';
    if(state.events.some(e=>e.id===r.eventId))$('#taskForm').elements.eventId.value=r.eventId;
    if(r.date)$('#taskForm').elements.date.value=r.date;
    $('#taskForm').elements.text.value=(r.items || []).map(i=>`${i.kind}: ${i.text}`).join('\n');
  }catch(err){$('#analysisStatus').textContent=err.message;}finally{busy=false;buttons.forEach(b=>b.disabled=false);$('#photoInput').disabled=false;}
};
$('#taskDialog').addEventListener('cancel',e=>{if(busy)e.preventDefault();});
$('#taskForm').onsubmit=e=>{e.preventDefault();run(async()=>{if(busy)return;const f=e.target;const items=f.elements.text.value.split('\n').filter(s=>s.trim()).map(s=>({kind:/^준비물\s*[:：]/.test(s)?'준비물':'숙제',text:s.replace(/^(준비물|숙제)\s*[:：]\s*/,'').trim()}));await api('/api/tasks',{method:'POST',body:JSON.stringify({eventId:f.elements.eventId.value,date:f.elements.date.value,items,photoId})});$('#taskDialog').close();week=monday(f.elements.date.value);await load();toast('준비할 것을 저장했어요.');});};
let registration;
if('serviceWorker' in navigator)navigator.serviceWorker.register('/sw.js').then(r=>registration=r).catch(()=>{});
$('#notificationButton').onclick=()=>{$('#pushStatus').textContent=state.pushReady?'수업 10분 전 · 준비물은 전날 20:00':'서버의 VAPID 알림 키가 아직 설정되지 않았어요.';$('#notifyDialog').showModal();};
function decodeKey(s){const p='='.repeat((4-s.length%4)%4);return Uint8Array.from(atob((s+p).replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));}
$('#enablePush').onclick=()=>run(async()=>{
  if(!state.pushReady)throw new Error('서버의 VAPID 알림 키를 먼저 설정해 주세요.');
  if(!('Notification' in window) || !('PushManager' in window))throw new Error('아이폰이라면 홈 화면에 추가한 은상에서 열어 주세요. HTTPS 접속도 필요해요.');
  const permission=await Notification.requestPermission();if(permission!=='granted')throw new Error('휴대폰 설정에서 은상의 알림을 허용해 주세요.');
  registration=await navigator.serviceWorker.ready;const sub=await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:decodeKey(state.vapidPublicKey)});await api('/api/push',{method:'POST',body:JSON.stringify(sub)});$('#pushStatus').textContent='이 기기의 알림이 켜졌어요. 테스트 알림을 눌러 확인해 보세요.';
});
$('#testPush').onclick=()=>run(async()=>{if(!registration)throw new Error('먼저 알림을 켜 주세요.');const sub=await registration.pushManager.getSubscription();if(!sub)throw new Error('먼저 알림을 켜 주세요.');await api('/api/push/test',{method:'POST',body:JSON.stringify({endpoint:sub.endpoint})});toast('테스트 알림을 보냈어요.');});
$('#disablePush').onclick=()=>run(async()=>{const sub=await registration?.pushManager.getSubscription();if(sub){await api('/api/push',{method:'DELETE',body:JSON.stringify({endpoint:sub.endpoint})});await sub.unsubscribe();}$('#pushStatus').textContent='이 기기의 알림을 껐어요.';});
load().catch(()=>{});
setInterval(()=>{if(!document.hidden && !drag && !busy && !document.querySelector('dialog[open]') && !$('#app').hidden)load().catch(()=>$('#syncState').textContent='연결이 끊겼어요. 다시 연결하는 중…');},15000);

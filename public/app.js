const $=s=>document.querySelector(s);
const days=['월','화','수','목','금','토','일'];
const DAY=86400000;
let state={events:[],tasks:[]},week=monday(today()),photoId=null,drag=null,busy=false,view='table';
function today(){return new Date(Date.now()+9*3600000).toISOString().slice(0,10);}
function plus(date,n){return new Date(Date.parse(date)+n*DAY).toISOString().slice(0,10);}
function monday(date){return plus(date,-((new Date(date).getUTCDay()+6)%7));}
function time(m){return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
function minutes(s){const [h,m]=s.split(':').map(Number);return h*60+m;}
function occurs(e,d){return d>=e.date && (!e.until || d<=e.until) && (e.repeat ? (Date.parse(d)-Date.parse(e.date))%(7*DAY)===0 : d===e.date);}
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

function referenceTime(m){return String(Math.floor(m/60)%12 || 12)+':'+String(m%60).padStart(2,'0');}
function renderTable(){
  const weekend=[5,6].some(i=>state.events.some(e=>occurs(e,plus(week,i))));
  const total=weekend?7:5;
  const lists=Array.from({length:total},(_,i)=>state.events.filter(e=>occurs(e,plus(week,i))).sort((a,b)=>a.start-b.start));
  const earlyRows=Math.max(1,...lists.map(list=>list.filter(e=>e.start<930).length));
  const card=(e,date)=>{
    const n=state.tasks.filter(t=>t.eventId===e.id && t.date===date && !t.done).length;
    return '<div class="event '+e.color+'" data-id="'+e.id+'" data-date="'+date+'"><button class="event-content" aria-label="'+esc(e.title)+' 상세 보기"><strong class="table-time">'+referenceTime(e.start)+'–'+referenceTime(e.end)+'</strong><span class="table-title">'+esc(e.title)+'</span>'+(e.place?'<span class="table-note">'+esc(e.place)+'</span>':'')+(n?'<small class="table-task-count">준비할 것 '+n+'개</small>':'')+'</button></div>';
  };
  let html='<div class="reference-board" style="--days:'+total+';--early-rows:'+earlyRows+'" role="group" aria-label="주간 수업 시간표">';
  for(let i=0;i<total;i++)html+='<div class="board-day">'+days[i]+'</div>';
  for(let i=0;i<total;i++){
    const date=plus(week,i),list=lists[i];
    html+='<div class="board-column"><div class="board-early">'+list.filter(e=>e.start<930).map(e=>card(e,date)).join('')+'</div><div class="board-late">'+list.filter(e=>e.start>=930).map(e=>card(e,date)).join('')+'</div></div>';
  }
  return html+'</div>';
}
$('#tableView').onclick=()=>{view='table';render();};
$('#timelineView').onclick=()=>{view='timeline';render();};

function render(){
  const end=plus(week,6);$('#weekTitle').textContent=`${week.slice(0,4)}. ${Number(week.slice(5,7))}.${Number(week.slice(8))} – ${Number(end.slice(5,7))}.${Number(end.slice(8))}`;
  const visible=state.events.filter(e=>Array.from({length:7},(_,i)=>plus(week,i)).some(d=>occurs(e,d)));
  const first=Math.min(9*60,...visible.map(e=>Math.floor(e.start/60)*60));
  const last=Math.max(21*60,...visible.map(e=>Math.ceil(e.end/60)*60));
  const height=last-first;let count=0;
  let html='<div class="grid-head"><div></div>';
  for(let i=0;i<7;i++){const d=plus(week,i);html+=`<div class="day-label ${d===today()?'is-today':''}">${days[i]}<b>${Number(d.slice(8))}</b></div>`;}
  html+='</div><div class="week-grid"><div class="time-axis">';
  for(let t=first;t<last;t+=60)html+=`<span class="time-label" style="top:${t-first}px">${time(t)}</span>`;
  html+='</div>';
  for(let i=0;i<7;i++){
    const date=plus(week,i),list=state.events.filter(e=>occurs(e,date)).sort((a,b)=>a.start-b.start);
    // Allocate overlapping events into connected groups with stable lanes.
    const groups=[];for(const e of list){let g=groups.at(-1);if(!g || e.start>=g.end){g={end:e.end,items:[],lanes:[]};groups.push(g);}let lane=g.lanes.findIndex(end=>end<=e.start);if(lane<0)lane=g.lanes.length;g.lanes[lane]=e.end;g.end=Math.max(g.end,e.end);g.items.push({e,lane});}
    html+=`<div class="day-column ${date===today()?'today':''}" data-date="${date}" data-first="${first}" style="height:${height}px">`;
    for(const g of groups)for(const {e,lane} of g.items){count++;const n=state.tasks.filter(t=>t.eventId===e.id && t.date===date && !t.done).length;html+=`<div class="event ${e.color}" data-id="${e.id}" data-date="${date}" style="top:${e.start-first}px;height:${e.end-e.start}px;left:calc(${lane/g.lanes.length*100}% + 3px);width:calc(${100/g.lanes.length}% - 6px)"><button class="move-handle" aria-label="${esc(e.title)} 이동. 방향키로 시간과 요일 조정">⠿</button><button class="event-content" aria-label="${esc(e.title)} 상세 보기"><b>${esc(e.title)}</b><span>${time(e.start)} – ${time(e.end)}</span>${e.end-e.start>=70?`<div>${esc(e.place)}</div>`:''}${n && e.end-e.start>=90?`<div>준비할 것 ${n}개</div>`:''}</button><button class="resize-handle" aria-label="${esc(e.title)} 시간 늘리기. 위아래 방향키로 조정">━</button></div>`;}
    html+='</div>';
  }
  html+='</div>';
  $('.calendar-card').classList.toggle('table-mode',view==='table');
  $('#tableView').setAttribute('aria-pressed',String(view==='table'));
  $('#timelineView').setAttribute('aria-pressed',String(view==='timeline'));
  $('#viewHint').textContent=view==='table'?'모든 수업은 오후 시간입니다. 수업을 누르면 수정할 수 있어요.':'손잡이를 드래그해 이동하거나 길이를 조절하세요. 세부 시간은 수업을 눌러 1분 단위로 입력할 수 있어요.';
  $('#calendar').innerHTML=view==='table'?renderTable():html;$('#count').innerHTML=`${count}<span>개의 수업</span>`;
  const items=state.tasks.filter(t=>t.date>=week && t.date<=end).sort((a,b)=>Number(a.done)-Number(b.done)||a.date.localeCompare(b.date));
  $('#taskCount').textContent=items.filter(t=>!t.done).length;
  $('#taskList').innerHTML=items.length?items.map(t=>{const e=state.events.find(e=>e.id===t.eventId);return `<div class="task-item ${t.done?'done':''}"><input type="checkbox" data-task="${t.id}" ${t.done?'checked':''} aria-label="${esc(t.text)} 완료"><div><small>${Number(t.date.slice(5,7))}/${Number(t.date.slice(8))} · ${esc(e?.title || '')} · ${t.kind}</small><p>${esc(t.text)}</p>${t.photoId?`<a href="/api/photos/${t.photoId}" target="_blank" rel="noopener">원본 사진</a> `:''}<button class="quiet" data-delete-task="${t.id}">삭제</button></div></div>`;}).join(''):'<p class="empty">아직 챙길 항목이 없어요.<br>사진이나 메모로 추가해 보세요.</p>';
  $('#calendar').querySelectorAll('.event-content').forEach(b=>b.onclick=()=>editEvent(b.parentElement.dataset.id,b.parentElement.dataset.date));
  $('#calendar').querySelectorAll('.move-handle,.resize-handle').forEach(b=>{b.onpointerdown=startDrag;b.onkeydown=keyboardMove;});
  $('#calendar').querySelectorAll('.day-column').forEach(col=>col.ondblclick=e=>{if(e.target===col)editEvent(null,col.dataset.date,Math.floor((e.clientY-col.getBoundingClientRect().top+first)/15)*15);});
  $('#taskList').querySelectorAll('[data-task]').forEach(c=>c.onchange=()=>run(async()=>{await api(`/api/tasks/${c.dataset.task}`,{method:'PATCH',body:JSON.stringify({done:c.checked})});await load();}));
  $('#taskList').querySelectorAll('[data-delete-task]').forEach(b=>b.onclick=()=>run(async()=>{if(!confirm('이 항목을 삭제할까요?'))return;await api(`/api/tasks/${b.dataset.deleteTask}`,{method:'DELETE'});await load();}));
}
function editEvent(id,date=today(),start=15*60){
  const f=$('#eventForm');f.reset();const e=state.events.find(e=>e.id===id);
  const v=e || {id:'',version:'',title:'',date,start:Math.min(start,1410),end:Math.min(start+60,1440),repeat:true,remind:true,color:'blue',place:'',until:''};
  for(const name of ['id','version','title','date','color','place','until'])f.elements[name].value=v[name];
  f.elements.start.value=time(v.start);f.elements.end.value=v.end===1440?'00:00':time(v.end);f.elements.repeat.checked=v.repeat;f.elements.remind.checked=v.remind;
  $('#eventHeading').textContent=e?'수업 수정':'수업 추가';$('#deleteEvent').hidden=!e;
  const ts=state.tasks.filter(t=>t.eventId===id && t.date===date);$('#eventTasks').innerHTML=ts.length?'<h3>이날 챙길 것</h3>'+ts.map(t=>`<p class="muted">${t.done?'✓':'□'} ${esc(t.text)}</p>`).join(''):'';
  $('#eventDialog').showModal();
}
$('#eventForm').onsubmit=e=>{e.preventDefault();run(async()=>{const f=e.target,v=Object.fromEntries(new FormData(f));v.start=minutes(v.start);v.end=minutes(v.end) || 1440;v.repeat=f.elements.repeat.checked;v.remind=f.elements.remind.checked;v.version=Number(v.version);if(v.end<=v.start)throw new Error('종료 시간을 시작 시간 이후로 설정해 주세요.');await api(v.id?`/api/events/${v.id}`:'/api/events',{method:v.id?'PUT':'POST',body:JSON.stringify(v)});$('#eventDialog').close();await load();toast('시간표에 저장했어요.');});};
$('#deleteEvent').onclick=()=>run(async()=>{if(!confirm('반복 일정과 연결된 준비물·숙제도 함께 삭제됩니다. 삭제할까요?'))return;await api(`/api/events/${$('#eventForm').elements.id.value}`,{method:'DELETE'});$('#eventDialog').close();await load();});
$('#newEvent').onclick=()=>editEvent(null);
$('#prev').onclick=()=>{week=plus(week,-7);render();};$('#next').onclick=()=>{week=plus(week,7);render();};$('#today').onclick=()=>{week=monday(today());render();};
document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$('#'+b.dataset.close).close());
function startDrag(e){
  if(e.button!==0)return;e.preventDefault();const el=e.target.closest('.event'),event=state.events.find(x=>x.id===el.dataset.id);drag={el,event,date:el.dataset.date,startX:e.clientX,startY:e.clientY,resize:e.target.classList.contains('resize-handle'),moved:false};el.classList.add('dragging');e.target.setPointerCapture(e.pointerId);e.target.onpointermove=moveDrag;e.target.onpointerup=endDrag;e.target.onpointercancel=()=>{drag=null;render();};
}
function moveDrag(e){if(!drag)return;const dy=Math.round((e.clientY-drag.startY)/15)*15;const cols=[...document.querySelectorAll('.day-column')];const col=cols.find(c=>e.clientX>=c.getBoundingClientRect().left && e.clientX<c.getBoundingClientRect().right);drag.deltaDay=col&&!drag.resize?(Date.parse(col.dataset.date)-Date.parse(drag.date))/DAY:0;drag.delta=dy;drag.moved=Math.abs(e.clientY-drag.startY)>5 || Math.abs(e.clientX-drag.startX)>5;drag.el.style.transform=`translate(${drag.resize?0:drag.deltaDay*cols[0].getBoundingClientRect().width}px,${drag.resize?0:dy}px)`;if(drag.resize)drag.el.style.height=`${Math.max(15,Math.min(1440-drag.event.start,drag.event.end-drag.event.start+dy))}px`;}
async function updatePosition(event,delta,deltaDay,resize){const v={...event};if(resize)v.end=Math.max(v.start+15,Math.min(1440,v.end+delta));else{const duration=v.end-v.start;v.start=Math.max(0,Math.min(1440-duration,v.start+delta));v.end=v.start+duration;v.date=plus(v.date,deltaDay);if(v.until)v.until=plus(v.until,deltaDay);}await api(`/api/events/${v.id}`,{method:'PUT',body:JSON.stringify(v)});await load();toast(resize?'수업 시간을 변경했어요.':'수업을 이동했어요.');}
function endDrag(){if(!drag)return;const d=drag;drag=null;if(!d.moved){render();return;}run(async()=>{try{await updatePosition(d.event,d.delta || 0,d.deltaDay || 0,d.resize);}catch(e){render();throw e;}});}
function keyboardMove(e){if(!['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();const event=state.events.find(x=>x.id===e.target.closest('.event').dataset.id),resize=e.target.classList.contains('resize-handle');run(()=>updatePosition(event,e.key==='ArrowUp'?-15:e.key==='ArrowDown'?15:0,resize?0:e.key==='ArrowLeft'?-1:e.key==='ArrowRight'?1:0,resize));}
function openTasks(){
  if(!state.events.length){toast('먼저 수업을 하나 추가해 주세요.');return;}
  photoId=null;$('#taskForm').reset();$('#analysisStatus').textContent='';$('#photoPreview').hidden=true;
  $('#taskForm').elements.eventId.innerHTML=state.events.map(e=>`<option value="${e.id}">${esc(e.title)}</option>`).join('');setNextTaskDate();$('#taskDialog').showModal();
}
function setNextTaskDate(){const e=state.events.find(e=>e.id===$('#taskForm').elements.eventId.value);let date=e.date;while(e.repeat && date<today() && (!e.until || date<e.until))date=plus(date,7);$('#taskForm').elements.date.value=date;}
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

self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
// Deliberately do not cache private API responses or photos.
self.addEventListener('push',event=>{
  let data={title:'은상',body:'일정을 확인해 주세요.'};
  try{data={...data,...event.data.json()};}catch{}
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,icon:'/icon-192.png',badge:'/icon-192.png',tag:data.key || 'eunsang',data:{url:'/'}}));
});
self.addEventListener('notificationclick',event=>{
  event.notification.close();event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{for(const client of clients)if('focus' in client)return client.focus();return self.clients.openWindow('/');}));
});

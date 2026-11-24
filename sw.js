// The combined app imports the existing local data from this same origin.
// Do not delete CacheStorage belonging to other classroom apps.
const DESTINATION='https://ingimar90.github.io/Grunnstae/';
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{
 if(event.request.method==='GET'&&event.request.mode==='navigate')event.respondWith(Promise.resolve(Response.redirect(DESTINATION,302)));
});

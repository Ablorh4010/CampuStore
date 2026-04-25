// EMERGENCY KILL SWITCH FOR SERVICE WORKER
self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  self.registration.unregister()
    .then(() => self.clients.matchAll())
    .then((clients) => {
      clients.forEach((client) => client.navigate(client.url));
    });
});

// Immediately clear all caches
caches.keys().then((names) => {
  for (let name of names) caches.delete(name);
});

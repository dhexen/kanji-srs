// Minimal service worker. Its only job is to make the app installable (browsers
// require a registered SW with a fetch handler). It does NOT cache responses, to
// avoid serving stale authenticated data — everything goes to the network.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => { /* network passthrough */ })

// Service Worker: App offline öffnen (zuletzt geladene Daten lesen) und Push-Benachrichtigungen anzeigen
const CACHE = 'portal-v2';
// Antwort, wenn weder Server noch Speicher etwas liefern (nie „null“ zurückgeben)
const offline = (json) =>
  json
    ? new Response(JSON.stringify({ error: 'Keine Verbindung zum Server. Bitte Internet prüfen und neu laden.' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
    : new Response('Keine Verbindung zum Server. Bitte Internet prüfen und neu laden.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
const SHELL = [
  '/',
  '/index.html',
  '/build/app.js',
  '/css/app.css',
  '/css/dokument.css',
  '/lib/chart.js',
  '/img/logo.png',
  '/img/logo-hell.png',
  '/img/icon-192.png',
  '/fonts/aileron-latin-400-normal.woff2',
  '/fonts/aileron-latin-700-normal.woff2'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Daten: zuerst vom Server, ohne Netz die zuletzt geladenen
  if (url.pathname === '/api/daten' || url.pathname === '/api/status') {
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, r.clone()));
          return r;
        })
        .catch(() => caches.match(e.request).then((alt) => alt || offline(true)))
    );
    return;
  }
  if (url.pathname.startsWith('/api/')) return;
  // Oberfläche: sofort aus dem Speicher, im Hintergrund aktualisieren
  e.respondWith(
    caches.match(e.request).then((alt) => {
      const neu = fetch(e.request)
        .then((r) => {
          if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, r.clone()));
          return r;
        })
        .catch(async () => {
          if (alt) return alt;
          if (e.request.mode === 'navigate') return (await caches.match('/index.html')) || offline(false);
          return offline(false);
        });
      return alt || neu;
    })
  );
});

self.addEventListener('push', (e) => {
  let d = {};
  try {
    d = e.data.json();
  } catch {
    d = { titel: 'Rechnung-Programm', text: e.data?.text() };
  }
  e.waitUntil(self.registration.showNotification(d.titel || 'Rechnung-Programm', { body: d.text || '', icon: '/img/icon-192.png', badge: '/img/icon-192.png', data: { url: d.url || '/' } }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const ziel = e.notification.data?.url || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((liste) => {
      const offen = liste.find((c) => c.url.startsWith(self.location.origin));
      if (offen) return offen.focus().then((c) => c.navigate(ziel));
      return self.clients.openWindow(ziel);
    })
  );
});

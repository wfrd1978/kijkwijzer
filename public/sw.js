// Service worker: zorgt dat de app snel opent, ook met slecht of geen internet.
const CACHE = 'kijkwijzer-v1';
const WACHT_OP_NETWERK = 3000;
// Bestanden in assets/ hebben een unieke naam per versie; de oudste ruimen we op.
const MAX_BESTANDEN = 40;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function ruimOudeBestandenOp(cache) {
  const bestanden = (await cache.keys()).filter((r) => new URL(r.url).pathname.includes('/assets/'));
  for (const oud of bestanden.slice(0, Math.max(0, bestanden.length - MAX_BESTANDEN))) await cache.delete(oud);
}

// Bestanden in assets/ veranderen nooit: eerst uit de opslag.
async function opslagEerst(request) {
  const bewaard = await caches.match(request);
  if (bewaard) return bewaard;
  const antwoord = await fetch(request);
  if (antwoord.ok) {
    const cache = await caches.open(CACHE);
    await cache.put(request, antwoord.clone());
    ruimOudeBestandenOp(cache).catch(() => {});
  }
  return antwoord;
}

// De rest (de pagina zelf): eerst internet, zodat je de nieuwste versie krijgt.
// Duurt dat langer dan 3 seconden of is er geen internet, dan de bewaarde versie.
async function netwerkEerst(request) {
  const cache = await caches.open(CACHE);
  const netwerk = fetch(request, { cache: 'no-cache' }).then((antwoord) => {
    if (antwoord.ok) cache.put(request, antwoord.clone());
    return antwoord;
  });
  const bewaard = (await cache.match(request)) || (request.mode === 'navigate' ? await cache.match('./') : undefined);
  if (!bewaard) return netwerk;
  const teLaat = new Promise((klaar) => setTimeout(() => klaar(bewaard), WACHT_OP_NETWERK));
  return Promise.race([netwerk.then((a) => (a.ok ? a : bewaard)).catch(() => bewaard), teLaat]);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(url.pathname.includes('/assets/') ? opslagEerst(request) : netwerkEerst(request));
});

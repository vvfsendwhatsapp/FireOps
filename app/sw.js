/* Service worker di FireOps VVF Pro.
 *
 * Prima era vuoto (solo per rendere l'app installabile). Ora serve anche a
 * usare la SITAC senza rete, senza rinunciare agli aggiornamenti:
 *  - RETE PRIMA: ogni richiesta va in rete come sempre, e la risposta buona
 *    se ne tiene una copia. Se la rete non c'è, si usa la copia. Con la rete
 *    l'app resta quindi sempre aggiornata come prima.
 *  - Le tessere delle mappe (OSM, Esri, OpenTopoMap...) vanno invece prima in
 *    cache: sono tante e non cambiano. Si tengono le ultime MAX_TESSERE.
 *  - All'installazione si scarica subito quello che serve alla SITAC, così è
 *    pronta offline anche se non la si è mai aperta (le mappe no: solo le
 *    zone già viste con la rete).
 * Per svuotare tutto basta cambiare CACHE.
 */
const CACHE = "fireops-pro-v6";
const CACHE_TESSERE = "fireops-pro-tessere-v1";
const MAX_TESSERE = 3000;

const SITAC = [
  "./sitac.html", "./user.html", "./manifest.webmanifest", "./js/versione.js",
  "../index.html", "../style.css", "../db/comandi.json",
  "../fireops-sfondi.js", "../radiotelefoni.js", "../sitac-simboli.js", "../sitac-vento.js",
  "../sitac-rilievo.js", "../sitac.js", "../sitac-frequenze.js", "../sitac-foto.js", "../sitac-scheda3d.js", "../sitac-mobile.js", "../sitac-immagine.html", "../images/logo.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js",
  "https://unpkg.com/@geoman-io/leaflet-geoman-free@2.15.0/dist/leaflet-geoman.css",
  "https://unpkg.com/@geoman-io/leaflet-geoman-free@2.15.0/dist/leaflet-geoman.min.js",
  "https://unpkg.com/leaflet-polylinedecorator@1.6.0/dist/leaflet.polylineDecorator.js"
];

self.addEventListener("install", e => {
  self.skipWaiting();
  // Ogni file per conto suo: uno che manca non deve bloccare gli altri
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SITAC.map(u => c.add(u).catch(() => {})))));
});

self.addEventListener("activate", e => e.waitUntil(
  caches.keys().then(k => Promise.all(k.filter(n => n !== CACHE && n !== CACHE_TESSERE).map(n => caches.delete(n))))
    .then(() => self.clients.claim())
));

const eTessera = u => /tile|arcgisonline\.com\/.*\/MapServer\/tile|opentopomap|\/\d+\/\d+\/\d+(\.png|\.jpg|\.jpeg|\.webp)?(\?|$)/i.test(u);

async function potaTessere(c) {
  const k = await c.keys();
  for (let i = 0; i < k.length - MAX_TESSERE; i++) await c.delete(k[i]);
}

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = r.url;
  if (!/^https?:/.test(u)) return;
  // Chiamate ai dati vivi (Apps Script, meteo, geocodifica): niente cache, se non c'è rete falliscono come prima
  if (/script\.google\.com|googleusercontent|open-meteo|nominatim|docs\.google\.com/.test(u)) return;

  if (eTessera(u)) {
    e.respondWith(caches.open(CACHE_TESSERE).then(async c => {
      const g = await c.match(r);
      if (g) return g;
      const n = await fetch(r);
      if (n && (n.ok || n.type === "opaque")) { c.put(r, n.clone()).then(() => potaTessere(c)).catch(() => {}); }
      return n;
    }));
    return;
  }

  e.respondWith(fetch(r).then(n => {
    // Chiave senza "?v=..." / "?t=...": una sola copia per file, non una per versione
    if (n && (n.ok || n.type === "opaque")) { const k = n.clone(); caches.open(CACHE).then(c => c.put(u.split("?")[0], k)).catch(() => {}); }
    return n;
  }).catch(async () => {
    const c = await caches.open(CACHE);
    return (await c.match(u.split("?")[0])) || (await c.match(r, {ignoreSearch: true}))
      || (r.mode === "navigate" ? await c.match("./sitac.html", {ignoreSearch: true}) : null) || Response.error();
  }));
});

/* Service worker minimo: serve a rendere FireOps installabile (e quindi visibile in "Condividi").
   Non memorizza nulla: le richieste vanno sempre in rete, cosi' l'app resta sempre aggiornata. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});

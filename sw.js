/* Service Worker minimal pour Background Sync.
 * Quand le réseau revient (même app/onglet fermé sous Chrome Android),
 * on poste un message au client (s'il existe) ou on tente d'ouvrir une fenêtre cliente
 * qui exécutera l'upload via la couche IndexedDB.
 *
 * NB: La synchro réelle s'exécute dans la page (la couche IndexedDB + supabase-js
 * a besoin du contexte de la page pour les sessions auth). Le SW sert de
 * déclencheur pour ouvrir/réveiller un client.
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

async function notifyClients() {
  const clientsList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const c of clientsList) {
    c.postMessage({ type: "ff-offline-sync" });
  }
  if (clientsList.length === 0) {
    // Best-effort: try to open the app so its sync engine runs.
    try {
      await self.clients.openWindow("/");
    } catch {}
  }
}

// Web Background Sync (one-shot, fires when network returns)
self.addEventListener("sync", (event) => {
  if (event.tag === "ff-offline-sync") {
    event.waitUntil(notifyClients());
  }
});

// Periodic Background Sync (Chrome Android, 15min+ intervals)
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "ff-offline-sync") {
    event.waitUntil(notifyClients());
  }
});

// ============================================================
// Service worker : permet à l'appli de fonctionner hors ligne.
// ============================================================

// 👉 Change ce numéro (v2, v3...) à chaque fois que tu modifies
// index.html, style.css ou app.js, pour forcer la mise à jour du cache.
const VERSION_DU_CACHE = "undercover-v7";

// Liste de tous les fichiers à garder en mémoire pour le mode hors ligne.
const FICHIERS_A_METTRE_EN_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./words.json",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Installation : on télécharge tous les fichiers et on les range dans le cache.
self.addEventListener("install", function (evenement) {
  evenement.waitUntil(
    caches.open(VERSION_DU_CACHE).then(function (cache) {
      return cache.addAll(FICHIERS_A_METTRE_EN_CACHE);
    })
  );
  // Active tout de suite la nouvelle version sans attendre.
  self.skipWaiting();
});

// Activation : on supprime les anciens caches (ceux d'une ancienne version).
self.addEventListener("activate", function (evenement) {
  evenement.waitUntil(
    caches.keys().then(function (nomsDesCaches) {
      return Promise.all(
        nomsDesCaches
          .filter(function (nom) { return nom !== VERSION_DU_CACHE; })
          .map(function (nom) { return caches.delete(nom); })
      );
    })
  );
  self.clients.claim();
});

// Chaque fois que l'appli demande un fichier, on décide d'où il vient.
self.addEventListener("fetch", function (evenement) {
  const requete = evenement.request;
  if (requete.method !== "GET") return;

  if (requete.url.endsWith("words.json")) {
    evenement.respondWith(reseauDabord(requete));
  } else {
    evenement.respondWith(cacheDabord(requete));
  }
});

// Stratégie "réseau d'abord" : on essaie de télécharger la version la plus
// récente ; si on est hors ligne, on prend la copie en cache.
async function reseauDabord(requete) {
  try {
    // cache: "no-cache" évite que le navigateur nous serve une vieille copie.
    const reponse = await fetch(requete, { cache: "no-cache" });
    const cache = await caches.open(VERSION_DU_CACHE);
    cache.put(requete, reponse.clone());
    return reponse;
  } catch (erreur) {
    return caches.match(requete);
  }
}

// Stratégie "cache d'abord" : on prend la copie en cache si elle existe,
// sinon on la télécharge.
async function cacheDabord(requete) {
  const reponseEnCache = await caches.match(requete);
  return reponseEnCache || fetch(requete);
}

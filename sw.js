// ============================================================
// Service worker : permet à l'appli de fonctionner hors ligne.
// ============================================================

// 👉 Change ce numéro (v2, v3...) à chaque fois que tu modifies
// index.html, style.css ou app.js, ou que tu ajoutes une catégorie,
// pour forcer la mise à jour du cache.
const VERSION_DU_CACHE = "undercover-v12";
const LANGUES = ["fr", "en"];

// Liste des fichiers de l'appli à garder en mémoire pour le mode hors ligne.
// Les fichiers de mots sont ajoutés automatiquement à partir de mots/categories.json.
const FICHIERS_A_METTRE_EN_CACHE = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./manifest.json",
  "./mots/categories.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

// Installation : on télécharge tous les fichiers et on les range dans le cache.
self.addEventListener("install", function (evenement) {
  evenement.waitUntil(mettreToutEnCache());
  // Active tout de suite la nouvelle version sans attendre.
  self.skipWaiting();
});

// Télécharge les fichiers de l'appli, plus les mots de chaque catégorie
// dans chaque langue (ex : ./mots/fr/animals.json, ./mots/en/animals.json).
async function mettreToutEnCache() {
  const reponse = await fetch("./mots/categories.json", { cache: "reload" });
  const categories = await reponse.json();

  const fichiers = FICHIERS_A_METTRE_EN_CACHE.slice();
  categories.forEach(function (categorie) {
    LANGUES.forEach(function (langue) {
      fichiers.push("./mots/" + langue + "/" + categorie.fichier + ".json");
    });
  });

  // cache: "reload" force le téléchargement de la dernière version de chaque
  // fichier, au lieu de reprendre une vieille copie gardée par le navigateur.
  const requetes = fichiers.map(function (fichier) {
    return new Request(fichier, { cache: "reload" });
  });
  const cache = await caches.open(VERSION_DU_CACHE);
  await cache.addAll(requetes);
}

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

  // Les mots (dossier mots/) : réseau d'abord, pour que tes modifications soient prises en compte.
  if (requete.url.includes("/mots/")) {
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

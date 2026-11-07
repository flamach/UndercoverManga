// ============================================================
// Undercover : distribution des mots avec des cartes.
// Le reste du jeu (indices, votes) se joue à l'oral.
// ============================================================

// ----- Réglages -----
const CLE_CONFIG = "undercover-config";                 // config mémorisée
const CLE_PAIRES_RECENTES = "undercover-paires-recentes"; // paires déjà jouées
const NB_PAIRES_A_EVITER = 10;
const NB_CIVILS_MIN = 2;     // avec 1 infiltré, il faut au moins 2 Civils (donc 3 joueurs)
const NB_JOUEURS_MAX = 20;
const NB_UNDERCOVER_MAX = 9; // avec 20 joueurs, au maximum 9 infiltrés
const CLE_LANGUE = "undercover-langue";                 // langue choisie

// ----- Tous les textes de l'appli, en français et en anglais -----
// Les {mots} entre accolades sont remplacés par des valeurs (voir la fonction t).
const TEXTES = {
  fr: {
    slogan: "Qui se cache parmi vous ?",
    civils: "Civils",
    aideCivils: "Ont tous le même mot",
    aideUndercover: "Ont un mot proche",
    aideMrWhite: "N'a aucun mot, doit bluffer",
    joueursAuTotal: "joueurs au total",
    distribuer: "Distribuer les cartes",
    erreurAucunInfiltre: "Il faut au moins un Undercover ou Mr. White.",
    erreurPasAssezDeCivils: "Il faut plus de Civils ({civils}) que d'infiltrés ({infiltres}).",
    erreurTropDeJoueurs: "{max} joueurs maximum.",
    erreurMots: "Impossible de charger la liste de mots.",
    choisisCarte: "Prends le téléphone et choisis une carte",
    tonPseudo: "Ton pseudo",
    erreurPseudoVide: "Écris ton pseudo d'abord.",
    erreurPseudoPris: "Ce pseudo est déjà pris.",
    retournerCarte: "Retourner ma carte",
    lu: "Lu",
    retour: "Retour",
    tuEsMrWhite: "Tu es Mr. White",
    toutLeMondeASonMot: "Tout le monde a son mot !",
    quiCommence: "Qui commence ?",
    lancer: "Lancer",
    relancer: "Relancer",
    finDePartie: "Fin de partie : retourner toutes les cartes",
    lesCartes: "Les cartes",
    rejouer: "Rejouer",
    nouvelleConfig: "Nouvelle configuration",
    choisisCategorie: "Choisis une catégorie",
    erreurCategories: "Impossible de charger les catégories.",
    changer: "Changer",
    installerTitre: "📲 Installer l'appli sur ton téléphone",
    installerIphone: "iPhone : ouvre le site dans Safari → bouton Partager → « Sur l'écran d'accueil ».",
    installerAndroid: "Android : ouvre le site dans Chrome → menu ⋮ → « Installer l'application »."
  },
  en: {
    slogan: "Who's hiding among you?",
    civils: "Civilians",
    aideCivils: "All share the same word",
    aideUndercover: "Have a similar word",
    aideMrWhite: "Has no word, must bluff",
    joueursAuTotal: "players in total",
    distribuer: "Deal the cards",
    erreurAucunInfiltre: "You need at least one Undercover or Mr. White.",
    erreurPasAssezDeCivils: "You need more Civilians ({civils}) than infiltrators ({infiltres}).",
    erreurTropDeJoueurs: "{max} players maximum.",
    erreurMots: "Could not load the word list.",
    choisisCarte: "Take the phone and pick a card",
    tonPseudo: "Your nickname",
    erreurPseudoVide: "Enter your nickname first.",
    erreurPseudoPris: "This nickname is already taken.",
    retournerCarte: "Flip my card",
    lu: "Got it",
    retour: "Back",
    tuEsMrWhite: "You are Mr. White",
    toutLeMondeASonMot: "Everyone has their word!",
    quiCommence: "Who starts?",
    lancer: "Spin",
    relancer: "Spin again",
    finDePartie: "End of game: flip all the cards",
    lesCartes: "The cards",
    rejouer: "Play again",
    nouvelleConfig: "New setup",
    choisisCategorie: "Pick a category",
    erreurCategories: "Could not load the categories.",
    changer: "Change",
    installerTitre: "📲 Install the app on your phone",
    installerIphone: "iPhone: open the site in Safari → Share button → “Add to Home Screen”.",
    installerAndroid: "Android: open the site in Chrome → ⋮ menu → “Install app”."
  }
};

// ----- État de la partie en cours -----
let categories = [];        // la liste lue dans mots/categories.json
let categorieChoisie = null; // ex : { fichier: "animals", emoji: "🐾", fr: "Animaux", en: "Animals" }
let toutesLesPaires = [];  // les paires de la catégorie choisie
let config = null;         // { nbCivils: 3, nbUndercover: 1, avecMrWhite: true, nbJoueurs: 5 }
let cartes = [];           // chaque carte : { role, mot, pseudo, lue }
let motDesCivils = "";
let motDesUndercover = "";
let carteEnCours = null;   // carte que le joueur est en train de regarder
let langue = localStorage.getItem(CLE_LANGUE) || "fr"; // français par défaut

// Raccourci pour récupérer un élément de la page par son id.
function element(id) {
  return document.getElementById(id);
}

// Renvoie le texte "cle" dans la langue choisie.
// Exemple : t("erreurTropDeJoueurs", { max: 20 }) donne "20 joueurs maximum."
function t(cle, valeurs) {
  let texte = TEXTES[langue][cle];
  for (const nom in valeurs) {
    texte = texte.replace("{" + nom + "}", valeurs[nom]);
  }
  return texte;
}

// Change la langue, la mémorise, puis traduit tous les éléments
// qui ont un attribut data-texte="...".
function changerLangue(nouvelleLangue) {
  langue = nouvelleLangue;
  localStorage.setItem(CLE_LANGUE, langue);
  document.documentElement.lang = langue;

  document.querySelectorAll("[data-texte]").forEach(function (el) {
    el.textContent = t(el.dataset.texte);
  });
  // Met en valeur le bouton de la langue choisie.
  document.querySelectorAll(".langues button").forEach(function (bouton) {
    bouton.classList.toggle("active", bouton.dataset.langue === langue);
  });
  // Les noms des catégories et le message d'erreur du menu dépendent de la langue.
  construireTuilesCategories();
  mettreAJourResume();
}

// Cache tous les écrans puis affiche seulement celui demandé.
function afficherEcran(idEcran) {
  document.querySelectorAll(".ecran").forEach(function (ecran) {
    ecran.hidden = ecran.id !== idEcran;
  });
  window.scrollTo(0, 0);
}

// Renvoie une copie du tableau avec les éléments dans un ordre aléatoire
// (algorithme de Fisher-Yates).
function melanger(tableau) {
  const copie = tableau.slice();
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temporaire = copie[i];
    copie[i] = copie[j];
    copie[j] = temporaire;
  }
  return copie;
}

// Met un texte en minuscules et enlève les accents et espaces autour,
// pour comparer "Léa" et "lea" comme étant le même pseudo.
function normaliser(texte) {
  return texte.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// ============================================================
// Mots
// ============================================================

// Écrit le mot dans l'élément "cible". Si le mot finit par un texte entre
// parenthèses, comme "Zoro (One Piece)", ce texte est écrit en plus petit dessous.
function ecrireMot(cible, mot) {
  // morceaux[1] = "Zoro", morceaux[2] = "(One Piece)" ; null s'il n'y a pas de parenthèses.
  const morceaux = mot.match(/^(.*?)\s*(\(.*\))$/);
  if (!morceaux) {
    cible.textContent = mot;
    return;
  }
  cible.textContent = morceaux[1];
  const precision = document.createElement("small");
  precision.className = "precision";
  precision.textContent = morceaux[2];
  cible.appendChild(precision);
}

// Télécharge les paires de la catégorie choisie, dans la langue choisie.
// Exemple : ./mots/fr/animals.json
async function chargerMots() {
  toutesLesPaires = [];
  try {
    const reponse = await fetch("./mots/" + langue + "/" + categorieChoisie.fichier + ".json");
    toutesLesPaires = await reponse.json();
  } catch (erreur) {
    console.log("Impossible de charger les mots", erreur);
  }
}

// ============================================================
// Écran d'accueil : choix de la catégorie
// ============================================================

// Télécharge la liste des catégories (mots/categories.json) puis crée les tuiles.
async function chargerCategories() {
  try {
    const reponse = await fetch("./mots/categories.json");
    categories = await reponse.json();
  } catch (erreur) {
    console.log("Impossible de charger les catégories", erreur);
  }
  construireTuilesCategories();
  element("erreur-categories").textContent = categories.length === 0 ? t("erreurCategories") : "";
}

// Crée une tuile (emoji + nom dans la langue choisie) par catégorie.
function construireTuilesCategories() {
  const grille = element("grille-categories");
  grille.innerHTML = "";
  categories.forEach(function (categorie) {
    const bouton = document.createElement("button");
    bouton.className = "tuile-categorie";
    const emoji = document.createElement("span");
    emoji.className = "emoji";
    emoji.textContent = categorie.emoji;
    bouton.append(emoji, categorie[langue]);
    bouton.addEventListener("click", function () { choisirCategorie(categorie); });
    grille.appendChild(bouton);
  });
}

// Affiche l'écran d'accueil avec les catégories.
function afficherCategories() {
  afficherEcran("ecran-categories");
}

// Mémorise la catégorie touchée puis passe au réglage des joueurs.
function choisirCategorie(categorie) {
  categorieChoisie = categorie;
  afficherConfiguration();
}

// Choisit une paire au hasard en évitant les 10 dernières jouées,
// puis tire au sort quel mot va aux Civils et lequel aux Undercover.
function choisirPaire() {
  const recentes = JSON.parse(localStorage.getItem(CLE_PAIRES_RECENTES) || "[]");

  // On identifie une paire par ses deux mots collés : "Chat|Chien".
  let disponibles = toutesLesPaires.filter(function (paire) {
    return !recentes.includes(paire.join("|"));
  });
  // S'il y a trop peu de paires, on autorise à nouveau toutes les paires.
  if (disponibles.length === 0) disponibles = toutesLesPaires;

  const paire = disponibles[Math.floor(Math.random() * disponibles.length)];

  // On mémorise cette paire et on ne garde que les 10 dernières.
  recentes.push(paire.join("|"));
  localStorage.setItem(CLE_PAIRES_RECENTES, JSON.stringify(recentes.slice(-NB_PAIRES_A_EVITER)));

  if (Math.random() < 0.5) {
    motDesCivils = paire[0];
    motDesUndercover = paire[1];
  } else {
    motDesCivils = paire[1];
    motDesUndercover = paire[0];
  }
}

// ============================================================
// Écran de configuration
// ============================================================

// Lit la configuration choisie à l'écran (compteurs et interrupteur).
// Le nombre de joueurs est calculé : Civils + Undercover + Mr. White.
function lireConfigAffichee() {
  const nbCivils = Number(element("nb-civils").textContent);
  const nbUndercover = Number(element("nb-undercover").textContent);
  const avecMrWhite = element("avec-mr-white").checked;
  return {
    nbCivils: nbCivils,
    nbUndercover: nbUndercover,
    avecMrWhite: avecMrWhite,
    nbJoueurs: nbCivils + nbUndercover + (avecMrWhite ? 1 : 0)
  };
}

// Ajoute "pas" (+1 ou -1) au compteur, sans sortir des limites min et max.
function changerCompteur(idCompteur, pas, min, max) {
  const compteur = element(idCompteur);
  const nouvelleValeur = Number(compteur.textContent) + pas;
  compteur.textContent = Math.min(max, Math.max(min, nouvelleValeur));
  mettreAJourResume();
}

// Met à jour le total de joueurs, grise les boutons − / + aux limites,
// et bloque le bouton "Distribuer" si la configuration n'est pas valable.
function mettreAJourResume() {
  const choix = lireConfigAffichee();
  element("total-joueurs").textContent = choix.nbJoueurs;

  const tableComplete = choix.nbJoueurs >= NB_JOUEURS_MAX;
  element("moins-civils").disabled = choix.nbCivils <= NB_CIVILS_MIN;
  element("plus-civils").disabled = tableComplete;
  element("moins-undercover").disabled = choix.nbUndercover <= 0;
  element("plus-undercover").disabled = tableComplete || choix.nbUndercover >= NB_UNDERCOVER_MAX;

  const erreur = verifierConfiguration(choix);
  element("erreur-config").textContent = erreur;
  element("bouton-commencer").disabled = erreur !== "";
}

// Lit la config mémorisée dans le téléphone (ou une config par défaut).
function chargerConfigSauvegardee() {
  const texte = localStorage.getItem(CLE_CONFIG);
  const sauvegarde = texte ? JSON.parse(texte) : {};
  return {
    nbCivils: sauvegarde.nbCivils || 3,
    nbUndercover: sauvegarde.nbUndercover ?? 1,
    avecMrWhite: sauvegarde.avecMrWhite || false
  };
}

// Affiche l'écran de configuration avec la dernière config utilisée.
function afficherConfiguration() {
  const sauvegarde = chargerConfigSauvegardee();
  element("nb-civils").textContent = sauvegarde.nbCivils;
  element("nb-undercover").textContent = sauvegarde.nbUndercover;
  element("avec-mr-white").checked = sauvegarde.avecMrWhite;
  element("nom-categorie").textContent = categorieChoisie.emoji + " " + categorieChoisie[langue];
  mettreAJourResume();
  afficherEcran("ecran-config");
}

// Vérifie la configuration. Renvoie un message d'erreur, ou "" si tout va bien.
function verifierConfiguration(nouvelleConfig) {
  const nbInfiltres = nouvelleConfig.nbUndercover + (nouvelleConfig.avecMrWhite ? 1 : 0);
  const nbCivils = nouvelleConfig.nbJoueurs - nbInfiltres;

  if (nbInfiltres === 0) {
    return t("erreurAucunInfiltre");
  }
  if (nbCivils <= nbInfiltres) {
    return t("erreurPasAssezDeCivils", { civils: nbCivils, infiltres: nbInfiltres });
  }
  if (nouvelleConfig.nbJoueurs > NB_JOUEURS_MAX) {
    return t("erreurTropDeJoueurs", { max: NB_JOUEURS_MAX });
  }
  return "";
}

// Appelée par le bouton "Distribuer les cartes" : lit, vérifie, mémorise
// la config puis lance la partie.
function validerConfiguration() {
  const nouvelleConfig = lireConfigAffichee();

  const erreur = verifierConfiguration(nouvelleConfig);
  element("erreur-config").textContent = erreur;
  if (erreur) return;

  config = nouvelleConfig;
  localStorage.setItem(CLE_CONFIG, JSON.stringify(config));
  demarrerPartie();
}

// ============================================================
// Cartes
// ============================================================

// Prépare une nouvelle partie : tire les mots et mélange les cartes.
async function demarrerPartie() {
  await chargerMots();
  if (toutesLesPaires.length === 0) {
    element("erreur-config").textContent = t("erreurMots");
    afficherEcran("ecran-config");
    return;
  }
  choisirPaire();

  // On prépare la liste des rôles, puis on la mélange.
  const roles = [];
  for (let i = 0; i < config.nbUndercover; i++) roles.push("undercover");
  if (config.avecMrWhite) roles.push("mrwhite");
  while (roles.length < config.nbJoueurs) roles.push("civil");

  cartes = melanger(roles).map(function (role) {
    let mot = null;
    if (role === "civil") mot = motDesCivils;
    if (role === "undercover") mot = motDesUndercover;
    return { role: role, mot: mot, pseudo: "", lue: false };
  });

  afficherGrille();
}

// Affiche toutes les cartes face cachée.
// Une carte déjà lue est grisée, affiche le pseudo du joueur et n'est plus cliquable.
// Quand toutes les cartes sont lues, on passe à la roulette.
function afficherGrille() {
  const toutesLues = cartes.every(function (carte) { return carte.lue; });
  if (toutesLues) {
    afficherRoulette();
    return;
  }

  const grille = element("grille-cartes");
  grille.innerHTML = "";
  cartes.forEach(function (carte, index) {
    const bouton = document.createElement("button");
    bouton.className = "petite-carte";
    if (carte.lue) {
      bouton.textContent = carte.pseudo;
      bouton.disabled = true;
    } else {
      bouton.textContent = index + 1;
      bouton.addEventListener("click", function () { ouvrirCarte(carte); });
    }
    grille.appendChild(bouton);
  });
  afficherEcran("ecran-cartes");
}

// Ouvre la carte choisie : le joueur doit d'abord taper son pseudo.
function ouvrirCarte(carte) {
  carteEnCours = carte;
  element("carte").classList.remove("retournee");
  element("mot-affiche").textContent = "";
  element("champ-pseudo").value = "";
  element("erreur-pseudo").textContent = "";
  element("zone-pseudo").hidden = false;
  element("bouton-retourner").hidden = false;
  element("bouton-annuler").hidden = false;
  element("bouton-lu").hidden = true;
  afficherEcran("ecran-carte");
}

// Vérifie le pseudo : il ne doit pas être vide ni déjà pris.
// Renvoie un message d'erreur, ou "" si tout va bien.
function verifierPseudo(pseudo) {
  if (pseudo === "") return t("erreurPseudoVide");
  const dejaPris = cartes.some(function (carte) {
    return carte.lue && normaliser(carte.pseudo) === normaliser(pseudo);
  });
  if (dejaPris) return t("erreurPseudoPris");
  return "";
}

// Retourne la carte pour montrer le mot (ou "Tu es Mr. White").
// À partir de là, la carte compte comme lue : personne ne pourra la rouvrir.
function retournerCarte() {
  const pseudo = element("champ-pseudo").value.trim();
  const erreur = verifierPseudo(pseudo);
  element("erreur-pseudo").textContent = erreur;
  if (erreur) return;

  carteEnCours.pseudo = pseudo;
  carteEnCours.lue = true;
  ecrireMot(element("mot-affiche"),
    carteEnCours.role === "mrwhite" ? t("tuEsMrWhite") : carteEnCours.mot);
  element("carte").classList.add("retournee");

  element("zone-pseudo").hidden = true;
  element("bouton-retourner").hidden = true;
  element("bouton-annuler").hidden = true;
  element("bouton-lu").hidden = false;
}

// Le joueur a lu son mot : on recache la carte et on revient à la grille.
function fermerCarte() {
  element("carte").classList.remove("retournee");
  element("bouton-lu").hidden = true;
  // On attend la fin de l'animation avant d'effacer le mot et de changer d'écran.
  setTimeout(function () {
    element("mot-affiche").textContent = "";
    carteEnCours = null;
    afficherGrille();
  }, 400);
}

// ============================================================
// Roulette : qui commence ?
// ============================================================

// Affiche l'écran de la roulette, prête à être lancée.
function afficherRoulette() {
  element("roulette").textContent = "?";
  element("roulette").classList.remove("gagnant");
  element("bouton-lancer").disabled = false;
  element("bouton-lancer").textContent = t("lancer");
  afficherEcran("ecran-roulette");
}

// Fait défiler les pseudos de plus en plus lentement, puis s'arrête
// sur un joueur tiré au hasard (n'importe qui, même Mr. White).
function lancerRoulette() {
  const pseudos = cartes.map(function (carte) { return carte.pseudo; });
  const indexGagnant = Math.floor(Math.random() * pseudos.length);
  const nbEtapes = 25;
  let etape = 0;
  let delai = 50; // temps en millisecondes entre deux pseudos

  element("bouton-lancer").disabled = true;
  element("roulette").classList.remove("gagnant");

  // Affiche le pseudo suivant puis se rappelle elle-même un peu plus tard.
  // Les pseudos défilent dans l'ordre, calculé pour finir pile sur le gagnant.
  function afficherEtapeSuivante() {
    const decalage = nbEtapes - 1 - etape;
    const index = ((indexGagnant - decalage) % pseudos.length + pseudos.length) % pseudos.length;
    element("roulette").textContent = pseudos[index];

    etape++;
    if (etape < nbEtapes) {
      delai = delai * 1.1; // on ralentit petit à petit (environ 5 secondes au total)
      setTimeout(afficherEtapeSuivante, delai);
    } else {
      element("roulette").classList.add("gagnant");
      element("bouton-lancer").disabled = false;
      element("bouton-lancer").textContent = t("relancer");
    }
  }

  afficherEtapeSuivante();
}

// ============================================================
// Fin de partie
// ============================================================

// Affiche la carte de chaque joueur : son pseudo, et en dessous sa carte
// qui se retourne pour montrer son mot.
function afficherFin() {
  const grille = element("grille-fin");
  grille.innerHTML = "";
  cartes.forEach(function (carte) {
    const bloc = document.createElement("div");

    const pseudo = document.createElement("p");
    pseudo.className = "pseudo";
    pseudo.textContent = carte.pseudo;

    // Même structure que la grande carte : un dos et une face avec le mot.
    const petiteCarte = document.createElement("div");
    petiteCarte.className = "carte petite";
    const dos = document.createElement("div");
    dos.className = "face face-dos";
    dos.textContent = "?";
    const face = document.createElement("div");
    face.className = "face face-mot";
    ecrireMot(face, carte.role === "mrwhite" ? "Mr. White" : carte.mot);
    petiteCarte.append(dos, face);

    bloc.append(pseudo, petiteCarte);
    grille.appendChild(bloc);
  });
  afficherEcran("ecran-fin");

  // On retourne toutes les cartes juste après leur affichage, pour voir l'animation.
  setTimeout(function () {
    grille.querySelectorAll(".carte").forEach(function (petiteCarte) {
      petiteCarte.classList.add("retournee");
    });
  }, 100);
}

// ============================================================
// Démarrage de l'appli : on branche les boutons.
// ============================================================

element("moins-civils").addEventListener("click", function () { changerCompteur("nb-civils", -1, NB_CIVILS_MIN, NB_JOUEURS_MAX); });
element("plus-civils").addEventListener("click", function () { changerCompteur("nb-civils", 1, NB_CIVILS_MIN, NB_JOUEURS_MAX); });
element("moins-undercover").addEventListener("click", function () { changerCompteur("nb-undercover", -1, 0, NB_UNDERCOVER_MAX); });
element("plus-undercover").addEventListener("click", function () { changerCompteur("nb-undercover", 1, 0, NB_UNDERCOVER_MAX); });
element("avec-mr-white").addEventListener("change", mettreAJourResume);
element("bouton-commencer").addEventListener("click", validerConfiguration);
element("bouton-retourner").addEventListener("click", retournerCarte);
element("bouton-lu").addEventListener("click", fermerCarte);
element("bouton-annuler").addEventListener("click", afficherGrille);
element("bouton-lancer").addEventListener("click", lancerRoulette);
element("bouton-voir-roles").addEventListener("click", afficherFin);
element("bouton-rejouer").addEventListener("click", demarrerPartie);
element("bouton-nouvelle-config").addEventListener("click", afficherCategories);
element("bouton-changer-categorie").addEventListener("click", afficherCategories);
document.querySelectorAll(".langues button").forEach(function (bouton) {
  bouton.addEventListener("click", function () { changerLangue(bouton.dataset.langue); });
});

// Si l'appli est déjà installée sur l'écran d'accueil, l'aide à l'installation est inutile.
const estInstallee = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
element("aide-installation").hidden = estInstallee;

changerLangue(langue);
afficherCategories();
chargerCategories();

// Active le mode hors ligne (service worker).
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js");
}

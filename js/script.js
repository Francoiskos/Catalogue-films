/* ==========================================
   01 - CONFIGURATION DE L'API
   ========================================== */

const URL_API = "https://cinescope-api.kosnanskyfrancois.workers.dev";

const URL_AFFICHES_TMDB = "https://image.tmdb.org/t/p/w500";

const IMAGE_INDISPONIBLE =
  "https://placehold.co/400x600/202020/D9AC52?text=Affiche+indisponible";

// Nom utilisé pour sauvegarder les favoris.
const CLE_FAVORIS = "cinescope-favoris";

/* ==========================================
   02 - RÉCUPÉRATION DES ÉLÉMENTS HTML
   ========================================== */

// Catalogue
const grilleFilms = document.getElementById("movies-grid");
const compteurFilms = document.getElementById("movies-count");
const messageVide = document.getElementById("empty-message");
const titreSection = document.getElementById("movies-title");
const boutonRetourCatalogue = document.getElementById("back-to-catalog");

// Recherche
const champRecherche = document.getElementById("search-input");
const boutonRecherche = document.getElementById("search-button");

// Filtres et tri
const filtreGenre = document.getElementById("filter-genre");
const filtreAnnee = document.getElementById("filter-year");
const filtreTri = document.getElementById("filter-sort");

// Pagination
const pagination = document.getElementById("pagination");
const boutonPrecedent = document.getElementById("previous-page");
const boutonSuivant = document.getElementById("next-page");
const informationPage = document.getElementById("page-info");

// Fenêtre de détails
const fenetreFilm = document.getElementById("movie-modal");
const boutonFermer = document.getElementById("close-modal");

const modalImage = document.getElementById("modal-image");
const modalTitre = document.getElementById("modal-title");
const modalDate = document.getElementById("modal-date");
const modalGenres = document.getElementById("modal-genres");
const modalDuree = document.getElementById("modal-duration");
const modalNote = document.getElementById("modal-rating");
const modalSynopsis = document.getElementById("modal-overview");

// NOUVEAU : boutons Favoris
const boutonFavorisNavigation = document.getElementById("favorites-button");

const compteurFavoris = document.getElementById("favorites-count");

const boutonFavoriFilm = document.getElementById("modal-favorite-button");

/* ==========================================
   03 - LISTE DES GENRES TMDB
   ========================================== */

const genresTMDB = {
  28: "Action",
  12: "Aventure",
  16: "Animation",
  35: "Comédie",
  80: "Crime",
  99: "Documentaire",
  18: "Drame",
  10751: "Familial",
  14: "Fantastique",
  36: "Histoire",
  27: "Horreur",
  10402: "Musique",
  9648: "Mystère",
  10749: "Romance",
  878: "Science-fiction",
  10770: "Téléfilm",
  53: "Thriller",
  10752: "Guerre",
  37: "Western",
};

/* ==========================================
   04 - ÉTAT DU CATALOGUE
   ========================================== */

let pageActuelle = 1;
let totalPages = 1;

let numeroRequete = 0;
let numeroRequeteFilm = 0;

// Film sélectionné dans la fenêtre.
let filmSelectionne = null;

// Indique si nous affichons les favoris.
let affichageFavoris = false;

/* ==========================================
   05 - CHARGEMENT DES FAVORIS SAUVEGARDÉS
   ========================================== */

function chargerFavoris() {
  try {
    const sauvegarde = localStorage.getItem(CLE_FAVORIS);

    if (!sauvegarde) {
      return [];
    }

    const donnees = JSON.parse(sauvegarde);

    if (!Array.isArray(donnees)) {
      return [];
    }

    // Conserver uniquement les films valides.
    const idsUtilises = new Set();

    return donnees.filter(function (film) {
      if (
        !film ||
        !Number.isInteger(film.id) ||
        film.id <= 0 ||
        typeof film.titre !== "string" ||
        idsUtilises.has(film.id)
      ) {
        return false;
      }

      idsUtilises.add(film.id);

      return true;
    });
  } catch (erreur) {
    console.error("Erreur de lecture des favoris :", erreur);
    return [];
  }
}

// Liste des favoris conservée en mémoire.
let favoris = chargerFavoris();

/* ==========================================
   06 - SAUVEGARDE DES FAVORIS
   ========================================== */

function sauvegarderFavoris() {
  try {
    localStorage.setItem(CLE_FAVORIS, JSON.stringify(favoris));

    return true;
  } catch (erreur) {
    console.error("Erreur de sauvegarde :", erreur);

    alert("Impossible d'enregistrer les favoris dans ce navigateur.");

    return false;
  }
}

/* ==========================================
   07 - GESTION DES FAVORIS
   ========================================== */

function estFavori(idFilm) {
  return favoris.some(function (film) {
    return film.id === idFilm;
  });
}

// Mettre à jour le compteur.
function mettreAJourCompteurFavoris() {
  compteurFavoris.textContent = favoris.length;
}

// Mettre à jour le bouton de la fiche.
function mettreAJourBoutonFavori() {
  if (!filmSelectionne) {
    boutonFavoriFilm.disabled = true;
    boutonFavoriFilm.textContent = "♡ Ajouter aux favoris";

    boutonFavoriFilm.setAttribute("aria-pressed", "false");

    return;
  }

  boutonFavoriFilm.disabled = false;

  const dejaFavori = estFavori(filmSelectionne.id);

  boutonFavoriFilm.textContent = dejaFavori
    ? "♥ Retirer des favoris"
    : "♡ Ajouter aux favoris";

  boutonFavoriFilm.setAttribute("aria-pressed", String(dejaFavori));
}

// Ajouter ou retirer le film sélectionné.
function basculerFavori() {
  if (!filmSelectionne) {
    return;
  }

  const idFilm = filmSelectionne.id;

  const anciensFavoris = [...favoris];

  if (estFavori(idFilm)) {
    favoris = favoris.filter(function (film) {
      return film.id !== idFilm;
    });
  } else {
    favoris.push({ ...filmSelectionne });
  }

  // Annuler le changement si la sauvegarde échoue.
  if (!sauvegarderFavoris()) {
    favoris = anciensFavoris;
    return;
  }

  mettreAJourCompteurFavoris();
  mettreAJourBoutonFavori();

  // Actualiser la grille si nous affichons les favoris.
  if (affichageFavoris) {
    afficherListeFavoris();
  }
}

boutonFavoriFilm.addEventListener("click", basculerFavori);

/* ==========================================
   08 - CONVERSION DES DONNÉES TMDB
   ========================================== */

function convertirFilmTMDB(film) {
  const annee = film.release_date
    ? film.release_date.substring(0, 4)
    : "Inconnue";

  const affiche = film.poster_path
    ? URL_AFFICHES_TMDB + film.poster_path
    : IMAGE_INDISPONIBLE;

  let genre = "Genre inconnu";

  if (Array.isArray(film.genre_ids) && film.genre_ids.length > 0) {
    genre = genresTMDB[film.genre_ids[0]] || "Genre inconnu";
  }

  return {
    id: film.id,
    titre: film.title || "Titre inconnu",
    annee: annee,
    dateSortie: film.release_date || "",
    genre: genre,
    note: Number(film.vote_average) || 0,
    popularite: Number(film.popularity) || 0,
    affiche: affiche,
  };
}

/* ==========================================
   09 - AFFICHAGE DES CARTES DE FILMS
   ========================================== */

function afficherFilms(listeFilms) {
  grilleFilms.innerHTML = "";

  compteurFilms.textContent = `${listeFilms.length} film(s) affiché(s)`;

  if (listeFilms.length === 0) {
    messageVide.textContent = affichageFavoris
      ? "Tu n'as pas encore ajouté de films aux favoris."
      : "Aucun film trouvé avec ces critères.";

    messageVide.hidden = false;

    return;
  }

  messageVide.hidden = true;

  listeFilms.forEach(function (film) {
    const carte = document.createElement("button");

    carte.type = "button";
    carte.classList.add("movie-card", "movie-card-button");

    carte.setAttribute("aria-label", `Voir les détails du film ${film.titre}`);

    // Affiche
    const image = document.createElement("img");

    image.src = film.affiche || IMAGE_INDISPONIBLE;
    image.alt = `Affiche du film ${film.titre}`;
    image.loading = "lazy";

    image.onerror = function () {
      image.onerror = null;
      image.src = IMAGE_INDISPONIBLE;
    };

    // Informations
    const infos = document.createElement("div");
    infos.classList.add("movie-info");

    const titre = document.createElement("h3");
    titre.textContent = film.titre;

    const details = document.createElement("p");

    details.textContent = `${film.annee} • ${film.genre}`;

    const note = document.createElement("span");
    note.classList.add("movie-rating");

    note.textContent = `★ ${Number(film.note).toFixed(1)} / 10`;

    infos.appendChild(titre);
    infos.appendChild(details);
    infos.appendChild(note);

    carte.appendChild(image);
    carte.appendChild(infos);

    carte.addEventListener("click", function () {
      ouvrirDetailsFilm(film.id);
    });

    grilleFilms.appendChild(carte);
  });
}

/* ==========================================
   10 - TRI DES RÉSULTATS DE RECHERCHE
   ========================================== */

function trierFilmsRecherche(films, tri) {
  const filmsTries = [...films];

  if (tri === "vote_average.desc") {
    filmsTries.sort(function (a, b) {
      return b.note - a.note;
    });
  } else if (tri === "primary_release_date.desc") {
    filmsTries.sort(function (a, b) {
      return b.dateSortie.localeCompare(a.dateSortie);
    });
  } else {
    filmsTries.sort(function (a, b) {
      return b.popularite - a.popularite;
    });
  }

  return filmsTries;
}

/* ==========================================
   11 - PAGINATION
   ========================================== */

function afficherPagination() {
  // Les favoris ne nécessitent pas encore
  // de pagination.
  if (affichageFavoris || totalPages <= 1) {
    pagination.hidden = true;
    return;
  }

  pagination.hidden = false;

  informationPage.textContent = `Page ${pageActuelle} sur ${totalPages}`;

  boutonPrecedent.disabled = pageActuelle <= 1;
  boutonSuivant.disabled = pageActuelle >= totalPages;
}

/* ==========================================
   12 - RÉCUPÉRATION DES FILMS
   ========================================== */

async function recupererFilms() {
  boutonRetourCatalogue.hidden = true;
  // Invalider les anciennes requêtes.
  const requeteActuelle = ++numeroRequete;

  affichageFavoris = false;

  boutonFavorisNavigation.setAttribute("aria-pressed", "false");

  const recherche = champRecherche.value.trim();
  const genre = filtreGenre.value;
  const annee = filtreAnnee.value;
  const tri = filtreTri.value;

  compteurFilms.textContent = "Chargement des films...";
  messageVide.hidden = true;
  grilleFilms.innerHTML = "";
  pagination.hidden = true;

  let adresse;

  if (recherche !== "") {
    const parametres = new URLSearchParams();

    parametres.set("query", recherche);
    parametres.set("page", String(pageActuelle));

    adresse = `${URL_API}/recherche?${parametres.toString()}`;

    titreSection.textContent = `Résultats pour « ${recherche} »`;
  } else {
    const parametres = new URLSearchParams();

    if (genre !== "") {
      parametres.set("genre", genre);
    }

    if (annee !== "") {
      parametres.set("annee", annee);
    }

    parametres.set("tri", tri);
    parametres.set("page", String(pageActuelle));

    adresse = `${URL_API}/decouvrir?${parametres.toString()}`;

    if (genre !== "" || annee !== "" || tri !== "popularity.desc") {
      titreSection.textContent = "Films selon vos critères";
    } else {
      titreSection.textContent = "Les films à découvrir";
    }
  }

  try {
    const reponse = await fetch(adresse);

    if (!reponse.ok) {
      throw new Error("Impossible de récupérer les films");
    }

    const donnees = await reponse.json();

    if (requeteActuelle !== numeroRequete) {
      return;
    }

    if (!Array.isArray(donnees.results)) {
      throw new Error("Format des données incorrect");
    }

    pageActuelle = Number(donnees.page) || pageActuelle;

    totalPages = Math.min(Math.max(Number(donnees.total_pages) || 1, 1), 500);

    let films = donnees.results.map(convertirFilmTMDB);

    if (recherche !== "") {
      films = trierFilmsRecherche(films, tri);
    }

    afficherFilms(films);
    afficherPagination();
  } catch (erreur) {
    if (requeteActuelle !== numeroRequete) {
      return;
    }

    console.error("Erreur API :", erreur);

    grilleFilms.innerHTML = "";
    compteurFilms.textContent = "Erreur de chargement";

    messageVide.textContent =
      "Impossible de charger les films. Réessaie plus tard.";

    messageVide.hidden = false;
    pagination.hidden = true;
  }
}

/* ==========================================
   13 - CHANGEMENT DE PAGE
   ========================================== */

function changerPage(nouvellePage) {
  if (
    affichageFavoris ||
    nouvellePage < 1 ||
    nouvellePage > totalPages ||
    nouvellePage === pageActuelle
  ) {
    return;
  }

  pageActuelle = nouvellePage;

  recupererFilms();

  document.querySelector(".movies-section").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

boutonPrecedent.addEventListener("click", function () {
  changerPage(pageActuelle - 1);
});

boutonSuivant.addEventListener("click", function () {
  changerPage(pageActuelle + 1);
});

/* ==========================================
   14 - RECHERCHE ET FILTRES
   ========================================== */

function lancerRecherche() {
  filtreGenre.value = "";
  filtreAnnee.value = "";
  pageActuelle = 1;

  recupererFilms();
}

boutonRecherche.addEventListener("click", lancerRecherche);

champRecherche.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    lancerRecherche();
  }
});

function appliquerFiltres() {
  champRecherche.value = "";
  pageActuelle = 1;

  recupererFilms();
}

filtreGenre.addEventListener("change", appliquerFiltres);

filtreAnnee.addEventListener("change", appliquerFiltres);

filtreTri.addEventListener("change", function () {
  pageActuelle = 1;
  recupererFilms();
});

/* ==========================================
   15 - AFFICHAGE DES FAVORIS
   ========================================== */

function afficherListeFavoris() {
  titreSection.textContent = "Mes films favoris";

  // Afficher le bouton de retour.
  boutonRetourCatalogue.hidden = false;

  // Masquer la pagination.
  pagination.hidden = true;

  // Afficher les films enregistrés.
  afficherFilms(favoris);

  // Afficher le nombre total de favoris.
  compteurFilms.textContent = `${favoris.length} film(s) favori(s)`;

  // Masquer la pagination du catalogue.
  pagination.hidden = true;

  // Afficher les favoris sauvegardés.
  afficherFilms(favoris);
}

// Afficher ou quitter la vue Favoris.
boutonFavorisNavigation.addEventListener("click", function () {
  if (affichageFavoris) {
    // Retour au catalogue.
    recupererFilms();
  } else {
    // Annuler les requêtes du catalogue
    // encore en cours.
    numeroRequete++;

    affichageFavoris = true;

    boutonFavorisNavigation.setAttribute("aria-pressed", "true");

    afficherListeFavoris();
  }

  document.querySelector(".movies-section").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
});

/* ==========================================
   16 - FORMATAGE DES INFORMATIONS
   ========================================== */

function formaterDate(dateTexte) {
  if (!dateTexte) {
    return "Date inconnue";
  }

  const date = new Date(dateTexte + "T12:00:00");

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return date.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formaterDuree(minutes) {
  const duree = Number(minutes);

  if (!Number.isFinite(duree) || duree <= 0) {
    return "Durée inconnue";
  }

  const heures = Math.floor(duree / 60);
  const minutesRestantes = duree % 60;

  if (heures === 0) {
    return `${minutesRestantes} min`;
  }

  return `${heures} h ${minutesRestantes} min`;
}

/* ==========================================
   17 - OUVERTURE DES DÉTAILS D'UN FILM
   ========================================== */

async function ouvrirDetailsFilm(idFilm) {
  if (!Number.isInteger(idFilm) || idFilm <= 0) {
    return;
  }

  const requeteActuelle = ++numeroRequeteFilm;

  // Aucun film sélectionné tant que
  // ses détails ne sont pas chargés.
  filmSelectionne = null;

  modalTitre.textContent = "Chargement du film...";
  modalDate.textContent = "";
  modalGenres.textContent = "";
  modalDuree.textContent = "";
  modalNote.textContent = "";

  modalSynopsis.textContent = "Chargement des informations...";

  modalImage.src = IMAGE_INDISPONIBLE;
  modalImage.alt = "Affiche en cours de chargement";

  mettreAJourBoutonFavori();

  if (!fenetreFilm.open) {
    fenetreFilm.showModal();
  }

  try {
    const adresse = `${URL_API}/film?id=${encodeURIComponent(idFilm)}`;

    const reponse = await fetch(adresse);

    if (!reponse.ok) {
      throw new Error("Impossible de charger le film");
    }

    const film = await reponse.json();

    if (requeteActuelle !== numeroRequeteFilm || !fenetreFilm.open) {
      return;
    }

    modalTitre.textContent = film.titre || "Titre inconnu";

    modalDate.textContent = `Sortie : ${formaterDate(film.dateSortie)}`;

    const genres = Array.isArray(film.genres)
      ? film.genres
          .map(function (genre) {
            return genre.name;
          })
          .filter(Boolean)
      : [];

    modalGenres.textContent = `Genres : ${
      genres.length > 0 ? genres.join(", ") : "Non renseignés"
    }`;

    modalDuree.textContent = `Durée : ${formaterDuree(film.duree)}`;

    const note = Number(film.note);

    modalNote.textContent = Number.isFinite(note)
      ? `★ ${note.toFixed(1)} / 10`
      : "Note indisponible";

    modalSynopsis.textContent =
      film.synopsis || "Aucun synopsis disponible pour ce film.";

    modalImage.src = film.affiche
      ? URL_AFFICHES_TMDB + film.affiche
      : IMAGE_INDISPONIBLE;

    modalImage.alt = `Affiche du film ${film.titre || "inconnu"}`;

    /* ==========================================
       18 - PRÉPARATION DU FILM FAVORI
       ========================================== */

    // Préparer les informations nécessaires
    // à l'affichage d'une carte favorite.

    filmSelectionne = {
      id: film.id,

      titre: film.titre || "Titre inconnu",

      annee: film.dateSortie ? film.dateSortie.substring(0, 4) : "Inconnue",

      dateSortie: film.dateSortie || "",

      genre: genres.length > 0 ? genres[0] : "Genre inconnu",

      note: Number(film.note) || 0,

      popularite: 0,

      affiche: film.affiche
        ? URL_AFFICHES_TMDB + film.affiche
        : IMAGE_INDISPONIBLE,
    };

    // Activer le bouton Ajouter/Retirer.
    mettreAJourBoutonFavori();
  } catch (erreur) {
    if (requeteActuelle !== numeroRequeteFilm || !fenetreFilm.open) {
      return;
    }

    console.error("Erreur détails du film :", erreur);

    modalTitre.textContent = "Erreur de chargement";

    modalSynopsis.textContent =
      "Impossible de récupérer les détails de ce film. Réessaie plus tard.";

    filmSelectionne = null;
    mettreAJourBoutonFavori();
  }
}

/* ==========================================
   19 - FERMETURE DE LA FENÊTRE
   ========================================== */

function fermerDetailsFilm() {
  if (fenetreFilm.open) {
    fenetreFilm.close();
  }
}

boutonFermer.addEventListener("click", fermerDetailsFilm);

// Fermer en cliquant en dehors.
fenetreFilm.addEventListener("click", function (event) {
  if (event.target === fenetreFilm) {
    const rectangle = fenetreFilm.getBoundingClientRect();

    const clicDansLaFenetre =
      event.clientX >= rectangle.left &&
      event.clientX <= rectangle.right &&
      event.clientY >= rectangle.top &&
      event.clientY <= rectangle.bottom;

    if (!clicDansLaFenetre) {
      fermerDetailsFilm();
    }
  }
});

// Invalider les anciennes demandes à la fermeture.
fenetreFilm.addEventListener("close", function () {
  numeroRequeteFilm++;
  filmSelectionne = null;
});

/* ==========================================
   RETOUR AU CATALOGUE
   ========================================== */

boutonRetourCatalogue.addEventListener("click", function () {
  recupererFilms();

  document.querySelector(".movies-section").scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
});

/* ==========================================
   20 - DÉMARRAGE DE CINÉSCOPE
   ========================================== */

// Afficher le nombre de favoris sauvegardés.
mettreAJourCompteurFavoris();

// Désactiver le bouton tant qu'aucun
// film n'est sélectionné.
mettreAJourBoutonFavori();

// Charger le catalogue.
recupererFilms();

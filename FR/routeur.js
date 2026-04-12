// --- LE CHEF D'ORCHESTRE (routeur.js) ---

// --- LE CHEF D'ORCHESTRE (routeur.js) ---

// L'Aiguilleur (Modifie l'URL sans recharger la page)
window.changerDePage = function(pageDemandee) {
    window.location.hash = pageDemandee;
};

function estHashAuthSupabase(hashValue = window.location.hash) {
    const hashNettoye = (hashValue || '').replace(/^#/, '');
    if (!hashNettoye) return false;

    return [
        'access_token=',
        'refresh_token=',
        'type=recovery',
        'type=invite',
        'error_description='
    ].some((fragment) => hashNettoye.includes(fragment));
}

function extrairePageDemandeeDepuisHash(hashValue = window.location.hash) {
    const hashNettoye = (hashValue || '').replace(/^#/, '');
    if (!hashNettoye || estHashAuthSupabase(hashValue)) {
        return 'accueil';
    }

    return hashNettoye;
}

window._siteDialogState = null;

function getSiteDialogRefs() {
    return {
        backdrop: document.getElementById('site-dialog-backdrop'),
        modal: document.getElementById('site-dialog-modal'),
        title: document.getElementById('site-dialog-title'),
        message: document.getElementById('site-dialog-message'),
        cancel: document.getElementById('site-dialog-cancel'),
        confirm: document.getElementById('site-dialog-confirm')
    };
}

function fermerDialogueSite(resultat) {
    const state = window._siteDialogState;
    if (!state || state.closed) return;
    state.closed = true;

    const { refs, resolve, onKeyDown } = state;
    document.removeEventListener('keydown', onKeyDown);
    refs.backdrop.classList.add('hidden');
    document.body.classList.remove('modal-open');
    refs.cancel.classList.add('hidden');
    refs.confirm.classList.remove('btn-danger');
    refs.confirm.classList.add('btn-primary');
    refs.cancel.onclick = null;
    refs.confirm.onclick = null;
    refs.backdrop.onclick = null;

    window._siteDialogState = null;
    resolve(resultat);
}

window.ouvrirDialogueSite = function({
    title = 'Message du Sanctuaire',
    message = '',
    confirmText = 'Valider',
    cancelText = 'Annuler',
    showCancel = false,
    danger = false
} = {}) {
    const refs = getSiteDialogRefs();

    if (!refs.backdrop || !refs.modal || !refs.title || !refs.message || !refs.cancel || !refs.confirm) {
        return Promise.resolve(showCancel ? false : true);
    }

    if (window._siteDialogState) {
        fermerDialogueSite(false);
    }

    refs.title.innerText = title;
    refs.message.innerText = message;
    refs.confirm.innerText = confirmText;
    refs.cancel.innerText = cancelText;
    refs.cancel.classList.toggle('hidden', !showCancel);
    refs.confirm.classList.toggle('btn-danger', danger);
    refs.confirm.classList.toggle('btn-primary', !danger);
    refs.backdrop.classList.remove('hidden');
    document.body.classList.add('modal-open');

    return new Promise((resolve) => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                fermerDialogueSite(showCancel ? false : true);
            }
        };

        window._siteDialogState = { refs, resolve, onKeyDown, closed: false };

        refs.cancel.onclick = () => fermerDialogueSite(false);
        refs.confirm.onclick = () => fermerDialogueSite(true);
        refs.backdrop.onclick = (event) => {
            if (event.target === refs.backdrop) {
                fermerDialogueSite(showCancel ? false : true);
            }
        };

        document.addEventListener('keydown', onKeyDown);
        refs.confirm.focus();
    });
};

window.siteAlert = function(message, options = {}) {
    return window.ouvrirDialogueSite({
        title: options.title || 'Message du Sanctuaire',
        message,
        confirmText: options.confirmText || 'Compris',
        danger: options.danger === true
    });
};

window.siteConfirm = function(message, options = {}) {
    return window.ouvrirDialogueSite({
        title: options.title || 'Confirmation',
        message,
        confirmText: options.confirmText || 'Confirmer',
        cancelText: options.cancelText || 'Annuler',
        showCancel: true,
        danger: options.danger === true
    });
};

window._pageCourante = window._pageCourante || null;
window._siteScrollUpdateFrame = null;

function getSiteScrollRefs() {
    return {
        top: document.getElementById('site-scroll-top'),
        bottom: document.getElementById('site-scroll-bottom')
    };
}

function masquerScrollRapideSite() {
    const { top, bottom } = getSiteScrollRefs();
    if (top) top.classList.remove('is-visible');
    if (bottom) bottom.classList.remove('is-visible');
}

function pageUtiliseScrollRapideSite() {
    return window._pageCourante !== 'lecture'
        && window._pageCourante !== 'conditions-utilisation'
        && window._pageCourante !== 'mentions-legales'
        && window._pageCourante !== 'politique-confidentialite';
}

window.mettreAJourScrollRapideSite = function() {
    const { top, bottom } = getSiteScrollRefs();
    if (!top || !bottom) return;

    if (!pageUtiliseScrollRapideSite()) {
        masquerScrollRapideSite();
        return;
    }

    const hauteurScrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (hauteurScrollable <= 40) {
        masquerScrollRapideSite();
        return;
    }

    const positionActuelle = window.scrollY || window.pageYOffset || 0;
    top.classList.toggle('is-visible', positionActuelle > 140);
    bottom.classList.toggle('is-visible', positionActuelle < hauteurScrollable - 120);
};

window.programmerMiseAJourScrollRapideSite = function() {
    if (window._siteScrollUpdateFrame) {
        cancelAnimationFrame(window._siteScrollUpdateFrame);
    }

    window._siteScrollUpdateFrame = requestAnimationFrame(() => {
        window.mettreAJourScrollRapideSite();
        window._siteScrollUpdateFrame = null;
    });
};

// Le Détecteur de Mouvement (Écoute quand l'URL change, même via les flèches du navigateur)
window.addEventListener('hashchange', () => {
    // On lit le mot après le '#' (s'il n'y a rien, on va dans le Hall)
    const pageDemandee = extrairePageDemandeeDepuisHash();
    window.chargerPageInterne(pageDemandee);
});

// L'Ouvrier (Va chercher le fichier HTML et l'injecte)
window.chargerPageInterne = async function(pageDemandee) {
    const root = document.getElementById('sanctuaire-root');
    window._pageCourante = pageDemandee;
    
    // Petit texte d'attente pendant que le fichier voyage
    root.innerHTML = '<p class="text-center text-muted-italic p-50">Ouverture du parchemin...</p>';

    // L'Aiguilleur : on relie le mot-clé au bon fichier HTML
    const pages = {
        'accueil': 'Accueil.html',
        'oeuvre': 'Histoire.html',
        'lecture': 'Lecteur.html',
        'conditions-utilisation': 'ConditionsUtilisation.html',
        'mentions-legales': 'MentionsLegales.html',
        'politique-confidentialite': 'PolitiqueConfidentialite.html',
        'quartiers': 'Parametre.html',
        'lectures': 'Favoris.html',
        'studio': 'Forge.html',
        'gestion': 'Gestion.html',
        'editeur-chapitre': 'Editeur.html',
        'creation-story': 'CreationStory.html',
        'statistiques': 'Statistiques.html',
        'categorie-genre': 'CategorieGenre.html'
    };

    const fichier = pages[pageDemandee];

    if (!fichier) {
        root.innerHTML = '<p class="text-error text-center">Ce parchemin n\'existe pas.</p>';
        return;
    }

    try {
        // On aspire le contenu du fichier HTML
        const reponse = await fetch(fichier);
        if (!reponse.ok) throw new Error("Impossible de lire le fichier " + fichier);
        
        const html = await reponse.text();
        
        // On l'injecte dans le Maître
        root.innerHTML = html;

        // --- 🌑 L'ÉCLIPSE DU LOGO & DU MENU (Nouveau Mécanisme) 🌑 ---
        const miniLogo = document.getElementById('mini-logo');
        const heroLogo = document.getElementById('hero-logo-area');
        const menuGenre = document.getElementById('main-genre-menu'); // <-- Le menu des catégories

        if (pageDemandee === 'accueil') {
            // Si on est dans le Hall : Gros Logo activé, Petit Logo caché, Menu affiché
            if (miniLogo) miniLogo.classList.add('hidden');
            if (heroLogo) heroLogo.classList.remove('hidden');
            if (menuGenre) menuGenre.classList.remove('hidden');
        } else if (pageDemandee === 'categorie-genre') {
            // Dans les rayons : Petit Logo activé, Gros Logo caché, mais Menu TOUJOURS affiché
            if (miniLogo) miniLogo.classList.remove('hidden');
            if (heroLogo) heroLogo.classList.add('hidden');
            if (menuGenre) menuGenre.classList.remove('hidden');
        } else {
            // Partout ailleurs : Petit Logo activé, Gros Logo caché, Menu masqué
            if (miniLogo) miniLogo.classList.remove('hidden');
            if (heroLogo) heroLogo.classList.add('hidden');
            if (menuGenre) menuGenre.classList.add('hidden');
        }
        // -------------------------------------------------------------

        // On réveille les scripts de la page
        initialiserScriptsDePage(pageDemandee);

        // On remonte tout en haut de la page proprement
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.programmerMiseAJourScrollRapideSite();
        setTimeout(() => window.programmerMiseAJourScrollRapideSite(), 250);

    } catch (erreur) {
        root.innerHTML = `<p class="text-error text-center">Erreur du Sanctuaire : ${erreur.message}</p>`;
        window.programmerMiseAJourScrollRapideSite();
    }
};

function initialiserScriptsDePage(page) {
    if (page === 'accueil') {
        if (typeof window.chargerVitrine === 'function') window.chargerVitrine();
    }
    // ---> AJOUTE CE BLOC ICI <---
    else if (page === 'studio') {
        if (typeof window.chargerMesOeuvres === 'function') window.chargerMesOeuvres();
    }
    else if (page === 'oeuvre') {
        if (typeof window.chargerPageHistoire === 'function') window.chargerPageHistoire();
    }
    // ---> LECTURE ICI <---
    else if (page === 'lecture') {
        if (typeof window.lireChapitre === 'function') window.lireChapitre();
    }
    // ---> FAVORIS ICI <---
    else if (page === 'lectures') {
        if (typeof window.chargerFavoris === 'function') window.chargerFavoris();
    }
    // ---> QUARTIERS ICI <---
    else if (page === 'quartiers') {
        if (typeof window.chargerQuartiers === 'function') window.chargerQuartiers();
    }
    // ---> AJOUTE CECI <---
    else if (page === 'gestion') {
        if (typeof window.chargerGestionOeuvre === 'function') window.chargerGestionOeuvre();
    }
    // ---> AJOUTE CELA <---
    else if (page === 'editeur-chapitre') {
        if (typeof window.chargerEditeurChapitre === 'function') window.chargerEditeurChapitre();
    }
    else if (page === 'creation-story') {
        if (typeof window.chargerCreationStory === 'function') window.chargerCreationStory();
    }
    // ---> AJOUTE LE RAYONNNAGE ICI <---
    else if (page === 'categorie-genre') {
        if (typeof window.chargerGenre === 'function') window.chargerGenre();
    }
    else if (
        page === 'conditions-utilisation'
        || page === 'mentions-legales'
        || page === 'politique-confidentialite'
    ) {
        if (typeof window.chargerPageJuridique === 'function') window.chargerPageJuridique();
    }
}

// --- LE NOUVEAU MÉCANISME DU PIÉDESTAL (Interrupteur de Thèmes) ---
window.changerTheme = function(state) {
    const toggleContainer = document.getElementById('footer-toggle');
    const themeLink = document.getElementById('theme-stylesheet');
    
    if (!toggleContainer || !themeLink) return;
    
    // 1. On gère le bouton visuel
    const buttons = toggleContainer.querySelectorAll('.toggle-btn');
    buttons.forEach(b => b.classList.remove('active'));
    
    const btnActif = toggleContainer.querySelector(`[data-state="${state}"]`);
    if (btnActif) btnActif.classList.add('active');
    
    toggleContainer.setAttribute('data-active', state);
    
    // 2. On change la fiole de couleur magique (Remplacement du fichier CSS)
    if (state == 1) {
        themeLink.href = 'theme-original.css';
    } else if (state == 2) {
        themeLink.href = 'theme-abysse.css';
    } else if (state == 3) {
        themeLink.href = 'theme-lumiere.css';
    }

    // 3. On sauvegarde la mémoire dans les archives du navigateur
    localStorage.setItem('themePrefere', state);
};

// --- DÉMARRAGE AUTOMATIQUE ---
// Quand le Maître a fini de charger, on lui dit d'ouvrir le Hall direct
document.addEventListener('DOMContentLoaded', () => {
    const btnScrollTop = document.getElementById('site-scroll-top');
    const btnScrollBottom = document.getElementById('site-scroll-bottom');
    const root = document.getElementById('sanctuaire-root');

    if (btnScrollTop) {
        btnScrollTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (btnScrollBottom) {
        btnScrollBottom.addEventListener('click', () => {
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
        });
    }

    window.addEventListener('scroll', window.programmerMiseAJourScrollRapideSite, { passive: true });
    window.addEventListener('resize', window.programmerMiseAJourScrollRapideSite);

    if (root) {
        const observer = new MutationObserver(() => {
            window.programmerMiseAJourScrollRapideSite();
        });
        observer.observe(root, { childList: true, subtree: true });
    }
    
    // --- LECTURE DE LA MÉMOIRE (Thèmes) AVANT TOUTE CHOSE ---
    const themeSauvegarde = localStorage.getItem('themePrefere');
    if (themeSauvegarde) {
        window.changerTheme(themeSauvegarde);
    }
    
    // Écouteurs pour le Mécanisme Occulte
    const themeButtons = document.querySelectorAll('#footer-toggle .toggle-btn');
    themeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const etatChoisi = e.target.getAttribute('data-state');
            window.changerTheme(etatChoisi);
        });
    });

    // Connecter les boutons du menu principal (Navigation par Genre)
    document.querySelectorAll('.genre-menu button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const genre = e.target.getAttribute('data-genre');
            if (genre === 'accueil') {
                window.changerDePage('accueil'); 
            } else if (genre) {
                // On mémorise le genre choisi pour le script CategorieGenre
                localStorage.setItem('currentGenre', genre);
                
                // Si on est déjà sur la page des genres, le hash de l'URL ne va pas changer
                // Il faut donc appeler manuellement le rechargement de la page interne
                if (window.location.hash === '#categorie-genre') {
                    if (typeof window.chargerGenre === 'function') {
                        window.chargerGenre();
                    }
                } else {
                    window.changerDePage('categorie-genre');
                }
            }
        });
    });

    // Lancer la page demandée dans l'URL (ou l'accueil par défaut)
    const pageInitiale = extrairePageDemandeeDepuisHash();
    window.chargerPageInterne(pageInitiale);
});

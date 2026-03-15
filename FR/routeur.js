// --- LE CHEF D'ORCHESTRE (routeur.js) ---

// --- LE CHEF D'ORCHESTRE (routeur.js) ---

// L'Aiguilleur (Modifie l'URL sans recharger la page)
window.changerDePage = function(pageDemandee) {
    window.location.hash = pageDemandee;
};

// Le Détecteur de Mouvement (Écoute quand l'URL change, même via les flèches du navigateur)
window.addEventListener('hashchange', () => {
    // On lit le mot après le '#' (s'il n'y a rien, on va dans le Hall)
    const pageDemandee = window.location.hash.replace('#', '') || 'accueil';
    window.chargerPageInterne(pageDemandee);
});

// L'Ouvrier (Va chercher le fichier HTML et l'injecte)
window.chargerPageInterne = async function(pageDemandee) {
    const root = document.getElementById('sanctuaire-root');
    
    // Petit texte d'attente pendant que le fichier voyage
    root.innerHTML = '<p class="text-center text-muted-italic p-50">Ouverture du parchemin...</p>';

    // L'Aiguilleur : on relie le mot-clé au bon fichier HTML
    const pages = {
        'accueil': 'Accueil.html',
        'oeuvre': 'Histoire.html',
        'lecture': 'Lecteur.html',
        'quartiers': 'Parametre.html',
        'lectures': 'Favoris.html',
        'studio': 'Forge.html',
        'gestion': 'Gestion.html',
        'editeur-chapitre': 'Editeur.html',


@@ -102,95 +102,99 @@
    else if (page === 'lecture') {
        if (typeof window.lireChapitre === 'function') window.lireChapitre();
    }
    // ---> FAVORIS ICI <---
    else if (page === 'lectures') {
        if (typeof window.chargerFavoris === 'function') window.chargerFavoris();
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
    const pageInitiale = window.location.hash.replace('#', '') || 'accueil';
    window.chargerPageInterne(pageInitiale);
});
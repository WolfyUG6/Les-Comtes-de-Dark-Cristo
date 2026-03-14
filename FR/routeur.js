// --- LE CHEF D'ORCHESTRE (routeur.js) ---

window.changerDePage = async function(pageDemandee) {
    const root = document.getElementById('sanctuaire-root');
    
    // Petit texte d'attente pendant que le fichier voyage
    root.innerHTML = '<p style="text-align: center; color: var(--text-muted); font-style: italic; padding: 50px;">Ouverture du parchemin...</p>';

    // L'Aiguilleur : on relie le mot-clé au bon fichier HTML
    const pages = {
        'accueil': 'Accueil.html',
        'oeuvre': 'Histoire.html',
        'lecture': 'Lecteur.html',
        'quartiers': 'Parametre.html',
        'lectures': 'Lectures.html',
        'studio': 'Forge.html',
        'gestion': 'Gestion.html',
        'editeur-chapitre': 'Editeur.html',
        'statistiques': 'Statistiques.html'
    };

    const fichier = pages[pageDemandee];

    if (!fichier) {
        root.innerHTML = '<p style="color: red; text-align: center;">Ce parchemin n\'existe pas.</p>';
        return;
    }

    try {
        // On aspire le contenu du fichier HTML
        const reponse = await fetch(fichier);
        if (!reponse.ok) throw new Error("Impossible de lire le fichier " + fichier);
        
        const html = await reponse.text();
        
        // On l'injecte dans le Maître
        root.innerHTML = html;

        // ⚠️ MAGIE NOIRE : Il faudra réveiller les scripts ici plus tard 
        // (ex: dire à l'Archiviste de recharger les histoires si on est sur 'accueil')
        initialiserScriptsDePage(pageDemandee);

        // On remonte tout en haut de la page proprement
        window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (erreur) {
        root.innerHTML = `<p style="color: red; text-align: center;">Erreur du Sanctuaire : ${erreur.message}</p>`;
    }
};

function initialiserScriptsDePage(page) {
    // Cette fonction sert de réveil-matin pour tes autres fichiers JS.
    if (page === 'accueil') {
        // On demande à l'Archiviste de remplir la vitrine
        if (typeof window.chargerVitrine === 'function') {
            window.chargerVitrine();
        }
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
};

// --- DÉMARRAGE AUTOMATIQUE ---
// Quand le Maître a fini de charger, on lui dit d'ouvrir le Hall direct
document.addEventListener('DOMContentLoaded', () => {
    
    // Connecter les boutons du menu principal (Navigation)
    document.querySelectorAll('.genre-menu button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const genre = e.target.getAttribute('data-genre');
            // Pour l'instant, on recharge juste la page d'accueil (on gèrera le filtre plus tard)
            if (genre) window.changerDePage('accueil'); 
        });
    });

    // Lancer l'accueil
    window.changerDePage('accueil');
});
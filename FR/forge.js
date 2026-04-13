// ==========================================
// LA FORGE (forge.js)
// L'atelier de l'auteur : Liste de ses œuvres
// ==========================================

// La mémoire de l'Inquisiteur (pour trier sans recharger Supabase)
window.mesHistoiresEnCache = [];

function dedoublonnerHistoires(histoires = []) {
    const map = new Map();

    histoires.forEach((histoire) => {
        if (!histoire || histoire.id == null) return;
        map.set(String(histoire.id), histoire);
    });

    return Array.from(map.values());
}

async function recupererHistoiresAuteur(session) {
    const histoiresTrouvees = [];
    let erreurBloquante = null;

    const { data: histoiresParUid, error: erreurUid } = await window._supabase
        .from('histoires')
        .select('*')
        .eq('auteur_user_id', session.user.id);

    if (erreurUid) {
        const message = erreurUid.message || '';
        const colonneManquante = message.includes('auteur_user_id');
        if (!colonneManquante) {
            erreurBloquante = erreurUid;
        }
    } else if (Array.isArray(histoiresParUid)) {
        histoiresTrouvees.push(...histoiresParUid);
    }

    const { data: histoiresParEmail, error: erreurEmail } = await window._supabase
        .from('histoires')
        .select('*')
        .eq('auteur', session.user.email);

    if (erreurEmail) {
        if (!erreurBloquante && histoiresTrouvees.length === 0) {
            erreurBloquante = erreurEmail;
        }
    } else if (Array.isArray(histoiresParEmail)) {
        histoiresTrouvees.push(...histoiresParEmail);
    }

    if (erreurBloquante) {
        return { data: null, error: erreurBloquante };
    }

    return { data: dedoublonnerHistoires(histoiresTrouvees), error: null };
}

window.chargerMesOeuvres = async function() {
    const conteneur = document.getElementById('mes-oeuvres-liste');
    if (!conteneur) return; 

    conteneur.innerHTML = '<p class="loading-text">Recherche de vos créations dans l\'Abysse...</p>';

    const { data: { session } } = await window._supabase.auth.getSession();
    
    if (!session) {
        conteneur.innerHTML = '<p class="text-error">Vous devez être connecté pour accéder à la Forge.</p>';
        return;
    }

    // On fouille l'étagère UNE SEULE FOIS
    const { data: mesHistoires, error } = await recupererHistoiresAuteur(session);

    if (error) {
        conteneur.innerHTML = `<p class="text-error">Erreur : ${error.message}</p>`;
        return;
    }

    if (mesHistoires.length === 0) {
        conteneur.innerHTML = '<p class="loading-text">Vous n\'avez encore forgé aucune œuvre.<br>Il est temps de noircir le parchemin.</p>';
        return;
    }

    // On stocke les histoires dans la mémoire du navigateur
    window.mesHistoiresEnCache = mesHistoires;
    
    // On lance l'affichage (qui va lire le tri par défaut)
    window.afficherOeuvresTriees();
};

// --- LE MOTEUR D'AFFICHAGE ET DE TRI ---
window.afficherOeuvresTriees = function() {
    const conteneur = document.getElementById('mes-oeuvres-liste');
    const selectTri = document.getElementById('tri-oeuvres');
    
    if (!conteneur || !window.mesHistoiresEnCache) return;

    // On fait une copie de la mémoire pour la trier sans détruire l'originale
    let histoires = [...window.mesHistoiresEnCache]; 
    const typeTri = selectTri ? selectTri.value : 'recent';

    // Les règles de l'Inquisition pour le tri
    if (typeTri === 'recent') {
        histoires.sort((a, b) => b.id - a.id); // L'ID le plus grand est le dernier créé
    } else if (typeTri === 'ancien') {
        histoires.sort((a, b) => a.id - b.id);
    } else if (typeTri === 'az') {
        histoires.sort((a, b) => a.titre.localeCompare(b.titre));
    } else if (typeTri === 'za') {
        histoires.sort((a, b) => b.titre.localeCompare(a.titre));
    }

    // On efface et on reconstruit la liste
    conteneur.innerHTML = '';
    histoires.forEach(histoire => {
        const carte = document.createElement('div');
        carte.className = 'card story-card-horizontal'; 
        
        carte.innerHTML = `
            <div>
                <h3 class="story-title-m0">${histoire.titre}</h3>
                <div class="story-tags">
                    <span class="tag tag-genre">${histoire.genre}</span>
                    <span class="tag tag-statut">${histoire.statut || '✍️ En cours'}</span>
                    <span class="tag tag-age">${histoire.classification || 'Tout public'}</span>
                </div>
            </div>
            <div>
                <button class="genre-btn btn-outline-blue" onclick="ouvrirGestionOeuvre(${histoire.id})">Gérer le Grimoire</button>
                <button class="genre-btn btn-outline-red" title="Détruire cette œuvre" onclick="supprimerHistoire(${histoire.id})">Annihiler</button>
            </div>
        `;
        conteneur.appendChild(carte);
    });
};

// ==========================================
// LES AIGUILLEURS (Navigation et Écouteurs)
// ==========================================

window.ouvrirGestionOeuvre = function(idHistoire) {
    window.currentOeuvreId = idHistoire; 
    localStorage.setItem('currentOeuvreId', idHistoire);
    window.changerDePage('gestion');     
};

// --- LE POUVOIR D'ÉDITION ---
window.ouvrirModificationHistoire = function(idHistoire) {
    window.currentOeuvreId = idHistoire;
    localStorage.setItem('currentOeuvreId', idHistoire);
    localStorage.setItem('modeEditionHistoire', 'true'); // On prévient la page qu'on vient pour modifier
    window.changerDePage('creation-story');
};

// --- LE POUVOIR DE DESTRUCTION MASSIVE ---
window.supprimerHistoire = async function(idHistoire) {
    const confirmation = await window.siteConfirm("Êtes-vous sûr de vouloir effacer ce Grimoire et tous ses chapitres de la mémoire du monde ? Cette action est irréversible.", {
        confirmText: 'Annihiler',
        cancelText: 'Annuler',
        danger: true
    });
    if (!confirmation) return;

    // 1. On détruit d'abord tous les chapitres liés (Sécurité Anti-Clé Étrangère)
    const { error: errChapitres } = await window._supabase.from('chapitres').delete().eq('histoire_id', idHistoire);
    
    if (errChapitres) {
        await window.siteAlert("Erreur lors de la purge des chapitres : " + errChapitres.message, { danger: true });
        return;
    }

    // 2. On détruit l'histoire principale
    const { error: errHistoire } = await window._supabase.from('histoires').delete().eq('id', idHistoire);
    
    if(errHistoire) {
        await window.siteAlert("Supabase a bloqué la destruction du grimoire ! Erreur : " + errHistoire.message, { danger: true });
    } else {
        // 3. Rafraîchissement total
        window.chargerMesOeuvres(); 
    }
};

// Écoute des clics globaux
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btn-publish') {
        localStorage.removeItem('modeEditionHistoire'); // C'est une création pur souche
        window.changerDePage('creation-story'); 
    }
    if (e.target && e.target.id === 'btn-retour-studio') {
        window.changerDePage('accueil');
    }
});

// Écoute du changement dans le menu déroulant de tri
document.addEventListener('change', (e) => {
    if (e.target && e.target.id === 'tri-oeuvres') {
        window.afficherOeuvresTriees();
    }
});

// ==========================================
// LA FORGE (forge.js)
// L'atelier de l'auteur : Liste de ses œuvres
// ==========================================

// La mémoire de l'Inquisiteur (pour trier sans recharger Supabase)
window.mesHistoiresEnCache = [];

window.chargerMesOeuvres = async function() {
    const conteneur = document.getElementById('mes-oeuvres-liste');
    if (!conteneur) return; 

    conteneur.innerHTML = '<p class="loading-text">Recherche de vos créations dans l\'Abysse...</p>';

    const { data: { session } } = await window._supabase.auth.getSession();
    
    if (!session) {
        conteneur.innerHTML = '<p style="color: var(--accent-red);">Vous devez être connecté pour accéder à la Forge.</p>';
        return;
    }

    // On fouille l'étagère UNE SEULE FOIS
    const { data: mesHistoires, error } = await window._supabase
        .from('histoires')
        .select('*')
        .eq('auteur', session.user.email);

    if (error) {
        conteneur.innerHTML = `<p style="color: var(--accent-red);">Erreur : ${error.message}</p>`;
        return;
    }

    if (mesHistoires.length === 0) {
        conteneur.innerHTML = '<p class="loading-text" style="text-align:center;">Vous n\'avez encore forgé aucune œuvre.<br>Il est temps de noircir le parchemin.</p>';
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
        carte.className = 'card'; 
        carte.style.cssText = "display: flex; justify-content: space-between; align-items: center; width: 100%; box-sizing: border-box;";
        
        carte.innerHTML = `
            <div>
                <h3 style="margin: 0 0 10px 0;">${histoire.titre}</h3>
                <div class="story-tags">
                    <span class="tag tag-genre">${histoire.genre}</span>
                    <span class="tag tag-statut">${histoire.statut || '✍️ En cours'}</span>
                    <span class="tag tag-age">${histoire.classification || 'Tout public'}</span>
                </div>
            </div>
            <div>
                <button class="genre-btn" style="border-color: var(--accent-blue); color: var(--accent-blue);" onclick="ouvrirGestionOeuvre(${histoire.id})">Gérer le Grimoire</button>
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
    window.changerDePage('gestion');     
};

// Écoute des clics globaux
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btn-publish') {
        window.changerDePage('creation'); 
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
// ==========================================
// LA FORGE (forge.js)
// L'atelier de l'auteur : Liste de ses œuvres
// ==========================================

window.chargerMesOeuvres = async function() {
    const conteneur = document.getElementById('mes-oeuvres-liste');
    
    // Si la boîte n'existe pas (on n'est pas sur la page Studio), on annule.
    if (!conteneur) return; 

    conteneur.innerHTML = '<p class="loading-text">Recherche de vos créations dans l\'Abysse...</p>';

    // 1. On vérifie qui est le Seigneur (l'utilisateur connecté)
    const { data: { session } } = await window._supabase.auth.getSession();
    
    if (!session) {
        conteneur.innerHTML = '<p style="color: var(--accent-red);">Vous devez être connecté pour accéder à la Forge.</p>';
        return;
    }

    // 2. On fouille l'étagère pour trouver SES œuvres
    const { data: mesHistoires, error } = await window._supabase
        .from('histoires')
        .select('*')
        .eq('auteur', session.user.email)
        .order('id', { ascending: false }); // Les plus récentes en haut

    if (error) {
        conteneur.innerHTML = `<p style="color: var(--accent-red);">Erreur : ${error.message}</p>`;
        return;
    }

    // 3. Si l'auteur n'a rien écrit
    if (mesHistoires.length === 0) {
        conteneur.innerHTML = '<p class="loading-text" style="text-align:center;">Vous n\'avez encore forgé aucune œuvre.<br>Il est temps de noircir le parchemin.</p>';
        return;
    }

    // 4. On affiche chaque œuvre trouvée
    conteneur.innerHTML = '';
    mesHistoires.forEach(histoire => {
        // On crée la carte avec les classes de ton base.css
        const carte = document.createElement('div');
        carte.className = 'card'; 
        carte.style.cssText = "display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;";
        
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
// LES AIGUILLEURS (Navigation depuis la Forge)
// ==========================================

// 1. La fonction pour ouvrir la gestion d'une œuvre précise
window.ouvrirGestionOeuvre = function(idHistoire) {
    window.currentOeuvreId = idHistoire; // On mémorise quelle œuvre on veut modifier
    window.changerDePage('gestion');     // Le Chef d'Orchestre (routeur) s'occupe de changer la page
};

// 2. Écouteurs de clics pour les boutons de la Forge
document.addEventListener('click', (e) => {
    
    // Bouton pour créer une NOUVELLE œuvre
    if (e.target && e.target.id === 'btn-publish') {
        window.changerDePage('creation'); // Change 'creation' si ta page pour créer s'appelle différemment (ex: 'gestion')
    }

    // Bouton pour retourner à l'accueil
    if (e.target && e.target.id === 'btn-retour-studio') {
        window.changerDePage('accueil');
    }
});
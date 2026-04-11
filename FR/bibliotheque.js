// ==========================================
// L'ARCHIVISTE (bibliotheque.js)
// Gestion de la vitrine (Accueil) et des filtres
// ==========================================

window.chargerVitrine = async function(genreFilter = null) {
    const storiesContainer = document.getElementById('stories-container');
    
    // Si le conteneur n'existe pas (ex: on n'est pas sur la page accueil), on annule.
    if (!storiesContainer) return;

    storiesContainer.innerHTML = '<p class="loading-text">Ouverture des grimoires...</p>';

    // 1. On prépare la recherche sur l'étagère Supabase
    let query = window._supabase.from('histoires').select('*').order('date_publication', { ascending: false });
    
    // 2. Le tri de l'Inquisiteur : Accueil ou Catégorie ?
    if (genreFilter && genreFilter !== 'accueil') {
        query = query.eq('genre', genreFilter);
    } else {
        query = query.limit(5); // Sur l'accueil de base, on ne prend que les 5 dernières
    }

    const { data: histoires, error } = await query;

    if (error) {
        storiesContainer.innerHTML = `<p class="text-error">Erreur de lecture : ${error.message}</p>`;
        return;
    }

    storiesContainer.innerHTML = ''; 

    if (histoires.length === 0) {
        storiesContainer.innerHTML = '<p class="loading-text">Aucune œuvre trouvée dans ces ténèbres pour le moment...</p>';
        return;
    }

    // 3. On fabrique les cartes avec nos nouvelles classes CSS pures
    histoires.forEach(histoire => {
        // Définition de la couleur de l'âge
        let couleurAge = "#2e8b57"; // Vert par défaut
        if (histoire.classification === "R15") couleurAge = "#ffd700"; 
        else if (histoire.classification === "R16") couleurAge = "#ff8c00"; 
        else if (histoire.classification === "R18") couleurAge = "#ff0000";

        // Préparation de l'image
        const imageCouverture = window.getStoryCoverUrl(histoire.image_couverture);
        const imgHtml = `<img src="${imageCouverture}" alt="${histoire.titre}">`;

        const pseudo = histoire.pseudo_auteur || histoire.auteur.split('@')[0];

        // Création de la carte HTML
        const card = document.createElement('div');
        card.className = 'story-card';

        card.innerHTML = `
            ${imgHtml}
            <div class="story-tags">
                <span class="tag tag-genre">${histoire.genre}</span>
                <span class="tag tag-statut">${histoire.statut || '✍️ En cours'}</span>
                <span class="tag tag-age" style="color: ${couleurAge}; border-color: ${couleurAge};">${histoire.classification || 'Tout public'}</span>
                ${histoire.contenu_sensible 
                    ? `<span class="tag tag-sensible">⚠️ Sensible</span>`
                    : `<span class="tag tag-sensible-off">Sensible</span>`
                }
            </div>
            <h3>${histoire.titre}</h3>
            <span class="text-small text-muted">Par Comte ${pseudo}</span>
            <p>${histoire.synopsis}</p>
            <button class="genre-btn w-100 mt-15" onclick="localStorage.setItem('currentOeuvreId', ${histoire.id}); window.changerDePage('oeuvre');">Lire l'œuvre</button>
        `;
        
        storiesContainer.appendChild(card);
    });
};

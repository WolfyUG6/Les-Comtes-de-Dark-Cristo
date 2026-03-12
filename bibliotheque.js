// --- L'ARCHIVISTE (Gestion de la vitrine et des filtres) ---
const storiesContainer = document.getElementById('stories-container');

async function loadStories(genreFilter = null) {
    storiesContainer.innerHTML = '<p style="color: #c4a484; font-style: italic;">Ouverture des grimoires...</p>';

    // 1. On prépare la recherche sur l'étagère (en utilisant window._supabase pour être sûr à 100%)
    let query = window._supabase.from('histoires').select('*').order('date_publication', { ascending: false });
    
    // 2. Le tri de l'Inquisiteur : Accueil ou Catégorie ?
    if (genreFilter && genreFilter !== 'accueil') {
        query = query.eq('genre', genreFilter); // On fouille un rayon spécifique
    } else {
        query = query.limit(4); // C'est l'accueil, on ne prend que les 4 grimoires les plus récents
    }

    const { data: histoires, error } = await query;

    if (error) {
        storiesContainer.innerHTML = '<p style="color: red;">Erreur de lecture : ' + error.message + '</p>';
        return;
    }

    storiesContainer.innerHTML = ''; 

    // 3. On affiche le message de bienvenue UNIQUEMENT dans le Hall (l'accueil)
    if (!genreFilter || genreFilter === 'accueil') {
        const messageBienvenue = document.createElement('div');
        messageBienvenue.style.cssText = "width: 100%; text-align: center; max-width: 800px; margin: 0 auto 30px auto;";
        messageBienvenue.innerHTML = `
            <h2 style="color: #c4a484; font-family: 'Cinzel', serif; font-size: 2rem; margin-top: 0;">Bienvenue dans le Sanctuaire</h2>
            <p style="color: #aaa; font-size: 1.1rem; line-height: 1.6; font-family: 'Segoe UI', sans-serif;">
                Les Comtes de Dark & Cristo est une confrérie littéraire dédiée aux œuvres sombres, matures et exigeantes.<br>
                Ici, pas de fast-food narratif. Seulement des récits forgés avec passion, allant de la High Fantasy épique à l'Horreur Psychologique.<br>
                Sélectionnez un rayon ci-dessus pour explorer nos archives, ou découvrez nos dernières entrées ci-dessous.
            </p>
        `;
        storiesContainer.appendChild(messageBienvenue);
    } 

    if (histoires.length === 0) {
        storiesContainer.innerHTML = '<p style="color: #777; font-style: italic;">Aucune œuvre trouvée dans ces ténèbres pour le moment...</p>';
        return;
    }

    histoires.forEach(histoire => {
        // 1. Les Teintures de l'Inquisition : on choisit la couleur de l'étiquette selon l'âge
        let couleurAge = "#2e8b57"; // Vert par défaut (Tout public)
        if (histoire.classification === "R15") couleurAge = "#ffd700"; // Jaune or
        else if (histoire.classification === "R16") couleurAge = "#ff8c00"; // Orange
        else if (histoire.classification === "R18") couleurAge = "#ff0000"; // Rouge sang

        // 2. On fabrique la carte (sans le halo, avec une ombre noire classique)
        const card = document.createElement('div');
        card.style.cssText = `background-color: #0a0a0a; border: 1px solid #5d1a1a; width: 280px; padding: 15px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 4px 15px rgba(0,0,0,0.8);`;

        const imgHtml = histoire.image_couverture 
            ? `<img src="${histoire.image_couverture}" alt="${histoire.titre}" style="width: 100%; height: 380px; object-fit: cover; border: 1px solid #333;">` 
            : `<div style="width: 100%; height: 380px; background-color: #111; border: 1px solid #333; display: flex; align-items: center; justify-content: center; color: #555;">Pas de couverture</div>`;

        const pseudo = histoire.pseudo_auteur || histoire.auteur.split('@')[0];

        // 3. On injecte la couleur dans l'étiquette de l'âge (et on garde la bulle sensible !)
        card.innerHTML = `
            ${imgHtml}
            <div style="display: flex; gap: 10px; align-self: flex-start; flex-wrap: wrap;">
                <span style="font-size: 0.7rem; background-color: #5d1a1a; color: white; padding: 3px 6px; text-transform: uppercase;">${histoire.genre}</span>
				<span style="font-size: 0.7rem; background-color: #0a0a0a; color: #00aaff; border: 1px solid #00aaff; padding: 3px 6px; text-transform: uppercase; font-weight: bold;">${histoire.statut || '✍️ En cours'}</span>
                <span style="font-size: 0.7rem; background-color: #111; color: ${couleurAge}; border: 1px solid ${couleurAge}; padding: 3px 6px; text-transform: uppercase; font-weight: bold;">${histoire.classification || 'Tout public'}</span>
                ${histoire.contenu_sensible 
                    ? `<span style="font-size: 0.7rem; background-color: #5d1a1a; color: white; border: 1px solid #ff0055; padding: 3px 6px; text-transform: uppercase; font-weight: bold;">⚠️ Sensible</span>`
                    : `<span style="font-size: 0.7rem; background-color: transparent; color: #555; border: 1px dotted #333; padding: 3px 6px; text-transform: uppercase; text-decoration: line-through;">Sensible</span>`
                }
            </div>
            <h3 style="color: #c4a484; font-family: 'Cinzel', serif; margin: 5px 0 0 0; font-size: 1.2rem;">${histoire.titre}</h3>
            <span style="font-size: 0.8rem; color: #777;">Par Comte ${pseudo}</span>
            <p style="color: #aaa; font-size: 0.9rem; flex-grow: 1; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; margin-bottom: 0;">${histoire.synopsis}</p>
            <button class="genre-btn" onclick="ouvrirOeuvre(${histoire.id})" style="width: 100%; margin-top: 15px; border-color: #c4a484; color: #c4a484;">Lire l'œuvre</button>
        `;
        storiesContainer.appendChild(card);
    });
}

// Lancement au démarrage
loadStories();

// Gestion des boutons de filtres (La boussole du lecteur)
document.querySelectorAll('.genre-menu button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Au lieu de lire le texte fragile du bouton, on lit notre étiquette invisible "data-genre"
        const genreChoisi = e.target.getAttribute('data-genre');
        loadStories(genreChoisi);
    });
});
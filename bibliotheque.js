// --- L'ARCHIVISTE (Gestion de la vitrine et des filtres) ---
const storiesContainer = document.getElementById('stories-container');

async function loadStories(genreFilter = null) {
    storiesContainer.innerHTML = '<p style="color: #c4a484; font-style: italic;">Ouverture des grimoires...</p>';

    let query = _supabase.from('histoires').select('*').order('date_publication', { ascending: false });
    
    if (genreFilter) {
        query = query.eq('genre', genreFilter);
    }

    const { data: histoires, error } = await query;

    if (error) {
        storiesContainer.innerHTML = '<p style="color: red;">Erreur de lecture : ' + error.message + '</p>';
        return;
    }

    storiesContainer.innerHTML = ''; 

    if (histoires.length === 0) {
        storiesContainer.innerHTML = '<p style="color: #777; font-style: italic;">Aucune œuvre trouvée dans ces ténèbres pour le moment...</p>';
        return;
    }

    histoires.forEach(histoire => {
        const card = document.createElement('div');
        card.style.cssText = "background-color: #0a0a0a; border: 1px solid #5d1a1a; width: 280px; padding: 15px; display: flex; flex-direction: column; gap: 10px; box-shadow: 0 4px 10px rgba(0,0,0,0.8);";

        const imgHtml = histoire.image_couverture 
            ? `<img src="${histoire.image_couverture}" alt="${histoire.titre}" style="width: 100%; height: 380px; object-fit: cover; border: 1px solid #333;">` 
            : `<div style="width: 100%; height: 380px; background-color: #111; border: 1px solid #333; display: flex; align-items: center; justify-content: center; color: #555;">Pas de couverture</div>`;

        const pseudo = histoire.pseudo_auteur || histoire.auteur.split('@')[0];

        card.innerHTML = `
            ${imgHtml}
            <div style="display: flex; gap: 10px; align-self: flex-start;">
                <span style="font-size: 0.7rem; background-color: #5d1a1a; color: white; padding: 3px 6px; text-transform: uppercase;">${histoire.genre}</span>
                <span style="font-size: 0.7rem; background-color: #111; color: #ff4444; border: 1px solid #ff4444; padding: 3px 6px; text-transform: uppercase; font-weight: bold;">${histoire.classification || 'Tout public'}</span>
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

// Gestion des boutons de filtres
document.querySelectorAll('.genre-menu button').forEach(btn => {
    btn.addEventListener('click', (e) => {
        loadStories(e.target.innerText);
    });
});
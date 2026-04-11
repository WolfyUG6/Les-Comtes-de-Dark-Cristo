// ==========================================
// AFFICHAGE PAR GENRE (categoriegenre.js)
// ==========================================

window.chargerGenre = async function() {
    console.log("Lecture du rayon spécifié...");

    const conteneur = document.getElementById('genre-stories-list');
    const titrePage = document.getElementById('genre-page-title');
    
    // Récupération de la thématique choisie et mémorisée
    const genreChoisi = localStorage.getItem('currentGenre');

    if (!conteneur || !titrePage) return;

    if (!genreChoisi) {
        titrePage.innerText = "Rayonnage Inconnu";
        conteneur.innerHTML = '<p class="text-error text-center">Aucun genre n\'a été spécifié. L\'âme vagabonde...</p>';
        return;
    }

    // Mise à jour magique du titre
    titrePage.innerText = `Rayonnage : ${genreChoisi}`;
    conteneur.innerHTML = '<p class="loading-text w-100">Les manuscrits s\'extirpent des abysses...</p>';

    // --- REQUÊTE SUPABASE ---
    const { data: histoires, error } = await window._supabase
        .from('histoires')
        .select('*')
        .eq('genre', genreChoisi)
        .order('date_publication', { ascending: false });

    if (error) {
        console.error("Erreur de bibliothèque :", error);
        conteneur.innerHTML = `<p class="text-error w-100 text-center">Le portail temporel a vacillé : ${error.message}</p>`;
        return;
    }

    conteneur.innerHTML = '';

    // --- CAS "ZÉRO RÉSULTAT" ---
    if (!histoires || histoires.length === 0) {
        conteneur.innerHTML = `
            <div class="welcome-content w-100 text-center" style="border:none; margin-top: 40px;">
                <h3 class="title-m0 text-muted">Le silence règne ici...</h3>
                <p class="text-muted-italic mt-15">Aucun grimoire n'a encore été gravé dans le rayon <strong>${genreChoisi}</strong>. Serez-vous le premier ?</p>
                <button class="genre-btn btn-primary shadow-active mt-15" onclick="localStorage.removeItem('modeEditionHistoire'); window.changerDePage('creation-story');">Forger le premier récit</button>
            </div>
        `;
        return;
    }

    // --- CONSTRUCTION DES CARTES (Zéro Style Inline, tout via base.css) ---
    histoires.forEach(histoire => {
        const carte = document.createElement('div');
        carte.className = 'story-card'; // Membre de list-col ou grid selon base.css

        // Sécurité pour la classification d'âge (Couleurs dynamiques basées sur le format original)
        let classeAge = 'tag-age';
        if (histoire.classification === 'Tout public') classeAge += ' age-tout-public';
        else if (histoire.classification === 'R15') classeAge += ' age-r15';
        else if (histoire.classification === 'R16') classeAge += ' age-r16';
        else if (histoire.classification === 'R18') classeAge += ' age-r18';

        const imageCouverture = window.getStoryCoverUrl(histoire.image_couverture);

        carte.innerHTML = `
            <img src="${imageCouverture}" alt="${histoire.titre}">
            <h3>${histoire.titre}</h3>
            
            <div class="story-tags">
                <span class="tag tag-genre">${histoire.genre}</span>
                <span class="tag ${classeAge}">${histoire.classification || 'Indéfini'}</span>
                ${histoire.contenu_sensible ? '<span class="tag tag-sensible">Contenu Sensible</span>' : '<span class="tag tag-sensible-off">Sans Alerte</span>'}
            </div>
            
            <p>${histoire.synopsis || "Cette œuvre est nimbée de mystères, son intrigue demeure cachée."}</p>
            
            <div class="mt-15">
                <span class="text-small text-muted-italic">Par ${histoire.pseudo_auteur || histoire.auteur || "Auteur Inconnu"}</span>
                <span class="tag tag-statut" style="float: right;">${histoire.statut || "Inconnu"}</span>
            </div>
            
            <button class="genre-btn btn-outline-blue mt-15 w-100" onclick="localStorage.setItem('currentOeuvreId', ${histoire.id}); window.changerDePage('oeuvre');">Ouvrir le Grimoire</button>
        `;
        
        conteneur.appendChild(carte);
    });
};

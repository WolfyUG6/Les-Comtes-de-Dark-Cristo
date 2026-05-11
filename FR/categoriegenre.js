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
                <button class="genre-btn btn-primary shadow-active mt-15" onclick="window.tenterAccesCreationHistoire();">Forger le premier récit</button>
            </div>
        `;
        return;
    }

    // --- CONSTRUCTION DES CARTES ---
    const [statsParHistoire, vuesParHistoire] = await Promise.all([
        window.chargerStatsCartesHistoires(histoires),
        window.chargerVuesActuellesHistoires(histoires)
    ]);
    const histoiresAvecVues = window.ajouterVuesActuellesAuxHistoires(histoires, vuesParHistoire);
    const histoiresAvecStats = window.ajouterStatsAuxHistoires(histoiresAvecVues, statsParHistoire);

    histoiresAvecStats.forEach(histoire => {
        conteneur.appendChild(window.creerCarteHistoire(histoire));
    });
};

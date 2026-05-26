// ==========================================
// L'ESPACE PERSONNEL (favoris.js)
// Gestion des pactes et archives
// ==========================================

window.chargerFavoris = async function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // 1. Gestion des onglets
    initialiserOngletsFavoris();

    // 2. Charger les pactes et archives
    await chargerMesPactes();
    await chargerArchives();

    // 3. Ecouteur de tri
    const sortSelect = document.getElementById('sort-pactes');
    if (sortSelect) {
        sortSelect.addEventListener('change', chargerMesPactes);
    }
};

function initialiserOngletsFavoris() {
    const boutons = document.querySelectorAll('.btn-tab-favoris');
    const contenus = document.querySelectorAll('.tab-content-favoris');

    boutons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Retirer l'état actif de tous les boutons
            boutons.forEach(b => {
                b.classList.remove('btn-primary', 'shadow-active');
            });
            // Activer le bouton cliqué
            e.target.classList.add('btn-primary', 'shadow-active');

            // Masquer tous les contenus
            contenus.forEach(c => c.classList.add('hidden'));

            // Afficher le contenu ciblé
            const cibleId = e.target.getAttribute('data-tab');
            const cibleDiv = document.getElementById(cibleId);
            if (cibleDiv) {
                cibleDiv.classList.remove('hidden');
            }
        });
    });
}

function trierOeuvresFavoris(oeuvres = [], sortBy = 'recent') {
    return [...oeuvres].sort((a, b) => {
        if (sortBy === 'recent') {
            return b.date_pacte - a.date_pacte;
        } else if (sortBy === 'ancien') {
            return a.date_pacte - b.date_pacte;
        } else if (sortBy === 'az') {
            return a.titre.localeCompare(b.titre);
        } else if (sortBy === 'za') {
            return b.titre.localeCompare(a.titre);
        }
        return 0;
    });
}

async function dessinerCartesFavoris(grille, pactesRefs, sortBy = 'recent') {
    const idsHistoires = pactesRefs.map(p => p.histoire_id);

    const { data: histoires, error: errHistoires } = await window._supabase
        .from('histoires')
        .select('*')
        .in('id', idsHistoires);

    if (errHistoires) {
        grille.innerHTML = `<p class="text-error text-center">${window.t?.('favorites.storyFetchErrorPrefix', {}, 'Erreur lors de la lecture des grimoires :') || 'Erreur lors de la lecture des grimoires :'} ${errHistoires.message}</p>`;
        return;
    }

    let oeuvresFusionnees = histoires.map(h => {
        const reference = pactesRefs.find(p => p.histoire_id === h.id);
        return {
            ...h,
            date_pacte: reference ? new Date(reference.created_at) : new Date(0)
        };
    });

    oeuvresFusionnees = trierOeuvresFavoris(oeuvresFusionnees, sortBy);

    grille.innerHTML = '';
    grille.className = 'stories-grid';

    if (typeof window.creerCarteHistoire !== 'function') {
        grille.innerHTML = `<p class="text-error text-center">${window.t?.('favorites.storyFetchErrorPrefix', {}, 'Erreur lors de la lecture des grimoires :') || 'Erreur lors de la lecture des grimoires :'} affichage indisponible.</p>`;
        return;
    }

    const [statsParHistoire, vuesParHistoire] = await Promise.all([
        typeof window.chargerStatsCartesHistoires === 'function'
            ? window.chargerStatsCartesHistoires(oeuvresFusionnees)
            : new Map(),
        typeof window.chargerVuesActuellesHistoires === 'function'
            ? window.chargerVuesActuellesHistoires(oeuvresFusionnees)
            : new Map()
    ]);

    const oeuvresAvecVues = typeof window.ajouterVuesActuellesAuxHistoires === 'function'
        ? window.ajouterVuesActuellesAuxHistoires(oeuvresFusionnees, vuesParHistoire)
        : oeuvresFusionnees;
    const oeuvresAvecStats = typeof window.ajouterStatsAuxHistoires === 'function'
        ? window.ajouterStatsAuxHistoires(oeuvresAvecVues, statsParHistoire)
        : oeuvresAvecVues;

    oeuvresAvecStats.forEach((histoire) => {
        grille.appendChild(window.creerCarteHistoire(histoire));
    });
}

async function chargerMesPactes() {
    const grille = document.getElementById('pactes-grid');
    if (!grille) return;

    grille.innerHTML = `<p class="loading-text text-center">${window.t?.('favorites.loading', {}, 'Interrogation des registres...') || 'Interrogation des registres...'}</p>`;

    // 1. Vérifier que l'utilisateur est connecté
    const { data: { session } } = await window._supabase.auth.getSession();
    if (!session) {
        grille.innerHTML = `<p class="text-error text-center">${window.t?.('favorites.loginRequired', {}, 'Vous devez avoir scellé un pacte avec le Sanctuaire (être connecté) pour voir vos lectures.') || 'Vous devez avoir scellé un pacte avec le Sanctuaire (être connecté) pour voir vos lectures.'}</p>`;
        return;
    }

    const userId = session.user.id;

    // 2. Récupérer les données des oeuvres favorites de l'utilisateur
    // On récupère "histoire_id" et "created_at" (qui représente la date du pacte)
    const { data: pactesRefs, error: errRefs } = await window._supabase
        .from('favoris')
        .select('histoire_id, created_at')
        .eq('user_id', userId)
        .eq('est_archive', false);

    if (errRefs) {
        grille.innerHTML = `<p class="text-error text-center">${window.t?.('favorites.fetchErrorPrefix', {}, "Erreur lors de l'accès aux archives :") || "Erreur lors de l'accès aux archives :"} ${errRefs.message}</p>`;
        return;
    }

    if (!pactesRefs || pactesRefs.length === 0) {
        grille.innerHTML = `
            <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 50px;">
                <h2 style="font-family: 'Cinzel', serif; color: var(--text-title); font-size: 2rem;">${window.t?.('favorites.emptyTitle', {}, 'Le silence règne ici...') || 'Le silence règne ici...'}</h2>
                <p class="text-muted-italic text-center mt-10" style="font-size: 1.1rem;">${window.t?.('favorites.emptyText', {}, "Aucun pacte n'a encore été scellé.") || "Aucun pacte n'a encore été scellé."}</p>
            </div>
        `;
        return;
    }

    const sortSelect = document.getElementById('sort-pactes');
    const sortBy = sortSelect ? sortSelect.value : 'recent';

    await dessinerCartesFavoris(grille, pactesRefs, sortBy);
}

async function chargerArchives() {
    const grille = document.getElementById('archives-grid');
    if (!grille) return;

    grille.innerHTML = `<p class="loading-text text-center">${window.t?.('favorites.loadingArchives', {}, 'Ouverture des archives...') || 'Ouverture des archives...'}</p>`;

    const { data: { session } } = await window._supabase.auth.getSession();
    if (!session) {
        grille.innerHTML = `<p class="text-error text-center">${window.t?.('favorites.loginRequired', {}, 'Vous devez avoir scellé un pacte avec le Sanctuaire (être connecté) pour voir vos lectures.') || 'Vous devez avoir scellé un pacte avec le Sanctuaire (être connecté) pour voir vos lectures.'}</p>`;
        return;
    }

    const { data: archivesRefs, error: errRefs } = await window._supabase
        .from('favoris')
        .select('histoire_id, created_at')
        .eq('user_id', session.user.id)
        .eq('est_archive', true);

    if (errRefs) {
        grille.innerHTML = `<p class="text-error text-center">${window.t?.('favorites.fetchErrorPrefix', {}, "Erreur lors de l'accès aux archives :") || "Erreur lors de l'accès aux archives :"} ${errRefs.message}</p>`;
        return;
    }

    if (!archivesRefs || archivesRefs.length === 0) {
        grille.innerHTML = `
            <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 50px;">
                <h2 style="font-family: 'Cinzel', serif; color: var(--text-title); font-size: 2rem;">${window.t?.('favorites.emptyArchivesTitle', {}, 'Aucune archive pour le moment.') || 'Aucune archive pour le moment.'}</h2>
                <p class="text-muted-italic text-center mt-10" style="font-size: 1.1rem;">${window.t?.('favorites.emptyArchivesText', {}, "Les œuvres rangées de côté apparaîtront ici.") || "Les œuvres rangées de côté apparaîtront ici."}</p>
            </div>
        `;
        return;
    }

    await dessinerCartesFavoris(grille, archivesRefs, 'recent');
}

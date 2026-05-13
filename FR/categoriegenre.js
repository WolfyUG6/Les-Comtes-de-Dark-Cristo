// ==========================================
// AFFICHAGE PAR GENRE (categoriegenre.js)
// ==========================================

function getTriCategorieActif() {
    return document.getElementById('category-sort')?.value || 'published_desc';
}

function getAuteurTriCategorie(histoire) {
    return histoire?.pseudo_auteur || histoire?.auteur?.split('@')?.[0] || '';
}

function comparerTexteCategorie(a = '', b = '') {
    const locale = window.getLocaleAffichageSite?.() || 'fr';
    return String(a || '').localeCompare(String(b || ''), locale, {
        sensitivity: 'base',
        numeric: true
    });
}

function getTimestampCategorie(value) {
    const timestamp = value ? new Date(value).getTime() : 0;
    return Number.isNaN(timestamp) ? 0 : timestamp;
}

async function chargerDernieresPublicationsChapitresCategorie(histoires = []) {
    const idsHistoires = [...new Set(
        (histoires || [])
            .map((histoire) => Number(histoire?.id))
            .filter(Boolean)
    )];

    const datesParHistoire = new Map();
    if (idsHistoires.length === 0) return datesParHistoire;

    const maintenantIso = new Date().toISOString();
    const { data, error } = await window._supabase
        .from('histoires')
        .select('id, chapitres(date_publication)')
        .in('id', idsHistoires)
        .eq('chapitres.est_publie', true)
        .lte('chapitres.date_publication', maintenantIso)
        .order('date_publication', { referencedTable: 'chapitres', ascending: false })
        .limit(1, { referencedTable: 'chapitres' });

    if (error) {
        console.error('Erreur de lecture des dernières publications :', error);
        return datesParHistoire;
    }

    (data || []).forEach((histoire) => {
        const dernierChapitre = Array.isArray(histoire.chapitres) ? histoire.chapitres[0] : null;
        if (dernierChapitre?.date_publication) {
            datesParHistoire.set(Number(histoire.id), dernierChapitre.date_publication);
        }
    });

    return datesParHistoire;
}

async function trierHistoiresCategorie(histoires = [], tri = 'published_desc') {
    const histoiresTriees = [...(histoires || [])];

    if (tri === 'updated_desc') {
        const datesParHistoire = await chargerDernieresPublicationsChapitresCategorie(histoiresTriees);
        histoiresTriees.sort((a, b) => {
            const dateB = getTimestampCategorie(datesParHistoire.get(Number(b.id)));
            const dateA = getTimestampCategorie(datesParHistoire.get(Number(a.id)));
            if (dateB !== dateA) return dateB - dateA;
            return getTimestampCategorie(b.date_publication) - getTimestampCategorie(a.date_publication);
        });
        return histoiresTriees;
    }

    histoiresTriees.sort((a, b) => {
        if (tri === 'name_asc') return comparerTexteCategorie(a.titre, b.titre);
        if (tri === 'name_desc') return comparerTexteCategorie(b.titre, a.titre);
        if (tri === 'author_asc') return comparerTexteCategorie(getAuteurTriCategorie(a), getAuteurTriCategorie(b));
        if (tri === 'author_desc') return comparerTexteCategorie(getAuteurTriCategorie(b), getAuteurTriCategorie(a));
        if (tri === 'published_asc') return getTimestampCategorie(a.date_publication) - getTimestampCategorie(b.date_publication);
        return getTimestampCategorie(b.date_publication) - getTimestampCategorie(a.date_publication);
    });

    return histoiresTriees;
}

window.chargerGenre = async function() {
    console.log("Lecture du rayon spécifié...");

    const conteneur = document.getElementById('genre-stories-list');
    const titrePage = document.getElementById('genre-page-title');
    
    // Récupération de la thématique choisie et mémorisée
    const genreChoisi = localStorage.getItem('currentGenre');
    const langueActive = ['FR', 'EN', 'JP'].includes(String(window._siteLocale || '').toUpperCase())
        ? String(window._siteLocale).toUpperCase()
        : 'FR';

    if (!conteneur || !titrePage) return;

    if (!genreChoisi) {
        titrePage.innerText = window.t?.('category.unknownTitle', {}, 'Rayonnage Inconnu') || 'Rayonnage Inconnu';
        conteneur.innerHTML = `<p class="text-error text-center">${window.t?.('category.missingGenre', {}, "Aucun genre n'a été spécifié. L'âme vagabonde...") || "Aucun genre n'a été spécifié. L'âme vagabonde..."}</p>`;
        return;
    }

    // Mise à jour magique du titre
    titrePage.innerText = window.t?.('category.title', { genre: window.traduireGenreSite?.(genreChoisi) || genreChoisi }, `Rayonnage : ${genreChoisi}`) || `Rayonnage : ${genreChoisi}`;
    conteneur.innerHTML = `<p class="loading-text w-100">${window.t?.('category.loading', {}, "Les manuscrits s'extirpent des abysses...") || "Les manuscrits s'extirpent des abysses..."}</p>`;

    // --- REQUÊTE SUPABASE ---
    const { data: histoires, error } = await window._supabase
        .from('histoires')
        .select('*')
        .eq('genre', genreChoisi)
        .eq('langue', langueActive)
        .order('date_publication', { ascending: false });

    if (error) {
        console.error("Erreur de bibliothèque :", error);
        conteneur.innerHTML = `<p class="text-error w-100 text-center">${window.t?.('category.error', {}, 'Le portail temporel a vacillé :') || 'Le portail temporel a vacillé :'} ${error.message}</p>`;
        return;
    }

    conteneur.innerHTML = '';

    // --- CAS "ZÉRO RÉSULTAT" ---
    if (!histoires || histoires.length === 0) {
        conteneur.innerHTML = `
            <div class="welcome-content w-100 text-center" style="border:none; margin-top: 40px;">
                <h3 class="title-m0 text-muted">Le silence règne ici...</h3>
                <p class="text-muted-italic mt-15">${window.t?.('category.empty', { genre: window.traduireGenreSite?.(genreChoisi) || genreChoisi }, `Aucun grimoire n'a encore été gravé dans le rayon <strong>${genreChoisi}</strong>. Serez-vous le premier ?`) || `Aucun grimoire n'a encore été gravé dans le rayon <strong>${genreChoisi}</strong>. Serez-vous le premier ?`}</p>
                <button class="genre-btn btn-primary shadow-active mt-15" onclick="window.tenterAccesCreationHistoire();">${window.t?.('category.forgeFirst', {}, 'Forger le premier récit') || 'Forger le premier récit'}</button>
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
    const histoiresTriees = await trierHistoiresCategorie(histoiresAvecStats, getTriCategorieActif());

    histoiresTriees.forEach(histoire => {
        conteneur.appendChild(window.creerCarteHistoire(histoire));
    });
};

if (!window.categorieGenreEventsHooked) {
    document.addEventListener('change', (event) => {
        if (event.target?.id === 'category-sort' && window._pageCourante === 'categorie-genre') {
            window.chargerGenre();
        }
    });

    window.categorieGenreEventsHooked = true;
}

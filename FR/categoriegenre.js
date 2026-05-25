// ==========================================
// AFFICHAGE PAR GENRE (categoriegenre.js)
// ==========================================

const GENRE_GENERAL_SITE = 'general';

window._categorieGenreState = window._categorieGenreState || {
    histoires: [],
    pageCourante: 1,
    taillePage: 15
};

function getTriCategorieActif() {
    return document.getElementById('category-sort')?.value || 'published_desc';
}

function getTaillePageCategorie() {
    const select = document.getElementById('category-page-size');
    const valeur = Number(select?.value || window._categorieGenreState.taillePage || 15);
    return [15, 30, 50].includes(valeur) ? valeur : 15;
}

function getRechercheCategorie() {
    return String(document.getElementById('category-search')?.value || '').trim().toLowerCase();
}

function estGenreGeneralSite(genre = '') {
    return String(genre || '').toLowerCase() === GENRE_GENERAL_SITE;
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

function filtrerHistoiresCategorie(histoires = []) {
    const recherche = getRechercheCategorie();
    if (!recherche) return histoires;

    return histoires.filter((histoire) => {
        const champs = [
            histoire?.titre,
            getAuteurTriCategorie(histoire),
            histoire?.synopsis,
            histoire?.genre
        ];

        return champs.some((champ) => String(champ || '').toLowerCase().includes(recherche));
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
        console.error('Erreur de lecture des dernieres publications :', error);
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

function getPagesPaginationCategorie(totalPages, pageCourante) {
    const pages = new Set([1, totalPages, pageCourante]);
    for (let i = pageCourante - 2; i <= pageCourante + 2; i++) {
        if (i >= 1 && i <= totalPages) pages.add(i);
    }
    return [...pages].sort((a, b) => a - b);
}

function dessinerPaginationCategorie(totalItems) {
    const pagination = document.getElementById('category-pagination');
    if (!pagination) return;

    const state = window._categorieGenreState;
    const totalPages = Math.max(1, Math.ceil(totalItems / state.taillePage));
    state.pageCourante = Math.min(Math.max(1, state.pageCourante), totalPages);

    if (totalPages <= 1) {
        pagination.classList.add('hidden');
        pagination.innerHTML = '';
        return;
    }

    pagination.classList.remove('hidden');
    pagination.innerHTML = '';

    const boutons = [
        { label: '«', page: 1, disabled: state.pageCourante === 1 },
        { label: '-5', page: Math.max(1, state.pageCourante - 5), disabled: state.pageCourante === 1 },
        { label: '‹', page: Math.max(1, state.pageCourante - 1), disabled: state.pageCourante === 1 }
    ];

    getPagesPaginationCategorie(totalPages, state.pageCourante).forEach((page) => {
        boutons.push({ label: String(page), page, active: page === state.pageCourante });
    });

    boutons.push(
        { label: '›', page: Math.min(totalPages, state.pageCourante + 1), disabled: state.pageCourante === totalPages },
        { label: '+5', page: Math.min(totalPages, state.pageCourante + 5), disabled: state.pageCourante === totalPages },
        { label: '»', page: totalPages, disabled: state.pageCourante === totalPages }
    );

    boutons.forEach((config) => {
        const bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.className = `genre-btn chapter-page-btn${config.active ? ' active' : ''}`;
        bouton.dataset.categoryPage = config.page;
        bouton.disabled = Boolean(config.disabled);
        bouton.textContent = config.label;
        pagination.appendChild(bouton);
    });
}

function dessinerHistoiresCategorie() {
    const conteneur = document.getElementById('genre-stories-list');
    if (!conteneur) return;

    const state = window._categorieGenreState;
    state.taillePage = getTaillePageCategorie();

    const histoires = filtrerHistoiresCategorie(state.histoires || []);

    if (histoires.length === 0) {
        conteneur.innerHTML = `<p class="text-muted-italic text-center w-100 mt-15">${window.t?.('category.searchEmpty', {}, "Aucune histoire ne correspond a cette recherche.") || "Aucune histoire ne correspond a cette recherche."}</p>`;
        dessinerPaginationCategorie(0);
        window.programmerMiseAJourScrollRapideSite?.();
        return;
    }

    const totalPages = Math.max(1, Math.ceil(histoires.length / state.taillePage));
    state.pageCourante = Math.min(Math.max(1, state.pageCourante), totalPages);

    const debut = (state.pageCourante - 1) * state.taillePage;
    const histoiresPage = histoires.slice(debut, debut + state.taillePage);

    conteneur.innerHTML = '';
    histoiresPage.forEach((histoire) => {
        conteneur.appendChild(window.creerCarteHistoire(histoire));
    });

    dessinerPaginationCategorie(histoires.length);
    window.programmerMiseAJourScrollRapideSite?.();
}

window.chargerGenre = async function() {
    console.log('Lecture du rayon specifie...');

    const conteneur = document.getElementById('genre-stories-list');
    const titrePage = document.getElementById('genre-page-title');

    const genreChoisi = localStorage.getItem('currentGenre');
    const langueActive = ['FR', 'EN', 'JP'].includes(String(window._siteLocale || '').toUpperCase())
        ? String(window._siteLocale).toUpperCase()
        : 'FR';
    const estGeneral = estGenreGeneralSite(genreChoisi);

    if (!conteneur || !titrePage) return;

    window._categorieGenreState.histoires = [];
    window._categorieGenreState.pageCourante = 1;
    window._categorieGenreState.taillePage = getTaillePageCategorie();
    dessinerPaginationCategorie(0);

    if (!genreChoisi) {
        titrePage.innerText = window.t?.('category.unknownTitle', {}, 'Rayonnage Inconnu') || 'Rayonnage Inconnu';
        conteneur.innerHTML = `<p class="text-error text-center">${window.t?.('category.missingGenre', {}, "Aucun genre n'a ete specifie. L'ame vagabonde...") || "Aucun genre n'a ete specifie. L'ame vagabonde..."}</p>`;
        return;
    }

    titrePage.innerText = window.t?.('category.title', { genre: window.traduireGenreSite?.(genreChoisi) || genreChoisi }, `Rayonnage : ${genreChoisi}`) || `Rayonnage : ${genreChoisi}`;
    conteneur.innerHTML = `<p class="loading-text w-100">${window.t?.('category.loading', {}, "Les manuscrits s'extirpent des abysses...") || "Les manuscrits s'extirpent des abysses..."}</p>`;

    let requete = window._supabase
        .from('histoires')
        .select('*')
        .eq('langue', langueActive);

    if (!estGeneral) {
        requete = requete.eq('genre', genreChoisi);
    }

    const { data: histoires, error } = await requete.order('date_publication', { ascending: false });

    if (error) {
        console.error('Erreur de bibliotheque :', error);
        conteneur.innerHTML = `<p class="text-error w-100 text-center">${window.t?.('category.error', {}, 'Le portail temporel a vacille :') || 'Le portail temporel a vacille :'} ${error.message}</p>`;
        return;
    }

    if (!histoires || histoires.length === 0) {
        const messageVide = estGeneral
            ? window.t?.('category.emptyGeneral', {}, "Aucun grimoire n'a encore ete grave dans cette langue. Serez-vous le premier ?") || "Aucun grimoire n'a encore ete grave dans cette langue. Serez-vous le premier ?"
            : window.t?.('category.empty', { genre: window.traduireGenreSite?.(genreChoisi) || genreChoisi }, `Aucun grimoire n'a encore ete grave dans le rayon <strong>${genreChoisi}</strong>. Serez-vous le premier ?`) || `Aucun grimoire n'a encore ete grave dans le rayon <strong>${genreChoisi}</strong>. Serez-vous le premier ?`;

        conteneur.innerHTML = `
            <div class="welcome-content w-100 text-center" style="border:none; margin-top: 40px;">
                <h3 class="title-m0 text-muted">${window.t?.('category.emptyTitle', {}, 'Le silence regne ici...') || 'Le silence regne ici...'}</h3>
                <p class="text-muted-italic mt-15">${messageVide}</p>
                <button class="genre-btn btn-primary shadow-active mt-15" onclick="window.tenterAccesCreationHistoire();">${window.t?.('category.forgeFirst', {}, 'Forger le premier recit') || 'Forger le premier recit'}</button>
            </div>
        `;
        return;
    }

    const [statsParHistoire, vuesParHistoire] = await Promise.all([
        window.chargerStatsCartesHistoires(histoires),
        window.chargerVuesActuellesHistoires(histoires)
    ]);
    const histoiresAvecVues = window.ajouterVuesActuellesAuxHistoires(histoires, vuesParHistoire);
    const histoiresAvecStats = window.ajouterStatsAuxHistoires(histoiresAvecVues, statsParHistoire);
    const histoiresTriees = await trierHistoiresCategorie(histoiresAvecStats, getTriCategorieActif());

    window._categorieGenreState.histoires = histoiresTriees;
    dessinerHistoiresCategorie();
};

if (!window.categorieGenreEventsHooked) {
    document.addEventListener('change', (event) => {
        if (event.target?.id === 'category-sort' && window._pageCourante === 'categorie-genre') {
            window.chargerGenre();
            return;
        }

        if (event.target?.id === 'category-page-size' && window._pageCourante === 'categorie-genre') {
            window._categorieGenreState.pageCourante = 1;
            dessinerHistoiresCategorie();
        }
    });

    document.addEventListener('input', (event) => {
        if (event.target?.id !== 'category-search' || window._pageCourante !== 'categorie-genre') return;

        window._categorieGenreState.pageCourante = 1;
        dessinerHistoiresCategorie();
    });

    document.addEventListener('click', (event) => {
        const boutonPage = event.target.closest('[data-category-page]');
        if (!boutonPage || window._pageCourante !== 'categorie-genre') return;

        window._categorieGenreState.pageCourante = Number(boutonPage.dataset.categoryPage) || 1;
        dessinerHistoiresCategorie();
        document.getElementById('genre-page-title')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    window.categorieGenreEventsHooked = true;
}

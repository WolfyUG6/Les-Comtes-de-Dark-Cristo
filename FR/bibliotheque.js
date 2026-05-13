// ==========================================
// L'ARCHIVISTE (bibliotheque.js)
// Gestion de la vitrine (Accueil) et des filtres
// ==========================================

const HOME_GENRE_ORDER = [
    'High & Low Fantasy',
    'Dark Fantasy & Grimdark',
    'Romantasy Tragique',
    'Sci-Fi & Cyberpunk',
    'Horreur Psychologique'
];

function getLangueActiveAccueil() {
    const langue = String(window._siteLocale || localStorage.getItem('siteLocale') || 'FR').toUpperCase();
    return ['FR', 'EN', 'JP'].includes(langue) ? langue : 'FR';
}

function getStoryAgeClass(classification = '') {
    let classe = 'tag tag-age';

    if (classification === 'Tout public') classe += ' age-tout-public';
    else if (classification === 'R15') classe += ' age-r15';
    else if (classification === 'R16') classe += ' age-r16';
    else if (classification === 'R18') classe += ' age-r18';

    return classe;
}

function getStoryPseudo(histoire) {
    return histoire.pseudo_auteur || histoire.auteur?.split('@')[0] || window.t?.('common.unknownAuthor', {}, 'Auteur inconnu') || 'Auteur inconnu';
}

function getDefaultStoryStats() {
    return {
        chapitres: 0,
        mots: 0
    };
}

function getStoryStats(histoire) {
    return {
        ...getDefaultStoryStats(),
        ...(histoire.stats || {})
    };
}

function formaterNombreCarte(nombre) {
    return new Intl.NumberFormat('fr-FR').format(Number(nombre) || 0);
}

function libellePluriel(nombre, singulier, pluriel) {
    return Number(nombre) === 1 ? singulier : pluriel;
}

function creerBlocStatsCarte(histoire, options = {}) {
    const stats = getStoryStats(histoire);
    const chapitres = Number(stats.chapitres) || 0;
    const mots = Number(stats.mots) || 0;
    const vues = Number(options.vues ?? histoire.vues) || 0;

    return `
        <div class="story-card-stats" aria-label="Informations de l'œuvre">
            <div class="story-card-stat">
                <span class="story-card-stat-value">${formaterNombreCarte(chapitres)}</span>
                <span class="story-card-stat-label">${libellePluriel(chapitres, window.t?.('common.chapter', {}, 'chapitre') || 'chapitre', window.t?.('common.chapters', {}, 'chapitres') || 'chapitres')}</span>
            </div>
            <div class="story-card-stat">
                <span class="story-card-stat-value">${formaterNombreCarte(mots)}</span>
                <span class="story-card-stat-label">${libellePluriel(mots, window.t?.('common.word', {}, 'mot') || 'mot', window.t?.('common.words', {}, 'mots') || 'mots')}</span>
            </div>
            <div class="story-card-stat">
                <span class="story-card-stat-value">${formaterNombreCarte(vues)}</span>
                <span class="story-card-stat-label">${libellePluriel(vues, window.t?.('common.view', {}, 'vue') || 'vue', window.t?.('common.views', {}, 'vues') || 'vues')}</span>
            </div>
        </div>
    `;
}

async function chargerStatsCartesHistoires(histoires = []) {
    const statsParHistoire = new Map();
    const idsHistoires = [...new Set(
        histoires
            .map((histoire) => Number(histoire?.id))
            .filter(Boolean)
    )];

    idsHistoires.forEach((id) => statsParHistoire.set(id, getDefaultStoryStats()));

    if (idsHistoires.length === 0) return statsParHistoire;

    const { data, error } = await window._supabase
        .from('chapitres')
        .select('histoire_id, nombre_mots, date_publication')
        .in('histoire_id', idsHistoires)
        .eq('est_publie', true);

    if (error) {
        console.error('Erreur de statistiques des cartes :', error);
        return statsParHistoire;
    }

    const maintenant = new Date();

    (data || []).forEach((chapitre) => {
        const datePublication = chapitre.date_publication ? new Date(chapitre.date_publication) : null;
        if (datePublication && datePublication > maintenant) return;

        const histoireId = Number(chapitre.histoire_id);
        const stats = statsParHistoire.get(histoireId) || getDefaultStoryStats();

        stats.chapitres += 1;
        stats.mots += Number(chapitre.nombre_mots) || 0;
        statsParHistoire.set(histoireId, stats);
    });

    return statsParHistoire;
}

function ajouterStatsAuxHistoires(histoires = [], statsParHistoire = new Map()) {
    return histoires.map((histoire) => ({
        ...histoire,
        stats: statsParHistoire.get(Number(histoire.id)) || getDefaultStoryStats()
    }));
}

async function chargerVuesActuellesHistoires(histoires = []) {
    const vuesParHistoire = new Map();
    const idsHistoires = [...new Set(
        histoires
            .map((histoire) => Number(histoire?.id))
            .filter(Boolean)
    )];

    if (idsHistoires.length === 0) return vuesParHistoire;

    const { data, error } = await window._supabase
        .from('histoires')
        .select('id, vues')
        .in('id', idsHistoires);

    if (error) {
        console.error('Erreur de récupération des vues des cartes :', error);
        return vuesParHistoire;
    }

    (data || []).forEach((histoire) => {
        vuesParHistoire.set(Number(histoire.id), Number(histoire.vues) || 0);
    });

    return vuesParHistoire;
}

function ajouterVuesActuellesAuxHistoires(histoires = [], vuesParHistoire = new Map()) {
    return histoires.map((histoire) => {
        const vuesActuelles = vuesParHistoire.get(Number(histoire.id));

        return {
            ...histoire,
            vues: vuesActuelles ?? histoire.vues
        };
    });
}

function ouvrirHistoireDepuisCarte(histoire) {
    if (typeof window.ouvrirPageOeuvre === 'function') {
        window.ouvrirPageOeuvre({
            id: histoire?.id,
            slug: histoire?.slug
        });
        return;
    }

    localStorage.setItem('currentOeuvreId', histoire.id);
    window.changerDePage('oeuvre', { id: histoire.id });
}

function creerCarteHistoire(histoire, options = {}) {
    const {
        miseEnAvant = false,
        score = null,
        followersCount = 0,
        vues = null
    } = options;

    const card = document.createElement('div');
    card.className = `story-card${miseEnAvant ? ' story-card-highlight' : ''}`;

    const imageCouverture = window.getStoryCoverUrl(histoire.image_couverture);
    const pseudo = getStoryPseudo(histoire);
    const ageClass = getStoryAgeClass(histoire.classification || 'Tout public');
    const tagSensible = histoire.contenu_sensible
        ? `<span class="tag tag-sensible">${window.t?.('home.sensitiveOn', {}, '⚠️ Sensible') || '⚠️ Sensible'}</span>`
        : `<span class="tag tag-sensible-off">${window.t?.('home.sensitiveOff', {}, 'Sensible') || 'Sensible'}</span>`;

    card.innerHTML = `
        ${miseEnAvant ? `<span class="story-highlight-kicker">${window.t?.('home.highlightKicker', {}, 'Mise en avant hebdomadaire') || 'Mise en avant hebdomadaire'}</span>` : ''}
        <img src="${imageCouverture}" alt="${histoire.titre}">
        <div class="story-tags">
            <span class="tag tag-genre">${window.traduireGenreSite?.(histoire.genre) || histoire.genre}</span>
            <span class="tag tag-statut">${window.traduireStatutSite?.(histoire.statut) || histoire.statut || '✍️ En cours'}</span>
            <span class="${ageClass}">${window.traduireClassificationSite?.(histoire.classification) || histoire.classification || 'Tout public'}</span>
            ${tagSensible}
        </div>
        <h3>${histoire.titre}</h3>
        <span class="text-small text-muted">${window.t?.('home.byAuthor', { pseudo }, `Par Comte ${pseudo}`) || `Par Comte ${pseudo}`}</span>
        ${creerBlocStatsCarte(histoire, { vues })}
        <button class="genre-btn w-100 mt-15" type="button">${miseEnAvant ? (window.t?.('home.discoverStory', {}, "Découvrir l'œuvre") || "Découvrir l'œuvre") : (window.t?.('home.readStory', {}, "Lire l'œuvre") || "Lire l'œuvre")}</button>
    `;

    const image = card.querySelector('img');
    const title = card.querySelector('h3');
    const button = card.querySelector('button');

    [image, title, button].forEach((element) => {
        if (!element) return;
        element.addEventListener('click', () => ouvrirHistoireDepuisCarte(histoire));
    });

    return card;
}

window.creerCarteHistoire = creerCarteHistoire;
window.chargerStatsCartesHistoires = chargerStatsCartesHistoires;
window.ajouterStatsAuxHistoires = ajouterStatsAuxHistoires;
window.chargerVuesActuellesHistoires = chargerVuesActuellesHistoires;
window.ajouterVuesActuellesAuxHistoires = ajouterVuesActuellesAuxHistoires;

function trierMisesEnAvantParGenre(histoires = []) {
    return [...histoires].sort((a, b) => {
        const indexA = HOME_GENRE_ORDER.indexOf(a.genre);
        const indexB = HOME_GENRE_ORDER.indexOf(b.genre);
        const ordreA = indexA === -1 ? Number.MAX_SAFE_INTEGER : indexA;
        const ordreB = indexB === -1 ? Number.MAX_SAFE_INTEGER : indexB;

        if (ordreA !== ordreB) {
            return ordreA - ordreB;
        }

        return (a.genre || '').localeCompare(b.genre || '', 'fr');
    });
}

function dedoublonnerMisesEnAvantParGenre(selections = []) {
    const genresVus = new Set();

    return trierMisesEnAvantParGenre(selections).filter((selection) => {
        const genre = (selection?.genre || '').trim().toLowerCase();

        if (!genre || genresVus.has(genre)) {
            return false;
        }

        genresVus.add(genre);
        return true;
    });
}

async function filtrerMisesEnAvantParLangue(selections = [], langueActive = 'FR') {
    const selectionsValides = (selections || []).filter(Boolean);
    if (selectionsValides.length === 0) return [];

    const toutesAvecLangue = selectionsValides.every((selection) => 'langue' in selection);
    if (toutesAvecLangue) {
        return selectionsValides.filter((selection) => String(selection.langue || 'FR').toUpperCase() === langueActive);
    }

    const idsHistoires = [...new Set(
        selectionsValides
            .map((selection) => Number(selection.histoire_id || selection.id))
            .filter(Boolean)
    )];

    if (idsHistoires.length === 0) return [];

    const { data, error } = await window._supabase
        .from('histoires')
        .select('id')
        .in('id', idsHistoires)
        .eq('langue', langueActive);

    if (error) {
        console.error('Erreur de filtrage des mises en avant par langue :', error);
        return [];
    }

    const idsAutorises = new Set((data || []).map((histoire) => Number(histoire.id)));
    return selectionsValides.filter((selection) => idsAutorises.has(Number(selection.histoire_id || selection.id)));
}

async function chargerCandidatsMisesEnAvantLangue(langueActive = 'FR') {
    const { data: histoires, error } = await window._supabase
        .from('histoires')
        .select('*')
        .eq('langue', langueActive)
        .order('date_publication', { ascending: false })
        .limit(60);

    if (error) {
        console.error('Erreur de lecture des mises en avant par langue :', error);
        return [];
    }

    const idsHistoires = (histoires || [])
        .map((histoire) => Number(histoire.id))
        .filter(Boolean);

    const pactesParHistoire = new Map();
    if (idsHistoires.length > 0) {
        const { data: pactes, error: pactesError } = await window._supabase
            .from('favoris')
            .select('histoire_id')
            .in('histoire_id', idsHistoires);

        if (!pactesError) {
            (pactes || []).forEach((pacte) => {
                const histoireId = Number(pacte.histoire_id);
                pactesParHistoire.set(histoireId, (pactesParHistoire.get(histoireId) || 0) + 1);
            });
        }
    }

    return (histoires || [])
        .map((histoire) => {
            const followersCount = pactesParHistoire.get(Number(histoire.id)) || 0;
            return {
                histoire_id: histoire.id,
                titre: histoire.titre,
                synopsis: histoire.synopsis,
                genre: histoire.genre,
                classification: histoire.classification,
                statut: histoire.statut,
                contenu_sensible: histoire.contenu_sensible,
                image_couverture: histoire.image_couverture,
                pseudo_auteur: histoire.pseudo_auteur,
                auteur: histoire.auteur,
                vues: histoire.vues,
                slug: histoire.slug,
                score: followersCount + (Number(histoire.vues) || 0),
                followers_count: followersCount
            };
        })
        .sort((a, b) => {
            if ((b.followers_count || 0) !== (a.followers_count || 0)) {
                return (b.followers_count || 0) - (a.followers_count || 0);
            }
            if ((b.vues || 0) !== (a.vues || 0)) {
                return (b.vues || 0) - (a.vues || 0);
            }
            return (b.histoire_id || 0) - (a.histoire_id || 0);
        });
}

async function chargerMisesEnAvantHebdomadairesAccueil() {
    const section = document.getElementById('weekly-highlights-section');
    const container = document.getElementById('weekly-highlights-container');

    if (!section || !container) return { ids: [], genres: [] };

    section.classList.remove('hidden');
    container.innerHTML = `<p class="loading-text">${window.t?.('home.weeklyHighlights.loading', {}, 'Lecture des mises en avant hebdomadaires...') || 'Lecture des mises en avant hebdomadaires...'}</p>`;

    const langueActive = getLangueActiveAccueil();
    const { data, error } = await window._supabase.rpc('get_mises_en_avant_hebdomadaires_courantes');

    if (error) {
        console.error('Erreur de mise en avant hebdomadaire :', error);
        container.innerHTML = `<p class="loading-text">${window.t?.('home.weeklyHighlights.unavailable', {}, 'Les mises en avant hebdomadaires ne sont pas encore disponibles.') || 'Les mises en avant hebdomadaires ne sont pas encore disponibles.'}</p>`;
        return { ids: [], genres: [] };
    }

    const selectionsLangue = await filtrerMisesEnAvantParLangue(data || [], langueActive);
    const candidatsLangue = await chargerCandidatsMisesEnAvantLangue(langueActive);
    const selectionsCompletes = [
        ...selectionsLangue,
        ...candidatsLangue
    ];

    if (!selectionsCompletes || selectionsCompletes.length === 0) {
        container.innerHTML = `<p class="loading-text">${window.t?.('home.weeklyHighlights.empty', {}, 'Aucune mise en avant hebdomadaire n’a encore été calculée.') || 'Aucune mise en avant hebdomadaire n’a encore été calculée.'}</p>`;
        return { ids: [], genres: [] };
    }

    container.innerHTML = '';
    const selectionsUniques = dedoublonnerMisesEnAvantParGenre(selectionsCompletes);
    const histoiresSelectionnees = selectionsUniques.map((selection) => ({
        id: selection.histoire_id,
        titre: selection.titre,
        synopsis: selection.synopsis,
        genre: selection.genre,
        classification: selection.classification,
        statut: selection.statut,
        contenu_sensible: selection.contenu_sensible,
        image_couverture: selection.image_couverture,
        pseudo_auteur: selection.pseudo_auteur,
        auteur: selection.auteur,
        vues: selection.vues,
        slug: selection.slug
    }));
    const [statsParHistoire, vuesParHistoire] = await Promise.all([
        chargerStatsCartesHistoires(histoiresSelectionnees),
        chargerVuesActuellesHistoires(histoiresSelectionnees)
    ]);
    const histoiresAvecVues = ajouterVuesActuellesAuxHistoires(histoiresSelectionnees, vuesParHistoire);

    selectionsUniques.forEach((selection, index) => {
        const histoire = {
            ...histoiresAvecVues[index],
            stats: statsParHistoire.get(Number(selection.histoire_id)) || getDefaultStoryStats()
        };

        container.appendChild(creerCarteHistoire(histoire, {
            miseEnAvant: true,
            score: selection.score,
            followersCount: selection.followers_count
        }));
    });

    return {
        ids: selectionsUniques.map((selection) => Number(selection.histoire_id)),
        genres: selectionsUniques
            .map((selection) => (selection.genre || '').trim().toLowerCase())
            .filter(Boolean)
    };
}

window.chargerVitrine = async function(genreFilter = null) {
    const storiesContainer = document.getElementById('stories-container');
    const weeklyHighlightsSection = document.getElementById('weekly-highlights-section');
    const langueActive = getLangueActiveAccueil();

    if (!storiesContainer) return;

    storiesContainer.innerHTML = `<p class="loading-text">${window.t?.('home.loadingStories', {}, 'Ouverture des grimoires...') || 'Ouverture des grimoires...'}</p>`;

    let chargementMiseEnAvant = Promise.resolve({ ids: [], genres: [] });

    if (!genreFilter || genreFilter === 'accueil') {
        chargementMiseEnAvant = chargerMisesEnAvantHebdomadairesAccueil();
    } else if (weeklyHighlightsSection) {
        weeklyHighlightsSection.classList.add('hidden');
    }

    let query = window._supabase
        .from('histoires')
        .select('*')
        .eq('langue', langueActive)
        .order('date_publication', { ascending: false });

    if (genreFilter && genreFilter !== 'accueil') {
        query = query.eq('genre', genreFilter);
    } else {
        query = query.limit(12);
    }

    const { data: histoires, error } = await query;
    const misesEnAvant = await chargementMiseEnAvant;

    if (error) {
        storiesContainer.innerHTML = `<p class="text-error">Erreur de lecture : ${error.message}</p>`;
        return;
    }

    storiesContainer.innerHTML = '';

    const idsMisEnAvant = new Set((misesEnAvant?.ids || []).map((id) => Number(id)));
    const genresMisEnAvant = new Set((misesEnAvant?.genres || []).map((genre) => genre.toLowerCase()));
    const histoiresAffichees = (!genreFilter || genreFilter === 'accueil')
        ? (histoires || [])
            .filter((histoire) => {
                const genre = (histoire?.genre || '').trim().toLowerCase();
                return !idsMisEnAvant.has(Number(histoire.id)) && !genresMisEnAvant.has(genre);
            })
            .slice(0, 5)
        : (histoires || []);

    if (!histoiresAffichees || histoiresAffichees.length === 0) {
        storiesContainer.innerHTML = (!genreFilter || genreFilter === 'accueil')
            ? `<p class="loading-text">${window.t?.('home.noStories', {}, 'Aucune autre œuvre n’est visible pour le moment.') || 'Aucune autre œuvre n’est visible pour le moment.'}</p>`
            : `<p class="loading-text">${window.t?.('home.categoryEmpty', {}, 'Aucune œuvre trouvée dans ces ténèbres pour le moment...') || 'Aucune œuvre trouvée dans ces ténèbres pour le moment...'}</p>`;
        return;
    }

    const statsParHistoire = await chargerStatsCartesHistoires(histoiresAffichees);
    const histoiresAvecStats = ajouterStatsAuxHistoires(histoiresAffichees, statsParHistoire);

    histoiresAvecStats.forEach((histoire) => {
        storiesContainer.appendChild(creerCarteHistoire(histoire));
    });
};

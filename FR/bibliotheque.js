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

function getStoryAgeClass(classification = '') {
    let classe = 'tag tag-age';

    if (classification === 'Tout public') classe += ' age-tout-public';
    else if (classification === 'R15') classe += ' age-r15';
    else if (classification === 'R16') classe += ' age-r16';
    else if (classification === 'R18') classe += ' age-r18';

    return classe;
}

function getStoryPseudo(histoire) {
    return histoire.pseudo_auteur || histoire.auteur?.split('@')[0] || 'Auteur inconnu';
}

function getStorySynopsis(histoire) {
    return histoire.synopsis || "Cette œuvre n'a pas encore révélé ses secrets.";
}

function ouvrirHistoireDepuisCarte(histoireId) {
    localStorage.setItem('currentOeuvreId', histoireId);
    window.changerDePage('oeuvre');
}

function creerCarteHistoire(histoire, options = {}) {
    const {
        miseEnAvant = false,
        score = null,
        followersCount = 0,
        vues = 0
    } = options;

    const card = document.createElement('div');
    card.className = `story-card${miseEnAvant ? ' story-card-highlight' : ''}`;

    const imageCouverture = window.getStoryCoverUrl(histoire.image_couverture);
    const pseudo = getStoryPseudo(histoire);
    const ageClass = getStoryAgeClass(histoire.classification || 'Tout public');
    const tagSensible = histoire.contenu_sensible
        ? `<span class="tag tag-sensible">⚠️ Sensible</span>`
        : `<span class="tag tag-sensible-off">Sensible</span>`;

    card.innerHTML = `
        ${miseEnAvant ? '<span class="story-highlight-kicker">Mise en avant hebdomadaire</span>' : ''}
        <img src="${imageCouverture}" alt="${histoire.titre}">
        <div class="story-tags">
            <span class="tag tag-genre">${histoire.genre}</span>
            <span class="tag tag-statut">${histoire.statut || '✍️ En cours'}</span>
            <span class="${ageClass}">${histoire.classification || 'Tout public'}</span>
            ${tagSensible}
            ${miseEnAvant && score !== null ? `<span class="tag tag-highlight-score">Score ${score}</span>` : ''}
        </div>
        <h3>${histoire.titre}</h3>
        <span class="text-small text-muted">Par Comte ${pseudo}</span>
        ${miseEnAvant ? `
            <div class="story-highlight-stats">
                <span>👁️ ${vues || 0} vues</span>
                <span>❤️ ${followersCount || 0} pactes</span>
            </div>
        ` : ''}
        <p>${getStorySynopsis(histoire)}</p>
        <button class="genre-btn w-100 mt-15" type="button">${miseEnAvant ? "Découvrir l'œuvre" : "Lire l'œuvre"}</button>
    `;

    const image = card.querySelector('img');
    const title = card.querySelector('h3');
    const button = card.querySelector('button');

    [image, title, button].forEach((element) => {
        if (!element) return;
        element.addEventListener('click', () => ouvrirHistoireDepuisCarte(histoire.id));
    });

    return card;
}

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

async function chargerMisesEnAvantHebdomadairesAccueil() {
    const section = document.getElementById('weekly-highlights-section');
    const container = document.getElementById('weekly-highlights-container');

    if (!section || !container) return;

    section.classList.remove('hidden');
    container.innerHTML = '<p class="loading-text">Lecture des mises en avant hebdomadaires...</p>';

    const { data, error } = await window._supabase.rpc('get_mises_en_avant_hebdomadaires_courantes');

    if (error) {
        console.error('Erreur de mise en avant hebdomadaire :', error);
        container.innerHTML = '<p class="loading-text">Les mises en avant hebdomadaires ne sont pas encore disponibles.</p>';
        return;
    }

    if (!data || data.length === 0) {
        container.innerHTML = '<p class="loading-text">Aucune mise en avant hebdomadaire n’a encore été calculée.</p>';
        return;
    }

    container.innerHTML = '';

    trierMisesEnAvantParGenre(data).forEach((selection) => {
        const histoire = {
            id: selection.histoire_id,
            titre: selection.titre,
            synopsis: selection.synopsis,
            genre: selection.genre,
            classification: selection.classification,
            statut: selection.statut,
            contenu_sensible: selection.contenu_sensible,
            image_couverture: selection.image_couverture,
            pseudo_auteur: selection.pseudo_auteur,
            auteur: selection.auteur
        };

        container.appendChild(creerCarteHistoire(histoire, {
            miseEnAvant: true,
            score: selection.score,
            followersCount: selection.followers_count,
            vues: selection.vues
        }));
    });
}

window.chargerVitrine = async function(genreFilter = null) {
    const storiesContainer = document.getElementById('stories-container');
    const weeklyHighlightsSection = document.getElementById('weekly-highlights-section');

    if (!storiesContainer) return;

    storiesContainer.innerHTML = '<p class="loading-text">Ouverture des grimoires...</p>';

    let chargementMiseEnAvant = Promise.resolve();

    if (!genreFilter || genreFilter === 'accueil') {
        chargementMiseEnAvant = chargerMisesEnAvantHebdomadairesAccueil();
    } else if (weeklyHighlightsSection) {
        weeklyHighlightsSection.classList.add('hidden');
    }

    let query = window._supabase
        .from('histoires')
        .select('*')
        .order('date_publication', { ascending: false });

    if (genreFilter && genreFilter !== 'accueil') {
        query = query.eq('genre', genreFilter);
    } else {
        query = query.limit(5);
    }

    const { data: histoires, error } = await query;
    await chargementMiseEnAvant;

    if (error) {
        storiesContainer.innerHTML = `<p class="text-error">Erreur de lecture : ${error.message}</p>`;
        return;
    }

    storiesContainer.innerHTML = '';

    if (!histoires || histoires.length === 0) {
        storiesContainer.innerHTML = '<p class="loading-text">Aucune œuvre trouvée dans ces ténèbres pour le moment...</p>';
        return;
    }

    histoires.forEach((histoire) => {
        storiesContainer.appendChild(creerCarteHistoire(histoire));
    });
};

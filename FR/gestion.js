// ==========================================
// LE GESTIONNAIRE DE GRIMOIRE (gestion.js)
// Affichage des infos et tri des chapitres
// ==========================================

window.volumesOeuvreCache = [];
window.histoireGestionCache = null;
window.chapitresGestionPagination = window.chapitresGestionPagination || {
    brouillons: { items: [], pageCourante: 1, taillePage: 15 },
    programmes: { items: [], pageCourante: 1, taillePage: 15 },
    publies: { items: [], pageCourante: 1, taillePage: 15 }
};
const VOLUME_COVER_BUCKET = 'VolumeCover';

function escapeGestionHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getVolumeCoverUrl(volume, histoire) {
    return window.getStoryCoverUrl(volume?.image_couverture || histoire?.image_couverture);
}

function getVolumeTitle(volumeId) {
    if (!volumeId) return window.t?.('volumes.general', {}, 'Générale') || 'Générale';
    const volume = (window.volumesOeuvreCache || []).find((item) => Number(item.id) === Number(volumeId));
    return volume?.titre || window.t?.('volumes.general', {}, 'Générale') || 'Générale';
}

function getVolumeOrdreGestion(volumeId) {
    if (!volumeId) return 0;
    const volume = (window.volumesOeuvreCache || []).find((item) => Number(item.id) === Number(volumeId));
    return Number(volume?.ordre) || Number.MAX_SAFE_INTEGER;
}

function getOrdreChapitreGestion(chapitre) {
    return Number(chapitre?.ordre_lecture ?? ((Number(chapitre?.numero) || 0) * 1000));
}

function trierChapitresGestion(chapitres = []) {
    return [...chapitres].sort((a, b) => {
        const volumeA = getVolumeOrdreGestion(a.volume_id);
        const volumeB = getVolumeOrdreGestion(b.volume_id);
        if (volumeA !== volumeB) return volumeA - volumeB;

        const ordreA = getOrdreChapitreGestion(a);
        const ordreB = getOrdreChapitreGestion(b);
        if (ordreA !== ordreB) return ordreA - ordreB;

        return Number(a.id) - Number(b.id);
    });
}

function getNomFichierVolumeCover(file, session, histoireId) {
    const nomNettoye = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${session.user.id}/histoire-${histoireId}/${Date.now()}-${nomNettoye}`;
}

function getCheminVolumeCoverDepuisUrl(url) {
    const valeur = typeof url === 'string' ? url.trim() : '';
    if (!valeur) return null;

    const extraireDepuisPathname = (pathname) => {
        const prefixes = [
            `/storage/v1/object/public/${VOLUME_COVER_BUCKET}/`,
            `/storage/v1/object/sign/${VOLUME_COVER_BUCKET}/`
        ];
        const prefix = prefixes.find((item) => pathname.includes(item));
        if (!prefix) return null;

        const chemin = pathname.slice(pathname.indexOf(prefix) + prefix.length);
        return chemin ? decodeURIComponent(chemin) : null;
    };

    try {
        const urlObjet = new URL(valeur);
        return extraireDepuisPathname(urlObjet.pathname);
    } catch (_erreur) {
        const cheminSansParams = valeur.split('?')[0];
        return extraireDepuisPathname(cheminSansParams);
    }
}

async function supprimerCoverVolumeStorage(url) {
    const chemin = getCheminVolumeCoverDepuisUrl(url);
    if (!chemin) return;

    const { error } = await window._supabase.storage
        .from(VOLUME_COVER_BUCKET)
        .remove([chemin]);

    if (error) throw error;
}

async function uploadVolumeCover(file, histoireId, session) {
    if (!file) return null;

    let fichierAEnvoyer = file;
    try {
        fichierAEnvoyer = await imageCompression(file, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1920,
            useWebWorker: true
        });
    } catch (compressionError) {
        console.error("Erreur de compression de couverture de volume :", compressionError);
    }

    const chemin = getNomFichierVolumeCover(file, session, histoireId);
    const { error } = await window._supabase.storage
        .from(VOLUME_COVER_BUCKET)
        .upload(chemin, fichierAEnvoyer, { cacheControl: '3600', upsert: false });

    if (error) throw error;

    const { data } = window._supabase.storage.from(VOLUME_COVER_BUCKET).getPublicUrl(chemin);
    return data.publicUrl;
}

window.chargerGestionOeuvre = async function() {
    // 0. Restauration de l'ID après un F5
    if (!window.currentOeuvreId) window.currentOeuvreId = localStorage.getItem('currentOeuvreId');

    const infoPanel = document.getElementById('info-histoire-panel');
    if (!infoPanel || !window.currentOeuvreId) {
        window.changerDePage('studio'); // Retour au studio si rien n'est trouvé
        return;
    }

    infoPanel.innerHTML = `<p class="loading-text">${window.t?.('gestion.storyLoading', {}, 'Déchiffrage des runes en cours...') || 'Déchiffrage des runes en cours...'}</p>`;

    // 1. Récupération des infos de l'histoire
    const { data: histoire, error: errHistoire } = await window._supabase
        .from('histoires')
        .select('*')
        .eq('id', window.currentOeuvreId)
        .single();

    if (errHistoire || !histoire) {
        infoPanel.innerHTML = `<p class="text-error">${window.t?.('gestion.storyNotFound', {}, "Erreur : L'œuvre est introuvable dans les abysses.") || "Erreur : L'œuvre est introuvable dans les abysses."}</p>`;
        return;
    }

    window.histoireGestionCache = histoire;

    // 2. Affichage des infos avec le style de base.css
    const imageCouverture = window.getStoryCoverUrl(histoire.image_couverture);
    const imgHtml = `<img src="${imageCouverture}" class="book-cover">`;

    infoPanel.innerHTML = `
        ${imgHtml}
        <div class="book-info-content">
            <h2 class="story-title-m0">${histoire.titre}</h2>
            <div class="story-tags mb-15">
                <span class="tag tag-genre">${window.traduireGenreSite?.(histoire.genre) || histoire.genre}</span>
                <span class="tag tag-statut">${window.traduireStatutSite?.(histoire.statut) || histoire.statut || '✍️ En cours'}</span>
                <span class="tag tag-age">${window.traduireClassificationSite?.(histoire.classification) || histoire.classification || 'Tout public'}</span>
                ${histoire.contenu_sensible ? `<span class="tag tag-sensible">${window.t?.('home.sensitiveOn', {}, '⚠️ Sensible') || '⚠️ Sensible'}</span>` : ''}
            </div>
            <p class="book-synopsis">${histoire.synopsis}</p>
        </div>
    `;

    // 3. On lance la récupération des volumes et chapitres
    await chargerVolumesOeuvre();
    chargerChapitresCategories();
};

window.chargerVolumesOeuvre = async function() {
    const liste = document.getElementById('volumes-liste');
    if (!liste || !window.currentOeuvreId) return;

    liste.innerHTML = `<p class="loading-text">${window.t?.('gestion.volumesLoading', {}, 'Lecture des volumes...') || 'Lecture des volumes...'}</p>`;

    const { data: volumes, error } = await window._supabase
        .from('volumes')
        .select('*')
        .eq('histoire_id', window.currentOeuvreId)
        .order('ordre', { ascending: true })
        .order('id', { ascending: true });

    if (error) {
        liste.innerHTML = `<p class="text-error">${window.t?.('gestion.volumesError', {}, 'Erreur volumes :') || 'Erreur volumes :'} ${error.message}</p>`;
        return;
    }

    window.volumesOeuvreCache = volumes || [];
    afficherVolumesOeuvre();
};

function afficherVolumesOeuvre() {
    const liste = document.getElementById('volumes-liste');
    const histoire = window.histoireGestionCache;
    if (!liste || !histoire) return;

    liste.innerHTML = '';

    const volumeGeneral = document.createElement('article');
    volumeGeneral.className = 'volume-item volume-general';
    volumeGeneral.innerHTML = `
        <img src="${window.getStoryCoverUrl(histoire.image_couverture)}" alt="${window.t?.('volumes.generalCoverAlt', {}, 'Couverture générale') || 'Couverture générale'}" class="volume-cover-thumb">
        <div class="volume-info">
            <h3>${window.t?.('volumes.general', {}, 'Générale') || 'Générale'}</h3>
            <p>${window.t?.('volumes.defaultDescription', {}, 'Volume par défaut, non modifiable. Les chapitres sans volume restent ici.') || 'Volume par défaut, non modifiable. Les chapitres sans volume restent ici.'}</p>
        </div>
        <span class="tag tag-statut">${window.t?.('volumes.baseTag', {}, 'Base') || 'Base'}</span>
    `;
    liste.appendChild(volumeGeneral);

    if (!window.volumesOeuvreCache || window.volumesOeuvreCache.length === 0) {
        const vide = document.createElement('p');
        vide.className = 'text-muted-italic text-small';
        vide.innerText = window.t?.('volumes.customEmpty', {}, 'Aucun volume personnalisé pour le moment.') || 'Aucun volume personnalisé pour le moment.';
        liste.appendChild(vide);
        return;
    }

    window.volumesOeuvreCache.forEach((volume) => {
        const item = document.createElement('article');
        item.className = 'volume-item';
        item.innerHTML = `
            <img src="${getVolumeCoverUrl(volume, histoire)}" alt="Couverture ${escapeGestionHtml(volume.titre)}" class="volume-cover-thumb">
            <div class="volume-info">
                <h3>${escapeGestionHtml(volume.titre)}</h3>
                <p>${window.t?.('volumes.orderLabel', { order: volume.ordre || 1 }, `Ordre ${volume.ordre || 1}`) || `Ordre ${volume.ordre || 1}`}</p>
            </div>
            <button class="genre-btn btn-outline-red btn-small-last" type="button" data-volume-delete="${volume.id}">${window.t?.('common.delete', {}, 'Supprimer') || 'Supprimer'}</button>
        `;
        liste.appendChild(item);
    });
}

async function creerVolumeDepuisFormulaire(form) {
    const titreInput = document.getElementById('volume-title');
    const fileInput = document.getElementById('volume-cover-file');
    const submit = document.getElementById('btn-create-volume');
    const titre = titreInput?.value.trim();
    const file = fileInput?.files?.[0] || null;

    if (!titre) {
        await window.siteAlert(window.t?.('volumes.nameRequired', {}, 'Donnez un nom au volume avant de le créer.') || 'Donnez un nom au volume avant de le créer.', { danger: true });
        return;
    }

    const { data: { session } } = await window._supabase.auth.getSession();
    if (!session) {
        await window.siteAlert(window.t?.('volumes.loginRequired', {}, 'Vous devez être connecté pour créer un volume.') || 'Vous devez être connecté pour créer un volume.', { danger: true });
        return;
    }

    if (submit) {
        submit.disabled = true;
        submit.innerText = window.t?.('volumes.creating', {}, 'Création...') || 'Création...';
    }

    try {
        const imageUrl = file ? await uploadVolumeCover(file, window.currentOeuvreId, session) : null;
        const prochainOrdre = (window.volumesOeuvreCache || []).reduce((max, volume) => Math.max(max, Number(volume.ordre) || 0), 0) + 1;

        const { error } = await window._supabase
            .from('volumes')
            .insert([{
                histoire_id: window.currentOeuvreId,
                titre,
                image_couverture: imageUrl,
                ordre: prochainOrdre
            }]);

        if (error) throw error;

        form.reset();
        await window.chargerVolumesOeuvre();
    } catch (error) {
        await window.siteAlert(window.t?.('volumes.createError', { message: error.message }, 'Impossible de créer le volume : ' + error.message) || 'Impossible de créer le volume : ' + error.message, { danger: true });
    } finally {
        if (submit) {
            submit.disabled = false;
            submit.innerText = window.t?.('gestion.createVolume', {}, 'Créer le volume') || 'Créer le volume';
        }
    }
}

async function supprimerVolume(volumeId) {
    const volume = (window.volumesOeuvreCache || []).find((item) => Number(item.id) === Number(volumeId));
    if (!volume) return;

    const confirmation = await window.siteConfirm(window.t?.('volumes.deleteConfirm', { title: volume.titre }, `Supprimer le volume "${volume.titre}" ? Les chapitres associés retourneront dans Générale.`) || `Supprimer le volume "${volume.titre}" ? Les chapitres associés retourneront dans Générale.`, {
        confirmText: window.t?.('common.delete', {}, 'Supprimer') || 'Supprimer',
        cancelText: window.t?.('common.cancel', {}, 'Annuler') || 'Annuler',
        danger: true
    });
    if (!confirmation) return;

    try {
        await supprimerCoverVolumeStorage(volume.image_couverture);
    } catch (error) {
        await window.siteAlert(window.t?.('volumes.coverDeleteError', { message: error.message }, "Impossible de supprimer l'image du volume : " + error.message) || "Impossible de supprimer l'image du volume : " + error.message, { danger: true });
        return;
    }

    const { error } = await window._supabase
        .from('volumes')
        .delete()
        .eq('id', volumeId);

    if (error) {
        await window.siteAlert(window.t?.('volumes.deleteError', { message: error.message }, 'Impossible de supprimer le volume : ' + error.message) || 'Impossible de supprimer le volume : ' + error.message, { danger: true });
        return;
    }

    await window.chargerVolumesOeuvre();
    window.chargerChapitresCategories();
}

function getGestionPaginationConfig(type) {
    if (!window.chapitresGestionPagination[type]) {
        window.chapitresGestionPagination[type] = { items: [], pageCourante: 1, taillePage: 15 };
    }

    const select = document.querySelector(`[data-gestion-page-size="${type}"]`);
    const valeur = Number(select?.value || window.chapitresGestionPagination[type].taillePage || 15);
    window.chapitresGestionPagination[type].taillePage = [15, 30, 50].includes(valeur) ? valeur : 15;

    return window.chapitresGestionPagination[type];
}

function getPagesPaginationGestion(totalPages, pageCourante) {
    const pages = new Set([1, totalPages, pageCourante]);
    for (let i = pageCourante - 2; i <= pageCourante + 2; i++) {
        if (i >= 1 && i <= totalPages) pages.add(i);
    }
    return [...pages].sort((a, b) => a - b);
}

function dessinerPaginationGestion(type, totalItems) {
    const pagination = document.getElementById(`pagination-${type}`);
    if (!pagination) return;

    const config = getGestionPaginationConfig(type);
    const totalPages = Math.max(1, Math.ceil(totalItems / config.taillePage));
    config.pageCourante = Math.min(Math.max(1, config.pageCourante), totalPages);

    if (totalPages <= 1) {
        pagination.classList.add('hidden');
        pagination.innerHTML = '';
        return;
    }

    pagination.classList.remove('hidden');
    pagination.innerHTML = '';

    const boutons = [
        { label: '«', page: 1, disabled: config.pageCourante === 1 },
        { label: '-5', page: Math.max(1, config.pageCourante - 5), disabled: config.pageCourante === 1 },
        { label: '‹', page: Math.max(1, config.pageCourante - 1), disabled: config.pageCourante === 1 }
    ];

    getPagesPaginationGestion(totalPages, config.pageCourante).forEach((page) => {
        boutons.push({ label: String(page), page, active: page === config.pageCourante });
    });

    boutons.push(
        { label: '›', page: Math.min(totalPages, config.pageCourante + 1), disabled: config.pageCourante === totalPages },
        { label: '+5', page: Math.min(totalPages, config.pageCourante + 5), disabled: config.pageCourante === totalPages },
        { label: '»', page: totalPages, disabled: config.pageCourante === totalPages }
    );

    boutons.forEach((item) => {
        const bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.className = `genre-btn chapter-page-btn${item.active ? ' active' : ''}`;
        bouton.dataset.gestionPageType = type;
        bouton.dataset.gestionPage = item.page;
        bouton.disabled = Boolean(item.disabled);
        bouton.textContent = item.label;
        pagination.appendChild(bouton);
    });
}

function creerElementChapitreGestion(chap, infoDate) {
    const div = document.createElement('div');
    div.className = "chapter-item";
    const titreChapitre = escapeGestionHtml(window.getTitreCompletChapitre?.(chap) || `Chapitre ${chap.numero} : ${chap.titre}`);
    div.innerHTML = `
        <div>
            <strong class="chapter-title">${titreChapitre}</strong>
            <span class="tag tag-volume">${escapeGestionHtml(getVolumeTitle(chap.volume_id))}</span>
            ${infoDate}
        </div>
        <div>
            <button class="genre-btn btn-outline-blue btn-small" onclick="window.ouvrirEditeurChapitre(${chap.id})">${window.t?.('common.edit', {}, 'Modifier') || 'Modifier'}</button>
            <button class="genre-btn btn-outline-red btn-small-last" onclick="supprimerChapitre(${chap.id})">${window.t?.('common.delete', {}, 'Supprimer') || 'Supprimer'}</button>
        </div>
    `;
    return div;
}

function dessinerListeChapitresGestion(type, liste, messageVide) {
    if (!liste) return;

    const config = getGestionPaginationConfig(type);
    const items = config.items || [];

    if (items.length === 0) {
        liste.innerHTML = `<p class="text-muted-italic text-small">${messageVide}</p>`;
        dessinerPaginationGestion(type, 0);
        return;
    }

    const totalPages = Math.max(1, Math.ceil(items.length / config.taillePage));
    config.pageCourante = Math.min(Math.max(1, config.pageCourante), totalPages);
    const debut = (config.pageCourante - 1) * config.taillePage;
    const itemsPage = items.slice(debut, debut + config.taillePage);

    liste.innerHTML = '';
    itemsPage.forEach(({ chapitre, infoDate }) => {
        liste.appendChild(creerElementChapitreGestion(chapitre, infoDate));
    });

    dessinerPaginationGestion(type, items.length);
}

function redessinerChapitresGestion() {
    dessinerListeChapitresGestion('brouillons', document.getElementById('liste-brouillons'), window.t?.('gestion.emptyDrafts', {}, 'Aucun parchemin en brouillon.') || 'Aucun parchemin en brouillon.');
    dessinerListeChapitresGestion('programmes', document.getElementById('liste-programmes'), window.t?.('gestion.emptyScheduled', {}, 'Aucun parchemin en attente.') || 'Aucun parchemin en attente.');
    dessinerListeChapitresGestion('publies', document.getElementById('liste-publies'), window.t?.('gestion.emptyPublished', {}, 'Aucun parchemin visible.') || 'Aucun parchemin visible.');
}

window.chargerChapitresCategories = async function() {
    const listeBrouillons = document.getElementById('liste-brouillons');
    const listeProgrammes = document.getElementById('liste-programmes');
    const listePublies = document.getElementById('liste-publies');

    if (!listeBrouillons) return;

    listeBrouillons.innerHTML = `<p class="loading-text">${window.t?.('common.searching', {}, 'Recherche...') || 'Recherche...'}</p>`;
    listeProgrammes.innerHTML = `<p class="loading-text">${window.t?.('common.searching', {}, 'Recherche...') || 'Recherche...'}</p>`;
    listePublies.innerHTML = `<p class="loading-text">${window.t?.('common.searching', {}, 'Recherche...') || 'Recherche...'}</p>`;

    const { data: chapitres, error } = await window._supabase
        .from('chapitres')
        .select('*')
        .eq('histoire_id', window.currentOeuvreId)
        .order('ordre_lecture', { ascending: true })
        .order('id', { ascending: true });

    if (error) {
        listeBrouillons.innerHTML = `<p class="text-error">${window.t?.('errors.genericPrefix', {}, 'Erreur :') || 'Erreur :'} ${error.message}</p>`;
        return;
    }

    listeBrouillons.innerHTML = '';
    listeProgrammes.innerHTML = '';
    listePublies.innerHTML = '';

    window.chapitresGestionPagination.brouillons.items = [];
    window.chapitresGestionPagination.programmes.items = [];
    window.chapitresGestionPagination.publies.items = [];
    window.chapitresGestionPagination.brouillons.pageCourante = 1;
    window.chapitresGestionPagination.programmes.pageCourante = 1;
    window.chapitresGestionPagination.publies.pageCourante = 1;

    const maintenant = new Date(); // L'heure exacte actuelle

    trierChapitresGestion(chapitres || []).forEach(chap => {
        const dateChap = chap.date_publication ? new Date(chap.date_publication) : new Date();
        let infoDate = '';

        if (chap.est_publie && dateChap > maintenant) {
            const dateAffichee = dateChap.toLocaleString(window.getLocaleAffichageSite?.() || 'fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            infoDate = `<span class="scheduled-date">${window.t?.('gestion.scheduledDate', { date: dateAffichee }, `(Prévu le ${dateAffichee})`) || `(Prévu le ${dateAffichee})`}</span>`;
        } else if (chap.est_publie) {
            const dateAffichee = dateChap.toLocaleDateString(window.getLocaleAffichageSite?.() || 'fr-FR');
            infoDate = `<span class="published-date">${window.t?.('story.publishedDate', { date: dateAffichee }, `(Publié le ${dateAffichee})`) || `(Publié le ${dateAffichee})`}</span>`;
        }

        // ⚖️ L'Aiguilleur : On range le chapitre dans la bonne case !
        if (!chap.est_publie) {
            window.chapitresGestionPagination.brouillons.items.push({ chapitre: chap, infoDate });
        } else if (dateChap > maintenant) {
            window.chapitresGestionPagination.programmes.items.push({ chapitre: chap, infoDate });
        } else {
            window.chapitresGestionPagination.publies.items.push({ chapitre: chap, infoDate });
        }
    });

    redessinerChapitresGestion();
};

// --- LE POUVOIR DE DESTRUCTION ---
window.supprimerChapitre = async function(id) {
    const confirmation = await window.siteConfirm(window.t?.('gestion.deleteChapterConfirm', {}, 'Détruire ce parchemin à jamais ? Cette action est irréversible.') || 'Détruire ce parchemin à jamais ? Cette action est irréversible.', {
        confirmText: window.t?.('common.delete', {}, 'Supprimer') || 'Supprimer',
        cancelText: window.t?.('common.cancel', {}, 'Annuler') || 'Annuler',
        danger: true
    });
    if (!confirmation) return;

    const { error } = await window._supabase.from('chapitres').delete().eq('id', id);
    if(error) await window.siteAlert((window.t?.('gestion.deleteChapterError', {}, 'Supabase a bloqué la destruction :') || 'Supabase a bloqué la destruction :') + ' ' + error.message, { danger: true });
    else window.chargerChapitresCategories(); // On recharge la liste instantanément
};

// --- SAUTS VERS L'ÉDITEUR ---
window.ouvrirEditeurChapitre = function(idChapitre) {
    window.currentChapitreId = idChapitre;
    localStorage.setItem('currentChapitreId', idChapitre);
    window.changerDePage('editeur-chapitre');
};

// --- ECOUTE DES CLICS DE NAVIGATION ---
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btn-retour-gestion') {
        window.changerDePage('studio');
    }
    if (e.target && e.target.id === 'btn-edit-histoire') {
        localStorage.setItem('modeEditionHistoire', 'true'); 
        window.changerDePage('creation-story');
    }
    if (e.target && e.target.id === 'btn-add-chapitre') {
        window.currentChapitreId = null; // C'est une création
        localStorage.removeItem('currentChapitreId');
        window.changerDePage('editeur-chapitre');
    }

    const boutonSuppressionVolume = e.target.closest('[data-volume-delete]');
    if (boutonSuppressionVolume) {
        supprimerVolume(boutonSuppressionVolume.dataset.volumeDelete);
    }

    const boutonPageGestion = e.target.closest('[data-gestion-page]');
    if (boutonPageGestion) {
        const type = boutonPageGestion.dataset.gestionPageType;
        const config = getGestionPaginationConfig(type);
        config.pageCourante = Number(boutonPageGestion.dataset.gestionPage) || 1;
        redessinerChapitresGestion();
    }
});

document.addEventListener('submit', (e) => {
    if (e.target && e.target.id === 'volume-create-form') {
        e.preventDefault();
        creerVolumeDepuisFormulaire(e.target);
    }
});

document.addEventListener('change', (e) => {
    const type = e.target?.dataset?.gestionPageSize;
    if (!type) return;

    const config = getGestionPaginationConfig(type);
    config.taillePage = Number(e.target.value) || 15;
    config.pageCourante = 1;
    redessinerChapitresGestion();
});

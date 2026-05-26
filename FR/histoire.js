// ==========================================
// LE GRIMOIRE (histoire.js)
// Présentation de l'œuvre et liste des chapitres
// ==========================================

const COMMENTAIRES_MIN = 50;
const COMMENTAIRES_MAX = 1000;
const COMMENTAIRES_TABLE = 'commentaires';
const VOLUMES_PAR_PAGE_HISTOIRE = 5;

window._commentairesInstances = window._commentairesInstances || {};
window._histoireVolumesState = window._histoireVolumesState || {
    histoire: null,
    volumes: [],
    chapitresPublies: [],
    volumeActif: 'general',
    indexDebut: 0,
    pageCourante: 1,
    taillePage: 15
};

function getCommentaireElements(section) {
    return {
        feedback: section.querySelector('[data-role="feedback"]'),
        form: section.querySelector('[data-role="form"]'),
        message: section.querySelector('[data-role="message"]'),
        compteur: section.querySelector('[data-role="compteur"]'),
        liste: section.querySelector('[data-role="liste"]'),
        vide: section.querySelector('[data-role="vide"]'),
        tri: section.querySelector('[data-role="tri"]'),
        replyState: section.querySelector('[data-role="reply-state"]'),
        replyLabel: section.querySelector('[data-role="reply-label"]')
    };
}

function getCommentaireInstanceFromNode(node) {
    const section = node?.closest?.('[data-commentaires-root]');
    if (!section) return null;
    return window._commentairesInstances[section.id] || null;
}

function setCommentaireFeedback(instance, message = '', className = '') {
    if (!instance?.elements?.feedback) return;

    instance.elements.feedback.innerText = message;
    instance.elements.feedback.className = `commentaires-feedback text-small mt-15 ${className}`.trim();
    instance.elements.feedback.classList.toggle('hidden', !message);
}

function escapeCommentaireHtml(value = '') {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normaliserPseudoCle(pseudo = '') {
    return pseudo.trim().toLowerCase();
}

function formaterDateCommentaire(value) {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString(window.tRaw?.('meta.locale', 'fr') || 'fr', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function retirerMentionPrefillee(message = '', pseudo = '') {
    const texte = message || '';
    const pseudoNettoye = pseudo.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!pseudoNettoye) return texte;

    const pattern = new RegExp(`^\\s*@${pseudoNettoye}(?=[\\s,:;.!?\\-]|$)\\s*`, 'i');
    return texte.replace(pattern, '');
}

function getDiscussionPseudoMap(commentaires = [], pseudoCourant = '') {
    const map = new Map();

    commentaires.forEach((commentaire) => {
        const pseudo = commentaire?.pseudo_auteur?.trim();
        if (!pseudo) return;
        map.set(normaliserPseudoCle(pseudo), pseudo);
    });

    if (pseudoCourant?.trim()) {
        map.set(normaliserPseudoCle(pseudoCourant), pseudoCourant.trim());
    }

    return map;
}

function formaterMessageCommentaire(message = '', discussionPseudos = new Map(), pseudoReponse = '') {
    const texteAffiche = pseudoReponse ? retirerMentionPrefillee(message, pseudoReponse) : message;
    const escaped = escapeCommentaireHtml(texteAffiche);
    const avecMentions = escaped.replace(/(^|[\s(])@([A-Za-z0-9_.-]{1,50})/g, (match, prefixe, pseudoBrut) => {
        const pseudoCanonique = discussionPseudos.get(normaliserPseudoCle(pseudoBrut));
        if (!pseudoCanonique) {
            return `${prefixe}@${pseudoBrut}`;
        }

        return `${prefixe}<span class="comment-mention">${escapeCommentaireHtml(pseudoCanonique)}</span>`;
    });

    return avecMentions.replace(/\r?\n/g, '<br>');
}

function mettreAJourCompteurCommentaire(textarea, compteur) {
    if (!textarea || !compteur) return;
    compteur.innerText = `${textarea.value.length} / ${COMMENTAIRES_MAX}`;
}

function validerMessageCommentaire(message) {
    const texte = (message || '').trim();

    if (!texte) {
        return window.t?.('comments.required', {}, "Le message est obligatoire.") || "Le message est obligatoire.";
    }

    if (texte.length < COMMENTAIRES_MIN) {
        return window.t?.('comments.minLength', { count: COMMENTAIRES_MIN }, `Le message doit contenir au moins ${COMMENTAIRES_MIN} caracteres.`) || `Le message doit contenir au moins ${COMMENTAIRES_MIN} caracteres.`;
    }

    if (texte.length > COMMENTAIRES_MAX) {
        return window.t?.('comments.maxLength', { count: COMMENTAIRES_MAX }, `Le message ne peut pas depasser ${COMMENTAIRES_MAX} caracteres.`) || `Le message ne peut pas depasser ${COMMENTAIRES_MAX} caracteres.`;
    }

    return '';
}

async function estCompteAdminSession(session) {
    if (!session) return false;

    if (typeof window.recupererStatutAdmin === 'function') {
        return await window.recupererStatutAdmin(session);
    }

    try {
        const { data, error } = await window._supabase.rpc('est_admin');
        if (error) throw error;
        return data === true;
    } catch (error) {
        console.error("Impossible de vérifier le statut admin :", error);
        return false;
    }
}

async function initialiserBoutonRetirerHistoire(idHistoire, session) {
    const bouton = document.getElementById('btn-retirer-histoire');
    if (!bouton) return;

    const clone = bouton.cloneNode(true);
    bouton.parentNode.replaceChild(clone, bouton);

    const estAdmin = await estCompteAdminSession(session);
    if (!estAdmin) {
        clone.classList.add('hidden');
        return;
    }

    clone.classList.remove('hidden');
    clone.addEventListener('click', async () => {
        const confirmation = await window.siteConfirm(
            window.t?.('story.removeAdminConfirm', {}, "Confirmez-vous le retrait complet de cette histoire et de toutes ses dependances ? Cette action est irreversible.") || "Confirmez-vous le retrait complet de cette histoire et de toutes ses dependances ? Cette action est irreversible.",
            {
                confirmText: window.t?.('story.removeAdmin', {}, "Retirer l'histoire") || "Retirer l'histoire",
                cancelText: window.t?.('common.cancel', {}, 'Annuler') || 'Annuler',
                danger: true
            }
        );

        if (!confirmation) return;

        clone.disabled = true;
        clone.innerText = window.t?.('story.removeAdminPending', {}, "Retrait en cours...") || "Retrait en cours...";

        const { error } = await window._supabase.rpc('retirer_histoire_admin', {
            p_histoire_id: idHistoire
        });

        if (error) {
            await window.siteAlert(window.t?.('story.removeAdminDenied', { message: error.message }, "Le retrait de l'histoire a ete refuse : " + error.message) || ("Le retrait de l'histoire a ete refuse : " + error.message), { danger: true });
            clone.disabled = false;
            clone.innerText = window.t?.('story.removeAdmin', {}, "Retirer l'histoire") || "Retirer l'histoire";
            return;
        }

        localStorage.removeItem('currentOeuvreId');
        localStorage.removeItem('currentChapitreId');
        await window.siteAlert(window.t?.('story.removeAdminSuccess', {}, "L'histoire a ete retiree avec succes.") || "L'histoire a ete retiree avec succes.");
        window.changerDePage('accueil');
    });
}

function estAuteurParent(histoire, session) {
    if (!histoire || !session?.user) return false;
    return Boolean(histoire.auteur_user_id && histoire.auteur_user_id === session.user.id);
}

function getLienPartageHistoire(histoire) {
    const url = new URL(window.location.href);
    const idHistoire = typeof histoire === 'object' ? histoire?.id : histoire;
    const slugHistoire = typeof histoire === 'object' ? histoire?.slug : '';
    url.hash = window.getHashOeuvre
        ? window.getHashOeuvre(idHistoire, slugHistoire)
        : `oeuvre?id=${encodeURIComponent(idHistoire)}`;
    return url.toString();
}

function getLocaleAffichageSite() {
    return window.tRaw?.('meta.locale', 'fr') || 'fr';
}

function traduireGenreHistoire(genre = '') {
    const genres = {
        'High & Low Fantasy': 'navigation.genres.highLowFantasy',
        'Dark Fantasy & Grimdark': 'navigation.genres.darkFantasyGrimdark',
        'Romance et Romantasy': 'navigation.genres.romanceRomantasy',
        'Sci-Fi & Cyberpunk': 'navigation.genres.sciFiCyberpunk',
        'Horreur Psychologique': 'navigation.genres.horreurPsychologique'
    };

    return genres[genre] ? window.t?.(genres[genre], {}, genre) || genre : genre;
}

function traduireStatutHistoire(statut = '') {
    return window.traduireStatutSite?.(statut) || statut || window.t?.('story.statusInProgress', {}, '✍️ En cours') || '✍️ En cours';
}

function synchroniserLienHistoireDansUrl(histoire) {
    if (!histoire?.id) return;

    const slugRoute = window.getRouteParam?.('slug');
    if (slugRoute && slugRoute === histoire.slug) return;

    window.history.replaceState({}, document.title, getLienPartageHistoire(histoire));
}

function initialiserBoutonPartageHistoire(histoire) {
    const bouton = document.getElementById('btn-partager-histoire');
    if (!bouton) return;

    const nouveauBouton = bouton.cloneNode(true);
    nouveauBouton.innerText = window.t?.('story.share', {}, 'Copier le lien') || 'Copier le lien';
    bouton.parentNode.replaceChild(nouveauBouton, bouton);

    nouveauBouton.addEventListener('click', async () => {
        const lien = getLienPartageHistoire(histoire);

        try {
            await navigator.clipboard.writeText(lien);
            await window.siteAlert(window.t?.('story.shareCopied', {}, "Lien de l'histoire copié. Il ouvrira directement cette fiche.") || "Lien de l'histoire copié. Il ouvrira directement cette fiche.");
        } catch (erreur) {
            await window.siteAlert(window.t?.('story.shareFallback', { link: lien }, `Impossible de copier automatiquement. Voici le lien à partager :\n${lien}`) || `Impossible de copier automatiquement. Voici le lien à partager :\n${lien}`, { danger: true });
        }
    });
}

function getVolumeHistoireCover(volume, histoire) {
    return window.getStoryCoverUrl(volume?.image_couverture || histoire?.image_couverture);
}

function getVolumesAffichablesHistoire(histoire, volumes = []) {
    return [
        {
            id: 'general',
            titre: window.t?.('common.general', {}, 'Générale') || 'Générale',
            image_couverture: histoire?.image_couverture,
            estGeneral: true
        },
        ...(volumes || []).map((volume) => ({
            ...volume,
            id: String(volume.id),
            estGeneral: false
        }))
    ];
}

function getVolumeAffichableHistoire(volumeId) {
    const state = window._histoireVolumesState;
    return getVolumesAffichablesHistoire(state.histoire, state.volumes)
        .find((volume) => String(volume.id) === String(volumeId || state.volumeActif));
}

function getNombreVolumesVisiblesHistoire() {
    return window.matchMedia?.('(max-width: 768px)').matches ? 2 : VOLUMES_PAR_PAGE_HISTOIRE;
}

function getTaillePageChapitresHistoire() {
    const select = document.getElementById('histoire-chapitres-page-size');
    const valeur = Number(select?.value || window._histoireVolumesState.taillePage || 15);
    return [15, 30, 50].includes(valeur) ? valeur : 15;
}

function getChapitresFiltresHistoire() {
    const state = window._histoireVolumesState;

    if (state.volumeActif === 'general') {
        return [...state.chapitresPublies].sort((a, b) => {
            const dateA = a.date_publication ? new Date(a.date_publication).getTime() : 0;
            const dateB = b.date_publication ? new Date(b.date_publication).getTime() : 0;
            return dateA - dateB;
        });
    }

    return state.chapitresPublies.filter((chapitre) => String(chapitre.volume_id) === String(state.volumeActif));
}

function getPagesPagination(totalPages, pageCourante) {
    const pages = new Set([1, totalPages, pageCourante]);
    for (let i = pageCourante - 2; i <= pageCourante + 2; i++) {
        if (i >= 1 && i <= totalPages) pages.add(i);
    }
    return [...pages].sort((a, b) => a - b);
}

function dessinerPaginationChapitresHistoire(totalItems) {
    const pagination = document.getElementById('histoire-chapitres-pagination');
    if (!pagination) return;

    const state = window._histoireVolumesState;
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

    getPagesPagination(totalPages, state.pageCourante).forEach((page) => {
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
        bouton.dataset.histoirePage = config.page;
        bouton.disabled = Boolean(config.disabled);
        bouton.textContent = config.label;
        pagination.appendChild(bouton);
    });
}

function dessinerChapitresHistoire(chapitres) {
    const chapitresListe = document.getElementById('lecteur-chapitres-liste');
    if (!chapitresListe) return;

    if (!chapitres || chapitres.length === 0) {
        chapitresListe.innerHTML = `<p class="text-muted-italic text-center mt-15">${window.t?.('story.noChapterInVolume', {}, "Aucun chapitre n'est disponible dans ce volume.") || "Aucun chapitre n'est disponible dans ce volume."}</p>`;
        dessinerPaginationChapitresHistoire(0);
        return;
    }

    const state = window._histoireVolumesState;
    state.taillePage = getTaillePageChapitresHistoire();
    const totalPages = Math.max(1, Math.ceil(chapitres.length / state.taillePage));
    state.pageCourante = Math.min(Math.max(1, state.pageCourante), totalPages);
    const debut = (state.pageCourante - 1) * state.taillePage;
    const chapitresPage = chapitres.slice(debut, debut + state.taillePage);

    chapitresListe.innerHTML = '';

    chapitresPage.forEach((chap) => {
        const dateChap = chap.date_publication ? new Date(chap.date_publication) : new Date();
        const dateAffichee = dateChap.toLocaleDateString(getLocaleAffichageSite());
        const div = document.createElement('div');
        div.className = 'chapter-item';
        div.innerHTML = `
            <div>
                <strong class="chapter-title">${window.t?.('story.chapterTitle', { number: chap.numero, title: escapeCommentaireHtml(chap.titre || '') }, `Chapitre ${chap.numero} : ${escapeCommentaireHtml(chap.titre || '')}`) || `Chapitre ${chap.numero} : ${escapeCommentaireHtml(chap.titre || '')}`}</strong>
                <span class="published-date ml-10">${window.t?.('story.publishedDate', { date: dateAffichee }, `(Publié le ${dateAffichee})`) || `(Publié le ${dateAffichee})`}</span>
            </div>
            <div>
                <button class="genre-btn btn-outline-blue btn-small" type="button" data-chapitre-read="${chap.id}" data-chapitre-slug="${escapeCommentaireHtml(chap.slug || '')}">${window.t?.('common.read', {}, 'Lire') || 'Lire'}</button>
            </div>
        `;
        chapitresListe.appendChild(div);
    });

    dessinerPaginationChapitresHistoire(chapitres.length);
}

function appliquerFiltreVolumeHistoire(volumeId) {
    const state = window._histoireVolumesState;
    state.volumeActif = String(volumeId || 'general');
    state.pageCourante = 1;

    const volumes = getVolumesAffichablesHistoire(state.histoire, state.volumes);
    const indexActif = volumes.findIndex((volume) => String(volume.id) === state.volumeActif);
    const nombreVisible = getNombreVolumesVisiblesHistoire();

    if (indexActif >= 0) {
        if (indexActif < state.indexDebut) {
            state.indexDebut = indexActif;
        } else if (indexActif >= state.indexDebut + nombreVisible) {
            state.indexDebut = Math.max(0, indexActif - nombreVisible + 1);
        }
    }

    dessinerBandeauVolumesHistoire();
    dessinerChapitresHistoire(getChapitresFiltresHistoire());
}

function fermerApercuVolumeHistoire() {
    const backdrop = document.getElementById('volume-preview-backdrop');
    const image = document.getElementById('volume-preview-image');
    const titre = document.getElementById('volume-preview-title');

    if (!backdrop) return;
    const etaitOuvert = !backdrop.classList.contains('hidden');

    backdrop.classList.add('hidden');
    if (etaitOuvert) document.body.classList.remove('modal-open');

    if (image) {
        image.removeAttribute('src');
        image.alt = '';
    }
    if (titre) titre.textContent = '';
}

function ouvrirApercuVolumeHistoire(volumeId) {
    const volume = getVolumeAffichableHistoire(volumeId);
    const state = window._histoireVolumesState;
    const backdrop = document.getElementById('volume-preview-backdrop');
    const image = document.getElementById('volume-preview-image');
    const titre = document.getElementById('volume-preview-title');

    if (!volume || !backdrop || !image || !titre) return;

    const titreVolume = volume.titre || 'Volume';
    image.src = getVolumeHistoireCover(volume, state.histoire);
    image.alt = `Couverture ${titreVolume}`;
    image.draggable = false;
    titre.textContent = titreVolume;
    backdrop.classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function dessinerBandeauVolumesHistoire() {
    const section = document.getElementById('histoire-volumes-section');
    const strip = document.getElementById('histoire-volumes-strip');
    const btnGauche = document.getElementById('volumes-scroll-left');
    const btnDroite = document.getElementById('volumes-scroll-right');
    const state = window._histoireVolumesState;

    if (!section || !strip || !state.histoire) return;

    const volumes = getVolumesAffichablesHistoire(state.histoire, state.volumes);
    section.classList.remove('hidden');
    strip.innerHTML = '';

    const nombreVisible = getNombreVolumesVisiblesHistoire();
    const maxIndex = Math.max(0, volumes.length - nombreVisible);
    state.indexDebut = Math.min(Math.max(0, state.indexDebut), maxIndex);
    const volumesVisibles = volumes.slice(state.indexDebut, state.indexDebut + nombreVisible);

    volumesVisibles.forEach((volume) => {
        const bouton = document.createElement('button');
        bouton.type = 'button';
        bouton.className = `histoire-volume-card${String(volume.id) === state.volumeActif ? ' active' : ''}`;
        bouton.dataset.volumeId = volume.id;
        bouton.innerHTML = `
            <img src="${getVolumeHistoireCover(volume, state.histoire)}" alt="Couverture ${escapeCommentaireHtml(volume.titre)}" draggable="false">
            <span>${escapeCommentaireHtml(volume.titre)}</span>
        `;
        strip.appendChild(bouton);
    });

    const navigationNecessaire = volumes.length > nombreVisible;

    [btnGauche, btnDroite].forEach((bouton) => {
        if (!bouton) return;
        bouton.classList.toggle('hidden', !navigationNecessaire);
    });

    if (btnGauche) btnGauche.disabled = !navigationNecessaire || state.indexDebut <= 0;
    if (btnDroite) btnDroite.disabled = !navigationNecessaire || state.indexDebut >= maxIndex;
}

function deplacerBandeauVolumesHistoire(direction) {
    const state = window._histoireVolumesState;
    const volumes = getVolumesAffichablesHistoire(state.histoire, state.volumes);
    const maxIndex = Math.max(0, volumes.length - getNombreVolumesVisiblesHistoire());

    state.indexDebut = Math.min(Math.max(0, state.indexDebut + direction), maxIndex);
    dessinerBandeauVolumesHistoire();
}

async function initialiserVolumesHistoire(histoire, idHistoire) {
    const section = document.getElementById('histoire-volumes-section');
    if (section) section.classList.add('hidden');

    const { data: volumes, error } = await window._supabase
        .from('volumes')
        .select('*')
        .eq('histoire_id', idHistoire)
        .order('ordre', { ascending: true })
        .order('id', { ascending: true });

    if (error) {
        console.error('Erreur de chargement des volumes de l\'histoire :', error);
        return [];
    }

    window._histoireVolumesState = {
        histoire,
        volumes: volumes || [],
        chapitresPublies: [],
        volumeActif: 'general',
        indexDebut: 0,
        pageCourante: 1,
        taillePage: getTaillePageChapitresHistoire()
    };

    dessinerBandeauVolumesHistoire();
    return volumes || [];
}

function resetCommentaireForm(instance) {
    if (!instance?.elements?.form || !instance.elements.message) return;

    instance.elements.form.reset();
    instance.commentaireEnEdition = null;
    instance.replyTargetId = null;
    instance.replyTargetPseudo = '';
    if (instance.elements.replyState) instance.elements.replyState.classList.add('hidden');
    if (instance.elements.replyLabel) instance.elements.replyLabel.innerText = '';
    mettreAJourCompteurCommentaire(instance.elements.message, instance.elements.compteur);
}

function trouverCommentaireParId(instance, commentaireId) {
    if (!instance?.commentaires?.length || !commentaireId) return null;
    return instance.commentaires.find((commentaire) => String(commentaire.id) === String(commentaireId)) || null;
}

function definirReponseActive(instance, commentaireId = null) {
    if (!instance?.elements?.message) return;

    const commentaireCible = commentaireId ? trouverCommentaireParId(instance, commentaireId) : null;
    const ancienPseudo = instance.replyTargetPseudo || '';
    const messageActuel = instance.elements.message.value || '';
    const corpsSansAncienneMention = ancienPseudo
        ? retirerMentionPrefillee(messageActuel, ancienPseudo)
        : messageActuel;

    if (!commentaireCible) {
        instance.replyTargetId = null;
        instance.replyTargetPseudo = '';
        instance.elements.message.value = corpsSansAncienneMention.trimStart();
        if (instance.elements.replyState) instance.elements.replyState.classList.add('hidden');
        if (instance.elements.replyLabel) instance.elements.replyLabel.innerText = '';
        mettreAJourCompteurCommentaire(instance.elements.message, instance.elements.compteur);
        return;
    }

    instance.replyTargetId = commentaireCible.id;
    instance.replyTargetPseudo = commentaireCible.pseudo_auteur || '';
    instance.elements.message.value = `@${instance.replyTargetPseudo} ${corpsSansAncienneMention.trimStart()}`.trimEnd();

    if (instance.elements.replyState) instance.elements.replyState.classList.remove('hidden');
    if (instance.elements.replyLabel) {
        instance.elements.replyLabel.innerText = window.t?.('comments.replyLinked', { pseudo: instance.replyTargetPseudo }, `Reponse liee a ${instance.replyTargetPseudo}`) || `Reponse liee a ${instance.replyTargetPseudo}`;
    }

    mettreAJourCompteurCommentaire(instance.elements.message, instance.elements.compteur);
    instance.elements.message.focus();
    instance.elements.message.setSelectionRange(instance.elements.message.value.length, instance.elements.message.value.length);
}

function getReplyTargetValide(instance) {
    if (!instance?.replyTargetId) return null;

    const commentaireCible = trouverCommentaireParId(instance, instance.replyTargetId);
    if (!commentaireCible) return null;

    if (instance.cibleType !== commentaireCible.cible_type) return null;
    if (String(commentaireCible.histoire_id) !== String(instance.histoire.id)) return null;

    if (instance.cibleType === 'chapitre') {
        if (String(commentaireCible.chapitre_id) !== String(instance.chapitreReference?.id || instance.chapitreId)) {
            return null;
        }
    } else if (commentaireCible.chapitre_id !== null) {
        return null;
    }

    return commentaireCible;
}

function renderCommentaires(instance) {
    const { liste, vide } = instance.elements;
    if (!liste || !vide) return;

    if (!instance.commentaires?.length) {
        liste.innerHTML = '';
        vide.classList.remove('hidden');
        return;
    }

    vide.classList.add('hidden');
    const commentairesParId = new Map(
        instance.commentaires.map((commentaire) => [String(commentaire.id), commentaire])
    );
    const discussionPseudos = getDiscussionPseudoMap(instance.commentaires, instance.pseudo);
    const commentairesRacine = [];
    const reponsesParRacine = new Map();

    instance.commentaires.forEach((commentaire) => {
        const parentId = commentaire.parent_commentaire_id;
        const parent = parentId ? commentairesParId.get(String(parentId)) : null;

        if (!parent) {
            commentairesRacine.push(commentaire);
            return;
        }

        let racine = parent;
        while (racine?.parent_commentaire_id) {
            const suivant = commentairesParId.get(String(racine.parent_commentaire_id));
            if (!suivant) break;
            racine = suivant;
        }

        const racineId = String(racine.id);
        if (!reponsesParRacine.has(racineId)) {
            reponsesParRacine.set(racineId, []);
        }
        reponsesParRacine.get(racineId).push(commentaire);
    });

    const renderBlocCommentaire = (commentaire, estReponse = false) => {
        const estAuteurCommentaire = instance.session?.user?.id === commentaire.user_id;
        const peutModifier = estAuteurCommentaire;
        const peutSupprimer = estAuteurCommentaire || instance.estAuteurHistoire;
        const enEdition = String(instance.commentaireEnEdition) === String(commentaire.id);
        const dateAffichee = formaterDateCommentaire(commentaire.created_at);
        const pseudo = escapeCommentaireHtml(commentaire.pseudo_auteur || (window.t?.('common.unknownAuthor', {}, 'Comte inconnu') || 'Comte inconnu'));
        const parent = commentaire.parent_commentaire_id
            ? commentairesParId.get(String(commentaire.parent_commentaire_id))
            : null;
        const pseudoReponse = parent?.pseudo_auteur || '';
        const message = formaterMessageCommentaire(commentaire.contenu || '', discussionPseudos, pseudoReponse);
        const texteEdition = escapeCommentaireHtml(commentaire.contenu || '');
        const etiquetteReponse = parent?.pseudo_auteur
            ? `<div class="commentaire-lien-parent">${window.t?.('comments.replyTo', { pseudo: `<span class="comment-mention">${escapeCommentaireHtml(parent.pseudo_auteur)}</span>` }, `En reponse a <span class="comment-mention">${escapeCommentaireHtml(parent.pseudo_auteur)}</span>`) || `En reponse a <span class="comment-mention">${escapeCommentaireHtml(parent.pseudo_auteur)}</span>`}</div>`
            : '';

        return `
            <article class="commentaire-item card${estReponse ? ' commentaire-reponse' : ''}" data-comment-id="${commentaire.id}">
                <div class="commentaire-meta">
                    <span class="commentaire-pseudo">${pseudo}</span>
                    <span class="commentaire-date">${dateAffichee}</span>
                </div>

                ${!enEdition && etiquetteReponse ? `<div class="mt-15">${etiquetteReponse}</div>` : ''}

                ${
                    enEdition
                        ? `
                            <div class="commentaire-edition mt-15">
                                <textarea class="custom-input commentaires-textarea" data-role="edit-message" minlength="${COMMENTAIRES_MIN}" maxlength="${COMMENTAIRES_MAX}">${texteEdition}</textarea>
                                <div class="commentaires-form-footer mt-15">
                                    <span class="commentaires-limites text-small text-muted">${window.t?.('comments.editLimits', { min: COMMENTAIRES_MIN, max: COMMENTAIRES_MAX }, `${COMMENTAIRES_MIN} a ${COMMENTAIRES_MAX} caracteres`) || `${COMMENTAIRES_MIN} a ${COMMENTAIRES_MAX} caracteres`}</span>
                                    <div class="commentaire-actions">
                                        <button type="button" class="genre-btn btn-primary btn-small" data-action="save-edit">${window.t?.('common.save', {}, 'Enregistrer') || 'Enregistrer'}</button>
                                        <button type="button" class="genre-btn btn-outline-blue btn-small-last" data-action="cancel-edit">${window.t?.('common.cancel', {}, 'Annuler') || 'Annuler'}</button>
                                    </div>
                                </div>
                            </div>
                        `
                        : `<div class="commentaire-message mt-15">${message}</div>`
                }

                ${
                    !enEdition
                        ? `
                            <div class="commentaire-actions mt-15">
                                <button type="button" class="genre-btn btn-outline-blue btn-small" data-action="reply">${window.t?.('comments.reply', {}, 'Repondre') || 'Repondre'}</button>
                                ${peutModifier ? `<button type="button" class="genre-btn btn-outline-blue btn-small" data-action="edit">${window.t?.('common.edit', {}, 'Modifier') || 'Modifier'}</button>` : ''}
                                ${peutSupprimer ? `<button type="button" class="genre-btn btn-outline-red btn-small-last" data-action="delete">${window.t?.('common.delete', {}, 'Supprimer') || 'Supprimer'}</button>` : ''}
                            </div>
                        `
                        : ''
                }
            </article>
        `;
    };

    liste.innerHTML = commentairesRacine.map((commentaire) => {
        const reponses = reponsesParRacine.get(String(commentaire.id)) || [];

        return `
            <div class="commentaire-thread">
                ${renderBlocCommentaire(commentaire)}
                ${
                    reponses.length
                        ? `
                            <div class="commentaire-reponses">
                                ${reponses.map((reponse) => renderBlocCommentaire(reponse, true)).join('')}
                            </div>
                        `
                        : ''
                }
            </div>
        `;
    }).join('');
}

async function chargerCommentairesInstance(instance) {
    if (!instance?.section) return;

    const triAscendant = instance.elements.tri?.value === 'anciens';
    instance.elements.liste.innerHTML = `<p class="loading-text">${window.t?.('comments.loading', {}, 'Chargement des commentaires...') || 'Chargement des commentaires...'}</p>`;
    setCommentaireFeedback(instance);

    const histoireIdCible = instance.cibleType === 'chapitre'
        ? instance.chapitreReference?.histoire_id
        : instance.histoire.id;
    const chapitreIdCible = instance.cibleType === 'chapitre'
        ? instance.chapitreReference?.id
        : null;

    let requete = window._supabase
        .from(COMMENTAIRES_TABLE)
        .select('id, user_id, pseudo_auteur, histoire_id, chapitre_id, parent_commentaire_id, cible_type, contenu, created_at, updated_at')
        .eq('histoire_id', histoireIdCible)
        .eq('cible_type', instance.cibleType)
        .order('created_at', { ascending: triAscendant });

    if (instance.cibleType === 'chapitre') {
        requete = requete.eq('chapitre_id', chapitreIdCible);
    } else {
        requete = requete.is('chapitre_id', null);
    }

    const { data, error } = await requete;

    if (error) {
        instance.commentaires = [];
        instance.elements.liste.innerHTML = '';
        instance.elements.vide.classList.add('hidden');
        setCommentaireFeedback(instance, window.t?.('comments.loadError', { message: error.message }, `Impossible de charger les commentaires : ${error.message}`) || `Impossible de charger les commentaires : ${error.message}`, 'text-error');
        return;
    }

    instance.commentaires = data || [];
    if (instance.replyTargetId && !getReplyTargetValide(instance)) {
        definirReponseActive(instance, null);
    }
    renderCommentaires(instance);
}

window.recupererContexteCommentaires = async function() {
    const { data: authData } = await window._supabase.auth.getSession();
    const session = authData?.session || null;

    if (!session) {
        return {
            session: null,
            pseudo: null,
            peutAfficherCommentaires: false,
            profil: null
        };
    }

    const { data: profil, error } = await window._supabase
        .from('noms_de_plume')
        .select('pseudo, afficher_commentaires')
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (error) {
        return {
            session,
            pseudo: session.user.user_metadata?.pseudo || localStorage.getItem('userPseudo') || session.user.email?.split('@')[0] || 'Comte',
            peutAfficherCommentaires: false,
            profil: null
        };
    }

    return {
        session,
        profil: profil || null,
        pseudo: profil?.pseudo || session.user.user_metadata?.pseudo || localStorage.getItem('userPseudo') || session.user.email?.split('@')[0] || 'Comte',
        peutAfficherCommentaires: profil ? profil.afficher_commentaires !== false : true
    };
};

async function recupererReferenceChapitre(chapitreId) {
    if (!chapitreId) return null;

    const { data, error } = await window._supabase
        .from('chapitres')
        .select('id, histoire_id')
        .eq('id', chapitreId)
        .single();

    if (error || !data) {
        return null;
    }

    return data;
}

window.initialiserBlocCommentaires = async function({ sectionId, cibleType, histoire, chapitreId = null }) {
    const section = document.getElementById(sectionId);
    if (!section || !histoire?.id) return;

    if (histoire.commentaires_actifs === false) {
        section.classList.add('hidden');
        delete window._commentairesInstances[sectionId];
        return;
    }

    const elements = getCommentaireElements(section);
    const contexte = await window.recupererContexteCommentaires();

    if (!contexte.session || !contexte.peutAfficherCommentaires) {
        section.classList.add('hidden');
        delete window._commentairesInstances[sectionId];
        return;
    }

    const instance = {
        sectionId,
        section,
        elements,
        session: contexte.session,
        pseudo: contexte.pseudo,
        profil: contexte.profil,
        histoire,
        chapitreId,
        chapitreReference: null,
        cibleType,
        estAuteurHistoire: estAuteurParent(histoire, contexte.session),
        commentaires: [],
        commentaireEnEdition: null,
        replyTargetId: null,
        replyTargetPseudo: ''
    };

    if (cibleType === 'chapitre') {
        instance.chapitreReference = await recupererReferenceChapitre(chapitreId);

        if (!instance.chapitreReference) {
            section.classList.remove('hidden');
            window._commentairesInstances[sectionId] = instance;
            instance.elements.liste.innerHTML = '';
            instance.elements.vide.classList.add('hidden');
            setCommentaireFeedback(instance, window.t?.('comments.chapterReferenceError', {}, "Impossible de verifier le chapitre avant de charger les commentaires.") || "Impossible de verifier le chapitre avant de charger les commentaires.", 'text-error');
            return;
        }

        instance.histoire = {
            ...histoire,
            id: instance.chapitreReference.histoire_id
        };
    }

    section.classList.remove('hidden');
    window._commentairesInstances[sectionId] = instance;
    resetCommentaireForm(instance);
    await chargerCommentairesInstance(instance);
};

async function publierCommentaire(instance) {
    const message = instance.elements.message?.value || '';
    const erreurValidation = validerMessageCommentaire(message);

    if (erreurValidation) {
        setCommentaireFeedback(instance, erreurValidation, 'text-error');
        return;
    }

    const replyTarget = getReplyTargetValide(instance);
    if (instance.replyTargetId && !replyTarget) {
        setCommentaireFeedback(instance, window.t?.('comments.replyUnavailableStory', {}, "La reponse ciblee n'est plus disponible dans cette discussion.") || "La reponse ciblee n'est plus disponible dans cette discussion.", 'text-error');
        definirReponseActive(instance, null);
        return;
    }

    const bouton = instance.elements.form?.querySelector('button[type="submit"]');
    if (bouton) {
        bouton.disabled = true;
        bouton.innerText = window.t?.('comments.publishing', {}, 'Publication...') || 'Publication...';
    }

    const payload = {
        user_id: instance.session.user.id,
        pseudo_auteur: instance.pseudo,
        histoire_id: instance.histoire.id,
        chapitre_id: instance.cibleType === 'chapitre' ? instance.chapitreId : null,
        parent_commentaire_id: replyTarget ? replyTarget.id : null,
        cible_type: instance.cibleType,
        contenu: message.trim()
    };

    const { error } = await window._supabase.from(COMMENTAIRES_TABLE).insert([payload]);

    if (bouton) {
        bouton.disabled = false;
        bouton.innerText = window.t?.('comments.publish', {}, 'Publier') || 'Publier';
    }

    if (error) {
        setCommentaireFeedback(instance, window.t?.('comments.publishError', { message: error.message }, `Impossible de publier ce commentaire : ${error.message}`) || `Impossible de publier ce commentaire : ${error.message}`, 'text-error');
        return;
    }

    await chargerCommentairesInstance(instance);
    resetCommentaireForm(instance);
    setCommentaireFeedback(instance, window.t?.('comments.publishSuccess', {}, 'Commentaire publie avec succes.') || 'Commentaire publie avec succes.', 'text-success');
}

async function publierCommentaireChapitre(instance) {
    const message = instance.elements.message?.value || '';
    const erreurValidation = validerMessageCommentaire(message);

    if (erreurValidation) {
        setCommentaireFeedback(instance, erreurValidation, 'text-error');
        return;
    }

    const referenceChapitre = await recupererReferenceChapitre(instance.chapitreId);
    if (!referenceChapitre) {
        setCommentaireFeedback(instance, window.t?.('comments.chapterReferenceError', {}, "Impossible de verifier les informations du chapitre avant publication.") || "Impossible de verifier les informations du chapitre avant publication.", 'text-error');
        return;
    }

    instance.chapitreReference = referenceChapitre;
    instance.histoire = {
        ...instance.histoire,
        id: referenceChapitre.histoire_id
    };

    const replyTarget = getReplyTargetValide(instance);
    if (instance.replyTargetId && !replyTarget) {
        setCommentaireFeedback(instance, window.t?.('comments.replyUnavailableChapter', {}, "La reponse ciblee n'est plus disponible pour ce chapitre.") || "La reponse ciblee n'est plus disponible pour ce chapitre.", 'text-error');
        definirReponseActive(instance, null);
        return;
    }

    const payload = {
        cible_type: 'chapitre',
        histoire_id: referenceChapitre.histoire_id,
        chapitre_id: referenceChapitre.id,
        parent_commentaire_id: replyTarget ? replyTarget.id : null,
        pseudo_auteur: instance.pseudo,
        user_id: instance.session.user.id,
        contenu: message.trim()
    };

    const bouton = instance.elements.form?.querySelector('button[type="submit"]');
    if (bouton) {
        bouton.disabled = true;
        bouton.innerText = window.t?.('comments.publishing', {}, 'Publication...') || 'Publication...';
    }

    const { data, error } = await window._supabase
        .from(COMMENTAIRES_TABLE)
        .insert([payload])
        .select('id, cible_type, histoire_id, chapitre_id, parent_commentaire_id, pseudo_auteur, user_id, contenu')
        .single();

    if (bouton) {
        bouton.disabled = false;
        bouton.innerText = window.t?.('comments.publish', {}, 'Publier') || 'Publier';
    }

    if (error) {
        setCommentaireFeedback(instance, window.t?.('comments.publishChapterError', { message: error.message }, `Impossible de publier ce commentaire de chapitre : ${error.message}`) || `Impossible de publier ce commentaire de chapitre : ${error.message}`, 'text-error');
        return;
    }

    const insertionValide = data
        && data.cible_type === 'chapitre'
        && String(data.chapitre_id) === String(referenceChapitre.id)
        && String(data.histoire_id) === String(referenceChapitre.histoire_id)
        && String(data.parent_commentaire_id || '') === String(replyTarget?.id || '')
        && String(data.user_id) === String(instance.session.user.id)
        && data.pseudo_auteur === instance.pseudo
        && data.contenu === payload.contenu;

    if (!insertionValide) {
        setCommentaireFeedback(instance, window.t?.('comments.chapterConfirmError', {}, "Le commentaire n'a pas ete confirme par la base pour ce chapitre.") || "Le commentaire n'a pas ete confirme par la base pour ce chapitre.", 'text-error');
        return;
    }

    await chargerCommentairesInstance(instance);
    resetCommentaireForm(instance);
    setCommentaireFeedback(instance, window.t?.('comments.publishSuccess', {}, 'Commentaire de chapitre publie avec succes.') || 'Commentaire de chapitre publie avec succes.', 'text-success');
}

async function enregistrerEditionCommentaire(instance, card) {
    const commentaireId = card?.dataset?.commentId;
    if (!commentaireId) return;

    const textarea = card.querySelector('[data-role="edit-message"]');
    const message = textarea?.value || '';
    const erreurValidation = validerMessageCommentaire(message);

    if (erreurValidation) {
        setCommentaireFeedback(instance, erreurValidation, 'text-error');
        return;
    }

    const { error } = await window._supabase
        .from(COMMENTAIRES_TABLE)
        .update({
            contenu: message.trim(),
            pseudo_auteur: instance.pseudo,
            updated_at: new Date().toISOString()
        })
        .eq('id', commentaireId)
        .eq('user_id', instance.session.user.id);

    if (error) {
        setCommentaireFeedback(instance, window.t?.('comments.updateError', { message: error.message }, `Impossible de modifier ce commentaire : ${error.message}`) || `Impossible de modifier ce commentaire : ${error.message}`, 'text-error');
        return;
    }

    instance.commentaireEnEdition = null;
    await chargerCommentairesInstance(instance);
    setCommentaireFeedback(instance, window.t?.('comments.updateSuccess', {}, 'Commentaire modifie avec succes.') || 'Commentaire modifie avec succes.', 'text-success');
}

async function supprimerCommentaireInstance(instance, commentaireId) {
    const { error } = await window._supabase
        .from(COMMENTAIRES_TABLE)
        .delete()
        .eq('id', commentaireId);

    if (error) {
        setCommentaireFeedback(instance, window.t?.('comments.deleteError', { message: error.message }, `Impossible de supprimer ce commentaire : ${error.message}`) || `Impossible de supprimer ce commentaire : ${error.message}`, 'text-error');
        return;
    }

    instance.commentaireEnEdition = null;
    await chargerCommentairesInstance(instance);
    setCommentaireFeedback(instance, window.t?.('comments.deleteSuccess', {}, 'Commentaire supprime.') || 'Commentaire supprime.', 'text-success');
}

if (!window.commentairesEventsHooked) {
    window.addEventListener('resize', () => {
        if (window._pageCourante === 'oeuvre') {
            dessinerBandeauVolumesHistoire();
        }
    });

    document.addEventListener('keydown', (event) => {
        const backdrop = document.getElementById('volume-preview-backdrop');
        if (event.key === 'Escape' && backdrop && !backdrop.classList.contains('hidden')) {
            fermerApercuVolumeHistoire();
        }
    });

    document.addEventListener('input', (event) => {
        if (event.target?.matches?.('[data-role="message"]')) {
            const instance = getCommentaireInstanceFromNode(event.target);
            if (!instance) return;
            mettreAJourCompteurCommentaire(event.target, instance.elements.compteur);
        }
    });

    document.addEventListener('change', async (event) => {
        if (event.target?.id === 'histoire-chapitres-page-size') {
            window._histoireVolumesState.taillePage = getTaillePageChapitresHistoire();
            window._histoireVolumesState.pageCourante = 1;
            dessinerChapitresHistoire(getChapitresFiltresHistoire());
            return;
        }

        if (event.target?.matches?.('[data-role="tri"]')) {
            const instance = getCommentaireInstanceFromNode(event.target);
            if (!instance) return;
            await chargerCommentairesInstance(instance);
        }
    });

    document.addEventListener('submit', async (event) => {
        if (!event.target?.matches?.('[data-role="form"]')) return;
        event.preventDefault();

        const instance = getCommentaireInstanceFromNode(event.target);
        if (!instance) return;

        if (instance.cibleType === 'chapitre') {
            await publierCommentaireChapitre(instance);
        } else {
            await publierCommentaire(instance);
        }
    });

    document.addEventListener('click', async (event) => {
        const boutonVolume = event.target.closest('.histoire-volume-card');
        if (boutonVolume) {
            const volumeId = boutonVolume.dataset.volumeId || 'general';
            const estVolumeActif = String(volumeId) === String(window._histoireVolumesState.volumeActif);
            if (estVolumeActif && event.target?.matches?.('img')) {
                ouvrirApercuVolumeHistoire(volumeId);
                return;
            }

            appliquerFiltreVolumeHistoire(volumeId);
            return;
        }

        if (event.target?.id === 'volume-preview-close' || event.target?.id === 'volume-preview-backdrop') {
            fermerApercuVolumeHistoire();
            return;
        }

        if (event.target?.id === 'volume-preview-image') {
            event.preventDefault();
            return;
        }

        if (event.target.id === 'volumes-scroll-left') {
            deplacerBandeauVolumesHistoire(-1);
            return;
        }

        if (event.target.id === 'volumes-scroll-right') {
            deplacerBandeauVolumesHistoire(1);
            return;
        }

        const boutonLecture = event.target.closest('[data-chapitre-read]');
        if (boutonLecture) {
            const chapitreId = boutonLecture.dataset.chapitreRead;
            window.ouvrirPageChapitre({
                id: chapitreId,
                slug: boutonLecture.dataset.chapitreSlug || '',
                histoireSlug: window._histoireVolumesState?.histoire?.slug || ''
            });
            return;
        }

        const boutonPageHistoire = event.target.closest('[data-histoire-page]');
        if (boutonPageHistoire) {
            window._histoireVolumesState.pageCourante = Number(boutonPageHistoire.dataset.histoirePage) || 1;
            dessinerChapitresHistoire(getChapitresFiltresHistoire());
            return;
        }

        const action = event.target?.dataset?.action;
        if (!action) return;

        const instance = getCommentaireInstanceFromNode(event.target);
        if (!instance) return;

        if (action === 'cancel-reply') {
            definirReponseActive(instance, null);
            setCommentaireFeedback(instance);
            return;
        }

        const card = event.target.closest('[data-comment-id]');
        const commentaireId = card?.dataset?.commentId;
        if (!commentaireId) return;

        if (action === 'reply') {
            const memeCible = String(instance.replyTargetId || '') === String(commentaireId);
            definirReponseActive(instance, memeCible ? null : commentaireId);
            setCommentaireFeedback(instance);
            return;
        }

        if (action === 'edit') {
            instance.commentaireEnEdition = commentaireId;
            setCommentaireFeedback(instance);
            renderCommentaires(instance);
            return;
        }

        if (action === 'cancel-edit') {
            instance.commentaireEnEdition = null;
            setCommentaireFeedback(instance);
            renderCommentaires(instance);
            return;
        }

        if (action === 'save-edit') {
            await enregistrerEditionCommentaire(instance, card);
            return;
        }

        if (action === 'delete') {
            const ok = await window.siteConfirm(window.t?.('comments.deleteConfirm', {}, 'Supprimer ce commentaire ? Cette action est irreversible.') || 'Supprimer ce commentaire ? Cette action est irreversible.', {
                confirmText: window.t?.('common.delete', {}, 'Supprimer') || 'Supprimer',
                cancelText: window.t?.('common.cancel', {}, 'Annuler') || 'Annuler',
                danger: true
            });
            if (!ok) return;
            await supprimerCommentaireInstance(instance, commentaireId);
        }
    });

    document.addEventListener('contextmenu', (event) => {
        if (event.target?.closest?.('#volume-preview-backdrop, .histoire-volume-card')) {
            event.preventDefault();
        }
    });

    document.addEventListener('dragstart', (event) => {
        if (event.target?.closest?.('#volume-preview-backdrop, .histoire-volume-card')) {
            event.preventDefault();
        }
    });

    document.addEventListener('copy', (event) => {
        if (event.target?.closest?.('#volume-preview-backdrop')) {
            event.preventDefault();
        }
    });

    window.commentairesEventsHooked = true;
}

window.chargerPageHistoire = async function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const slugHistoireRoute = window.getRouteParam?.('slug');
    let idHistoire = window.getRouteParam?.('id') || localStorage.getItem('currentOeuvreId');
    const infoPanel = document.getElementById('histoire-presentation-panel');
    
    if ((!idHistoire && !slugHistoireRoute) || !infoPanel) {
        window.changerDePage('accueil');
        return;
    }

    infoPanel.innerHTML = `<p class="loading-text">${window.t?.('story.loading', {}, 'Déchiffrage des runes en cours...') || 'Déchiffrage des runes en cours...'}</p>`;

    // 1. Récupération des infos de l'histoire
    let requeteHistoire = window._supabase
        .from('histoires')
        .select('*');

    if (slugHistoireRoute) {
        requeteHistoire = requeteHistoire.eq('slug', slugHistoireRoute);
    } else {
        requeteHistoire = requeteHistoire.eq('id', idHistoire);
    }

    const { data: histoire, error: errHistoire } = await requeteHistoire.maybeSingle();

    if (errHistoire || !histoire) {
        infoPanel.innerHTML = `<p class="text-error text-center">${window.t?.('story.notFound', {}, "Erreur : L'œuvre est introuvable dans les abysses.") || "Erreur : L'œuvre est introuvable dans les abysses."}</p>`;
        return;
    }

    idHistoire = histoire.id;
    window.currentOeuvreId = idHistoire;
    localStorage.setItem('currentOeuvreId', idHistoire);
    if (histoire.slug) localStorage.setItem('currentOeuvreSlug', histoire.slug);
    synchroniserLienHistoireDansUrl(histoire);

    // 2. Gestion des tags
    let classeAge = 'tag-age';
    if (histoire.classification === 'Tout public') classeAge += ' age-tout-public';
    else if (histoire.classification === 'R15') classeAge += ' age-r15';
    else if (histoire.classification === 'R16') classeAge += ' age-r16';
    else if (histoire.classification === 'R18') classeAge += ' age-r18';

    const tagSensible = histoire.contenu_sensible 
        ? `<span class="tag tag-sensible">${window.t?.('home.sensitiveOn', {}, '⚠️ Sensible') || '⚠️ Sensible'}</span>`
        : `<span class="tag tag-sensible-off">${window.t?.('home.sensitiveOff', {}, 'Sensible') || 'Sensible'}</span>`;

    const imageCouverture = window.getStoryCoverUrl(histoire.image_couverture);
    const imgHtml = `<img src="${imageCouverture}" class="book-cover" alt="Couverture">`;
    const metaHistoireHtml = () => `
        <div class="story-side-meta" aria-label="Informations de l'histoire">
            <span class="tag tag-genre story-meta-line">${traduireGenreHistoire(histoire.genre)}</span>
            <span class="tag tag-statut story-meta-line">${traduireStatutHistoire(histoire.statut)}</span>
            <span class="tag ${classeAge} story-meta-line">${histoire.classification || 'Tout public'}</span>
            ${tagSensible.replace('class="tag ', 'class="tag story-meta-line ')}
            <span class="tag story-meta-line">👁️ ${window.t?.('story.views', { count: histoire.vues || 0 }, `${histoire.vues || 0} Vues`) || `${histoire.vues || 0} Vues`}</span>
            <span class="tag story-meta-line" id="histoire-likes-count">❤️ ${window.t?.('story.likes', { count: totalLikes || 0 }, `${totalLikes || 0} Pactes`) || `${totalLikes || 0} Pactes`}</span>
            <span class="tag story-meta-line">📝 <span id="histoire-mots-count">...</span> ${window.t?.('common.words', {}, 'Mots') || 'Mots'}</span>
        </div>
    `;
    const synopsisBrut = typeof histoire.synopsis === 'string' ? histoire.synopsis : '';
    const synopsisHtml = synopsisBrut.trim()
        ? escapeCommentaireHtml(synopsisBrut)
        : window.t?.('story.unknownSynopsis', {}, "Cette œuvre est nimbée de mystères, son intrigue demeure cachée.") || "Cette œuvre est nimbée de mystères, son intrigue demeure cachée.";

    const { data: { session } } = await window._supabase.auth.getSession();

    // 3. Récupération des likes (pactes)
    const { count: totalLikes } = await window._supabase
        .from('favoris')
        .select('*', { count: 'exact', head: true })
        .eq('histoire_id', idHistoire);

    // 4. Affichage du panneau
    infoPanel.innerHTML = `
        <div class="book-cover-column">
            ${imgHtml}
            ${metaHistoireHtml()}
        </div>
        <div class="book-info-content">
            <h2 class="story-title-m0">${histoire.titre}</h2>
            <span class="text-small text-muted-italic mb-15">${window.t?.('story.author', { pseudo: histoire.pseudo_auteur || histoire.auteur.split('@')[0] }, `Auteur : Comte ${histoire.pseudo_auteur || histoire.auteur.split('@')[0]}`) || `Auteur : Comte ${histoire.pseudo_auteur || histoire.auteur.split('@')[0]}`}</span>
            
            <div class="book-synopsis story-synopsis-detail mt-15">${synopsisHtml}</div>
        </div>
    `;

    // 5. Gestion du bouton admin et du bouton Suivre l'Histoire
    await initialiserBoutonRetirerHistoire(idHistoire, session);
    initialiserBoutonPartageHistoire(histoire);

    const btnSuivre = document.getElementById('btn-suivre-histoire');
    const btnArchiver = document.getElementById('btn-archiver-histoire');
    const remplacerBoutonFavori = (bouton) => {
        if (!bouton) return null;
        const clone = bouton.cloneNode(true);
        bouton.parentNode.replaceChild(clone, bouton);
        return clone;
    };
    const boutonSuivre = remplacerBoutonFavori(btnSuivre);
    const boutonArchiver = remplacerBoutonFavori(btnArchiver);
    let favoriLecteur = null;

    const definirBoutonFavori = (bouton, texte, classes, disabled = false) => {
        if (!bouton) return;
        bouton.innerText = texte;
        bouton.className = classes;
        bouton.disabled = disabled;
    };

    const afficherEtatFavori = () => {
        const estArchive = Boolean(favoriLecteur?.est_archive);

        if (!favoriLecteur) {
            definirBoutonFavori(boutonSuivre, window.t?.('story.support', {}, "Soutenir l'œuvre") || "Soutenir l'œuvre", 'genre-btn btn-primary shadow-active');
            definirBoutonFavori(boutonArchiver, window.t?.('story.archive', {}, "Archiver l'œuvre") || "Archiver l'œuvre", 'genre-btn btn-outline-blue');
            return;
        }

        if (estArchive) {
            definirBoutonFavori(boutonSuivre, window.t?.('story.moveToPacts', {}, 'Ranger dans Mes Pactes') || 'Ranger dans Mes Pactes', 'genre-btn btn-outline-blue');
            definirBoutonFavori(boutonArchiver, window.t?.('story.archived', {}, 'Œuvre archivée') || 'Œuvre archivée', 'genre-btn btn-primary shadow-active');
            return;
        }

        definirBoutonFavori(boutonSuivre, window.t?.('story.supported', {}, 'Œuvre soutenue') || 'Œuvre soutenue', 'genre-btn btn-danger shadow-active');
        definirBoutonFavori(boutonArchiver, window.t?.('story.archive', {}, "Archiver l'œuvre") || "Archiver l'œuvre", 'genre-btn btn-outline-blue');
    };

    const definirAttenteFavori = (boutonActif, texte) => {
        [boutonSuivre, boutonArchiver].forEach((bouton) => {
            if (!bouton) return;
            bouton.disabled = true;
        });
        if (boutonActif) boutonActif.innerText = texte;
    };

    const actualiserCompteurPactes = async () => {
        const { count } = await window._supabase
            .from('favoris')
            .select('*', { count: 'exact', head: true })
            .eq('histoire_id', idHistoire);

        const spanLikes = document.getElementById('histoire-likes-count');
        if (spanLikes) {
            spanLikes.innerHTML = `❤️ ${window.t?.('story.likes', { count: count || 0 }, `${count || 0} Pactes`) || `${count || 0} Pactes`}`;
        }
    };

    const changerEtatFavori = async (archiveSouhaitee, boutonActif) => {
        if (!session) {
            await window.siteAlert(window.t?.('story.supportLoginRequired', {}, "Les ombres refusent votre requête : vous devez être connecté pour soutenir une œuvre.") || "Les ombres refusent votre requête : vous devez être connecté pour soutenir une œuvre.", { danger: true });
            return;
        }

        definirAttenteFavori(
            boutonActif,
            archiveSouhaitee
                ? (window.t?.('story.archivePending', {}, 'Archivage en cours...') || 'Archivage en cours...')
                : (window.t?.('story.supportPending', {}, 'Pacte en cours...') || 'Pacte en cours...')
        );

        try {
            const { data: exist, error: erreurLecture } = await window._supabase
                .from('favoris')
                .select('id, est_archive')
                .eq('user_id', session.user.id)
                .eq('histoire_id', idHistoire)
                .maybeSingle();

            if (erreurLecture) throw erreurLecture;

            if (exist && Boolean(exist.est_archive) === archiveSouhaitee) {
                const { error } = await window._supabase
                    .from('favoris')
                    .delete()
                    .eq('id', exist.id);
                if (error) throw error;
                favoriLecteur = null;
            } else if (exist) {
                const { data, error } = await window._supabase
                    .from('favoris')
                    .update({ est_archive: archiveSouhaitee })
                    .eq('id', exist.id)
                    .select('id, est_archive')
                    .single();
                if (error) throw error;
                favoriLecteur = data;
            } else {
                const { data, error } = await window._supabase
                    .from('favoris')
                    .insert([{
                        user_id: session.user.id,
                        histoire_id: idHistoire,
                        est_archive: archiveSouhaitee
                    }])
                    .select('id, est_archive')
                    .single();
                if (error) throw error;
                favoriLecteur = data;
            }

            await actualiserCompteurPactes();

            if (typeof window.actualiserNotificationsHeader === 'function') {
                window.actualiserNotificationsHeader();
            }
        } catch (error) {
            await window.siteAlert(window.t?.('story.favoriteUpdateError', { message: error.message }, `Impossible de mettre à jour ce pacte : ${error.message}`) || `Impossible de mettre à jour ce pacte : ${error.message}`, { danger: true });
        } finally {
            afficherEtatFavori();
        }
    };

    if (session) {
        const { data: favoriActuel } = await window._supabase
            .from('favoris')
            .select('id, est_archive')
            .eq('user_id', session.user.id)
            .eq('histoire_id', idHistoire)
            .maybeSingle();

        favoriLecteur = favoriActuel || null;
    }

    afficherEtatFavori();
    if (boutonSuivre) boutonSuivre.addEventListener('click', () => changerEtatFavori(false, boutonSuivre));
    if (boutonArchiver) boutonArchiver.addEventListener('click', () => changerEtatFavori(true, boutonArchiver));

    // 6. Chargement des volumes et chapitres
    await initialiserVolumesHistoire(histoire, idHistoire);
    chargerListeChapitres(idHistoire);

    // 7. Chargement des commentaires globaux
    const sectionCommentairesHistoire = document.getElementById('commentaires-histoire-section');
    if (histoire.commentaires_actifs === false) {
        if (sectionCommentairesHistoire) sectionCommentairesHistoire.classList.add('hidden');
        delete window._commentairesInstances['commentaires-histoire-section'];
    } else {
        if (sectionCommentairesHistoire) sectionCommentairesHistoire.classList.remove('hidden');
        await window.initialiserBlocCommentaires({
            sectionId: 'commentaires-histoire-section',
            cibleType: 'histoire',
            histoire
        });
    }
};

async function chargerListeChapitres(idHistoire) {
    const chapitresListe = document.getElementById('lecteur-chapitres-liste');
    if (!chapitresListe) return;

    chapitresListe.innerHTML = `<p class="loading-text">${window.t?.('story.loadingChapters', {}, 'Recherche des écrits...') || 'Recherche des écrits...'}</p>`;

    const { data: chapitres, error } = await window._supabase
        .from('chapitres')
        .select('*')
        .eq('histoire_id', idHistoire)
        .eq('est_publie', true) // Uniquement les chapitres marqués comme "Publiés" par l'auteur
        .order('numero', { ascending: true }); // Tri par numéro

    if (error) {
        chapitresListe.innerHTML = `<p class="text-error">Erreur de lecture : ${error.message}</p>`;
        return;
    }

    if (chapitres.length === 0) {
        chapitresListe.innerHTML = `<p class="text-muted-italic text-center mt-15">${window.t?.('story.noChapterAvailable', {}, "Aucun chapitre n'est disponible pour le moment.") || "Aucun chapitre n'est disponible pour le moment."}</p>`;
        const spanMots = document.getElementById('histoire-mots-count');
        if (spanMots) spanMots.innerText = "0";
        window._histoireVolumesState.chapitresPublies = [];
        dessinerBandeauVolumesHistoire();
        return;
    }

    let totalMotsOeuvre = 0;
    const maintenant = new Date(); // L'heure magique !
    
    let prochainChapitre = null;
    const chapitresPublies = [];

    chapitres.forEach(chap => {
        const dateChap = chap.date_publication ? new Date(chap.date_publication) : new Date();
        
        if (dateChap > maintenant) {
            // C'est un chapitre programmé (dans le futur)
            // On cherche le plus proche de nous (celui avec la date la plus petite)
            if (!prochainChapitre || dateChap < prochainChapitre.date) {
                prochainChapitre = { date: dateChap, numero: chap.numero };
            }
        } else {
            // C'est un chapitre publié
            chapitresPublies.push(chap);
            totalMotsOeuvre += chap.nombre_mots || 0;
        }
    });

    window._histoireVolumesState.chapitresPublies = chapitresPublies;
    dessinerBandeauVolumesHistoire();
    dessinerChapitresHistoire(getChapitresFiltresHistoire());
    
    // Si aucun chapitre n'est publié, on affiche un message dans la liste
    if (chapitresPublies.length === 0) {
        chapitresListe.innerHTML = `<p class="text-muted-italic text-center mt-15">${window.t?.('story.noReadableChapter', {}, "L'œuvre n'a pas encore de parchemin lisible.") || "L'œuvre n'a pas encore de parchemin lisible."}</p>`;
    }

    // --- MISE À JOUR DE LA BOÎTE DE PROGRAMMATION ---
    const boxProchain = document.getElementById('prochain-chapitre-box');
    if (boxProchain) {
        if (prochainChapitre) {
            const dateAffichee = prochainChapitre.date.toLocaleString(getLocaleAffichageSite(), { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            boxProchain.innerHTML = `
                <div style="font-family: 'Cinzel', serif; color: var(--text-title); margin-bottom: 5px;">${window.t?.('story.nextPublication', {}, 'Prochaine publication :') || 'Prochaine publication :'}</div>
                <div style="color: #ffd700; font-weight: bold; letter-spacing: 1px;">${window.t?.('story.nextPublicationDate', { date: dateAffichee }, `Le ${dateAffichee}`) || `Le ${dateAffichee}`}</div>
            `;
        } else {
            boxProchain.innerHTML = `
                <div style="color: var(--text-muted); font-style: italic;">${window.t?.('story.noScheduledPublication', {}, 'Aucune publication programmée') || 'Aucune publication programmée'}</div>
            `;
        }
    }

    // Mise à jour du compteur de mots global
    const spanMots = document.getElementById('histoire-mots-count');
    if (spanMots) {
        spanMots.innerText = totalMotsOeuvre.toLocaleString(getLocaleAffichageSite());
    }
}

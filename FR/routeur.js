// --- LE CHEF D'ORCHESTRE (routeur.js) ---

// --- LE CHEF D'ORCHESTRE (routeur.js) ---

function construireHashPage(pageDemandee, params = {}) {
    const recherche = new URLSearchParams();
    const slugOeuvre = pageDemandee === 'oeuvre' ? String(params?.slug || '').trim() : '';
    const slugLectureHistoire = pageDemandee === 'lecture' ? String(params?.histoireSlug || '').trim() : '';
    const slugLectureChapitre = pageDemandee === 'lecture' ? String(params?.chapitreSlug || params?.slug || '').trim() : '';

    Object.entries(params || {}).forEach(([cle, valeur]) => {
        if (cle === 'slug' && slugOeuvre) return;
        if (pageDemandee === 'lecture' && ['histoireSlug', 'chapitreSlug', 'slug'].includes(cle) && slugLectureHistoire && slugLectureChapitre) return;
        if (valeur !== null && valeur !== undefined && valeur !== '') {
            recherche.set(cle, valeur);
        }
    });

    if (slugOeuvre) {
        return `oeuvre/${encodeURIComponent(slugOeuvre)}${recherche.toString() ? `?${recherche.toString()}` : ''}`;
    }

    if (slugLectureHistoire && slugLectureChapitre) {
        return `lecture/${encodeURIComponent(slugLectureHistoire)}/${encodeURIComponent(slugLectureChapitre)}${recherche.toString() ? `?${recherche.toString()}` : ''}`;
    }

    return `${pageDemandee}${recherche.toString() ? `?${recherche.toString()}` : ''}`;
}

function construireHashOeuvreDepuisDonnees(idHistoire, slugHistoire = '') {
    const slug = String(slugHistoire || '').trim();
    if (slug) return construireHashPage('oeuvre', { slug });
    return construireHashPage('oeuvre', { id: idHistoire });
}

function construireHashChapitreDepuisDonnees(idChapitre, slugChapitre = '', slugHistoire = '') {
    const chapitreSlug = String(slugChapitre || '').trim();
    const histoireSlug = String(slugHistoire || '').trim();
    if (chapitreSlug && histoireSlug) {
        return construireHashPage('lecture', {
            histoireSlug,
            chapitreSlug
        });
    }

    return construireHashPage('lecture', { id: idChapitre });
}

// L'Aiguilleur (Modifie l'URL sans recharger la page)
window.changerDePage = function(pageDemandee, params = {}) {
    const hash = construireHashPage(pageDemandee, params);

    if (window.location.hash === `#${hash}`) {
        const route = extraireRouteDepuisHash();
        appliquerParamsRoute(route);
        window.chargerPageInterne(route.page);
        return;
    }

    window.location.hash = hash;
};

window.ouvrirPageOeuvre = function({ id, slug } = {}) {
    if (id !== null && id !== undefined && id !== '') {
        window.currentOeuvreId = id;
        localStorage.setItem('currentOeuvreId', id);
    }

    if (slug) {
        localStorage.setItem('currentOeuvreSlug', slug);
        window.changerDePage('oeuvre', { slug });
        return;
    }

    window.changerDePage('oeuvre', { id });
};

window.ouvrirPageOeuvreDepuisLien = function(id, slug = '') {
    window.ouvrirPageOeuvre({ id, slug });
};

window.getHashOeuvre = function(idHistoire, slugHistoire = '') {
    return construireHashOeuvreDepuisDonnees(idHistoire, slugHistoire);
};

window.ouvrirPageChapitre = function({ id, slug, histoireSlug } = {}) {
    if (id !== null && id !== undefined && id !== '') {
        window.currentChapitreId = id;
        localStorage.setItem('currentChapitreId', id);
    }

    if (slug) {
        localStorage.setItem('currentChapitreSlug', slug);
    }

    if (histoireSlug) {
        localStorage.setItem('currentOeuvreSlug', histoireSlug);
    }

    if (histoireSlug && slug) {
        window.changerDePage('lecture', {
            histoireSlug,
            chapitreSlug: slug
        });
        return;
    }

    window.changerDePage('lecture', { id });
};

window.getHashChapitre = function(idChapitre, slugChapitre = '', slugHistoire = '') {
    return construireHashChapitreDepuisDonnees(idChapitre, slugChapitre, slugHistoire);
};

function estHashAuthSupabase(hashValue = window.location.hash) {
    const hashNettoye = (hashValue || '').replace(/^#/, '');
    if (!hashNettoye) return false;

    return [
        'access_token=',
        'refresh_token=',
        'type=recovery',
        'type=invite',
        'error_description='
    ].some((fragment) => hashNettoye.includes(fragment));
}

function extrairePageDemandeeDepuisHash(hashValue = window.location.hash) {
    return extraireRouteDepuisHash(hashValue).page;
}

function extraireRouteDepuisHash(hashValue = window.location.hash) {
    const hashNettoye = (hashValue || '').replace(/^#/, '');
    if (!hashNettoye || estHashAuthSupabase(hashValue)) {
        return { page: 'accueil', params: new URLSearchParams() };
    }

    const [cheminBrut, queryString = ''] = hashNettoye.split('?');
    const segmentsChemin = cheminBrut.split('/').filter(Boolean);
    const pageBrute = segmentsChemin.shift() || '';
    const params = new URLSearchParams(queryString);

    if (pageBrute === 'oeuvre' && segmentsChemin.length > 0) {
        params.set('slug', decodeURIComponent(segmentsChemin.join('/')));
    }

    if (pageBrute === 'lecture' && segmentsChemin.length >= 2) {
        params.set('histoireSlug', decodeURIComponent(segmentsChemin[0]));
        params.set('chapitreSlug', decodeURIComponent(segmentsChemin.slice(1).join('/')));
    }

    return {
        page: pageBrute || 'accueil',
        params
    };
}

function appliquerParamsRoute(route) {
    window._routeParams = route.params;

    if (route.page === 'oeuvre') {
        const idHistoire = route.params.get('id');
        const slugHistoire = route.params.get('slug');
        if (idHistoire) {
            window.currentOeuvreId = idHistoire;
            localStorage.setItem('currentOeuvreId', idHistoire);
        }
        if (slugHistoire) {
            localStorage.setItem('currentOeuvreSlug', slugHistoire);
        }
    }

    if (route.page === 'lecture') {
        const idChapitre = route.params.get('id') || route.params.get('chapitre');
        const slugHistoire = route.params.get('histoireSlug');
        const slugChapitre = route.params.get('chapitreSlug');
        if (idChapitre) {
            window.currentChapitreId = idChapitre;
            localStorage.setItem('currentChapitreId', idChapitre);
        }
        if (slugHistoire) {
            localStorage.setItem('currentOeuvreSlug', slugHistoire);
        }
        if (slugChapitre) {
            localStorage.setItem('currentChapitreSlug', slugChapitre);
        }
    }

    if (route.page === 'categorie-genre') {
        const genre = route.params.get('genre');
        if (genre) {
            localStorage.setItem('currentGenre', genre);
        }
    }
}

window.getRouteParam = function(nom) {
    return window._routeParams?.get(nom) || null;
}

window._siteDialogState = null;

function getSiteDialogRefs() {
    return {
        backdrop: document.getElementById('site-dialog-backdrop'),
        modal: document.getElementById('site-dialog-modal'),
        title: document.getElementById('site-dialog-title'),
        message: document.getElementById('site-dialog-message'),
        cancel: document.getElementById('site-dialog-cancel'),
        confirm: document.getElementById('site-dialog-confirm')
    };
}

function fermerDialogueSite(resultat) {
    const state = window._siteDialogState;
    if (!state || state.closed) return;
    state.closed = true;

    const { refs, resolve, onKeyDown } = state;
    document.removeEventListener('keydown', onKeyDown);
    refs.backdrop.classList.add('hidden');
    document.body.classList.remove('modal-open');
    refs.cancel.classList.add('hidden');
    refs.confirm.classList.remove('btn-danger');
    refs.confirm.classList.add('btn-primary');
    refs.cancel.onclick = null;
    refs.confirm.onclick = null;
    refs.backdrop.onclick = null;

    window._siteDialogState = null;
    resolve(resultat);
}

window.ouvrirDialogueSite = function({
    title = 'Message du Sanctuaire',
    message = '',
    confirmText = 'Valider',
    cancelText = 'Annuler',
    showCancel = false,
    danger = false
} = {}) {
    const refs = getSiteDialogRefs();

    if (!refs.backdrop || !refs.modal || !refs.title || !refs.message || !refs.cancel || !refs.confirm) {
        return Promise.resolve(showCancel ? false : true);
    }

    if (window._siteDialogState) {
        fermerDialogueSite(false);
    }

    refs.title.innerText = title;
    refs.message.innerText = message;
    refs.confirm.innerText = confirmText;
    refs.cancel.innerText = cancelText;
    refs.cancel.classList.toggle('hidden', !showCancel);
    refs.confirm.classList.toggle('btn-danger', danger);
    refs.confirm.classList.toggle('btn-primary', !danger);
    refs.backdrop.classList.remove('hidden');
    document.body.classList.add('modal-open');

    return new Promise((resolve) => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                fermerDialogueSite(showCancel ? false : true);
            }
        };

        window._siteDialogState = { refs, resolve, onKeyDown, closed: false };

        refs.cancel.onclick = () => fermerDialogueSite(false);
        refs.confirm.onclick = () => fermerDialogueSite(true);
        refs.backdrop.onclick = (event) => {
            if (event.target === refs.backdrop) {
                fermerDialogueSite(showCancel ? false : true);
            }
        };

        document.addEventListener('keydown', onKeyDown);
        refs.confirm.focus();
    });
};

window.siteAlert = function(message, options = {}) {
    return window.ouvrirDialogueSite({
        title: options.title || 'Message du Sanctuaire',
        message,
        confirmText: options.confirmText || 'Compris',
        danger: options.danger === true
    });
};

window.siteConfirm = function(message, options = {}) {
    return window.ouvrirDialogueSite({
        title: options.title || 'Confirmation',
        message,
        confirmText: options.confirmText || 'Confirmer',
        cancelText: options.cancelText || 'Annuler',
        showCancel: true,
        danger: options.danger === true
    });
};

window._pageCourante = window._pageCourante || null;
window._siteScrollUpdateFrame = null;

function getSiteScrollRefs() {
    return {
        top: document.getElementById('site-scroll-top'),
        bottom: document.getElementById('site-scroll-bottom')
    };
}

function masquerScrollRapideSite() {
    const { top, bottom } = getSiteScrollRefs();
    if (top) top.classList.remove('is-visible');
    if (bottom) bottom.classList.remove('is-visible');
}

function pageUtiliseScrollRapideSite() {
    return window._pageCourante !== 'lecture'
        && window._pageCourante !== 'conditions-utilisation'
        && window._pageCourante !== 'mentions-legales'
        && window._pageCourante !== 'politique-confidentialite';
}

window.mettreAJourScrollRapideSite = function() {
    const { top, bottom } = getSiteScrollRefs();
    if (!top || !bottom) return;

    if (!pageUtiliseScrollRapideSite()) {
        masquerScrollRapideSite();
        return;
    }

    const hauteurScrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (hauteurScrollable <= 40) {
        masquerScrollRapideSite();
        return;
    }

    const positionActuelle = window.scrollY || window.pageYOffset || 0;
    top.classList.toggle('is-visible', positionActuelle > 140);
    bottom.classList.toggle('is-visible', positionActuelle < hauteurScrollable - 120);
};

window.programmerMiseAJourScrollRapideSite = function() {
    if (window._siteScrollUpdateFrame) {
        cancelAnimationFrame(window._siteScrollUpdateFrame);
    }

    window._siteScrollUpdateFrame = requestAnimationFrame(() => {
        window.mettreAJourScrollRapideSite();
        window._siteScrollUpdateFrame = null;
    });
};

function fermerPanneauNotifications() {
    const bouton = document.getElementById('btn-notifications');
    const panneau = document.getElementById('notifications-panel');

    if (panneau) panneau.classList.add('hidden');
    if (bouton) bouton.setAttribute('aria-expanded', 'false');
}

function setNotificationsCount(nombreNonLues = 0) {
    const compteur = document.getElementById('notifications-count');
    if (!compteur) return;

    compteur.innerText = nombreNonLues > 9 ? '9+' : String(nombreNonLues);
    compteur.classList.toggle('hidden', nombreNonLues <= 0);
}

function setNotificationsEmpty(message = 'Aucun parchemin ne vous est destinée') {
    const panneau = document.getElementById('notifications-panel');
    if (!panneau) return;

    panneau.innerHTML = `<p class="notifications-empty">${message}</p>`;
    setNotificationsCount(0);
}

const NOTIFICATIONS_CHAPITRES_DEPUIS = new Date('2026-05-11T01:52:01.488+02:00');

function getDateDebutNotificationsParHistoire(pactes = []) {
    const dates = new Map();

    pactes.forEach((pacte) => {
        const histoireId = Number(pacte.histoire_id);
        if (!histoireId) return;

        const datePacte = pacte.created_at ? new Date(pacte.created_at) : new Date(0);
        dates.set(
            histoireId,
            datePacte > NOTIFICATIONS_CHAPITRES_DEPUIS ? datePacte : NOTIFICATIONS_CHAPITRES_DEPUIS
        );
    });

    return dates;
}

function normaliserTitreNotification(valeur, fallback) {
    return typeof valeur === 'string' && valeur.trim() ? valeur.trim() : fallback;
}

async function marquerNotificationLue(notificationId) {
    const idNotification = Number(notificationId);
    if (!idNotification) return;

    const { data: { session } } = await window._supabase.auth.getSession();
    if (!session) return;

    const { error } = await window._supabase
        .from('notifications')
        .update({ lu: true })
        .eq('id', idNotification)
        .eq('user_id_receveur', session.user.id);

    if (error) {
        console.error('Impossible de marquer la notification comme lue :', error);
    }
}

function rendreNotificationLue(notificationId) {
    const item = document.querySelector(`[data-notification-id="${notificationId}"]`);
    if (item) item.classList.add('is-read');

    const nonLues = document.querySelectorAll('.notification-item:not(.is-read)').length;
    setNotificationsCount(nonLues);
}

function retirerNotificationAffichee(notificationId) {
    const item = document.querySelector(`[data-notification-id="${notificationId}"]`);
    if (item) item.remove();

    const notificationsRestantes = document.querySelectorAll('.notification-item');
    if (notificationsRestantes.length === 0) {
        setNotificationsEmpty();
        return;
    }

    const nonLues = document.querySelectorAll('.notification-item:not(.is-read)').length;
    setNotificationsCount(nonLues);
}

async function supprimerNotificationSupabase(notificationId) {
    const idNotification = Number(notificationId);
    if (!idNotification) return;

    const { data: { session } } = await window._supabase.auth.getSession();
    if (!session) return;

    const { error } = await window._supabase
        .from('notifications')
        .delete()
        .eq('id', idNotification)
        .eq('user_id_receveur', session.user.id);

    if (error) throw error;
}

function creerLienNotification({ texte, href, notificationId, destination }) {
    const lien = document.createElement('a');
    lien.href = href;
    lien.className = 'notification-link';
    lien.textContent = texte;

    lien.addEventListener('click', async (event) => {
        event.preventDefault();
        await marquerNotificationLue(notificationId);
        rendreNotificationLue(notificationId);
        fermerPanneauNotifications();

        if (destination.type === 'histoire') {
            window.ouvrirPageOeuvre({
                id: destination.id,
                slug: destination.slug
            });
        } else if (destination.type === 'chapitre') {
            window.ouvrirPageChapitre({
                id: destination.id,
                slug: destination.slug,
                histoireSlug: destination.histoireSlug
            });
        }
    });

    return lien;
}

function creerBoutonSuppressionNotification(notificationId) {
    const bouton = document.createElement('button');
    bouton.type = 'button';
    bouton.className = 'notification-delete';
    bouton.dataset.tooltip = 'Supprimer';
    bouton.setAttribute('aria-label', 'Supprimer la notification');
    bouton.textContent = '×';

    bouton.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopPropagation();

        bouton.disabled = true;
        try {
            await supprimerNotificationSupabase(notificationId);
            retirerNotificationAffichee(notificationId);
        } catch (error) {
            bouton.disabled = false;
            await window.siteAlert("Impossible de supprimer la notification : " + error.message, { danger: true });
        }
    });

    return bouton;
}

function afficherNotificationsChapitres(notifications = []) {
    const panneau = document.getElementById('notifications-panel');
    if (!panneau) return;

    if (notifications.length === 0) {
        setNotificationsEmpty();
        return;
    }

    panneau.innerHTML = '';
    const liste = document.createElement('div');
    liste.className = 'notifications-list';
    panneau.appendChild(liste);

    notifications.forEach((notification) => {
        const item = document.createElement('article');
        item.className = `notification-item${notification.lue ? ' is-read' : ''}`;
        item.dataset.notificationChapitreId = notification.chapitreId;
        item.dataset.notificationId = notification.id;

        const lienHistoire = creerLienNotification({
            texte: notification.titreHistoire,
            href: `#${window.getHashOeuvre(notification.histoireId, notification.slugHistoire)}`,
            notificationId: notification.id,
            destination: {
                type: 'histoire',
                id: notification.histoireId,
                slug: notification.slugHistoire
            }
        });

        const lienChapitre = creerLienNotification({
            texte: notification.titreChapitre,
            href: `#${window.getHashChapitre(notification.chapitreId, notification.slugChapitre, notification.slugHistoire)}`,
            notificationId: notification.id,
            destination: {
                type: 'chapitre',
                id: notification.chapitreId,
                slug: notification.slugChapitre,
                histoireSlug: notification.slugHistoire
            }
        });

        const lienIci = creerLienNotification({
            texte: 'ici',
            href: `#${window.getHashChapitre(notification.chapitreId, notification.slugChapitre, notification.slugHistoire)}`,
            notificationId: notification.id,
            destination: {
                type: 'chapitre',
                id: notification.chapitreId,
                slug: notification.slugChapitre,
                histoireSlug: notification.slugHistoire
            }
        });

        item.append(
            lienHistoire,
            document.createTextNode(' a ajouté un nouveau chapitre : '),
            lienChapitre,
            document.createTextNode(". N'hésite pas à cliquer "),
            lienIci,
            document.createTextNode(' pour le lire.')
        );
        item.appendChild(creerBoutonSuppressionNotification(notification.id));

        liste.appendChild(item);
    });

    setNotificationsCount(notifications.filter((notification) => !notification.lue).length);
}

window.actualiserNotificationsHeader = async function() {
    const panneau = document.getElementById('notifications-panel');
    if (!panneau || !window._supabase) return;

    const { data: { session } } = await window._supabase.auth.getSession();
    if (!session) {
        setNotificationsEmpty();
        return;
    }

    panneau.innerHTML = '<p class="notifications-empty">Lecture des parchemins...</p>';

    const { data: notificationsBrutes, error: erreurNotifications } = await window._supabase
        .from('notifications')
        .select('id, user_id_receveur, histoire_id, chapitre_id, titre_chapitre, date_declenchement, lu')
        .eq('user_id_receveur', session.user.id)
        .order('date_declenchement', { ascending: false })
        .limit(30);

    if (erreurNotifications) {
        console.error('Erreur de récupération des notifications :', erreurNotifications);
        setNotificationsEmpty();
        return;
    }

    if (!notificationsBrutes || notificationsBrutes.length === 0) {
        setNotificationsEmpty();
        return;
    }

    const idsChapitres = [...new Set(notificationsBrutes.map((notification) => Number(notification.chapitre_id)).filter(Boolean))];
    if (idsChapitres.length === 0) {
        setNotificationsEmpty();
        return;
    }

    const maintenantIso = new Date().toISOString();

    const { data: chapitres, error: erreurChapitres } = await window._supabase
        .from('chapitres')
        .select('id, histoire_id, titre, slug, date_publication')
        .in('id', idsChapitres)
        .eq('est_publie', true)
        .lte('date_publication', maintenantIso)
        .order('date_publication', { ascending: false })
        .limit(30);

    if (erreurChapitres) {
        console.error('Erreur de récupération des chapitres pour les notifications :', erreurChapitres);
        setNotificationsEmpty();
        return;
    }

    const chapitresParId = new Map((chapitres || []).map((chapitre) => [Number(chapitre.id), chapitre]));
    const notificationsValides = notificationsBrutes.filter((notification) => chapitresParId.has(Number(notification.chapitre_id)));

    if (notificationsValides.length === 0) {
        setNotificationsEmpty();
        return;
    }

    const idsHistoiresAvecChapitre = [...new Set(notificationsValides.map((notification) => {
        const chapitre = chapitresParId.get(Number(notification.chapitre_id));
        return Number(chapitre?.histoire_id || notification.histoire_id);
    }).filter(Boolean))];

    const { data: histoires } = await window._supabase
        .from('histoires')
        .select('id, titre, slug')
        .in('id', idsHistoiresAvecChapitre);

    const histoiresParId = new Map((histoires || []).map((histoire) => [
        Number(histoire.id),
        {
            titre: normaliserTitreNotification(histoire.titre, 'Cette histoire'),
            slug: histoire.slug || ''
        }
    ]));
    const notifications = notificationsValides.map((notification) => {
        const chapitre = chapitresParId.get(Number(notification.chapitre_id));
        const histoireId = Number(chapitre?.histoire_id || notification.histoire_id);
        const histoireReference = histoiresParId.get(histoireId);

        return {
            id: Number(notification.id),
            chapitreId: Number(chapitre.id),
            histoireId,
            slugHistoire: histoireReference?.slug || '',
            slugChapitre: chapitre.slug || '',
            titreHistoire: histoireReference?.titre || 'Cette histoire',
            titreChapitre: normaliserTitreNotification(notification.titre_chapitre || chapitre.titre, 'Nouveau chapitre'),
            lue: notification.lu === true
        };
    });

    afficherNotificationsChapitres(notifications);
};

function initialiserNotificationsHeader() {
    const bouton = document.getElementById('btn-notifications');
    const panneau = document.getElementById('notifications-panel');

    if (!bouton || !panneau || bouton.dataset.notificationsReady === 'true') return;

    bouton.dataset.notificationsReady = 'true';

    bouton.addEventListener('click', (event) => {
        event.stopPropagation();
        const estOuvert = !panneau.classList.contains('hidden');
        panneau.classList.toggle('hidden', estOuvert);
        bouton.setAttribute('aria-expanded', estOuvert ? 'false' : 'true');

        if (estOuvert === false && typeof window.actualiserNotificationsHeader === 'function') {
            window.actualiserNotificationsHeader();
        }
    });

    panneau.addEventListener('click', (event) => {
        event.stopPropagation();
    });
}

// Le Détecteur de Mouvement (Écoute quand l'URL change, même via les flèches du navigateur)
window.addEventListener('hashchange', () => {
    const route = extraireRouteDepuisHash();
    appliquerParamsRoute(route);
    window.chargerPageInterne(route.page);
});

// L'Ouvrier (Va chercher le fichier HTML et l'injecte)
window.chargerPageInterne = async function(pageDemandee) {
    const root = document.getElementById('sanctuaire-root');
    window._pageCourante = pageDemandee;
    
    // Petit texte d'attente pendant que le fichier voyage
    root.innerHTML = '<p class="text-center text-muted-italic p-50">Ouverture du parchemin...</p>';

    // L'Aiguilleur : on relie le mot-clé au bon fichier HTML
    const pages = {
        'accueil': 'Accueil.html',
        'oeuvre': 'Histoire.html',
        'lecture': 'Lecteur.html',
        'conditions-utilisation': 'ConditionsUtilisation.html',
        'mentions-legales': 'MentionsLegales.html',
        'politique-confidentialite': 'PolitiqueConfidentialite.html',
        'quartiers': 'Parametre.html',
        'lectures': 'Favoris.html',
        'studio': 'Forge.html',
        'gestion': 'Gestion.html',
        'editeur-chapitre': 'Editeur.html',
        'creation-story': 'CreationStory.html',
        'statistiques': 'Statistiques.html',
        'categorie-genre': 'CategorieGenre.html'
    };

    const fichier = pages[pageDemandee];

    if (!fichier) {
        root.innerHTML = '<p class="text-error text-center">Ce parchemin n\'existe pas.</p>';
        return;
    }

    try {
        // On aspire le contenu du fichier HTML
        const reponse = await fetch(fichier);
        if (!reponse.ok) throw new Error("Impossible de lire le fichier " + fichier);
        
        const html = await reponse.text();
        
        // On l'injecte dans le Maître
        root.innerHTML = html;

        // --- 🌑 L'ÉCLIPSE DU LOGO & DU MENU (Nouveau Mécanisme) 🌑 ---
        const miniLogo = document.getElementById('mini-logo');
        const heroLogo = document.getElementById('hero-logo-area');
        const menuGenre = document.getElementById('main-genre-menu'); // <-- Le menu des catégories

        if (pageDemandee === 'accueil') {
            // Si on est dans le Hall : Gros Logo activé, Petit Logo caché, Menu affiché
            if (miniLogo) miniLogo.classList.add('hidden');
            if (heroLogo) heroLogo.classList.remove('hidden');
            if (menuGenre) menuGenre.classList.remove('hidden');
        } else if (pageDemandee === 'categorie-genre') {
            // Dans les rayons : Petit Logo activé, Gros Logo caché, mais Menu TOUJOURS affiché
            if (miniLogo) miniLogo.classList.remove('hidden');
            if (heroLogo) heroLogo.classList.add('hidden');
            if (menuGenre) menuGenre.classList.remove('hidden');
        } else {
            // Partout ailleurs : Petit Logo activé, Gros Logo caché, Menu masqué
            if (miniLogo) miniLogo.classList.remove('hidden');
            if (heroLogo) heroLogo.classList.add('hidden');
            if (menuGenre) menuGenre.classList.add('hidden');
        }
        // -------------------------------------------------------------

        // On réveille les scripts de la page
        initialiserScriptsDePage(pageDemandee);

        // On remonte tout en haut de la page proprement
        window.scrollTo({ top: 0, behavior: 'smooth' });
        window.programmerMiseAJourScrollRapideSite();
        setTimeout(() => window.programmerMiseAJourScrollRapideSite(), 250);

    } catch (erreur) {
        root.innerHTML = `<p class="text-error text-center">Erreur du Sanctuaire : ${erreur.message}</p>`;
        window.programmerMiseAJourScrollRapideSite();
    }
};

function initialiserScriptsDePage(page) {
    if (page === 'accueil') {
        if (typeof window.chargerVitrine === 'function') window.chargerVitrine();
    }
    // ---> AJOUTE CE BLOC ICI <---
    else if (page === 'studio') {
        if (typeof window.chargerMesOeuvres === 'function') window.chargerMesOeuvres();
    }
    else if (page === 'oeuvre') {
        if (typeof window.chargerPageHistoire === 'function') window.chargerPageHistoire();
    }
    // ---> LECTURE ICI <---
    else if (page === 'lecture') {
        if (typeof window.lireChapitre === 'function') window.lireChapitre();
    }
    // ---> FAVORIS ICI <---
    else if (page === 'lectures') {
        if (typeof window.chargerFavoris === 'function') window.chargerFavoris();
    }
    // ---> QUARTIERS ICI <---
    else if (page === 'quartiers') {
        if (typeof window.chargerQuartiers === 'function') window.chargerQuartiers();
    }
    // ---> AJOUTE CECI <---
    else if (page === 'gestion') {
        if (typeof window.chargerGestionOeuvre === 'function') window.chargerGestionOeuvre();
    }
    // ---> AJOUTE CELA <---
    else if (page === 'editeur-chapitre') {
        if (typeof window.chargerEditeurChapitre === 'function') window.chargerEditeurChapitre();
    }
    else if (page === 'creation-story') {
        if (typeof window.chargerCreationStory === 'function') window.chargerCreationStory();
    }
    // ---> AJOUTE LE RAYONNNAGE ICI <---
    else if (page === 'categorie-genre') {
        if (typeof window.chargerGenre === 'function') window.chargerGenre();
    }
    else if (
        page === 'conditions-utilisation'
        || page === 'mentions-legales'
        || page === 'politique-confidentialite'
    ) {
        if (typeof window.chargerPageJuridique === 'function') window.chargerPageJuridique();
    }
}

// --- LE NOUVEAU MÉCANISME DU PIÉDESTAL (Interrupteur de Thèmes) ---
window.changerTheme = function(state) {
    const toggleContainer = document.getElementById('footer-toggle');
    const themeLink = document.getElementById('theme-stylesheet');
    
    if (!toggleContainer || !themeLink) return;
    
    // 1. On gère le bouton visuel
    const buttons = toggleContainer.querySelectorAll('.toggle-btn');
    buttons.forEach(b => b.classList.remove('active'));
    
    const btnActif = toggleContainer.querySelector(`[data-state="${state}"]`);
    if (btnActif) btnActif.classList.add('active');
    
    toggleContainer.setAttribute('data-active', state);
    
    // 2. On change la fiole de couleur magique (Remplacement du fichier CSS)
    if (state == 1) {
        themeLink.href = 'theme-original.css';
    } else if (state == 2) {
        themeLink.href = 'theme-abysse.css';
    } else if (state == 3) {
        themeLink.href = 'theme-lumiere.css';
    }

    // 3. On sauvegarde la mémoire dans les archives du navigateur
    localStorage.setItem('themePrefere', state);
};

// --- DÉMARRAGE AUTOMATIQUE ---
// Quand le Maître a fini de charger, on lui dit d'ouvrir le Hall direct
document.addEventListener('DOMContentLoaded', () => {
    const btnScrollTop = document.getElementById('site-scroll-top');
    const btnScrollBottom = document.getElementById('site-scroll-bottom');
    const root = document.getElementById('sanctuaire-root');

    initialiserNotificationsHeader();

    if (btnScrollTop) {
        btnScrollTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (btnScrollBottom) {
        btnScrollBottom.addEventListener('click', () => {
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
        });
    }

    window.addEventListener('scroll', window.programmerMiseAJourScrollRapideSite, { passive: true });
    window.addEventListener('resize', window.programmerMiseAJourScrollRapideSite);
    document.addEventListener('click', fermerPanneauNotifications);
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            fermerPanneauNotifications();
        }
    });

    if (root) {
        const observer = new MutationObserver(() => {
            window.programmerMiseAJourScrollRapideSite();
        });
        observer.observe(root, { childList: true, subtree: true });
    }
    
    // --- LECTURE DE LA MÉMOIRE (Thèmes) AVANT TOUTE CHOSE ---
    const themeSauvegarde = localStorage.getItem('themePrefere');
    if (themeSauvegarde) {
        window.changerTheme(themeSauvegarde);
    }
    
    // Écouteurs pour le Mécanisme Occulte
    const themeButtons = document.querySelectorAll('#footer-toggle .toggle-btn');
    themeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const etatChoisi = e.target.getAttribute('data-state');
            window.changerTheme(etatChoisi);
        });
    });

    // Connecter les boutons du menu principal (Navigation par Genre)
    document.querySelectorAll('.genre-menu button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const genre = e.target.getAttribute('data-genre');
            if (genre === 'accueil') {
                window.changerDePage('accueil'); 
            } else if (genre) {
                // On mémorise le genre choisi pour le script CategorieGenre
                localStorage.setItem('currentGenre', genre);
                
                window.changerDePage('categorie-genre', { genre });
            }
        });
    });

    const miniLogo = document.getElementById('mini-logo');
    if (miniLogo) {
        const retourAccueilDepuisLogo = () => {
            if (window._pageCourante !== 'accueil') {
                window.changerDePage('accueil');
            }
        };

        miniLogo.addEventListener('click', retourAccueilDepuisLogo);
        miniLogo.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                retourAccueilDepuisLogo();
            }
        });
    }

    // Lancer la page demandée dans l'URL (ou l'accueil par défaut)
    const routeInitiale = extraireRouteDepuisHash();
    appliquerParamsRoute(routeInitiale);
    window.chargerPageInterne(routeInitiale.page);
});

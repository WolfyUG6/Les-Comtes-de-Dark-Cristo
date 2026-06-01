// ==========================================
// LANGUES DU SITE (i18n)
// ==========================================

const SITE_LOCALES_DISPONIBLES = ['FR', 'EN', 'JP'];

function normaliserLocaleSite(locale) {
    const localeNormalisee = String(locale || 'FR').toUpperCase();
    return SITE_LOCALES_DISPONIBLES.includes(localeNormalisee) ? localeNormalisee : 'FR';
}

window._siteLocale = normaliserLocaleSite(localStorage.getItem('siteLocale') || 'FR');
window._siteTranslations = null;

function getI18nValue(path, fallback = '') {
    const parts = String(path || '').split('.').filter(Boolean);
    let value = window._siteTranslations;

    for (const part of parts) {
        if (!value || typeof value !== 'object' || !(part in value)) {
            return fallback;
        }
        value = value[part];
    }

    return value ?? fallback;
}

function formatI18nValue(value, params = {}) {
    if (typeof value !== 'string') return value;

    return value.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
        return params[key] ?? match;
    });
}

window.t = function(path, params = {}, fallback = '') {
    return formatI18nValue(getI18nValue(path, fallback || path), params);
};

window.tRaw = function(path, fallback = null) {
    return getI18nValue(path, fallback);
};

function setTextById(id, key, params = {}) {
    const element = document.getElementById(id);
    if (!element) return;
    element.textContent = window.t(key, params, element.textContent);
}

function setAttrById(id, attr, key, params = {}) {
    const element = document.getElementById(id);
    if (!element) return;
    element.setAttribute(attr, window.t(key, params, element.getAttribute(attr) || ''));
}

function setText(selector, key, root = document, params = {}) {
    const element = root.querySelector(selector);
    if (!element) return;
    element.textContent = window.t(key, params, element.textContent);
}

function setAttr(selector, attr, key, root = document, params = {}) {
    const element = root.querySelector(selector);
    if (!element) return;
    element.setAttribute(attr, window.t(key, params, element.getAttribute(attr) || ''));
}

function setOptionText(selector, key, root = document, params = {}) {
    setText(selector, key, root, params);
}

function setHtml(selector, html) {
    const element = document.querySelector(selector);
    if (!element || typeof html !== 'string') return;
    element.innerHTML = html;
}

window.getLocaleAffichageSite = function() {
    return window.tRaw('meta.locale', 'fr') || 'fr';
};

window.traduireGenreSite = function(genre) {
    const map = {
        general: 'navigation.genres.general',
        'High & Low Fantasy': 'navigation.genres.highLowFantasy',
        'Dark Fantasy & Grimdark': 'navigation.genres.darkFantasyGrimdark',
        'Romance et Romantasy': 'navigation.genres.romanceRomantasy',
        'Sci-Fi & Cyberpunk': 'navigation.genres.sciFiCyberpunk',
        'Horreur Psychologique': 'navigation.genres.horreurPsychologique'
    };
    return window.t(map[genre] || '', {}, genre || '');
};

window.traduireStatutSite = function(statut) {
    const map = {
        '✍️ En cours': 'story.statusInProgress',
        '✅ Terminé': 'story.statusCompleted',
        '⏳ En pause': 'story.statusPaused',
        '☠️ Abandonné': 'story.statusAbandoned'
    };
    return window.t(map[statut] || '', {}, statut || window.t('story.statusInProgress', {}, '✍️ En cours'));
};

window.traduireClassificationSite = function(classification) {
    const valeur = classification || 'Tout public';
    const map = {
        'Tout public': 'creationStory.ageAudience',
        R15: 'creationStory.ageR15',
        R16: 'creationStory.ageR16',
        R18: 'creationStory.ageR18'
    };
    return window.t(map[valeur] || '', {}, valeur);
};

window.getLibelleTypeChapitre = function(typeChapitre = 'chapitre') {
    const type = String(typeChapitre || 'chapitre').trim();
    const map = {
        prologue: window.t?.('editor.typePrologue', {}, 'Prologue') || 'Prologue',
        chapitre: window.t?.('editor.typeChapter', {}, 'Chapitre') || 'Chapitre',
        epilogue: window.t?.('editor.typeEpilogue', {}, 'Epilogue') || 'Epilogue',
        hors_serie: window.t?.('editor.typeBonus', {}, 'Hors-serie') || 'Hors-serie'
    };
    return map[type] || map.chapitre;
};

window.getTitreCompletChapitre = function(chapitre = {}) {
    const titre = String(chapitre.titre || '').trim();
    const type = String(chapitre.type_chapitre || 'chapitre').trim();
    const libelle = window.getLibelleTypeChapitre(type);
    const numeroAffichage = chapitre.numero_affichage == null ? '' : String(chapitre.numero_affichage).trim();
    const numero = type === 'chapitre'
        ? (numeroAffichage || String(chapitre.numero ?? '').trim())
        : numeroAffichage;

    if (type === 'chapitre') {
        return numero ? `${libelle} ${numero} : ${titre}` : `${libelle} : ${titre}`;
    }

    return numero ? `${libelle} ${numero} : ${titre}` : `${libelle} : ${titre}`;
};

window.getOrdreLectureDepuisChamps = function(typeChapitre = 'chapitre', numeroAffichage = '') {
    const type = String(typeChapitre || 'chapitre').trim();
    const numero = String(numeroAffichage || '').trim().replace(',', '.');
    const match = numero.match(/^(\d+)(?:\.(\d{1,3}))?$/);
    const base = match ? (Number(match[1]) * 1000) + Number(match[2] || 0) : 0;

    if (type === 'prologue') return -1000000 + base;
    if (type === 'epilogue') return 100000000 + base;
    if (type === 'hors_serie') return 200000000 + base;
    return base;
};

window.getNumeroLegacyChapitre = function(typeChapitre = 'chapitre', numeroAffichage = '') {
    const numero = String(numeroAffichage || '').trim().replace(',', '.');
    const entier = Number.parseInt(numero, 10);
    if (Number.isFinite(entier)) return entier;
    if (typeChapitre === 'prologue') return 0;
    if (typeChapitre === 'epilogue') return 9999;
    return 0;
};

function appliquerTraductionsChrome() {
    if (!window._siteTranslations) return;

    document.documentElement.lang = window.tRaw('meta.locale', 'fr');
    document.documentElement.dir = window.tRaw('meta.direction', 'ltr');
    document.title = window.tRaw('meta.seoTitle', window.tRaw('meta.siteName', document.title));
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute('content', window.tRaw('meta.description', description.getAttribute('content') || ''));

    setAttrById('mini-logo', 'aria-label', 'header.homeAria');
    const miniLogoName = document.querySelector('#mini-logo span');
    if (miniLogoName) miniLogoName.textContent = window.tRaw('meta.siteName', miniLogoName.textContent);
    const heroTitle = document.querySelector('#hero-logo-area h1');
    if (heroTitle) heroTitle.textContent = window.tRaw('meta.siteName', heroTitle.textContent);
    setTextById('btn-login', 'header.login');
    setTextById('btn-signup', 'header.signup');
    setTextById('btn-profile-main', 'header.profile');
    setTextById('btn-logout', 'header.logout');
    setAttrById('btn-notifications', 'aria-label', 'header.notificationsAria');
    setTextById('btn-quartiers-nav', 'header.profileMenu.quarters');
    setTextById('btn-lectures-nav', 'header.profileMenu.readings');
    setTextById('btn-atelier-nav', 'header.profileMenu.forge');
    setTextById('btn-install-app', 'header.profileMenu.installApp');
    setTextById('auth-modal-title', 'auth.modalTitle');
    setAttrById('email-input', 'placeholder', 'auth.emailPlaceholder');
    setAttrById('password-input', 'placeholder', 'auth.passwordPlaceholder');
    setTextById('forgot-password-link', 'auth.forgotPassword');
    setAttrById('reset-password-input', 'placeholder', 'auth.newPasswordPlaceholder');
    setAttrById('reset-password-confirm', 'placeholder', 'auth.confirmPasswordPlaceholder');
    setTextById('submit-auth', 'auth.submit');
    setTextById('close-modal', 'common.close');
    setTextById('site-dialog-title', 'dialog.defaultTitle');
    setTextById('site-dialog-cancel', 'common.cancel');
    setTextById('site-dialog-confirm', 'common.confirm');

    document.querySelectorAll('.auth-helper-text').forEach((element) => {
        element.textContent = window.t('auth.recoveryText', {}, element.textContent);
    });

    const menuLabels = {
        accueil: 'navigation.home',
        general: 'navigation.genres.general',
        'High & Low Fantasy': 'navigation.genres.highLowFantasy',
        'Dark Fantasy & Grimdark': 'navigation.genres.darkFantasyGrimdark',
        'Romance et Romantasy': 'navigation.genres.romanceRomantasy',
        'Sci-Fi & Cyberpunk': 'navigation.genres.sciFiCyberpunk',
        'Horreur Psychologique': 'navigation.genres.horreurPsychologique'
    };

    document.querySelectorAll('#main-genre-menu [data-genre]').forEach((button) => {
        const key = menuLabels[button.dataset.genre];
        if (key) button.textContent = window.t(key, {}, button.textContent);
    });

    document.querySelectorAll('.footer-brand .brand-title').forEach((element) => {
        element.textContent = window.tRaw('meta.siteName', element.textContent);
    });
    document.querySelectorAll('.footer-brand .brand-subtitle').forEach((element) => {
        element.textContent = window.t('footer.brandSubtitle', {}, element.textContent);
    });
    document.querySelectorAll('.footer-theme-toggle p').forEach((element) => {
        element.textContent = window.t('footer.themeTitle', {}, element.textContent);
    });

    const themeLabels = {
        1: 'footer.themes.original',
        2: 'footer.themes.abyss',
        3: 'footer.themes.light'
    };
    document.querySelectorAll('#footer-toggle .toggle-btn').forEach((button) => {
        const key = themeLabels[button.dataset.state];
        if (key) button.textContent = window.t(key, {}, button.textContent);
    });

    const footerLinks = document.querySelectorAll('.footer-links a');
    if (footerLinks[0]) footerLinks[0].textContent = window.t('footer.terms', {}, footerLinks[0].textContent);
    if (footerLinks[1]) footerLinks[1].textContent = window.t('footer.legal', {}, footerLinks[1].textContent);
    if (footerLinks[2]) footerLinks[2].textContent = window.t('footer.privacy', {}, footerLinks[2].textContent);
    if (footerLinks[3]) {
        const svg = footerLinks[3].querySelector('svg');
        footerLinks[3].textContent = '';
        if (svg) footerLinks[3].appendChild(svg);
        footerLinks[3].append(' ' + window.t('footer.discord', {}, 'Rejoindre le Culte'));
    }

    document.querySelectorAll('.footer-copyright').forEach((element) => {
        element.textContent = window.t('footer.copyright', {}, element.textContent);
    });

    document.querySelectorAll('.notifications-empty').forEach((element) => {
        element.textContent = window.t('notifications.empty', {}, element.textContent);
    });

    document.querySelectorAll('.language-btn').forEach((button) => {
        const active = button.dataset.lang?.toUpperCase() === window._siteLocale.toUpperCase();
        button.classList.toggle('active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function appliquerTraductionsAccueil(root = document) {
    const welcome = window.tRaw('home.welcome', null);
    if (welcome) {
        const title = root.querySelector('#welcome-section h2');
        const paragraph = root.querySelector('#welcome-section p');
        if (title) title.textContent = welcome.title;
        if (paragraph) {
            paragraph.innerHTML = (welcome.paragraphs || []).join('<br><br>');
        }
    }

    const weekly = window.tRaw('home.weeklyHighlights', null);
    if (weekly) {
        const weeklyTitle = root.querySelector('#weekly-highlights-section .section-heading h2');
        const weeklyDescription = root.querySelector('#weekly-highlights-section .section-heading p');
        const weeklyLoading = root.querySelector('#weekly-highlights-container .loading-text');

        if (weeklyTitle) weeklyTitle.textContent = weekly.title;
        if (weeklyDescription) weeklyDescription.textContent = weekly.description;
        if (weeklyLoading) weeklyLoading.textContent = weekly.loading;
    }

    const archiveLoading = root.querySelector('#stories-container .loading-text');
    if (archiveLoading) archiveLoading.textContent = window.t('home.archiveLoading', {}, archiveLoading.textContent);
}

function appliquerTraductionsLecteur(root = document) {
    const titre = root.querySelector('#lecture-titre');
    if (titre && /Déchiffrement|DÃ©chiffrement/.test(titre.textContent)) {
        titre.textContent = window.t('reader.deciphering', {}, titre.textContent);
    }

    root.querySelectorAll('#btn-chap-prec-haut, #btn-chap-prec-bas').forEach((button) => {
        button.textContent = window.t('reader.previous', {}, button.textContent);
    });
    root.querySelectorAll('#btn-chap-suiv-haut, #btn-chap-suiv-bas').forEach((button) => {
        button.textContent = window.t('reader.next', {}, button.textContent);
    });
    root.querySelectorAll('[data-retour-oeuvre]').forEach((button) => {
        const key = button.id === 'btn-retour-oeuvre-haut' ? 'reader.quitReadingShort' : 'reader.quitReading';
        button.textContent = window.t(key, {}, button.textContent);
    });

    const pupitreTitle = root.querySelector('.pupitre-title');
    if (pupitreTitle) pupitreTitle.textContent = window.t('reader.pupitreTitle', {}, pupitreTitle.textContent);

    const labels = root.querySelectorAll('.pupitre-group label');
    const labelKeys = ['reader.backgroundLabel', 'reader.fontSizeLabel', 'reader.widthLabel', 'reader.fontLabel'];
    labels.forEach((label, index) => {
        if (labelKeys[index]) label.textContent = window.t(labelKeys[index], {}, label.textContent);
    });

    setTextById('btn-theme-sombre', 'reader.themeAbyss');
    setTextById('btn-theme-sepia', 'reader.themeSepia');
    setTextById('btn-theme-clair', 'reader.themeLight');
    setTextById('btn-mode-zen', 'reader.fullscreen');
    setTextById('btn-pupitre-scroll-top', 'reader.top');
    setTextById('btn-pupitre-scroll-bottom', 'reader.bottom');
    setAttrById('btn-toggle-pupitre', 'aria-label', 'reader.toggleSettings');
}

function appliquerTraductionsCommentaires(root = document) {
    root.querySelectorAll('[data-commentaires-root]').forEach((section) => {
        const estChapitre = section.id === 'commentaires-chapitre-section';
        const titre = section.querySelector('.commentaires-header h2');
        const intro = section.querySelector('.commentaires-intro');
        const triLabel = section.querySelector('.commentaires-tri-wrap span');
        const optionRecents = section.querySelector('option[value="recents"]');
        const optionAnciens = section.querySelector('option[value="anciens"]');
        const message = section.querySelector('[data-role="message"]');
        const boutonPublier = section.querySelector('[data-role="form"] button[type="submit"]');
        const vide = section.querySelector('[data-role="vide"]');
        const annulerReponse = section.querySelector('[data-action="cancel-reply"]');

        if (titre) titre.textContent = window.t(estChapitre ? 'comments.titleChapter' : 'comments.titleStory', {}, titre.textContent);
        if (intro) intro.textContent = window.t(estChapitre ? 'comments.introChapter' : 'comments.introStory', {}, intro.textContent);
        if (triLabel) triLabel.textContent = window.t('comments.sortLabel', {}, triLabel.textContent);
        if (optionRecents) optionRecents.textContent = window.t('comments.sortRecent', {}, optionRecents.textContent);
        if (optionAnciens) optionAnciens.textContent = window.t('comments.sortOld', {}, optionAnciens.textContent);
        if (message) message.setAttribute('placeholder', window.t('comments.placeholder', {}, message.getAttribute('placeholder') || ''));
        if (boutonPublier) boutonPublier.textContent = window.t('comments.publish', {}, boutonPublier.textContent);
        if (vide) vide.textContent = window.t('comments.empty', {}, vide.textContent);
        if (annulerReponse) annulerReponse.textContent = window.t('comments.cancelReply', {}, annulerReponse.textContent);
    });
}

function appliquerTraductionsHistoire(root = document) {
    setTextById('btn-retour-bibliotheque', 'story.backToLibrary');
    setTextById('btn-retirer-histoire', 'story.removeAdmin');
    setTextById('btn-suivre-histoire', 'story.support');
    setTextById('btn-archiver-histoire', 'story.archive');
    setTextById('btn-partager-histoire', 'story.share');
    setAttrById('volumes-scroll-left', 'aria-label', 'story.volumePrevious');
    setAttrById('volumes-scroll-right', 'aria-label', 'story.volumeNext');
    setAttrById('volume-preview-close', 'aria-label', 'story.volumePreviewClose');

    const loading = root.querySelector('#histoire-presentation-panel .loading-text');
    if (loading) loading.textContent = window.t('story.loading', {}, loading.textContent);

    const stars = root.querySelector('#prochain-chapitre-box .text-muted-italic');
    if (stars) stars.textContent = window.t('story.readingStars', {}, stars.textContent);

    const chaptersTitle = root.querySelector('.chapters-header h2');
    if (chaptersTitle) chaptersTitle.textContent = window.t('story.chaptersListTitle', {}, chaptersTitle.textContent);

    const pageSizeLabel = root.querySelector('.chapter-page-size span');
    if (pageSizeLabel) pageSizeLabel.textContent = window.t('story.pageSizeLabel', {}, pageSizeLabel.textContent);

    appliquerTraductionsCommentaires(root);
}

function appliquerTraductionsForge(root = document) {
    setText('.welcome-content h2', 'forge.heroTitle', root);
    setText('.welcome-content > p', 'forge.heroIntro', root);
    setText('.forge-image-notice strong', 'forge.imageNoticeTitle', root);
    setText('.forge-image-notice p', 'forge.imageNotice', root);
    setText('#btn-publish', 'forge.newStory', root);
    setText('#btn-retour-studio', 'forge.leave', root);
    setText('.my-stories-section .section-title', 'forge.currentStories', root);
    setOptionText('#tri-oeuvres option[value="recent"]', 'forge.sortRecent', root);
    setOptionText('#tri-oeuvres option[value="ancien"]', 'forge.sortOld', root);
    setOptionText('#tri-oeuvres option[value="az"]', 'forge.sortAz', root);
    setOptionText('#tri-oeuvres option[value="za"]', 'forge.sortZa', root);
    setText('#mes-oeuvres-liste .loading-text', 'forge.loadingMine', root);
}

function appliquerTraductionsGestion(root = document) {
    setText('#btn-retour-gestion', 'gestion.backToForge', root);
    setText('#btn-edit-histoire', 'gestion.editStory', root);
    setText('#info-histoire-panel .loading-text', 'gestion.storyLoading', root);
    setText('.volumes-section .chapters-header h2', 'gestion.volumesTitle', root);
    setText('#volumes-liste .loading-text', 'gestion.volumesLoading', root);
    setText('label[for="volume-title"]', 'gestion.volumeNameLabel', root);
    setAttr('#volume-title', 'placeholder', 'gestion.volumeNamePlaceholder', root);
    setText('label[for="volume-cover-file"]', 'gestion.volumeCoverLabel', root);
    setText('#btn-create-volume', 'gestion.createVolume', root);
    setText('.chapitres-section .chapters-header h2', 'gestion.chaptersTitle', root);
    setText('#btn-add-chapitre', 'gestion.addChapter', root);
    setText('.chapter-section-title-brouillon', 'gestion.draftsTitle', root);
    setText('.chapter-section-title-programme', 'gestion.scheduledTitle', root);
    setText('.chapter-section-title-publie', 'gestion.publishedTitle', root);
    root.querySelectorAll('.chapter-page-size span').forEach((element) => {
        element.textContent = window.t('story.pageSizeLabel', {}, element.textContent);
    });
}

function appliquerTraductionsCreationStory(root = document) {
    setText('#btn-retour-creation', 'gestion.backToForge', root);
    setText('.editor-header h2', 'creationStory.newTitle', root);
    setText('#submit-story', 'creationStory.submitCreate', root);
    setText('label[for="story-title"]', 'creationStory.titleLabel', root);
    setAttr('#story-title', 'placeholder', 'creationStory.titlePlaceholder', root);
    setText('label[for="story-synopsis"]', 'creationStory.synopsisLabel', root);
    setAttr('#story-synopsis', 'placeholder', 'creationStory.synopsisPlaceholder', root);
    setText('#story-language-label', 'creationStory.languageLabel', root);
    setText('.story-language-help', 'creationStory.languageHelp', root);
    setText('label[for="story-genre"]', 'creationStory.genreLabel', root);
    setOptionText('#story-genre option[value=""]', 'creationStory.genrePlaceholder', root);
    setOptionText('#story-genre option[value="High & Low Fantasy"]', 'navigation.genres.highLowFantasy', root);
    setOptionText('#story-genre option[value="Dark Fantasy & Grimdark"]', 'navigation.genres.darkFantasyGrimdark', root);
    setOptionText('#story-genre option[value="Romance et Romantasy"]', 'navigation.genres.romanceRomantasy', root);
    setOptionText('#story-genre option[value="Sci-Fi & Cyberpunk"]', 'navigation.genres.sciFiCyberpunk', root);
    setOptionText('#story-genre option[value="Horreur Psychologique"]', 'navigation.genres.horreurPsychologique', root);
    setText('label[for="story-age"]', 'creationStory.ageLabel', root);
    setOptionText('#story-age option[value=""]', 'creationStory.agePlaceholder', root);
    setOptionText('#story-age option[value="Tout public"]', 'creationStory.ageAudience', root);
    setOptionText('#story-age option[value="R15"]', 'creationStory.ageR15', root);
    setOptionText('#story-age option[value="R16"]', 'creationStory.ageR16', root);
    setOptionText('#story-age option[value="R18"]', 'creationStory.ageR18', root);
    setText('label[for="story-status"]', 'creationStory.statusLabel', root);
    setOptionText('#story-status option[value="✍️ En cours"]', 'story.statusInProgress', root);
    setOptionText('#story-status option[value="✅ Terminé"]', 'story.statusCompleted', root);
    setOptionText('#story-status option[value="⏳ En pause"]', 'story.statusPaused', root);
    setOptionText('#story-status option[value="☠️ Abandonné"]', 'story.statusAbandoned', root);
    const sensibleLabel = root.querySelector('#story-sensible')?.closest('label')?.querySelector('strong');
    if (sensibleLabel) sensibleLabel.textContent = window.t('creationStory.sensitiveLabel', {}, sensibleLabel.textContent);
    const commentsLabel = root.querySelector('#story-comments-enabled')?.closest('label')?.querySelector('strong');
    if (commentsLabel) commentsLabel.textContent = window.t('creationStory.commentsLabel', {}, commentsLabel.textContent);
    setText('label[for="story-cover-file"]', 'creationStory.coverLabel', root);
    setText('.publish-options .text-muted', 'creationStory.coverHelp', root);
    const deleteCoverLabel = root.querySelector('#story-delete-cover')?.closest('label')?.querySelector('strong');
    if (deleteCoverLabel) deleteCoverLabel.textContent = window.t('creationStory.deleteCoverLabel', {}, deleteCoverLabel.textContent);
}

function appliquerTraductionsEditeur(root = document) {
    setText('#close-chapitre-modal', 'editor.cancel', root);
    setText('.editor-header h2', 'editor.workshopTitle', root);
    setText('#submit-chapitre', 'editor.submitCreate', root);
    setText('label[for="chapitre-type"]', 'editor.typeLabel', root);
    setOptionText('#chapitre-type option[value="chapitre"]', 'editor.typeChapter', root);
    setOptionText('#chapitre-type option[value="prologue"]', 'editor.typePrologue', root);
    setOptionText('#chapitre-type option[value="epilogue"]', 'editor.typeEpilogue', root);
    setOptionText('#chapitre-type option[value="hors_serie"]', 'editor.typeBonus', root);
    setText('label[for="chapitre-numero"]', 'editor.numberLabel', root);
    setAttr('#chapitre-numero', 'placeholder', 'editor.numberPlaceholder', root);
    if (typeof window.actualiserLabelNumeroChapitre === 'function') {
        window.actualiserLabelNumeroChapitre();
    }
    setText('label[for="chapitre-titre"]', 'editor.titleLabel', root);
    setAttr('#chapitre-titre', 'placeholder', 'editor.titlePlaceholder', root);
    setText('label[for="chapitre-volume"]', 'editor.volumeLabel', root);
    setOptionText('#chapitre-volume option[value=""]', 'volumes.general', root);
    const labels = root.querySelectorAll('.editor-container > .form-group > label');
    if (labels[1]) labels[1].textContent = window.t('editor.startNoteLabel', {}, labels[1].textContent);
    if (labels[2]) labels[2].textContent = window.t('editor.contentLabel', {}, labels[2].textContent);
    if (labels[3]) labels[3].textContent = window.t('editor.endNoteLabel', {}, labels[3].textContent);
    setText('#compteur-mots-container', 'editor.wordCounter', root, { count: 0 });
    const publishLabel = root.querySelector('#chapitre-publie')?.closest('label')?.querySelector('strong');
    if (publishLabel) publishLabel.textContent = window.t('editor.publishNowLabel', {}, publishLabel.textContent);
    setText('label[for="chapitre-date-pub"]', 'editor.scheduleLabel', root);
    setText('.publish-help-text', 'editor.scheduleHelp', root);
    setAttr('#chapitre-date-pub', 'placeholder', 'editor.noSchedule', root);
    setText('#chapitre-date-trigger', 'editor.openCalendar', root);
    setText('#chapitre-date-clear', 'editor.clearSchedule', root);
}

function appliquerTraductionsFavoris(root = document) {
    setText('.accueil-header h1', 'favorites.title', root);
    setText('.accueil-header p', 'favorites.subtitle', root);
    setText('[data-tab="tab-pactes"]', 'favorites.tabPacts', root);
    setText('[data-tab="tab-archives"]', 'favorites.tabArchives', root);
    setText('.favoris-sort label', 'favorites.sortLabel', root);
    setOptionText('#sort-pactes option[value="recent"]', 'favorites.sortRecent', root);
    setOptionText('#sort-pactes option[value="ancien"]', 'favorites.sortOld', root);
    setOptionText('#sort-pactes option[value="az"]', 'favorites.sortAz', root);
    setOptionText('#sort-pactes option[value="za"]', 'favorites.sortZa', root);
    setText('.favoris-toolbar .btn-outline-blue', 'favorites.returnHome', root);
    setText('#tab-archives h2', 'favorites.archivesTitle', root);
    setText('#tab-archives p', 'favorites.archivesText', root);
}

function appliquerTraductionsQuartiers(root = document) {
    setText('.btn-retour-container button', 'profile.returnHome', root);
    setText('[data-target="section-identite"]', 'profile.tabIdentity', root);
    setText('[data-target="section-securite"]', 'profile.tabSecurity', root);
    setText('[data-target="section-preferences"]', 'profile.tabPreferences', root);
    setText('[data-target="section-compte"]', 'profile.tabAccount', root);
    setText('#section-identite h2', 'profile.identityTitle', root);
    setText('#section-identite label', 'profile.avatarLabel', root);
    setText('#section-identite button[onclick*="quartiers-avatar-file"]', 'profile.chooseAvatar', root);
    setText('#section-identite small', 'profile.avatarHelp', root);
    setText('#section-identite .form-group:nth-of-type(2) label', 'profile.pseudoLabel', root);
    setAttr('#quartiers-pseudo', 'placeholder', 'profile.pseudoPlaceholder', root);
    setText('#btn-save-identite', 'profile.saveIdentity', root);
    setText('#section-securite h2', 'profile.securityTitle', root);
    const emailLabel = root.querySelector('#quartiers-email')?.closest('.form-group')?.querySelector('label');
    if (emailLabel) emailLabel.textContent = window.t('profile.emailLabel', {}, emailLabel.textContent);
    setAttr('#quartiers-email', 'placeholder', 'profile.emailPlaceholder', root);
    setText('#btn-save-email', 'profile.emailButton', root);
    const passwordLabel = root.querySelector('#quartiers-password')?.closest('.form-group')?.querySelector('label');
    if (passwordLabel) passwordLabel.textContent = window.t('profile.passwordLabel', {}, passwordLabel.textContent);
    setAttr('#quartiers-password', 'placeholder', 'profile.passwordPlaceholder', root);
    setText('#btn-save-password', 'profile.passwordButton', root);
    setText('#section-preferences h2', 'profile.preferencesTitle', root);
    setText('#section-preferences .pref-item:nth-of-type(1) h3', 'profile.authorModeTitle', root);
    setText('#section-preferences .pref-item:nth-of-type(1) p', 'profile.authorModeText', root);
    setText('#section-preferences .pref-item:nth-of-type(2) h3', 'profile.commentsTitle', root);
    setText('#section-preferences .pref-item:nth-of-type(2) p', 'profile.commentsText', root);
    setText('#section-compte h2', 'profile.deleteTitle', root);
    setText('#section-compte p', 'profile.deleteText', root);
    setText('#btn-delete-account', 'profile.deleteButton', root);
}

function appliquerTraductionsCategorie(root = document) {
    const genre = localStorage.getItem('currentGenre') || '';
    setText('#genre-page-title', genre ? 'category.title' : 'category.unknownTitle', root, { genre: window.traduireGenreSite(genre) });
    setText('.welcome-content .text-muted', 'category.intro', root);
    setText('label[for="category-search"] span', 'common.search', root);
    setAttr('#category-search', 'placeholder', 'category.searchPlaceholder', root);
    setText('label[for="category-page-size"] span', 'story.pageSizeLabel', root);
    setText('label[for="category-sort"] span', 'category.sortLabel', root);
    setOptionText('#category-sort option[value="published_desc"]', 'category.sortPublishedDesc', root);
    setOptionText('#category-sort option[value="published_asc"]', 'category.sortPublishedAsc', root);
    setOptionText('#category-sort option[value="name_asc"]', 'category.sortNameAsc', root);
    setOptionText('#category-sort option[value="name_desc"]', 'category.sortNameDesc', root);
    setOptionText('#category-sort option[value="author_asc"]', 'category.sortAuthorAsc', root);
    setOptionText('#category-sort option[value="author_desc"]', 'category.sortAuthorDesc', root);
    setOptionText('#category-sort option[value="updated_desc"]', 'category.sortUpdatedDesc', root);
}

window.appliquerTraductionsPage = function(page, root = document) {
    if (!window._siteTranslations) return;

    if (page === 'accueil') {
        appliquerTraductionsAccueil(root);
    }

    if (page === 'oeuvre') {
        appliquerTraductionsHistoire(root);
    }

    if (page === 'lecture') {
        appliquerTraductionsLecteur(root);
        appliquerTraductionsCommentaires(root);
    }

    if (page === 'studio') appliquerTraductionsForge(root);
    if (page === 'gestion') appliquerTraductionsGestion(root);
    if (page === 'creation-story') appliquerTraductionsCreationStory(root);
    if (page === 'editeur-chapitre') appliquerTraductionsEditeur(root);
    if (page === 'lectures') appliquerTraductionsFavoris(root);
    if (page === 'quartiers') appliquerTraductionsQuartiers(root);
    if (page === 'categorie-genre') appliquerTraductionsCategorie(root);
};

window.getPageStatiqueTraduite = function(page) {
    const map = {
        'conditions-utilisation': 'staticPages.conditionsOfUse.html',
        'mentions-legales': 'staticPages.legalNotice.html',
        'politique-confidentialite': 'staticPages.privacyPolicy.html'
    };

    const key = map[page];
    return key ? window.tRaw(key, null) : null;
};

async function chargerLocaleSite(locale = 'FR') {
    const localeNormalisee = normaliserLocaleSite(locale);

    try {
        const response = await fetch(`locales/${localeNormalisee}.json`, { cache: 'no-cache' });
        if (!response.ok) throw new Error(`Locale ${localeNormalisee} indisponible`);

        window._siteTranslations = await response.json();
        window._siteLocale = localeNormalisee;
        localStorage.setItem('siteLocale', localeNormalisee);
        appliquerTraductionsChrome();
        return window._siteTranslations;
    } catch (error) {
        if (localeNormalisee !== 'FR') {
            return chargerLocaleSite('FR');
        }

        console.error('Impossible de charger la langue du site :', error);
        window._siteTranslations = {};
        return window._siteTranslations;
    }
}

async function enregistrerLanguePrefereeSite(locale = 'FR') {
    const localeNormalisee = normaliserLocaleSite(locale);

    if (!window._supabase?.auth) return;

    try {
        const { data: { session } } = await window._supabase.auth.getSession();
        const userId = session?.user?.id;
        if (!userId) return;

        const payload = { langue_preferee: localeNormalisee };
        const { data: profil, error: selectError } = await window._supabase
            .from('noms_de_plume')
            .select('user_id')
            .eq('user_id', userId)
            .maybeSingle();

        if (selectError) throw selectError;

        const { error } = profil
            ? await window._supabase
                .from('noms_de_plume')
                .update(payload)
                .eq('user_id', userId)
            : await window._supabase
                .from('noms_de_plume')
                .insert({ user_id: userId, ...payload });

        if (error) throw error;
    } catch (error) {
        console.error("Impossible d'enregistrer la langue preferee :", error);
    }
}

window.changerLangueSite = async function(locale) {
    const localeNormalisee = normaliserLocaleSite(locale);

    await chargerLocaleSite(localeNormalisee);
    await enregistrerLanguePrefereeSite(localeNormalisee);
    appliquerTraductionsChrome();

    if (window._pageCourante && typeof window.chargerPageInterne === 'function') {
        window.chargerPageInterne(window._pageCourante);
    }
};

window.i18nReady = chargerLocaleSite(window._siteLocale);

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.language-btn').forEach((button) => {
        button.addEventListener('click', () => {
            window.changerLangueSite(button.dataset.lang || 'FR');
        });
    });

    window.i18nReady.then(appliquerTraductionsChrome);
});

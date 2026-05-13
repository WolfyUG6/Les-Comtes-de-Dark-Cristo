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

function setHtml(selector, html) {
    const element = document.querySelector(selector);
    if (!element || typeof html !== 'string') return;
    element.innerHTML = html;
}

function appliquerTraductionsChrome() {
    if (!window._siteTranslations) return;

    document.documentElement.lang = window.tRaw('meta.locale', 'fr');
    document.documentElement.dir = window.tRaw('meta.direction', 'ltr');
    document.title = window.tRaw('meta.siteName', document.title);
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
        'High & Low Fantasy': 'navigation.genres.highLowFantasy',
        'Dark Fantasy & Grimdark': 'navigation.genres.darkFantasyGrimdark',
        'Romantasy Tragique': 'navigation.genres.romantasyTragique',
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
    setTextById('btn-retour-oeuvre', 'reader.quitReading');
}

window.appliquerTraductionsPage = function(page, root = document) {
    if (!window._siteTranslations) return;

    if (page === 'accueil') {
        appliquerTraductionsAccueil(root);
    }

    if (page === 'lecture') {
        appliquerTraductionsLecteur(root);
    }
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

window.changerLangueSite = async function(locale) {
    await chargerLocaleSite(locale);
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

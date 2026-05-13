// ==========================================
// INSTALLATION MOBILE (PWA)
// ==========================================

window._pwaInstallPrompt = null;
window._pwaSessionActive = false;

function estAppInstalleePwa() {
    return window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
}

function estAppareilMobilePwa() {
    const tactile = window.matchMedia('(pointer: coarse)').matches;
    const largeurMobile = window.matchMedia('(max-width: 1024px)').matches;
    const agent = navigator.userAgent || '';
    const mobileAgent = /Android|iPhone|iPad|iPod/i.test(agent);

    return (tactile && largeurMobile) || mobileAgent;
}

function estIosPwa() {
    return /iPhone|iPad|iPod/i.test(navigator.userAgent || '');
}

function getBoutonInstallationPwa() {
    return document.getElementById('btn-install-app');
}

function actualiserBoutonInstallationPwa() {
    const bouton = getBoutonInstallationPwa();
    if (!bouton) return;

    const visible = window._pwaSessionActive === true
        && estAppareilMobilePwa()
        && !estAppInstalleePwa();

    bouton.classList.toggle('hidden', !visible);
}

window.actualiserBoutonInstallationApp = function(session = null) {
    window._pwaSessionActive = Boolean(session);
    actualiserBoutonInstallationPwa();
};

async function afficherAideInstallationPwa() {
    if (estIosPwa()) {
        await window.siteAlert(
            window.t?.('pwa.iosHelp', {}, "Sur iPhone ou iPad, ouvrez le menu Partager de Safari, puis choisissez \"Sur l'écran d'accueil\".") || "Sur iPhone ou iPad, ouvrez le menu Partager de Safari, puis choisissez \"Sur l'écran d'accueil\"."
        );
        return;
    }

    await window.siteAlert(
        window.t?.('pwa.genericHelp', {}, "Si l'installation ne s'ouvre pas automatiquement, utilisez le menu du navigateur puis \"Ajouter à l'écran d'accueil\".") || "Si l'installation ne s'ouvre pas automatiquement, utilisez le menu du navigateur puis \"Ajouter à l'écran d'accueil\"."
    );
}

async function demanderInstallationPwa() {
    if (estAppInstalleePwa()) {
        actualiserBoutonInstallationPwa();
        return;
    }

    if (!window._pwaInstallPrompt) {
        await afficherAideInstallationPwa();
        return;
    }

    const promptEvent = window._pwaInstallPrompt;
    window._pwaInstallPrompt = null;
    promptEvent.prompt();

    const choix = await promptEvent.userChoice.catch(() => null);
    if (choix?.outcome === 'accepted') {
        actualiserBoutonInstallationPwa();
    } else {
        window._pwaInstallPrompt = promptEvent;
    }
}

window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    window._pwaInstallPrompt = event;
    actualiserBoutonInstallationPwa();
});

window.addEventListener('appinstalled', () => {
    window._pwaInstallPrompt = null;
    actualiserBoutonInstallationPwa();
});

window.addEventListener('resize', actualiserBoutonInstallationPwa);

document.addEventListener('DOMContentLoaded', () => {
    const bouton = getBoutonInstallationPwa();
    if (bouton) {
        bouton.addEventListener('click', demanderInstallationPwa);
    }

    actualiserBoutonInstallationPwa();
});

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js').catch((error) => {
            console.error(window.t?.('pwa.registrationError', { message: error.message }, "Impossible d'activer l'installation mobile : " + error.message) || "Impossible d'activer l'installation mobile :", error);
        });
    });
}

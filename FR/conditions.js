// ==========================================
// CONDITIONS D'UTILISATION (conditions.js)
// Lecture simple, sommaire et navigation
// ==========================================

function getConditionsRefs() {
    return {
        page: document.querySelector('.page-conditions'),
        scrollTop: document.getElementById('conditions-scroll-top'),
        scrollBottom: document.getElementById('conditions-scroll-bottom')
    };
}

function estPageJuridiqueActive() {
    return window._pageCourante === 'conditions-utilisation'
        || window._pageCourante === 'mentions-legales';
}

function mettreAJourBoutonsConditions() {
    const { page, scrollTop, scrollBottom } = getConditionsRefs();
    if (!page || !estPageJuridiqueActive()) return;

    const hauteurScrollable = document.documentElement.scrollHeight - window.innerHeight;
    const peutScroller = hauteurScrollable > 40;
    const positionActuelle = window.scrollY || window.pageYOffset || 0;

    if (scrollTop) {
        scrollTop.classList.toggle('is-visible', peutScroller && positionActuelle > 180);
    }

    if (scrollBottom) {
        scrollBottom.classList.toggle('is-visible', peutScroller && positionActuelle < hauteurScrollable - 140);
    }
}

function faireDefilerVersSection(targetId) {
    const cible = document.getElementById(targetId);
    if (!cible) return;

    const offset = 110;
    const top = cible.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({
        top: Math.max(0, top),
        behavior: 'smooth'
    });
}

window.chargerPageJuridique = function() {
    window.scrollTo({ top: 0, behavior: 'auto' });
    requestAnimationFrame(() => {
        mettreAJourBoutonsConditions();
    });
};

window.chargerConditionsUtilisation = window.chargerPageJuridique;
window.chargerMentionsLegales = window.chargerPageJuridique;

if (!window.conditionsEventsHooked) {
    document.addEventListener('click', (event) => {
        const cibleSommaire = event.target.closest('[data-conditions-target]');
        if (cibleSommaire && estPageJuridiqueActive()) {
            event.preventDefault();
            faireDefilerVersSection(cibleSommaire.getAttribute('data-conditions-target'));
            return;
        }

        if (event.target.id === 'conditions-return-site' && estPageJuridiqueActive()) {
            event.preventDefault();
            window.changerDePage('accueil');
            return;
        }

        if (event.target.id === 'conditions-scroll-top' && estPageJuridiqueActive()) {
            event.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        if (event.target.id === 'conditions-scroll-bottom' && estPageJuridiqueActive()) {
            event.preventDefault();
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
        }
    });

    window.addEventListener('scroll', mettreAJourBoutonsConditions, { passive: true });
    window.addEventListener('resize', mettreAJourBoutonsConditions);
    window.conditionsEventsHooked = true;
}

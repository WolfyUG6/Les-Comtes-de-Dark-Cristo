// ==========================================
// LA SALLE DE LECTURE (lecteur.js)
// Affichage du chapitre, Pupitre et Barre de Sang
// ==========================================

let timeoutBulle = null;
let vueComptee = false;
let tempsLectureAtteint = false; 
let aAtteintMoitie = false;
let derniereZone = 0;
// On initialise la taille de plume avec la valeur sauvegardée ou 1.1 par défaut
let taillePlumeActuelle = parseFloat(localStorage.getItem('lecteurTaille')) || 1.1;
let largeurParcheminActuelle = parseFloat(localStorage.getItem('lecteurLargeur')) || 75;

// Met à jour l'état des boutons de largeur (grisés si min/max atteints)
function updateWidthButtons() {
    const btnMoins = document.getElementById('btn-width-minus');
    const btnPlus = document.getElementById('btn-width-plus');
    if (btnMoins) btnMoins.disabled = largeurParcheminActuelle <= 25;
    if (btnPlus) btnPlus.disabled = largeurParcheminActuelle >= 75;
}

window.lireChapitre = async function(idParam = null) {
    window.scrollTo({ top: 0, behavior: 'auto' });
    
    // On prend l'ID en paramètre (via btn 'Suivant') ou dans le storage (via btn 'Lire' de la page Histoire)
    const idChapitre = idParam || localStorage.getItem('currentChapitreId');
    const lecteurContenu = document.getElementById('lecture-contenu');
    const titreHeader = document.getElementById('lecture-titre');
    
    if (!idChapitre || !lecteurContenu) {
        window.changerDePage('accueil');
        return;
    }

    // Réinitialisation de la session de lecture
    vueComptee = false;
    tempsLectureAtteint = false;
    aAtteintMoitie = false;
    derniereZone = 0;
    document.getElementById('lecture-progress-bar').style.width = '0%';
    
    // Le Chronomètre de 30 secondes pour valider la lecture
    setTimeout(() => {
        tempsLectureAtteint = true;
        verifierPacteDeVue();
    }, 30000);

    titreHeader.innerText = "Déchiffrement du parchemin...";
    lecteurContenu.innerHTML = '<p class="loading-text">Les runes s\'assemblent...</p>';

    // 1. Récupération du chapitre actuel
    const { data: chapitre, error } = await window._supabase
        .from('chapitres')
        .select('*')
        .eq('id', idChapitre)
        .single();

    if (error || !chapitre) {
        lecteurContenu.innerHTML = `<p class="text-error text-center">Ce parchemin est introuvable ou illisible.</p>`;
        return;
    }

    // On stocke l'ID de l'œuvre courante pour le bouton "Retour"
    window.currentOeuvreId = chapitre.histoire_id;

    // 2. Assemblage du contenu (Notes + Texte)
    titreHeader.innerText = `Chapitre ${chapitre.numero} : ${chapitre.titre}`;
    let htmlLecture = "";

    const cleanNote = (note) => {
        if (!note) return false;
        const n = note.trim();
        return n !== '<p><br></p>' && n !== '<p></p>' && n !== '<div><br></div>' && n !== '<div></div>' && n !== '<br>' && n !== '';
    };

    if (cleanNote(chapitre.note_debut)) {
        htmlLecture += `
            <div class="note-auteur note-debut mb-15">
                <span class="note-title">Mot de l'Auteur</span>
                <div class="note-content">${chapitre.note_debut}</div>
            </div>`;
    }

    htmlLecture += `<div id="vrai-contenu-chapitre" class="vrai-contenu-chapitre">${chapitre.contenu}</div>`;

    if (cleanNote(chapitre.note_fin)) {
        htmlLecture += `
            <div class="note-auteur note-fin mt-15">
                <span class="note-title">Mot de fin de l'Auteur</span>
                <div class="note-content">${chapitre.note_fin}</div>
            </div>`;
    }

    lecteurContenu.innerHTML = htmlLecture;

    const { data: histoireParente } = await window._supabase
        .from('histoires')
        .select('*')
        .eq('id', chapitre.histoire_id)
        .maybeSingle();
    
    // 3. Application des paramètres sauvegardés
    appliquerStylePupitre();

    // 4. Configuration de la navigation (Chapitre Précédent / Suivant)
    configurerNavigation(chapitre);

    const sectionCommentairesChapitre = document.getElementById('commentaires-chapitre-section');
    const histoireCommentairesActive = histoireParente?.commentaires_actifs !== false;

    if (!histoireCommentairesActive) {
        if (sectionCommentairesChapitre) sectionCommentairesChapitre.classList.add('hidden');
        if (window._commentairesInstances) {
            delete window._commentairesInstances['commentaires-chapitre-section'];
        }
    } else if (typeof window.initialiserBlocCommentaires === 'function') {
        if (sectionCommentairesChapitre) sectionCommentairesChapitre.classList.remove('hidden');
        await window.initialiserBlocCommentaires({
            sectionId: 'commentaires-chapitre-section',
            cibleType: 'chapitre',
            histoire: histoireParente || { id: chapitre.histoire_id, auteur: null, commentaires_actifs: true },
            chapitreId: chapitre.id
        });
    }
};

async function configurerNavigation(chapitreActuel) {
    const btnPrecHauts = document.getElementById('btn-chap-prec-haut');
    const btnPrecBas = document.getElementById('btn-chap-prec-bas');
    const btnSuivHauts = document.getElementById('btn-chap-suiv-haut');
    const btnSuivBas = document.getElementById('btn-chap-suiv-bas');

    // On cache tout d'abord
    [btnPrecHauts, btnPrecBas, btnSuivHauts, btnSuivBas].forEach(btn => {
        if (btn) btn.classList.add('hidden');
    });

    // Chapitre Précédent
    const { data: chapPrec } = await window._supabase
        .from('chapitres')
        .select('id')
        .eq('histoire_id', chapitreActuel.histoire_id)
        .eq('est_publie', true)
        .lt('numero', chapitreActuel.numero)
        .order('numero', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (chapPrec) {
        [btnPrecHauts, btnPrecBas].forEach(btn => {
            if (btn) {
                btn.classList.remove('hidden');
                btn.onclick = () => lireNouveauChapitre(chapPrec.id);
            }
        });
    }

    // Chapitre Suivant (seulement ceux déjà parus)
    const maintenant = new Date().toISOString();
    const { data: chapSuiv } = await window._supabase
        .from('chapitres')
        .select('id')
        .eq('histoire_id', chapitreActuel.histoire_id)
        .eq('est_publie', true)
        .lte('date_publication', maintenant)
        .gt('numero', chapitreActuel.numero)
        .order('numero', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (chapSuiv) {
        [btnSuivHauts, btnSuivBas].forEach(btn => {
            if (btn) {
                btn.classList.remove('hidden');
                btn.onclick = () => lireNouveauChapitre(chapSuiv.id);
            }
        });
    }
}

function lireNouveauChapitre(id) {
    localStorage.setItem('currentChapitreId', id);
    window.lireChapitre(id);
}

// ==========================================
// SCROLL ET JAUGE DE SANG
// ==========================================

function verifierPacteDeVue() {
    if (tempsLectureAtteint && aAtteintMoitie && !vueComptee && window.currentOeuvreId) {
        vueComptee = true; 
        window._supabase.rpc('increment_vues', { histoire_id: window.currentOeuvreId })
            .then(({error}) => {
                if (error) console.error("Erreur de vue :", error.message);
            });
    }
}

window.addEventListener('scroll', function() {
    // Si la page contient le lecteur, on gère son scroll
    if (document.getElementById('lecture-progress-container')) {
        const hauteurDefilee = window.scrollY;
        const scrollHauteurComplete = document.documentElement.scrollHeight - window.innerHeight;
        
        // Jauge de sang principale
        let pourcentage = 0;
        if (scrollHauteurComplete > 0) {
            pourcentage = (hauteurDefilee / scrollHauteurComplete) * 100;
        }
        
        pourcentage = Math.max(0, Math.min(100, pourcentage));
        
        const progressBar = document.getElementById('lecture-progress-bar');
        if (progressBar) progressBar.style.width = pourcentage + '%';
        
        // Validation de lecture
        if (pourcentage >= 50 && !aAtteintMoitie) {
            aAtteintMoitie = true;
            verifierPacteDeVue();
        }
        
        // Indicateur de bulle de progression
        let zoneActuelle = Math.floor(pourcentage / 25);
        if (pourcentage >= 99) zoneActuelle = 4;

        if (zoneActuelle !== derniereZone) {
            let palierFranchi = (zoneActuelle > derniereZone) ? (zoneActuelle * 25) : (derniereZone * 25);
            derniereZone = zoneActuelle;

            if (palierFranchi > 0 && palierFranchi <= 100) {
                const bulle = document.getElementById('lecture-pourcentage-bulle');
                if (bulle) {
                    bulle.innerText = palierFranchi + "%"; 
                    bulle.style.opacity = '1'; 
                    
                    if (timeoutBulle) clearTimeout(timeoutBulle);
                    timeoutBulle = setTimeout(() => {
                        bulle.style.opacity = '0';
                    }, 2000);
                }
            }
        }

        // Boutons de défilement rapide (Apparaissant en bas à droite)
        const btnScrollTop = document.getElementById('btn-scroll-top');
        const btnScrollBottom = document.getElementById('btn-scroll-bottom');

        if (btnScrollTop && btnScrollBottom) {
            if (hauteurDefilee > 50) {
                btnScrollTop.classList.add('visible');
            } else {
                btnScrollTop.classList.remove('visible');
            }

            const positionActuelle = window.innerHeight + hauteurDefilee;
            if (positionActuelle >= document.documentElement.scrollHeight - 50) {
                btnScrollBottom.classList.remove('visible');
            } else {
                btnScrollBottom.classList.add('visible');
            }
        }
        
        // --- BOUTONS INTELLIGENTS DU PUPITRE ---
        const btnPupitreTop = document.getElementById('btn-pupitre-scroll-top');
        const btnPupitreBottom = document.getElementById('btn-pupitre-scroll-bottom');
        
        if (btnPupitreTop && btnPupitreBottom) {
            // Au sommet ?
            btnPupitreTop.disabled = hauteurDefilee === 0;
            
            // Aux abysses ?
            const positionActuelle = window.innerHeight + hauteurDefilee;
            btnPupitreBottom.disabled = positionActuelle >= document.documentElement.scrollHeight - 10;
        }
    }
});

// ==========================================
// LE PUPITRE (Généré au premier chargement)
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // Délégation d'événements pour le pupitre (au cas où Lecteur.html se recharge)
    document.body.addEventListener('click', (e) => {
        
        // Ouvrir/Fermer
        if (e.target.id === 'btn-toggle-pupitre') {
            const pupitre = document.getElementById('lecture-settings');
            if (pupitre) {
                pupitre.classList.toggle('pupitre-cache');
                e.target.innerText = pupitre.classList.contains('pupitre-cache') ? '«' : '»';
            }
        }
        
        // Bouton Retour
        if (e.target.id === 'btn-retour-oeuvre') {
            document.body.classList.remove('mode-zen');
            if (window.currentOeuvreId) {
                localStorage.setItem('currentOeuvreId', window.currentOeuvreId);
                window.changerDePage('oeuvre');
            } else {
                window.changerDePage('accueil');
            }
        }

        // Mode ZEN
        if (e.target.id === 'btn-mode-zen') {
            document.body.classList.toggle('mode-zen');
            const estZen = document.body.classList.contains('mode-zen');
            e.target.innerText = estZen ? "✖ Quitter Plein Écran" : "👁️ Plein Écran";
            e.target.classList.toggle('btn-outline-red', estZen);
            e.target.classList.toggle('btn-outline-blue', !estZen);
        }

        // Thèmes de lecture
        if (e.target.id === 'btn-theme-sombre') {
            document.getElementById('lecture-contenu').setAttribute('data-theme-lecture', 'abysses');
            const bandeau = document.getElementById('lecture-header-fixe');
            if (bandeau) bandeau.setAttribute('data-theme-lecture', 'abysses');
            localStorage.setItem('lecteurTheme', 'abysses');
            updateActiveThemeButton('btn-theme-sombre');
        }
        if (e.target.id === 'btn-theme-clair') {
            document.getElementById('lecture-contenu').setAttribute('data-theme-lecture', 'lumiere');
            const bandeau = document.getElementById('lecture-header-fixe');
            if (bandeau) bandeau.setAttribute('data-theme-lecture', 'lumiere');
            localStorage.setItem('lecteurTheme', 'lumiere');
            updateActiveThemeButton('btn-theme-clair');
        }
        if (e.target.id === 'btn-theme-sepia') {
            document.getElementById('lecture-contenu').setAttribute('data-theme-lecture', 'sepia');
            const bandeau = document.getElementById('lecture-header-fixe');
            if (bandeau) bandeau.setAttribute('data-theme-lecture', 'sepia');
            localStorage.setItem('lecteurTheme', 'sepia');
            updateActiveThemeButton('btn-theme-sepia');
        }

        // Taille texte
        if (e.target.id === 'btn-text-plus') {
            if (taillePlumeActuelle < 2.5) {
                taillePlumeActuelle += 0.1;
                document.getElementById('lecture-contenu').style.fontSize = taillePlumeActuelle + 'rem';
                localStorage.setItem('lecteurTaille', taillePlumeActuelle);
            }
        }
        if (e.target.id === 'btn-text-minus') {
            if (taillePlumeActuelle > 0.8) {
                taillePlumeActuelle -= 0.1;
                document.getElementById('lecture-contenu').style.fontSize = taillePlumeActuelle + 'rem';
                localStorage.setItem('lecteurTaille', taillePlumeActuelle);
            }
        }
        
        // Largeur du panneau
        if (e.target.id === 'btn-width-plus') {
            if (largeurParcheminActuelle < 75) {
                largeurParcheminActuelle += 5;
                const page = document.getElementById('page-lecteur-container');
                if (page) page.style.width = largeurParcheminActuelle + '%';
                localStorage.setItem('lecteurLargeur', largeurParcheminActuelle);
                updateWidthButtons();
            }
        }
        if (e.target.id === 'btn-width-minus') {
            if (largeurParcheminActuelle > 25) {
                largeurParcheminActuelle -= 5;
                const page = document.getElementById('page-lecteur-container');
                if (page) page.style.width = largeurParcheminActuelle + '%';
                localStorage.setItem('lecteurLargeur', largeurParcheminActuelle);
                updateWidthButtons();
            }
        }
        
        // Scroll Rapide (Global + Pupitre)
        if (e.target.id === 'btn-scroll-top' || e.target.id === 'btn-pupitre-scroll-top') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (e.target.id === 'btn-scroll-bottom' || e.target.id === 'btn-pupitre-scroll-bottom') {
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
        }
    });

    // Écouteur pour le Select (Typographie)
    document.body.addEventListener('change', (e) => {
        if (e.target.id === 'select-font') {
            const contenu = document.getElementById('lecture-contenu');
            if (contenu) contenu.style.fontFamily = e.target.value;
            localStorage.setItem('lecteurPolice', e.target.value);
        }
    });
});

function updateActiveThemeButton(activeId) {
    ['btn-theme-sombre', 'btn-theme-clair', 'btn-theme-sepia'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            if (id === activeId) {
                btn.classList.add('btn-primary');
                btn.classList.remove('btn-outline-blue');
            } else {
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-outline-blue');
            }
        }
    });
}

function appliquerStylePupitre() {
    const contenu = document.getElementById('lecture-contenu');
    if (!contenu) return;
    
    // 1. Appliquer le thème sauvegardé
    const themeSauvegarde = localStorage.getItem('lecteurTheme') || 'abysses';
    contenu.setAttribute('data-theme-lecture', themeSauvegarde);
    const bandeau = document.getElementById('lecture-header-fixe');
    if (bandeau) bandeau.setAttribute('data-theme-lecture', themeSauvegarde);
    
    if (themeSauvegarde === 'abysses') updateActiveThemeButton('btn-theme-sombre');
    else if (themeSauvegarde === 'lumiere') updateActiveThemeButton('btn-theme-clair');
    else if (themeSauvegarde === 'sepia') updateActiveThemeButton('btn-theme-sepia');
    
    // 2. Appliquer la taille sauvegardée
    contenu.style.fontSize = taillePlumeActuelle + 'rem';
    
    // 3. Appliquer la police sauvegardée
    const selectFont = document.getElementById('select-font');
    if (selectFont) {
        const policeSauvegardee = localStorage.getItem('lecteurPolice');
        if (policeSauvegardee) {
            selectFont.value = policeSauvegardee;
        }
        contenu.style.fontFamily = selectFont.value;
    }
    
    // 4. Appliquer la largeur sauvegardée
    const page = document.getElementById('page-lecteur-container');
    if (page) page.style.width = largeurParcheminActuelle + '%';
    updateWidthButtons();
}

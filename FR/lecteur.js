// ==========================================
// LA SALLE DE LECTURE (lecteur.js)
// Affichage du chapitre, Pupitre et Barre de Sang
// ==========================================

let timeoutBulle = null;
let vueComptee = false;
let tempsLectureAtteint = false; 
let aAtteintMoitie = false;
let derniereZone = 0;
let taillePlumeActuelle = 1.1;

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
    
    // 3. Application des paramètres sauvegardés
    appliquerStylePupitre();

    // 4. Configuration de la navigation (Chapitre Précédent / Suivant)
    configurerNavigation(chapitre);
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

        // Boutons de défilement rapide
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
            updateActiveThemeButton('btn-theme-sombre');
        }
        if (e.target.id === 'btn-theme-clair') {
            document.getElementById('lecture-contenu').setAttribute('data-theme-lecture', 'lumiere');
            updateActiveThemeButton('btn-theme-clair');
        }
        if (e.target.id === 'btn-theme-sepia') {
            document.getElementById('lecture-contenu').setAttribute('data-theme-lecture', 'sepia');
            updateActiveThemeButton('btn-theme-sepia');
        }

        // Taille texte
        if (e.target.id === 'btn-text-plus') {
            if (taillePlumeActuelle < 2.5) {
                taillePlumeActuelle += 0.1;
                document.getElementById('lecture-contenu').style.fontSize = taillePlumeActuelle + 'rem';
            }
        }
        if (e.target.id === 'btn-text-minus') {
            if (taillePlumeActuelle > 0.8) {
                taillePlumeActuelle -= 0.1;
                document.getElementById('lecture-contenu').style.fontSize = taillePlumeActuelle + 'rem';
            }
        }
        
        // Scroll Rapide
        if (e.target.id === 'btn-scroll-top') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (e.target.id === 'btn-scroll-bottom') {
            window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
        }
    });

    // Écouteur pour le Select (Typographie)
    document.body.addEventListener('change', (e) => {
        if (e.target.id === 'select-font') {
            const contenu = document.getElementById('lecture-contenu');
            if (contenu) contenu.style.fontFamily = e.target.value;
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
    
    // Valeurs par défaut si non set
    if (!contenu.getAttribute('data-theme-lecture')) {
        contenu.setAttribute('data-theme-lecture', 'abysses');
        updateActiveThemeButton('btn-theme-sombre');
    }
    
    contenu.style.fontSize = taillePlumeActuelle + 'rem';
    
    const selectFont = document.getElementById('select-font');
    if (selectFont) {
        contenu.style.fontFamily = selectFont.value;
    }
}

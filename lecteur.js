// --- LE GRIMOIRE (Lecture et affichage des chapitres) ---
const oeuvrePage = document.getElementById('oeuvre-page');

// Revenir à l'accueil
document.getElementById('btn-retour').addEventListener('click', () => {
    window.changerDePage('accueil');
});

// Ouvrir une œuvre spécifique
window.ouvrirOeuvre = async function(idHistoire) {
    // 1. On utilise le Chef d'Orchestre pour tout nettoyer et afficher la bonne page
    window.changerDePage('oeuvre');

    document.getElementById('oeuvre-titre').innerText = "Ouverture du grimoire...";

    // 2. On va chercher l'histoire dans l'étagère Supabase
    const { data: histoire, error } = await window._supabase
        .from('histoires')
        .select('*')
        .eq('id', idHistoire)
        .single();

    if (error) {
        alert("Erreur de chargement : " + error.message);
        return;
    }

    // 3. Remplissage des informations sur la page
    document.getElementById('oeuvre-cover').src = histoire.image_couverture || '';
    document.getElementById('oeuvre-genre').innerText = histoire.genre;
	document.getElementById('oeuvre-statut').innerText = histoire.statut || '✍️ En cours';
	document.getElementById('oeuvre-vues').innerText = histoire.vues || 0;
	// Teinture de l'âge
    const ageSpan = document.getElementById('oeuvre-age');
    ageSpan.innerText = histoire.classification || 'Tout public';
    
    let couleurAge = "#2e8b57"; // Vert
    if (histoire.classification === "R15") couleurAge = "#ffd700"; // Or
    else if (histoire.classification === "R16") couleurAge = "#ff8c00"; // Orange
    else if (histoire.classification === "R18") couleurAge = "#ff0000"; // Rouge
    
    ageSpan.style.color = couleurAge;
    ageSpan.style.borderColor = couleurAge;
	const bulleSensible = document.getElementById('oeuvre-sensible');
    if (histoire.contenu_sensible) {
        bulleSensible.innerText = "⚠️ Contenu Sensible";
        bulleSensible.style.backgroundColor = "#5d1a1a";
        bulleSensible.style.color = "white";
        bulleSensible.style.border = "1px solid #ff0055";
        bulleSensible.style.textDecoration = "none";
    } else {
        bulleSensible.innerText = "Contenu Sensible";
        bulleSensible.style.backgroundColor = "transparent";
        bulleSensible.style.color = "#555";
        bulleSensible.style.border = "1px dotted #333";
        bulleSensible.style.textDecoration = "line-through";
    }
    document.getElementById('oeuvre-titre').innerText = histoire.titre;
    document.getElementById('oeuvre-auteur').innerText = "Comte " + (histoire.pseudo_auteur || histoire.auteur.split('@')[0]);
    document.getElementById('oeuvre-synopsis').innerText = histoire.synopsis;
    
    // --- L'ARCHIVISTE COMPTE DIRECTEMENT LES PACTES DANS LES FAVORIS ---
    const { count: totalLikes } = await window._supabase
        .from('favoris')
        .select('*', { count: 'exact', head: true })
        .eq('histoire_id', idHistoire);
        
    document.getElementById('oeuvre-likes').innerText = totalLikes || 0;

    window.currentOeuvreId = idHistoire;

    // --- 5. GESTION VISUELLE DU BOUTON SOUTENIR ---
    const btnSoutenir = document.getElementById('btn-soutenir');
    if (btnSoutenir) {
        // On remet le bouton à zéro par défaut
        btnSoutenir.innerText = "Soutenir l'œuvre";
        btnSoutenir.style.backgroundColor = "transparent";
        btnSoutenir.style.color = "#ff0055";
        btnSoutenir.disabled = false;

        // Si le lecteur est connecté, on vérifie s'il a déjà versé son sang (liké)
        const { data: { session } } = await window._supabase.auth.getSession();
        if (session) {
            const { data: aDejaSoutenu } = await window._supabase
                .from('favoris')
                .select('id')
                .eq('user_id', session.user.id)
                .eq('histoire_id', idHistoire)
                .maybeSingle();

            // S'il avait déjà liké, on rougit le bouton !
            if (aDejaSoutenu) {
                btnSoutenir.innerText = "Œuvre soutenue 🩸";
                btnSoutenir.style.backgroundColor = "#5d1a1a";
                btnSoutenir.style.color = "white";
            }
        }
    }
    
    // 6. On appelle la fonction pour charger les chapitres
    chargerChapitres(idHistoire);
};

// Charger la liste des chapitres
async function chargerChapitres(idHistoire) {
    const chapitresListe = document.getElementById('chapitres-liste');
    chapitresListe.innerHTML = '<p style="color: #c4a484; font-style: italic;">Recherche des écrits...</p>';

    const { data: chapitres, error } = await window._supabase
        .from('chapitres')
        .select('*')
        .eq('histoire_id', idHistoire)
        .eq('est_publie', true) // <-- LE BOUCLIER QUI CACHE LES BROUILLONS
		.lte('date_publication', new Date().toISOString())
        .order('numero', { ascending: true });

    if (error) {
        chapitresListe.innerHTML = '<p style="color: red;">Erreur : ' + error.message + '</p>';
        return;
    }

    if (chapitres.length === 0) {
        chapitresListe.innerHTML = '<p style="color: #777; font-style: italic;">Aucun chapitre forgé.</p>';
        return;
    }

    chapitresListe.innerHTML = '';
    const ul = document.createElement('ul');
    ul.style.listStyleType = 'none';
    ul.style.padding = '0';

    // --- LE BOULIER DE L'ARCHIVISTE (NOUVEAU) ---
    let totalMotsOeuvre = 0;

    chapitres.forEach(chapitre => {
        // On ajoute les mots du chapitre au grand total !
        totalMotsOeuvre += chapitre.nombre_mots || 0; 

        const li = document.createElement('li');
        li.style.cssText = "background: #0a0a0a; border: 1px solid #333; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;";
        
        const datePub = new Date(chapitre.date_publication).toLocaleDateString('fr-FR');

        li.innerHTML = `
            <div>
                <span style="color: #00aaff; font-weight: bold; margin-right: 10px;">Chapitre ${chapitre.numero}</span>
                <span style="color: #e0d7c6;">${chapitre.titre}</span>
            </div>
            <div style="display: flex; gap: 15px; align-items: center;">
                <span style="color: #555; font-size: 0.8rem;">${datePub}</span>
                <button class="genre-btn" style="padding: 5px 15px; font-size: 0.8rem;" onclick="lireChapitre(${chapitre.id})">Lire</button>
            </div>
        `;
        ul.appendChild(li);
    });
    chapitresListe.appendChild(ul);

    // --- AFFICHAGE DU TOTAL (NOUVEAU) ---
    // Le toLocaleString permet d'afficher 10 000 au lieu de 10000 (c'est plus joli)
    const affichageMots = document.getElementById('oeuvre-mots');
    if (affichageMots) {
        affichageMots.innerText = totalMotsOeuvre.toLocaleString('fr-FR');
    }
}

// --- LE POUVOIR DE SOUTIEN (Ajouter ou Retirer) ---
const btnSoutenir = document.getElementById('btn-soutenir');

btnSoutenir.addEventListener('click', async () => {
    const { data: { session } } = await window._supabase.auth.getSession();
    
    if (!session) {
        alert("Les ombres refusent votre requête : vous devez être connecté pour soutenir une œuvre.");
        return;
    }

    btnSoutenir.innerText = "Pacte en cours...";
    btnSoutenir.disabled = true; 

    // 1. On vérifie si le pacte existe déjà
    const { data: exist } = await window._supabase
        .from('favoris')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('histoire_id', window.currentOeuvreId)
        .maybeSingle();

    if (exist) {
        // On détruit sa trace
        await window._supabase.from('favoris').delete().eq('id', exist.id);
        btnSoutenir.innerText = "Soutenir l'œuvre";
        btnSoutenir.style.backgroundColor = "transparent";
        btnSoutenir.style.color = "#ff0055";
    } else {
        // On crée sa trace
        await window._supabase.from('favoris').insert([{ user_id: session.user.id, histoire_id: window.currentOeuvreId }]);
        btnSoutenir.innerText = "Œuvre soutenue 🩸";
        btnSoutenir.style.backgroundColor = "#5d1a1a";
        btnSoutenir.style.color = "white";
    }

    // 2. L'Archiviste recompte le vrai nombre de pactes dans l'étagère favoris
    const { count } = await window._supabase
        .from('favoris')
        .select('*', { count: 'exact', head: true })
        .eq('histoire_id', window.currentOeuvreId);

    // 3. On affiche le résultat sans toucher à l'histoire !
    document.getElementById('oeuvre-likes').innerText = count || 0;

    btnSoutenir.disabled = false; 
});

// --- LE POUVOIR DE LECTURE ---
window.lireChapitre = async function(idChapitre) {
    // 1. On demande au Chef d'Orchestre d'ouvrir la Salle de Lecture
    window.changerDePage('lecture');
    
    // On met un texte d'attente
    document.getElementById('lecture-titre').innerText = "Déchiffrement du parchemin...";
    document.getElementById('lecture-contenu').innerHTML = "";

    // 2. L'Archiviste fouille l'étagère Supabase pour trouver CE chapitre précis
    const { data: chapitre, error } = await window._supabase
        .from('chapitres')
        .select('*')
        .eq('id', idChapitre)
        .single();

    if (error) {
        document.getElementById('lecture-contenu').innerHTML = '<p style="color: red;">Erreur : ' + error.message + '</p>';
        return;
    }

    // 3. On affiche le titre
    document.getElementById('lecture-titre').innerText = "Chapitre " + chapitre.numero + " : " + chapitre.titre;
    
    // 4. LA MAGIE : On assemble le chapitre (Notes + Contenu)
    let htmlLecture = "";

    // S'il y a une note de début (et que ce n'est pas juste un fantôme d'espace)
    if (chapitre.note_debut && chapitre.note_debut !== '<p><br></p>' && chapitre.note_debut !== '<p></p>' && chapitre.note_debut !== '<div><br></div>' && chapitre.note_debut !== '<div></div>' && chapitre.note_debut !== '<br>' && chapitre.note_debut.trim() !== '') {
        htmlLecture += `
            <div style="background: #111; border-left: 3px solid #ff0055; padding: 15px; margin-bottom: 40px; font-family: 'Segoe UI', sans-serif;">
                <span style="color: #ff0055; font-size: 0.8rem; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 5px;">Mot de l'Auteur</span>
                <div style="color: #c4a484; font-size: 0.95rem; font-style: italic; line-height: 1.5;">${chapitre.note_debut}</div>
            </div>`;
    }

    // Le corps du chapitre protégé par le bouclier
    htmlLecture += '<div id="vrai-contenu-chapitre">' + chapitre.contenu + '</div>';

    // S'il y a une note de fin (et que ce n'est pas juste un fantôme d'espace)
    if (chapitre.note_fin && chapitre.note_fin !== '<p><br></p>' && chapitre.note_fin !== '<p></p>' && chapitre.note_fin !== '<div><br></div>' && chapitre.note_fin !== '<div></div>' && chapitre.note_fin !== '<br>' && chapitre.note_fin.trim() !== '') {
        htmlLecture += `
            <div style="background: #111; border-left: 3px solid #00aaff; padding: 15px; margin-top: 40px; font-family: 'Segoe UI', sans-serif;">
                <span style="color: #00aaff; font-size: 0.8rem; text-transform: uppercase; font-weight: bold; display: block; margin-bottom: 5px;">Mot de fin de l'Auteur</span>
                <div style="color: #c4a484; font-size: 0.95rem; font-style: italic; line-height: 1.5;">${chapitre.note_fin}</div>
            </div>`;
    }

    document.getElementById('lecture-contenu').innerHTML = htmlLecture;
	window.scrollTo(0, 0);
	
	// --- NOUVEAU : LES PANNEAUX DE NAVIGATION ---
    const btnPrecHaut = document.getElementById('btn-chap-prec-haut');
    const btnSuivHaut = document.getElementById('btn-chap-suiv-haut');
    const btnPrecBas = document.getElementById('btn-chap-prec-bas');
    const btnSuivBas = document.getElementById('btn-chap-suiv-bas');

    // On cache tout par défaut à chaque nouveau chapitre
    if (btnPrecHaut) btnPrecHaut.style.display = 'none';
    if (btnSuivHaut) btnSuivHaut.style.display = 'none';
    if (btnPrecBas) btnPrecBas.style.display = 'none';
    if (btnSuivBas) btnSuivBas.style.display = 'none';

    // L'Archiviste cherche le chapitre PRÉCÉDENT (numéro inférieur au numéro actuel)
    const { data: chapPrec } = await window._supabase
        .from('chapitres')
        .select('id')
        .eq('histoire_id', chapitre.histoire_id)
        .eq('est_publie', true) // <-- AJOUTE CETTE LIGNE
		.lte('date_publication', new Date().toISOString())
        .lt('numero', chapitre.numero)
        .order('numero', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (chapPrec) {
        if (btnPrecHaut) { btnPrecHaut.style.display = 'block'; btnPrecHaut.onclick = () => lireChapitre(chapPrec.id); }
        if (btnPrecBas) { btnPrecBas.style.display = 'block'; btnPrecBas.onclick = () => lireChapitre(chapPrec.id); }
    }

    // L'Archiviste cherche le chapitre SUIVANT (numéro supérieur au numéro actuel)
    const { data: chapSuiv } = await window._supabase
        .from('chapitres')
        .select('id')
        .eq('histoire_id', chapitre.histoire_id)
        .eq('est_publie', true) // <-- AJOUTE CETTE LIGNE
		.lte('date_publication', new Date().toISOString())
        .gt('numero', chapitre.numero)
        .order('numero', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (chapSuiv) {
        if (btnSuivHaut) { btnSuivHaut.style.display = 'block'; btnSuivHaut.onclick = () => lireChapitre(chapSuiv.id); }
        if (btnSuivBas) { btnSuivBas.style.display = 'block'; btnSuivBas.onclick = () => lireChapitre(chapSuiv.id); }
    }
	
	// 5. Apparition de la Jauge de Sang
    document.getElementById('lecture-progress-container').style.display = 'block';
    document.getElementById('lecture-progress-bar').style.width = '0%';
	window.derniereZone = 0; 
    vueComptee = false;
    tempsLectureAtteint = false;
    aAtteintMoitie = false;

    // L'horloge absolue : Dans exactement 30 secondes (30000ms), la Serrure 1 s'ouvre !
    setTimeout(() => {
        tempsLectureAtteint = true;
        verifierPacteDeVue();
    }, 30000);
};

// --- BOUTON DE RETOUR ---
// Permet de quitter la Salle de Lecture pour revenir à l'accueil du Grimoire (l'œuvre)
document.getElementById('btn-retour-oeuvre').addEventListener('click', () => {
    // On cache la jauge dans les ténèbres
    document.getElementById('lecture-progress-container').style.display = 'none';
    
    // --- LE DISSIPATEUR D'ILLUSION (Annulation du Mode Zen) ---
    // 1. On arrache le manteau d'invisibilité du site
    document.body.classList.remove('mode-zen');
    
    // 2. On remet le bouton du Pupitre dans son état d'origine
    const btnModeZen = document.getElementById('btn-mode-zen');
    if (btnModeZen) {
        btnModeZen.innerText = "👁️ Plein Écran";
        btnModeZen.style.borderColor = "#00aaff";
        btnModeZen.style.color = "#00aaff";
    }

    // On utilise la fonction existante en lui redonnant l'ID de l'œuvre en cours
    window.ouvrirOeuvre(window.currentOeuvreId); 
});

// --- LE SORTILÈGE DE LA JAUGE DE SANG (Progression DANS LA BOÎTE) ---
let timeoutBulle = null;
let vueComptee = false;
let tempsLectureAtteint = false; // Serrure 1 : Le temps
let aAtteintMoitie = false;      // Serrure 2 : Le défilement

// La fonction magique qui vérifie si les DEUX serrures sont ouvertes
function verifierPacteDeVue() {
    if (tempsLectureAtteint && aAtteintMoitie && !vueComptee) {
        vueComptee = true; // On verrouille pour ne faire +1 qu'une seule fois
        // On murmure l'ordre à Supabase
        window._supabase.rpc('increment_vues', { histoire_id: window.currentOeuvreId })
            .then(({error}) => {
                if (error) console.error("L'archiviste a trébuché :", error.message);
            });
    }
}

window.addEventListener('scroll', function() {
    const progressContainer = document.getElementById('lecture-progress-container');
    
    if (progressContainer && progressContainer.style.display === 'block') {
        
        const hauteurDefilee = window.scrollY;
        const hauteurTotale = document.documentElement.scrollHeight - window.innerHeight;
        
        let pourcentage = 0;
        if (hauteurTotale > 0) {
            pourcentage = (hauteurDefilee / hauteurTotale) * 100;
        }
        
        if (pourcentage > 100) pourcentage = 100;
        if (pourcentage < 0) pourcentage = 0;
        
        document.getElementById('lecture-progress-bar').style.width = pourcentage + '%';
		
		// --- L'OEIL DE L'INQUISITEUR (Serrure de distance) ---
        if (pourcentage >= 50 && !aAtteintMoitie) {
            aAtteintMoitie = true; // La Serrure 2 s'ouvre !
            verifierPacteDeVue();
        }
        
        // On découpe l'œuvre en 4 zones
        let zoneActuelle = Math.floor(pourcentage / 25);
        if (pourcentage >= 99) zoneActuelle = 4; // Zone de fin absolue (100%)

        // L'Inquisiteur vérifie si on a franchi une frontière entre deux zones
        if (zoneActuelle !== window.derniereZone) {
            let palierFranchi;
            
            if (zoneActuelle > window.derniereZone) {
                // On descend vers les abysses : on annonce la nouvelle zone atteinte (ex: passe en zone 2 -> 50%)
                palierFranchi = zoneActuelle * 25;
            } else {
                // On remonte vers la lumière : on annonce la ligne qu'on vient de repasser (ex: quitte la zone 2 par le haut -> 50%)
                palierFranchi = window.derniereZone * 25;
            }
            
            window.derniereZone = zoneActuelle; // On met à jour la mémoire du Sanctuaire

            if (palierFranchi > 0 && palierFranchi <= 100) {
                const bulle = document.getElementById('lecture-pourcentage-bulle');
                if (bulle) {
                    bulle.innerText = palierFranchi + "%"; 
                    bulle.style.display = 'block'; 
                    
                    if (timeoutBulle) clearTimeout(timeoutBulle);
                    timeoutBulle = setTimeout(() => {
                        bulle.style.display = 'none';
                    }, 3000);
                }
            }
        }
    }
});

// --- LE PUPITRE DU LECTEUR (Paramètres d'affichage) ---
const boiteLecture = document.getElementById('lecture-contenu');
const btnThemeSombre = document.getElementById('btn-theme-sombre');
const btnThemeClair = document.getElementById('btn-theme-clair');
const btnTextMinus = document.getElementById('btn-text-minus');
const btnTextPlus = document.getElementById('btn-text-plus');
const selectFont = document.getElementById('select-font');

let taillePlumeActuelle = 1.1; // La taille de départ (en rem)

// 1. La magie des Thèmes (Couleurs)
btnThemeSombre.addEventListener('click', () => {
    boiteLecture.style.background = '#050505'; // Noir abyssal
    boiteLecture.style.color = '#e0d7c6'; // Texte beige os
    boiteLecture.style.border = '1px solid #333';
    // Allumer le bouton Sombre en bleu
    btnThemeSombre.style.borderColor = '#00aaff';
    btnThemeSombre.style.color = '#00aaff';
    // Éteindre le bouton Clair
    btnThemeClair.style.borderColor = '#c4a484';
    btnThemeClair.style.color = '#c4a484';
});

btnThemeClair.addEventListener('click', () => {
    boiteLecture.style.background = '#f5ebd9'; // Beige parchemin
    boiteLecture.style.color = '#1a1a1a'; // Encre noire très sombre
    boiteLecture.style.border = '1px solid #c4a484'; // Bordure cuivrée
    // Allumer le bouton Clair en bleu
    btnThemeClair.style.borderColor = '#00aaff';
    btnThemeClair.style.color = '#00aaff';
    // Éteindre le bouton Sombre
    btnThemeSombre.style.borderColor = '#c4a484';
    btnThemeSombre.style.color = '#c4a484';
});

// 2. La magie de la Loupe (Taille du texte)
btnTextPlus.addEventListener('click', () => {
    if (taillePlumeActuelle < 2.5) { // On empêche d'écrire trop gros
        taillePlumeActuelle += 0.1;
        boiteLecture.style.fontSize = taillePlumeActuelle + 'rem';
    }
});

btnTextMinus.addEventListener('click', () => {
    if (taillePlumeActuelle > 0.8) { // On empêche d'écrire trop petit
        taillePlumeActuelle -= 0.1;
        boiteLecture.style.fontSize = taillePlumeActuelle + 'rem';
    }
});

// 3. La magie de la Calligraphie (Police d'écriture)
selectFont.addEventListener('change', (event) => {
    boiteLecture.style.fontFamily = event.target.value;
});

// --- LES BOTTES DE SEPT LIEUES (Défilement rapide) ---
const btnScrollTop = document.getElementById('btn-scroll-top');
const btnScrollBottom = document.getElementById('btn-scroll-bottom');

if (btnScrollTop && btnScrollBottom) {
    // 1. Action : S'envoler tout en haut du parchemin
    btnScrollTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // 2. Action : Plonger tout en bas du parchemin
    btnScrollBottom.addEventListener('click', () => {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    });

    // 3. L'Oeil de la Tour : Surveille la position pendant la lecture
    window.addEventListener('scroll', () => {
        
        // --- SENSIBILITÉ ACCRUE : On réagit dès 50 pixels au lieu de 300 ---
        if (window.scrollY > 50) {
            // On réveille le bouton "Haut" (sang rouge et clic autorisé)
            btnScrollTop.style.opacity = '1';
            btnScrollTop.style.pointerEvents = 'auto';
            btnScrollTop.style.borderColor = '#5d1a1a';
            btnScrollTop.style.color = '#e0d7c6';
        } else {
            // On pétrifie le bouton "Haut" (gris et incliquable)
            btnScrollTop.style.opacity = '0.3';
            btnScrollTop.style.pointerEvents = 'none';
            btnScrollTop.style.borderColor = '#333';
            btnScrollTop.style.color = '#777';
        }

        // --- GESTION DU FOND DU GOUFFRE ---
        const hauteurTotale = document.documentElement.scrollHeight;
        const positionActuelle = window.innerHeight + window.scrollY;
        
        if (positionActuelle >= hauteurTotale - 50) {
            // On pétrifie le bouton "Bas"
            btnScrollBottom.style.opacity = '0.3';
            btnScrollBottom.style.pointerEvents = 'none';
            btnScrollBottom.style.borderColor = '#333';
            btnScrollBottom.style.color = '#777';
        } else {
            // On réveille le bouton "Bas"
            btnScrollBottom.style.opacity = '1';
            btnScrollBottom.style.pointerEvents = 'auto';
            btnScrollBottom.style.borderColor = '#5d1a1a';
            btnScrollBottom.style.color = '#e0d7c6';
        }
    });
}

// --- LES NOUVEAUX POUVOIRS DU LECTEUR ---

// 1. Le Plein Écran (Mode Zen)
const btnModeZen = document.getElementById('btn-mode-zen');
if (btnModeZen) {
    btnModeZen.addEventListener('click', () => {
        document.body.classList.toggle('mode-zen');
        if (document.body.classList.contains('mode-zen')) {
            btnModeZen.innerText = "✖ Quitter Plein Écran";
            btnModeZen.style.borderColor = "#ff0055";
            btnModeZen.style.color = "#ff0055";
        } else {
            btnModeZen.innerText = "👁️ Plein Écran";
            btnModeZen.style.borderColor = "#00aaff";
            btnModeZen.style.color = "#00aaff";
        }
    });
}

// 2. Le Pupitre Coulissant (Illusion)
const btnTogglePupitre = document.getElementById('btn-toggle-pupitre');
const pupitreSettings = document.getElementById('lecture-settings');
if (btnTogglePupitre && pupitreSettings) {
    btnTogglePupitre.addEventListener('click', () => {
        pupitreSettings.classList.toggle('pupitre-cache');
        if (pupitreSettings.classList.contains('pupitre-cache')) {
            btnTogglePupitre.innerText = "»"; // Flèche vers la droite pour le rouvrir
        } else {
            btnTogglePupitre.innerText = "«"; // Flèche vers la gauche pour le cacher
        }
    });
}
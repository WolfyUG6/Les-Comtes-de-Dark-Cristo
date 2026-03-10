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
    
    // 4. Vérification si l'utilisateur est l'auteur (pour le bouton "Ajouter Chapitre")
    const { data: { session } } = await window._supabase.auth.getSession();
    if (session && session.user.email === histoire.auteur) {
        document.getElementById('btn-add-chapitre').style.display = 'block';
    } else {
        document.getElementById('btn-add-chapitre').style.display = 'none';
    }

    // --- 5. GESTION VISUELLE DU BOUTON SOUTENIR ---
    const btnSoutenir = document.getElementById('btn-soutenir');
    if (btnSoutenir) {
        // On remet le bouton à zéro par défaut
        btnSoutenir.innerText = "Soutenir l'œuvre";
        btnSoutenir.style.backgroundColor = "transparent";
        btnSoutenir.style.color = "#ff0055";
        btnSoutenir.disabled = false;

        // Si le lecteur est connecté, on vérifie s'il a déjà versé son sang (liké)
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

    const { data: chapitres, error } = await _supabase
        .from('chapitres')
        .select('*')
        .eq('histoire_id', idHistoire)
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

    chapitres.forEach(chapitre => {
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
    
    // 4. LA MAGIE : On utilise innerHTML pour que le gras et l'italique s'affichent correctement !
    document.getElementById('lecture-contenu').innerHTML = chapitre.contenu;
	window.scrollTo(0, 0);
	
	// --- NOUVEAU : LES PANNEAUX DE NAVIGATION ---
    const btnPrecBas = document.getElementById('btn-chap-prec-bas');
    const btnSuivBas = document.getElementById('btn-chap-suiv-bas');

    // On cache tout par défaut à chaque nouveau chapitre
    if (btnPrecBas) btnPrecBas.style.display = 'none';
    if (btnSuivBas) btnSuivBas.style.display = 'none';

    // L'Archiviste cherche le chapitre PRÉCÉDENT (numéro inférieur au numéro actuel)
    const { data: chapPrec } = await window._supabase
        .from('chapitres')
        .select('id')
        .eq('histoire_id', chapitre.histoire_id)
        .lt('numero', chapitre.numero)
        .order('numero', { ascending: false })
        .limit(1)
        .maybeSingle();

    if (chapPrec && btnPrecBas) {
        btnPrecBas.style.display = 'block';
        btnPrecBas.onclick = () => lireChapitre(chapPrec.id);
    }

    // L'Archiviste cherche le chapitre SUIVANT (numéro supérieur au numéro actuel)
    const { data: chapSuiv } = await window._supabase
        .from('chapitres')
        .select('id')
        .eq('histoire_id', chapitre.histoire_id)
        .gt('numero', chapitre.numero)
        .order('numero', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (chapSuiv && btnSuivBas) {
        btnSuivBas.style.display = 'block';
        btnSuivBas.onclick = () => lireChapitre(chapSuiv.id);
    }
	
	// 5. Apparition de la Jauge de Sang
    document.getElementById('lecture-progress-container').style.display = 'block';
    document.getElementById('lecture-progress-bar').style.width = '0%';
	window.dernierPalierAffiche = 0; // On remet la mémoire des paliers à zéro
};

// --- BOUTON DE RETOUR ---
// Permet de quitter la Salle de Lecture pour revenir à l'accueil du Grimoire (l'œuvre)
document.getElementById('btn-retour-oeuvre').addEventListener('click', () => {
    // On cache la jauge dans les ténèbres
    document.getElementById('lecture-progress-container').style.display = 'none';
    // On utilise la fonction existante en lui redonnant l'ID de l'œuvre en cours
    window.ouvrirOeuvre(window.currentOeuvreId); 
});

// --- LE SORTILÈGE DE LA JAUGE DE SANG (Progression DANS LA BOÎTE) ---
let timeoutBulle = null;

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
        
        let palierActuel = Math.floor(pourcentage / 25) * 25;
        if (pourcentage >= 99) palierActuel = 100;

        if (palierActuel > (window.dernierPalierAffiche || 0) && palierActuel > 0) {
            window.dernierPalierAffiche = palierActuel;
            
            const bulle = document.getElementById('lecture-pourcentage-bulle');
            if (bulle) {
                bulle.innerText = palierActuel + "%"; 
                bulle.style.display = 'block'; 
                
                if (timeoutBulle) clearTimeout(timeoutBulle);
                timeoutBulle = setTimeout(() => {
                    bulle.style.display = 'none';
                }, 3000);
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
        // Si on est descendu dans les abysses (plus de 300 pixels), on affiche le bouton "Haut"
        if (window.scrollY > 300) {
            btnScrollTop.style.display = 'block';
        } else {
            btnScrollTop.style.display = 'none';
        }

        // Si on touche presque le fond du gouffre, on cache le bouton "Bas"
        const hauteurTotale = document.documentElement.scrollHeight;
        const positionActuelle = window.innerHeight + window.scrollY;
        
        if (positionActuelle >= hauteurTotale - 50) {
            btnScrollBottom.style.display = 'none';
        } else {
            btnScrollBottom.style.display = 'block';
        }
    });
}
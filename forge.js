// --- L'ATELIER (Publication et Gestion Auteur) ---
const btnPublish = document.getElementById('btn-publish');
const submitStory = document.getElementById('submit-story');

// 1. Ouvrir la page de création
btnPublish.addEventListener('click', () => {
    window.changerDePage('creation');
});

// 2. Retourner à l'atelier si on annule
document.getElementById('btn-retour-creation').addEventListener('click', () => {
    window.changerDePage('studio');
});

submitStory.addEventListener('click', async () => {
    const title = document.getElementById('story-title').value;
    const synopsis = document.getElementById('story-synopsis').value;
    const genre = document.getElementById('story-genre').value;
	const classification = document.getElementById('story-age').value;
	const statut = document.getElementById('story-status').value;
    const file = document.getElementById('story-cover-file').files[0];
	const isSensible = document.getElementById('story-sensible').checked;

    const { data: { session } } = await _supabase.auth.getSession();
    if (!session || !title || !synopsis || !genre || !classification) {
        alert("Champs manquants ou non connecté.");
        return;
    }

    submitStory.innerText = "Forgeage...";
    let imageUrl = null;

    if (file) {
        const fileName = `${Date.now()}-${file.name}`;
        const { error: upErr } = await _supabase.storage.from('couvertures').upload(fileName, file);
        if (!upErr) {
            const { data } = _supabase.storage.from('couvertures').getPublicUrl(fileName);
            imageUrl = data.publicUrl;
        }
    }

    const monPseudo = session.user.user_metadata?.pseudo || session.user.email.split('@')[0];
    const { error } = await _supabase.from('histoires').insert([{ 
        titre: title, 
        synopsis, 
        genre, 
		classification, 
		statut: statut, // <-- Ajoute cette ligne ici 
        auteur: session.user.email, 
        image_couverture: imageUrl,
        pseudo_auteur: monPseudo,
		contenu_sensible: isSensible 
    }]);
    if (error) alert(error.message);
    else {
        alert("Œuvre gravée !");
        location.reload(); // On rafraîchit pour voir l'œuvre
    }
});

// --- LES ACTIONS DU MENU PROFIL ---

// 1. Vos Lectures (Bibliothèque - En travaux)
document.getElementById('btn-lectures').addEventListener('click', () => {
    alert("Votre bibliothèque est encore poussiéreuse...");
});

// 2. La Forge (Le Studio de l'Auteur)
document.getElementById('btn-atelier').addEventListener('click', () => {
    window.changerDePage('studio');
    chargerMesOeuvres();
});


// --- LE SORTILÈGE POUR CHARGER VOS ŒUVRES ---
async function chargerMesOeuvres() {
    const conteneur = document.getElementById('mes-oeuvres-liste');
    conteneur.innerHTML = '<p style="color: #c4a484; font-style: italic;">Recherche de vos créations dans l\'Abysse...</p>';

    // 1. On vérifie qui est le Bâtisseur (l'utilisateur connecté)
    const { data: { session } } = await window._supabase.auth.getSession();
    if (!session) return;

    // 2. On fouille l'étagère (Supabase) pour trouver SES œuvres
    const { data: mesHistoires, error } = await window._supabase
        .from('histoires')
        .select('*')
        .eq('auteur', session.user.email);

    if (error) {
        conteneur.innerHTML = '<p style="color: red;">Erreur : ' + error.message + '</p>';
        return;
    }

    // 3. Si l'auteur n'a rien écrit
    if (mesHistoires.length === 0) {
        conteneur.innerHTML = '<p style="color: #777; font-style: italic;">Vous n\'avez encore forgé aucune œuvre.</p>';
        return;
    }

    // 4. On affiche chaque œuvre trouvée
    conteneur.innerHTML = '';
    mesHistoires.forEach(histoire => {
        const carte = document.createElement('div');
        carte.style.cssText = "background: #0a0a0a; border: 1px solid #5d1a1a; padding: 15px; display: flex; justify-content: space-between; align-items: center;";
        
        carte.innerHTML = `
            <div>
                <h3 style="color: #c4a484; font-family: 'Cinzel', serif; margin: 0 0 5px 0;">${histoire.titre}</h3>
                <span style="font-size: 0.8rem; background-color: #5d1a1a; color: white; padding: 2px 6px; text-transform: uppercase;">${histoire.genre}</span>
            </div>
            <div>
                <button class="genre-btn" style="border-color: #00aaff; color: #00aaff;" onclick="ouvrirGestionOeuvre(${histoire.id})">Gérer</button>
            </div>
        `;
        conteneur.appendChild(carte);
    });
}

// --- AJOUT DE CHAPITRE DANS L'ATELIER ---
const submitChapitre = document.getElementById('submit-chapitre');

// --- LE BOUCLIER ANTI-WORD (Force les blocs neutres) ---
const Block = Quill.import('blots/block');
Block.tagName = 'DIV';
Quill.register(Block, true);

// Initialisation de la Plume Quill (La Grande)
const quill = new Quill('#chapitre-contenu', {
    theme: 'snow',
    placeholder: 'Rédigez votre texte ici...',
    modules: {
        toolbar: [
            [{ 'header': [1, 2, 3, false] }],
            ['bold', 'italic', 'underline', 'strike'],
            [{ 'list': 'ordered'}, { 'list': 'bullet' }],
            [{ 'align': [] }],
            ['clean'] // Bouton pour enlever le formatage
        ],
        clipboard: {
            matchVisual: false
        }
    }
}); // <-- REGARDE ICI, la grande plume se termine bien par ça !

// Initialisation des petites Plumes pour les Notes (Les Petites)
const optionPlumeNote = {
    theme: 'snow',
    placeholder: 'Un mot pour vos lecteurs ? (Laissez vide si inutile)',
    modules: { toolbar: [ ['bold', 'italic'], ['clean'] ] }
};
const quillNoteDebut = new Quill('#note-debut-contenu', optionPlumeNote);
const quillNoteFin = new Quill('#note-fin-contenu', optionPlumeNote);

// --- LE GARDIEN DU PARCHEMIN (Nettoyage sécurisé du collage) ---
quill.root.addEventListener('paste', function(e) {
    // 1. On bloque le collage par défaut qui fait n'importe quoi avec les espaces
    e.preventDefault();

    // 2. On récupère le texte copié de manière sécurisée (compatible tout navigateur)
    const clipboardData = e.clipboardData || window.clipboardData;
    let text = clipboardData.getData('text/plain');

    // 3. L'Inquisiteur : On écrase les gouffres (s'il y a 3 sauts de ligne ou plus, on n'en garde que 2)
    text = text.replace(/[\r\n]{3,}/g, '\n\n');

    // 4. On FORCE la plume à trouver où est ton curseur dans l'éditeur (le "true" sauve la vie)
    const range = quill.getSelection(true); 
    
    // 5. On insère le texte propre
    quill.insertText(range.index, text);
    
    // 6. On remet le curseur à la fin pour que tu puisses continuer à écrire
    quill.setSelection(range.index + text.length);
});

document.getElementById('close-chapitre-modal').addEventListener('click', () => {
    window.changerDePage('gestion');
});

submitChapitre.addEventListener('click', async () => {
    const numero = document.getElementById('chapitre-numero').value;
    const titre = document.getElementById('chapitre-titre').value;
    const contenu = quill.root.innerHTML;

    // 1. On récupère les notes (et on les vide si elles ne contiennent qu'un espace invisible)
    let contenuDebut = quillNoteDebut.root.innerHTML;
    if (contenuDebut === '<p><br></p>') contenuDebut = null;

    let contenuFin = quillNoteFin.root.innerHTML;
    if (contenuFin === '<p><br></p>') contenuFin = null;

    // --- LE SORTILÈGE DE COMPTAGE (L'OEIL DE LA PLUME) ---
    // On demande directement à la Plume le texte pur, ignorant totalement le code HTML !
    const textePur = quill.getText().trim();
    let compteMots = 0;
    if (textePur.length > 0) {
        compteMots = textePur.split(/\s+/).length; 
    }

    // 2. Vérification de sécurité (on force à remplir le chapitre)
    if (!numero || !titre || contenu === '<p><br></p>' || !contenu) {
        alert("Les Ténèbres exigent un Numéro, un Titre et un Contenu pour ce chapitre !");
        return;
    }

    submitChapitre.innerText = "Gravure...";
    let erreurGravure = null;

    // 3. L'AIGUILLAGE : Création ou Modification ?
    if (window.currentChapitreId) {
        // --- MODE MODIFICATION (Le chapitre existe déjà) ---
        const { error } = await window._supabase
            .from('chapitres')
            .update({ 
                numero: parseInt(numero), 
                titre, 
                contenu,
                note_debut: contenuDebut,
                note_fin: contenuFin,
                nombre_mots: compteMots // <-- NOUVELLE LIGNE ICI
            })
            .eq('id', window.currentChapitreId);
        erreurGravure = error;
    } else {
        // --- MODE CRÉATION (C'est un tout nouveau chapitre) ---
        const { error } = await window._supabase
            .from('chapitres')
            .insert([{ 
                histoire_id: window.currentOeuvreId, 
                numero: parseInt(numero), 
                titre, 
                contenu,
                note_debut: contenuDebut,
                note_fin: contenuFin,
                nombre_mots: compteMots // <-- NOUVELLE LIGNE ICI
            }]);
        erreurGravure = error;
    }

    // 4. Bilan de l'opération
    if (erreurGravure) {
        alert("Le parchemin a pris feu : " + erreurGravure.message);
    } else {
        alert(window.currentChapitreId ? "Modifications gravées !" : "Chapitre ajouté !");
        window.changerDePage('gestion');
        
        // --- NETTOYAGE DES 3 PLUMES ---
        quill.root.innerHTML = ''; 
        quillNoteDebut.root.innerHTML = ''; 
        quillNoteFin.root.innerHTML = ''; 
        
        chargerChapitresAdmin(window.currentOeuvreId); // On recharge la liste avec Admin !
    }
    
    // On remet le texte par défaut sur le bouton
    submitChapitre.innerText = "Graver le Chapitre";
});

// Quitter le Studio pour retourner aux archives
document.getElementById('btn-retour-studio').addEventListener('click', () => {
    window.changerDePage('accueil');
});

// --- GESTION DE L'ŒUVRE (Le Panneau d'Administration Complet) ---

// 1. Ouvrir la nouvelle page de gestion pour une œuvre
window.ouvrirGestionOeuvre = async function(idHistoire) {
    window.currentOeuvreId = idHistoire; // On mémorise l'œuvre
    window.changerDePage('gestion'); // Le Chef d'Orchestre affiche la page

    // On met des textes d'attente le temps de lire la base de données
    document.getElementById('edit-story-title').value = "Recherche en cours...";
    document.getElementById('edit-story-synopsis').value = "Recherche en cours...";

    // L'Archiviste récupère les données actuelles de l'histoire
    const { data: histoire, error } = await window._supabase
        .from('histoires')
        .select('*')
        .eq('id', idHistoire)
        .single();

    if (histoire) {
        document.getElementById('edit-story-title').value = histoire.titre;
        document.getElementById('edit-story-synopsis').value = histoire.synopsis;
		document.getElementById('edit-story-age').value = histoire.classification || 'Tout public';
		document.getElementById('edit-story-status').value = histoire.statut || '✍️ En cours';
		document.getElementById('edit-story-sensible').checked = histoire.contenu_sensible || false;
    }

    // On charge la liste des chapitres en dessous
    chargerChapitresAdmin(idHistoire);
};

// 2. Charger et lister les chapitres dans la page Gestion
window.chargerChapitresAdmin = async function(idHistoire) {
    const liste = document.getElementById('liste-chapitres-admin');
    liste.innerHTML = '<p style="color: #c4a484; font-style: italic;">Lecture des parchemins...</p>';

    const { data: chapitres, error } = await window._supabase
        .from('chapitres')
        .select('*')
        .eq('histoire_id', idHistoire)
        .order('numero', { ascending: true });

    if (error) {
        liste.innerHTML = '<p style="color: red;">Erreur : ' + error.message + '</p>';
        return;
    }

    if (chapitres.length === 0) {
        liste.innerHTML = '<p style="color: #777; font-style: italic;">Aucun chapitre pour le moment.</p>';
        return;
    }

    liste.innerHTML = '';
    chapitres.forEach(chap => {
        const div = document.createElement('div');
        div.style.cssText = "background: #111; border: 1px solid #333; padding: 10px; display: flex; justify-content: space-between; align-items: center;";
        
        div.innerHTML = `
            <span style="color: #e0d7c6; font-family: 'Cinzel', serif;">Chapitre ${chap.numero} : ${chap.titre}</span>
            <div>
                <button class="genre-btn" style="font-size: 0.7rem; margin-right: 10px; border-color: #c4a484; color: #c4a484;" onclick="ouvrirEditeurChapitre(${chap.id})">Modifier</button>
                <button class="genre-btn" style="font-size: 0.7rem; border-color: red; color: red;" onclick="supprimerChapitre(${chap.id}, ${idHistoire})">Supprimer</button>
            </div>
        `;
        liste.appendChild(div);
    });
};

// 3. Le pouvoir de Destruction : Supprimer TOUTE l'œuvre
window.supprimerOeuvreCourante = async function() {
    if(confirm("Êtes-vous sûr de vouloir jeter cette œuvre dans les abysses ? Cette action est irréversible.")) {
        const { error } = await window._supabase.from('histoires').delete().eq('id', window.currentOeuvreId);
        if(error) {
            alert("Supabase a bloqué la destruction ! Erreur : " + error.message + "\n\n(Va sur Supabase autoriser le DELETE dans les Policies RLS)");
        } else {
            alert("L'œuvre a été consumée par les ténèbres.");
            window.changerDePage('studio'); // On retourne à l'atelier
            chargerMesOeuvres(); // On rafraîchit la liste
        }
    }
};

// 4. Le pouvoir de Destruction : Supprimer un chapitre
window.supprimerChapitre = async function(idChapitre, idHistoire) {
    if(confirm("Détruire ce parchemin à jamais ?")) {
        const { error } = await window._supabase.from('chapitres').delete().eq('id', idChapitre);
        if(error) {
            alert("Supabase a bloqué la destruction ! Erreur : " + error.message + "\n\n(Va sur Supabase autoriser le DELETE dans les Policies RLS)");
        } else {
            chargerChapitresAdmin(idHistoire); // On rafraîchit la liste
        }
    }
};

// --- LES BOUTONS DE LA NOUVELLE PAGE GESTION ---

// Bouton Retour à l'Atelier
document.getElementById('btn-retour-gestion').addEventListener('click', () => {
    window.changerDePage('studio');
    chargerMesOeuvres(); 
});

// Bouton Ouvrir "Ajouter un Chapitre" (nouvelle page)
document.getElementById('btn-open-add-chapitre').addEventListener('click', () => {
    window.currentChapitreId = null; // On oublie l'ancien chapitre ! C'est une NOUVELLE création.
    
    // On vide toutes les cases
    document.getElementById('chapitre-numero').value = '';
    document.getElementById('chapitre-titre').value = '';
    quill.root.innerHTML = '';
    quillNoteDebut.root.innerHTML = '';
    quillNoteFin.root.innerHTML = '';
    
    document.getElementById('submit-chapitre').innerText = "Graver le Chapitre";
    window.changerDePage('editeur-chapitre');
});

// Bouton Sauvegarder les modifications de l'histoire (Titre, Synopsis, Image)
document.getElementById('btn-save-story-edit').addEventListener('click', async () => {
    const btnSave = document.getElementById('btn-save-story-edit');
    const nouveauTitre = document.getElementById('edit-story-title').value;
    const nouveauSynopsis = document.getElementById('edit-story-synopsis').value;
	const nouvelleClassification = document.getElementById('edit-story-age').value;
	const nouveauStatut = document.getElementById('edit-story-status').value;
    const fichierCouverture = document.getElementById('edit-story-cover').files[0];

    // Vérification de sécurité : on ne veut pas d'histoire sans nom
    if (!nouveauTitre || !nouveauSynopsis) {
        alert("Les fondations de votre œuvre ne peuvent pas être vides ! (Titre et Synopsis requis)");
        return;
    }

    btnSave.innerText = "Gravure en cours...";
    btnSave.disabled = true; // On bloque le bouton pour éviter les doubles clics

    // On prépare le colis pour l'Archiviste
    const nouvelleSensibilite = document.getElementById('edit-story-sensible').checked;
    
    let miseAJour = {
        titre: nouveauTitre,
        synopsis: nouveauSynopsis,
        classification: nouvelleClassification, // <-- LA VIRGULE EST ICI !
        contenu_sensible: nouvelleSensibilite,
        statut: nouveauStatut // <-- LA NOUVELLE VIRGULE ET CETTE LIGNE
    };

    // Si le Seigneur a choisi une NOUVELLE couverture, on l'envoie d'abord
    if (fichierCouverture) {
        const fileName = `${Date.now()}-${fichierCouverture.name}`;
        const { error: upErr } = await window._supabase.storage.from('couvertures').upload(fileName, fichierCouverture);
        
        if (!upErr) {
            const { data } = window._supabase.storage.from('couvertures').getPublicUrl(fileName);
            miseAJour.image_couverture = data.publicUrl; // On ajoute la nouvelle image au colis
        } else {
            alert("Erreur lors de l'ajout de la couverture : " + upErr.message);
            btnSave.innerText = "Graver les modifications";
            btnSave.disabled = false;
            return; // On arrête tout si l'image plante
        }
    }

    // On envoie la mise à jour finale au registre (Supabase)
    const { error } = await window._supabase
        .from('histoires')
        .update(miseAJour)
        .eq('id', window.currentOeuvreId);

    if (error) {
        alert("Le registre a refusé la modification : " + error.message);
    } else {
        alert("Les modifications ont été gravées dans la roche !");
        document.getElementById('edit-story-cover').value = ""; // On nettoie le champ de l'image
        
        // --- LES DEUX NOUVEAUX ORDRES POUR L'ARCHIVISTE ---
        if (typeof loadStories === 'function') loadStories(); // Met à jour l'accueil en cachette
        chargerMesOeuvres(); // Met à jour la liste dans l'Atelier
    }

    btnSave.innerText = "Graver les modifications";
    btnSave.disabled = false;
});

// 5. Rouvrir un parchemin existant (Modifier un Chapitre)
window.ouvrirEditeurChapitre = async function(idChapitre) {
    // On mémorise l'ID du chapitre pour savoir qu'on est en train de modifier !
    window.currentChapitreId = idChapitre; 
    
    // On ouvre la page de l'éditeur
    window.changerDePage('editeur-chapitre');

    document.getElementById('chapitre-titre').value = "Recherche dans les archives...";

    // L'Archiviste va chercher les textes
    const { data: chapitre, error } = await window._supabase
        .from('chapitres')
        .select('*')
        .eq('id', idChapitre)
        .single();

    if (chapitre) {
        // On remplit les cases
        document.getElementById('chapitre-numero').value = chapitre.numero;
        document.getElementById('chapitre-titre').value = chapitre.titre;
        
        // On remplit les 3 plumes (avec une sécurité si c'est vide)
        quill.root.innerHTML = chapitre.contenu || '';
        quillNoteDebut.root.innerHTML = chapitre.note_debut || '';
        quillNoteFin.root.innerHTML = chapitre.note_fin || '';
        
        // On change le texte du bouton pour être clair
        document.getElementById('submit-chapitre').innerText = "Graver les modifications";
    }
};
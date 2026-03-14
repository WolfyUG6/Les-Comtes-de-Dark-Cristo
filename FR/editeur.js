// ==========================================
// L'ÉDITEUR DE CHAPITRE (editeur.js)
// Plume Magique (Quill) & Sauvegarde
// ==========================================

// --- VARIABLES GLOBALES DE L'ÉDITEUR ---
let quill, quillNoteDebut, quillNoteFin;
window.compteMotsLive = 0;

window.chargerEditeurChapitre = function() {
    console.log("Chargement de l'éditeur pour l'œuvre ID:", window.currentOeuvreId, "Chapitre ID:", window.currentChapitreId);
    if (!window.currentOeuvreId) {
        alert("Erreur: Aucune œuvre sélectionnée !");
        window.changerDePage('studio');
        return;
    }

    // 1. Initialisation des Plumes si ce n'est pas déjà fait
    if (!quill) initialiserPlumes();

    // 2. Nettoyage de l'ardoise (très important quand on ouvre l'éditeur)
    document.getElementById('chapitre-numero').value = '';
    document.getElementById('chapitre-titre').value = '';
    quill.root.innerHTML = '';
    quillNoteDebut.root.innerHTML = '';
    quillNoteFin.root.innerHTML = '';
    document.getElementById('chapitre-publie').checked = true;
    document.getElementById('chapitre-date-pub').value = '';
    window.compteMotsLive = 0;
    actualiserAffichageCompteur();

    // Modification du texte du bouton principal selon le mode
    const btnSubmit = document.getElementById('submit-chapitre');
    btnSubmit.innerText = window.currentChapitreId ? "Graver les modifications" : "Graver le Chapitre";

    // 3. Si on MODIFIE un chapitre existant, on va le chercher
    if (window.currentChapitreId) {
        document.getElementById('chapitre-titre').value = "Recherche dans les archives...";
        recupererDonneesChapitre(window.currentChapitreId);
    }
    
    // 4. Initialiser Flatpickr pour la date (si pas déjà fait)
    if (!window.horlogeChapitre) {
        window.horlogeChapitre = flatpickr("#chapitre-date-pub", {
            enableTime: true,
            time_24hr: true,
            minuteIncrement: 1,
            dateFormat: "Z", 
            altInput: true,
            altFormat: "j F Y à H:i", 
            locale: "fr",
            minDate: "today" 
        });
    } else {
        window.horlogeChapitre.clear();
    }
};

// --- INITIALISATION DES PLUMES QUILL ---
function initialiserPlumes() {
    // Le bouclier anti-Word (Force les blocs en DIV)
    const Block = Quill.import('blots/block');
    Block.tagName = 'DIV';
    Quill.register(Block, true);

    // Initialisation de la Plume Principale
    quill = new Quill('#chapitre-contenu', {
        theme: 'snow',
        placeholder: 'Rédigez votre texte ici...',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['clean']
            ],
            clipboard: { matchVisual: false }
        }
    });

    // Compteur de mots en direct
    quill.on('text-change', () => {
        const textePropre = quill.getText().trim();
        window.compteMotsLive = textePropre.length === 0 ? 0 : textePropre.split(/\s+/).length;
        actualiserAffichageCompteur();
    });

    // Filtre de collage (Nettoyage des gouffres)
    quill.root.addEventListener('paste', function(e) {
        e.preventDefault();
        const clipboardData = e.clipboardData || window.clipboardData;
        let text = clipboardData.getData('text/plain');
        text = text.replace(/[\r\n]{3,}/g, '\n\n');
        
        const range = quill.getSelection(true); 
        quill.insertText(range.index, text);
        quill.setSelection(range.index + text.length);
    });

    // Initialisation des Plumes pour Notes (plus petites)
    const optionPlumeNote = {
        theme: 'snow',
        placeholder: 'Un mot pour vos lecteurs ? (Optionnel)',
        modules: { toolbar: [ ['bold', 'italic'], ['clean'] ] }
    };
    quillNoteDebut = new Quill('#note-debut-contenu', optionPlumeNote);
    quillNoteFin = new Quill('#note-fin-contenu', optionPlumeNote);
}

function actualiserAffichageCompteur() {
    const compteurDiv = document.getElementById('compteur-mots-container');
    if (compteurDiv) compteurDiv.innerText = "Mots gravés : " + window.compteMotsLive;
}

// --- RECUPERATION DONNEES D'UN CHAPITRE EXISTANT ---
async function recupererDonneesChapitre(id) {
    const { data: chapitre, error } = await window._supabase
        .from('chapitres')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        alert("Erreur de récupération : " + error.message);
        window.changerDePage('gestion');
        return;
    }

    if (chapitre) {
        document.getElementById('chapitre-numero').value = chapitre.numero || '';
        document.getElementById('chapitre-titre').value = chapitre.titre || '';
        
        quill.clipboard.dangerouslyPasteHTML(chapitre.contenu || '');
        quillNoteDebut.clipboard.dangerouslyPasteHTML(chapitre.note_debut || '');
        quillNoteFin.clipboard.dangerouslyPasteHTML(chapitre.note_fin || '');
        
        document.getElementById('chapitre-publie').checked = chapitre.est_publie !== false; // false explicite
        
        if (chapitre.date_publication && window.horlogeChapitre) {
            window.horlogeChapitre.setDate(chapitre.date_publication);
        }

        setTimeout(actualiserAffichageCompteur, 100);
    }
}

// --- SAUVEGARDE DU CHAPITRE ---
document.addEventListener('click', async (e) => {
    if (e.target && e.target.id === 'submit-chapitre') {
        const btnSubmit = document.getElementById('submit-chapitre');
        
        const numero = document.getElementById('chapitre-numero').value;
        const titre = document.getElementById('chapitre-titre').value;
        const contenu = quill.root.innerHTML;

        let contenuDebut = quillNoteDebut.root.innerHTML;
        if (quillNoteDebut.getText().trim() === '') contenuDebut = null;

        let contenuFin = quillNoteFin.root.innerHTML;
        if (quillNoteFin.getText().trim() === '') contenuFin = null;

        const compteMots = window.compteMotsLive;
        const estPublie = document.getElementById('chapitre-publie').checked;
        const champDate = document.getElementById('chapitre-date-pub').value;
        const datePublication = champDate ? new Date(champDate).toISOString() : new Date().toISOString();

        if (!numero || !titre || contenu === '<p><br></p>' || !contenu) {
            alert("Les Ténèbres exigent un Numéro, un Titre et un Contenu pour ce chapitre !");
            return;
        }

        btnSubmit.innerText = "Gravure...";
        btnSubmit.disabled = true;

        let erreurGravure = null;

        if (window.currentChapitreId) {
            // Modification
            const { error } = await window._supabase
                .from('chapitres')
                .update({ 
                    numero: parseInt(numero), 
                    titre, 
                    contenu,
                    note_debut: contenuDebut,
                    note_fin: contenuFin,
                    nombre_mots: compteMots,
                    est_publie: estPublie,
                    date_publication: datePublication
                })
                .eq('id', window.currentChapitreId);
            erreurGravure = error;
        } else {
            // Création
            const { error } = await window._supabase
                .from('chapitres')
                .insert([{ 
                    histoire_id: window.currentOeuvreId, 
                    numero: parseInt(numero), 
                    titre, 
                    contenu,
                    note_debut: contenuDebut,
                    note_fin: contenuFin,
                    nombre_mots: compteMots,
                    est_publie: estPublie,
                    date_publication: datePublication
                }]);
            erreurGravure = error;
        }

        btnSubmit.disabled = false;

        if (erreurGravure) {
            alert("Le parchemin a pris feu : " + erreurGravure.message);
            btnSubmit.innerText = window.currentChapitreId ? "Graver les modifications" : "Graver le Chapitre";
        } else {
            alert(window.currentChapitreId ? "Modifications gravées !" : "Chapitre ajouté !");
            window.changerDePage('gestion');
        }
    }

    if (e.target && e.target.id === 'close-chapitre-modal') {
        window.changerDePage('gestion');
    }
});

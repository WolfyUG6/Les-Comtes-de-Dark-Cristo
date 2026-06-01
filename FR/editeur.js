// ==========================================
// L'ÉDITEUR DE CHAPITRE (editeur.js)
// Plume Magique (Quill) & Sauvegarde
// ==========================================

// --- VARIABLES GLOBALES DE L'ÉDITEUR ---
let quill, quillNoteDebut, quillNoteFin;
window.compteMotsLive = 0;

async function chargerSelectVolumesChapitre(volumeSelectionne = null) {
    const select = document.getElementById('chapitre-volume');
    if (!select || !window.currentOeuvreId) return;

    select.innerHTML = `<option value="">${window.t?.('volumes.general', {}, 'Générale') || 'Générale'}</option>`;

    const { data: volumes, error } = await window._supabase
        .from('volumes')
        .select('id, titre, ordre')
        .eq('histoire_id', window.currentOeuvreId)
        .order('ordre', { ascending: true })
        .order('id', { ascending: true });

    if (error) {
        console.error('Erreur de chargement des volumes :', error);
        return;
    }

    (volumes || []).forEach((volume) => {
        const option = document.createElement('option');
        option.value = volume.id;
        option.textContent = volume.titre;
        select.appendChild(option);
    });

    select.value = volumeSelectionne ? String(volumeSelectionne) : '';
}

function initialiserCalendrierChapitre() {
    const champDate = document.getElementById('chapitre-date-pub');
    const boutonOuvrir = document.getElementById('chapitre-date-trigger');
    const boutonEffacer = document.getElementById('chapitre-date-clear');

    if (!champDate || typeof flatpickr !== 'function') return;

    if (window.horlogeChapitre && typeof window.horlogeChapitre.destroy === 'function') {
        window.horlogeChapitre.destroy();
    }

    window.horlogeChapitre = flatpickr(champDate, {
        enableTime: true,
        time_24hr: true,
        minuteIncrement: 1,
        dateFormat: "Z",
        altInput: true,
        altInputClass: "custom-input chapitre-date-visible",
        altFormat: "j F Y à H:i",
        locale: window._siteLocale === 'EN' ? (window.flatpickr?.l10ns?.default || 'default') : (window.flatpickr?.l10ns?.fr || "fr"),
        minDate: "today",
        allowInput: false,
        clickOpens: true
    });

    if (boutonOuvrir) {
        boutonOuvrir.onclick = () => {
            if (!window.horlogeChapitre) return;
            window.horlogeChapitre.open();
        };
    }

    if (boutonEffacer) {
        boutonEffacer.onclick = () => {
            if (!window.horlogeChapitre) return;
            window.horlogeChapitre.clear();
        };
    }
}

function normaliserTypeChapitre(typeChapitre) {
    const typesValides = ['prologue', 'chapitre', 'epilogue', 'hors_serie'];
    return typesValides.includes(typeChapitre) ? typeChapitre : 'chapitre';
}

function normaliserNumeroAffichage(numero) {
    return String(numero || '').trim().replace(',', '.');
}

function estNumeroChapitreValide(numero) {
    return /^\d+(?:\.\d{1,3})?$/.test(numero);
}

async function recupererOrdresUtilises(volumeSelectionne) {
    let requete = window._supabase
        .from('chapitres')
        .select('id, ordre_lecture')
        .eq('histoire_id', window.currentOeuvreId);

    if (volumeSelectionne) {
        requete = requete.eq('volume_id', volumeSelectionne);
    } else {
        requete = requete.is('volume_id', null);
    }

    if (window.currentChapitreId) {
        requete = requete.neq('id', window.currentChapitreId);
    }

    const { data, error } = await requete;
    if (error) throw error;

    return new Set((data || []).map((chapitre) => Number(chapitre.ordre_lecture)));
}

async function resoudreOrdreLecture(typeChapitre, numeroAffichage, volumeSelectionne) {
    const ordresUtilises = await recupererOrdresUtilises(volumeSelectionne);
    const ordreVoulu = window.getOrdreLectureDepuisChamps(typeChapitre, numeroAffichage);

    if (!ordresUtilises.has(ordreVoulu)) {
        return { numeroAffichage, ordreLecture: ordreVoulu, aAjuste: false };
    }

    if (typeChapitre === 'chapitre') {
        const match = numeroAffichage.match(/^(\d+)(?:\.(\d{1,3}))?$/);
        const numeroPrincipal = Number(match?.[1] || 0);
        const sousNumeroInitial = Number(match?.[2] || 0) + 1;

        for (let sousNumero = sousNumeroInitial; sousNumero <= 999; sousNumero++) {
            const ordreLecture = (numeroPrincipal * 1000) + sousNumero;
            if (!ordresUtilises.has(ordreLecture)) {
                return {
                    numeroAffichage: `${numeroPrincipal}.${sousNumero}`,
                    ordreLecture,
                    aAjuste: true
                };
            }
        }

        throw new Error(window.t?.('editor.orderConflictError', {}, "Impossible de trouver une position libre dans ce volume.") || "Impossible de trouver une position libre dans ce volume.");
    }

    for (let decalage = 1; decalage <= 999; decalage++) {
        const ordreLecture = ordreVoulu + decalage;
        if (!ordresUtilises.has(ordreLecture)) {
            return { numeroAffichage, ordreLecture, aAjuste: true };
        }
    }

    throw new Error(window.t?.('editor.orderConflictError', {}, "Impossible de trouver une position libre dans ce volume.") || "Impossible de trouver une position libre dans ce volume.");
}

window.chargerEditeurChapitre = async function() {
    // 0. Restauration des IDs après un F5
    if (!window.currentOeuvreId) window.currentOeuvreId = localStorage.getItem('currentOeuvreId');
    if (!window.currentChapitreId && localStorage.getItem('currentChapitreId')) {
        window.currentChapitreId = localStorage.getItem('currentChapitreId');
    }

    console.log("Chargement de l'éditeur pour l'œuvre ID:", window.currentOeuvreId, "Chapitre ID:", window.currentChapitreId);
    if (!window.currentOeuvreId) {
        await window.siteAlert(window.t?.('editor.noStoryError', {}, 'Erreur: Aucune œuvre sélectionnée !') || 'Erreur: Aucune œuvre sélectionnée !', { danger: true });
        window.changerDePage('studio');
        return;
    }

    // 1. Initialisation des Plumes (Le DOM est recréé par le routeur à chaque passage)
    initialiserPlumes();

    // 2. Nettoyage de l'ardoise (très important quand on ouvre l'éditeur)
    document.getElementById('chapitre-type').value = 'chapitre';
    document.getElementById('chapitre-numero').value = '';
    document.getElementById('chapitre-titre').value = '';
    quill.root.innerHTML = '';
    quillNoteDebut.root.innerHTML = '';
    quillNoteFin.root.innerHTML = '';
    document.getElementById('chapitre-publie').checked = true;
    document.getElementById('chapitre-date-pub').value = '';
    await chargerSelectVolumesChapitre();
    window.compteMotsLive = 0;
    actualiserAffichageCompteur();

    // Modification du texte du bouton principal selon le mode
    const btnSubmit = document.getElementById('submit-chapitre');
    btnSubmit.innerText = window.currentChapitreId ? (window.t?.('editor.submitEdit', {}, 'Graver les modifications') || 'Graver les modifications') : (window.t?.('editor.submitCreate', {}, 'Graver le Chapitre') || 'Graver le Chapitre');

    // 3. Réattacher le calendrier à chaque recréation du DOM
    initialiserCalendrierChapitre();

    // 4. Si on MODIFIE un chapitre existant, on va le chercher
    if (window.currentChapitreId) {
        document.getElementById('chapitre-titre').value = window.t?.('creationStory.loadingArchive', {}, 'Recherche dans les archives...') || 'Recherche dans les archives...';
        recupererDonneesChapitre(window.currentChapitreId);
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
        placeholder: window.t?.('editor.textPlaceholder', {}, 'Rédigez votre texte ici...') || 'Rédigez votre texte ici...',
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
        placeholder: window.t?.('editor.notePlaceholder', {}, 'Un mot pour vos lecteurs ? (Optionnel)') || 'Un mot pour vos lecteurs ? (Optionnel)',
        modules: { toolbar: [ ['bold', 'italic'], ['clean'] ] }
    };
    quillNoteDebut = new Quill('#note-debut-contenu', optionPlumeNote);
    quillNoteFin = new Quill('#note-fin-contenu', optionPlumeNote);
}

function actualiserAffichageCompteur() {
    const compteurDiv = document.getElementById('compteur-mots-container');
    if (compteurDiv) compteurDiv.innerText = window.t?.('editor.wordCounter', { count: window.compteMotsLive }, "Mots gravés : " + window.compteMotsLive) || "Mots gravés : " + window.compteMotsLive;
}

// --- RECUPERATION DONNEES D'UN CHAPITRE EXISTANT ---
async function recupererDonneesChapitre(id) {
    const { data: chapitre, error } = await window._supabase
        .from('chapitres')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        await window.siteAlert(window.t?.('editor.fetchError', { message: error.message }, 'Erreur de récupération : ' + error.message) || 'Erreur de récupération : ' + error.message, { danger: true });
        window.changerDePage('gestion');
        return;
    }

    if (chapitre) {
        document.getElementById('chapitre-type').value = normaliserTypeChapitre(chapitre.type_chapitre);
        document.getElementById('chapitre-numero').value = chapitre.numero_affichage || chapitre.numero || '';
        document.getElementById('chapitre-titre').value = chapitre.titre || '';
        
        quill.clipboard.dangerouslyPasteHTML(chapitre.contenu || '');
        quillNoteDebut.clipboard.dangerouslyPasteHTML(chapitre.note_debut || '');
        quillNoteFin.clipboard.dangerouslyPasteHTML(chapitre.note_fin || '');
        
        document.getElementById('chapitre-publie').checked = chapitre.est_publie !== false; // false explicite
        await chargerSelectVolumesChapitre(chapitre.volume_id);
        
        if (chapitre.date_publication && window.horlogeChapitre) {
            window.horlogeChapitre.setDate(chapitre.date_publication);
        }

        setTimeout(actualiserAffichageCompteur, 100);
    }
}

// --- SAUVEGARDE DU CHAPITRE ---
// Au lieu d'ajouter un event listener global qui s'exécute à chaque clic sur toute la page, 
// on s'assure qu'il n'est attaché qu'une fois (ou mieux, on utilise une fonction attachée au DOM direct).
// L'approche "document.addEventListener" est correcte pour la délégation d'événements dans une SPA,
// à condition de ne l'ajouter qu'une seule fois.

if (!window.editeurEventHooked) {
    document.addEventListener('click', async (e) => {
        if (e.target && e.target.id === 'submit-chapitre') {
            const btnSubmit = document.getElementById('submit-chapitre');
            
            const typeChapitre = normaliserTypeChapitre(document.getElementById('chapitre-type')?.value);
            const numeroDemande = normaliserNumeroAffichage(document.getElementById('chapitre-numero').value);
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
            const volumeSelectionne = document.getElementById('chapitre-volume')?.value || null;

            if (typeChapitre === 'chapitre' && !numeroDemande) {
                await window.siteAlert(window.t?.('editor.numberRequiredError', {}, 'Un chapitre doit avoir un numero.') || 'Un chapitre doit avoir un numero.', { danger: true });
                return;
            }

            if (numeroDemande && !estNumeroChapitreValide(numeroDemande)) {
                await window.siteAlert(window.t?.('editor.numberFormatError', {}, 'Le numero doit utiliser le format 1 ou 1.1.') || 'Le numero doit utiliser le format 1 ou 1.1.', { danger: true });
                return;
            }

            if (!titre || contenu === '<p><br></p>' || !contenu) {
                await window.siteAlert(window.t?.('editor.requiredError', {}, 'Les Ténèbres exigent un Titre et un Contenu pour ce chapitre !') || 'Les Ténèbres exigent un Titre et un Contenu pour ce chapitre !', { danger: true });
                return;
            }

            btnSubmit.innerText = window.t?.('editor.engraving', {}, 'Gravure...') || 'Gravure...';
            btnSubmit.disabled = true;

            let erreurGravure = null;
            let ordreResolue = null;

            try {
                ordreResolue = await resoudreOrdreLecture(typeChapitre, numeroDemande, volumeSelectionne);
            } catch (error) {
                erreurGravure = error;
            }

            const payloadChapitre = ordreResolue ? {
                numero: window.getNumeroLegacyChapitre(typeChapitre, ordreResolue.numeroAffichage),
                type_chapitre: typeChapitre,
                numero_affichage: ordreResolue.numeroAffichage || null,
                ordre_lecture: ordreResolue.ordreLecture,
                titre,
                contenu,
                note_debut: contenuDebut,
                note_fin: contenuFin,
                nombre_mots: compteMots,
                est_publie: estPublie,
                date_publication: datePublication,
                volume_id: volumeSelectionne
            } : null;

            if (!erreurGravure && window.currentChapitreId) {
                // Modification
                const { error } = await window._supabase
                    .from('chapitres')
                    .update(payloadChapitre)
                    .eq('id', window.currentChapitreId);
                erreurGravure = error;
            } else if (!erreurGravure) {
                // Création
                const { error } = await window._supabase
                    .from('chapitres')
                    .insert([{ 
                        histoire_id: window.currentOeuvreId,
                        ...payloadChapitre
                    }]);
                erreurGravure = error;
            }

            btnSubmit.disabled = false;

            if (erreurGravure) {
                await window.siteAlert(window.t?.('editor.saveError', { message: erreurGravure.message }, 'Le parchemin a pris feu : ' + erreurGravure.message) || 'Le parchemin a pris feu : ' + erreurGravure.message, { danger: true });
                btnSubmit.innerText = window.currentChapitreId ? (window.t?.('editor.submitEdit', {}, 'Graver les modifications') || 'Graver les modifications') : (window.t?.('editor.submitCreate', {}, 'Graver le Chapitre') || 'Graver le Chapitre');
            } else {
                const messageAjustement = ordreResolue?.aAjuste && typeChapitre === 'chapitre'
                    ? ` ${window.t?.('editor.numberAdjusted', { number: ordreResolue.numeroAffichage }, `Le numero existait deja dans ce volume, il a ete place en ${ordreResolue.numeroAffichage}.`) || `Le numero existait deja dans ce volume, il a ete place en ${ordreResolue.numeroAffichage}.`}`
                    : '';
                await window.siteAlert((window.currentChapitreId ? (window.t?.('editor.updated', {}, 'Modifications gravées !') || 'Modifications gravées !') : (window.t?.('editor.created', {}, 'Chapitre ajouté !') || 'Chapitre ajouté !')) + messageAjustement);
                window.changerDePage('gestion');
            }
        }

        if (e.target && e.target.id === 'close-chapitre-modal') {
            window.changerDePage('gestion');
        }
    });

    window.editeurEventHooked = true;
}

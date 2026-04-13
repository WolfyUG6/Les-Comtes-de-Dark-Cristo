// ==========================================
// CRÉATION D'UNE OEUVRE (creationstory.js)
// Formulaire de publication
// ==========================================

window.chargerCreationStory = function() {
    console.log("Chargement de la page de création d'œuvre");
    
    // Nettoyage de l'ardoise (utile si on revient via le cache)
    document.getElementById('story-title').value = '';
    document.getElementById('story-synopsis').value = '';
    document.getElementById('story-genre').value = '';
    const selectAge = document.getElementById('story-age');
    selectAge.value = '';
    window.appliquerCouleurAge(selectAge);

    document.getElementById('story-status').value = '✍️ En cours'; 
    document.getElementById('story-sensible').checked = false;
    document.getElementById('story-comments-enabled').checked = true;
    document.getElementById('story-cover-file').value = '';

    const deleteBox = document.getElementById('delete-cover-container');
    if (deleteBox) deleteBox.classList.add('hidden');
    const deleteCheck = document.getElementById('story-delete-cover');
    if (deleteCheck) deleteCheck.checked = false;

    const btnSubmit = document.getElementById('submit-story');
    if (btnSubmit) {
        btnSubmit.innerText = "Forger l'Histoire";
        btnSubmit.disabled = false;
    }

    // --- MODE ÉDITION : PRÉ-REMPLISSAGE ---
    const modeEdition = localStorage.getItem('modeEditionHistoire') === 'true';
    const idHistoire = localStorage.getItem('currentOeuvreId');

    if (modeEdition && idHistoire) {
        if (btnSubmit) btnSubmit.innerText = "Recherche dans les archives...";
        
        window._supabase.from('histoires').select('*').eq('id', idHistoire).single()
            .then(({ data: histoire, error }) => {
                if (histoire && !error) {
                    document.getElementById('story-title').value = histoire.titre || '';
                    document.getElementById('story-synopsis').value = histoire.synopsis || '';
                    document.getElementById('story-genre').value = histoire.genre || '';
                    
                    const selectAge = document.getElementById('story-age');
                    selectAge.value = histoire.classification || 'Tout public';
                    window.appliquerCouleurAge(selectAge); // Colore selon la classification récupérée
                    
                    document.getElementById('story-status').value = histoire.statut || '✍️ En cours';
                    document.getElementById('story-sensible').checked = histoire.contenu_sensible || false;
                    document.getElementById('story-comments-enabled').checked = histoire.commentaires_actifs !== false;
                    
                    // On ne peut pas pré-remplir un <input type="file"> pour des raisons de sécurité navigateur.
                    const deleteBox = document.getElementById('delete-cover-container');
                    if (histoire.image_couverture && deleteBox && !window.estCouvertureParDefaut(histoire.image_couverture)) {
                        deleteBox.classList.remove('hidden');
                    }
                    
                    if (btnSubmit) {
                        btnSubmit.innerText = "Sauvegarder les changements";
                        document.querySelector('.title-m0').innerText = "Réviser le Grimoire";
                    }
                }
            });
    } else {
        // Rétablit le titre par défaut si c'est une création
        const titrePage = document.querySelector('.title-m0');
        if (titrePage) titrePage.innerText = "Graver une Nouvelle Œuvre";
    }
};

// Application dynamique de la couleur de classification
window.appliquerCouleurAge = function(selectElement) {
    if (!selectElement) return;
    selectElement.classList.remove('age-tout-public', 'age-r15', 'age-r16', 'age-r18');
    const val = selectElement.value;
    if (val === 'Tout public') selectElement.classList.add('age-tout-public');
    else if (val === 'R15') selectElement.classList.add('age-r15');
    else if (val === 'R16') selectElement.classList.add('age-r16');
    else if (val === 'R18') selectElement.classList.add('age-r18');
};

async function sauvegarderHistoireAvecCompatibilite({ payload, modeEdition, idHistoire }) {
    const executerRequete = (payloadFinal) => {
        if (modeEdition && idHistoire) {
            return window._supabase.from('histoires')
                .update(payloadFinal)
                .eq('id', idHistoire)
                .select();
        }

        return window._supabase.from('histoires')
            .insert([payloadFinal])
            .select();
    };

    let resultat = await executerRequete(payload);

    if (resultat.error && (resultat.error.message || '').includes('auteur_user_id')) {
        const payloadCompat = { ...payload };
        delete payloadCompat.auteur_user_id;
        resultat = await executerRequete(payloadCompat);
    }

    return resultat;
}

// --- GESTION DES CLICS (Délégation d'événements) ---
if (!window.creationStoryEventHooked) {
    document.addEventListener('change', (e) => {
        if (e.target && e.target.id === 'story-age') {
            window.appliquerCouleurAge(e.target);
        }
    });

    document.addEventListener('click', async (e) => {
        // Redirection Bouton Retour
        if (e.target && e.target.id === 'btn-retour-creation') {
            window.changerDePage('studio');
            return;
        }

        // Soumission du Formulaire
        if (e.target && e.target.id === 'submit-story') {
            const btnSubmit = document.getElementById('submit-story');
            
            const title = document.getElementById('story-title').value;
            const synopsis = document.getElementById('story-synopsis').value;
            const genre = document.getElementById('story-genre').value;
            const classification = document.getElementById('story-age').value;
            const statut = document.getElementById('story-status').value;
            const file = document.getElementById('story-cover-file').files[0];
            const isSensible = document.getElementById('story-sensible').checked;
            const commentairesActifs = document.getElementById('story-comments-enabled').checked;

            const { data: { session } } = await window._supabase.auth.getSession();
            
            if (!session) {
                await window.siteAlert("Erreur critique : Tu as été déconnecté par le vide spatial. Reconnecte-toi.", { danger: true });
                return;
            }

            if (!title || !synopsis || !genre || !classification) {
                await window.siteAlert("Les fondations sont instables ! Remplissez tous les champs obligatoires (Titre, Synopsis, Genre, Classification).", { danger: true });
                return;
            }

            btnSubmit.innerText = "Forgeage en cours...";
            btnSubmit.disabled = true;

            const modeEdition = localStorage.getItem('modeEditionHistoire') === 'true';
            const idHistoire = localStorage.getItem('currentOeuvreId');
            const chkDelCover = document.getElementById('story-delete-cover');
            const isDeleteCover = chkDelCover ? chkDelCover.checked : false;

            let imageUrl = null;
            let oldImageUrl = null;
            let currentImageUrl = null;

            if (modeEdition && idHistoire) {
                const { data: currentStory } = await window._supabase.from('histoires').select('image_couverture').eq('id', idHistoire).single();
                if (currentStory && currentStory.image_couverture) {
                    currentImageUrl = currentStory.image_couverture;
                    if (!window.estCouvertureParDefaut(currentImageUrl)) {
                        oldImageUrl = currentImageUrl;
                    }
                }
            }

            async function purgerAncienneImage(url) {
                if (!url) return;
                try {
                    const parts = url.split('/');
                    const fName = parts[parts.length - 1];
                    if (fName) {
                        await window._supabase.storage.from('couvertures').remove([fName]);
                    }
                } catch(err) {
                    console.error("Erreur destruction image:", err);
                }
            }

            // 1. Dépôt de la couverture si fichier présent
            if (file) {
                btnSubmit.innerText = "Téléversement de l'image...";
                
                // --- ON EFFACE D'ABORD L'ANCIENNE ---
                if (oldImageUrl) {
                    await purgerAncienneImage(oldImageUrl);
                }

                const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`; // Sécurité nom de fichier
                
                // Compression silencieuse
                let fichierAEnvoyer = file;
                try {
                    const options = {
                        maxSizeMB: 0.5,           // Max 500 Ko
                        maxWidthOrHeight: 1920,   // Max largeur/hauteur 1920px
                        useWebWorker: true
                    };
                    fichierAEnvoyer = await imageCompression(file, options);
                    
                    // Fallback extrême : si le fichier compresse mal (ex: de gros PNG), forcer en JPEG avec perte
                    if (fichierAEnvoyer.size > 500 * 1024) {
                        const optionsJpegForce = {
                            maxSizeMB: 0.5,
                            maxWidthOrHeight: 1920,
                            useWebWorker: true,
                            fileType: 'image/jpeg',
                            initialQuality: 0.85
                        };
                        fichierAEnvoyer = await imageCompression(file, optionsJpegForce);
                    }
                } catch (compressionError) {
                    console.error("Erreur de compression, envoi du fichier original :", compressionError);
                }

                const { error: upErr } = await window._supabase.storage.from('couvertures').upload(fileName, fichierAEnvoyer);
                
                if (!upErr) {
                    const { data } = window._supabase.storage.from('couvertures').getPublicUrl(fileName);
                    imageUrl = data.publicUrl;
                } else {
                    await window.siteAlert("L'image a été rejetée par le portail : " + upErr.message, { danger: true });
                    btnSubmit.innerText = modeEdition ? "Sauvegarder les changements" : "Forger l'Histoire";
                    btnSubmit.disabled = false;
                    return; // On arrête là si l'image plante
                }
            } else if (isDeleteCover && oldImageUrl) {
                // L'utilisateur n'a pas mis de nouveau fichier mais veut effacer l'ancien
                await purgerAncienneImage(oldImageUrl);
                imageUrl = window.DEFAULT_STORY_COVER;
            }

            btnSubmit.innerText = "Écriture dans le registre...";

            // 2. Gravure ou Révision du Grimoire (Table "histoires")
            const monPseudo = session.user.user_metadata?.pseudo || session.user.email.split('@')[0];
            
            let requeteResult;
            
            const payload = {
                titre: title, 
                synopsis: synopsis, 
                genre: genre, 
                classification: classification, 
                statut: statut,
                contenu_sensible: isSensible,
                commentaires_actifs: commentairesActifs,
                auteur: session.user.email,
                auteur_user_id: session.user.id
            };
            
            if (imageUrl) {
                payload.image_couverture = imageUrl; // On n'écrase pas l'image si on n'en fournit pas de nouvelle
            } else if (!modeEdition || !currentImageUrl) {
                payload.image_couverture = window.DEFAULT_STORY_COVER;
            }

            if (modeEdition && idHistoire) {
                // --- UPDATE ---
                requeteResult = await sauvegarderHistoireAvecCompatibilite({
                    payload,
                    modeEdition,
                    idHistoire
                });
            } else {
                // --- INSERT ---
                payload.auteur = session.user.email; // Compatibilite des verifications historiques
                payload.auteur_user_id = session.user.id;
                payload.pseudo_auteur = monPseudo;
                
                requeteResult = await sauvegarderHistoireAvecCompatibilite({
                    payload,
                    modeEdition,
                    idHistoire
                });
            }

            const { data: histoireSauvee, error } = requeteResult;

            if (error) {
                await window.siteAlert("Le registre Supabase a refusé l'inscription : " + error.message, { danger: true });
                btnSubmit.innerText = modeEdition ? "Sauvegarder les changements" : "Forger l'Histoire";
                btnSubmit.disabled = false;
            } else {
                await window.siteAlert(modeEdition ? "Les modifications ont été gravées dans la roche !" : "Un nouveau grimoire est apparu dans l'Atelier !");
                
                // Mémorisation pour le panneau Gestion
                if (histoireSauvee && histoireSauvee.length > 0) {
                    const idNouvelleOuevre = histoireSauvee[0].id;
                    window.currentOeuvreId = idNouvelleOuevre;
                    localStorage.setItem('currentOeuvreId', idNouvelleOuevre);
                }
                
                // On nettoie le cache d'édition
                localStorage.removeItem('modeEditionHistoire');
                
                // Recharge obligatoire pour l'atelier
                if (typeof window.chargerMesOeuvres === 'function') window.chargerMesOeuvres(); 

                window.changerDePage('studio'); // Retour l'atelier
            }
        }
    });

    window.creationStoryEventHooked = true;
}

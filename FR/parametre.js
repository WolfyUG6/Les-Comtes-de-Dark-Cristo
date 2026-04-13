// =====================================
// FONCTIONS DE LA PAGE DES QUARTIERS (Isolée)
// =====================================

window.chargerQuartiers = async function() {
    // 1. Charger et injecter le HTML
    const reponse = await fetch('Parametre.html');
    const html = await reponse.text();
    document.getElementById('sanctuaire-root').innerHTML = html;

    // 2. Initialiser la navigation de la Sidebar
    initialiserSidebarQuartiers();

    // 3. Charger les données du membre depuis Supabase (Isolé d'Auth)
    await remplirDonneesProfil();
    
    // 4. Activer l'aperçu de l'avatar
    activerApercuAvatar();

    // 5. Brancher les boutons Sécurité
    brancherBoutonsSécurité();
};

function initialiserSidebarQuartiers() {
    const boutons = document.querySelectorAll('.quartier-tab-btn');
    const sections = document.querySelectorAll('.quartier-section');

    boutons.forEach(btn => {
        btn.addEventListener('click', () => {
            boutons.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            btn.classList.add('active');
            const cibleId = btn.getAttribute('data-target');
            document.getElementById(cibleId).classList.add('active');
        });
    });
}

function activerApercuAvatar() {
    const fileInput = document.getElementById('quartiers-avatar-file');
    const preview = document.getElementById('quartiers-avatar-preview');

    if(fileInput && preview) {
        fileInput.addEventListener('change', function() {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    preview.src = e.target.result;
                }
                reader.readAsDataURL(file);
            }
        });
    }
}

// =====================================
// BRANCHEMENT DES BOUTONS SÉCURITÉ
// =====================================

function brancherBoutonsSécurité() {
    const btnEmail = document.getElementById('btn-save-email');
    const btnPassword = document.getElementById('btn-save-password');
    const btnDeleteAccount = document.getElementById('btn-delete-account');

    if (btnEmail) {
        btnEmail.addEventListener('click', changerEmail);
    }
    if (btnPassword) {
        btnPassword.addEventListener('click', changerMotDePasse);
    }
    if (btnDeleteAccount) {
        btnDeleteAccount.addEventListener('click', supprimerMonCompte);
    }
}

// --- CHANGEMENT D'EMAIL ---
async function changerEmail() {
    const feedback = document.getElementById('securite-feedback');
    const nouvelEmail = document.getElementById('quartiers-email').value.trim();
    const btn = document.getElementById('btn-save-email');

    if (!nouvelEmail) {
        afficherFeedback(feedback, "L'incantation est vide. Entrez un email.", "text-error");
        return;
    }

    // Validation basique du format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(nouvelEmail)) {
        afficherFeedback(feedback, "Ce grimoire d'adresse est mal formé.", "text-error");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Transmission...";
    afficherFeedback(feedback, "Envoi du lien de confirmation...", "");

    const { error } = await window._supabase.auth.updateUser({ email: nouvelEmail });

    btn.disabled = false;
    btn.innerText = "Changer l'Email";

    if (error) {
        afficherFeedback(feedback, "Refus du Sanctuaire : " + error.message, "text-error");
    } else {
        afficherFeedback(feedback, "✅ Un lien de confirmation a été envoyé à " + nouvelEmail + ". Vérifiez vos courriers. Après validation, les histoires liées à votre compte seront resynchronisées automatiquement.", "text-success");
        document.getElementById('quartiers-email').value = '';
    }
}

// --- CHANGEMENT DE MOT DE PASSE ---
async function changerMotDePasse() {
    const feedback = document.getElementById('securite-feedback');
    const nouveauMdp = document.getElementById('quartiers-password').value;
    const btn = document.getElementById('btn-save-password');

    if (!nouveauMdp) {
        afficherFeedback(feedback, "Le Sceau de Garde ne peut être vide.", "text-error");
        return;
    }

    if (nouveauMdp.length < 6) {
        afficherFeedback(feedback, "Le Sceau doit contenir au moins 6 caractères.", "text-error");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Forgeage...";
    afficherFeedback(feedback, "Gravure du nouveau Sceau...", "");

    const { error } = await window._supabase.auth.updateUser({ password: nouveauMdp });

    btn.disabled = false;
    btn.innerText = "Forger le Sceau";

    if (error) {
        afficherFeedback(feedback, "Refus du Sanctuaire : " + error.message, "text-error");
    } else {
        afficherFeedback(feedback, "✅ Nouveau Sceau de Garde gravé avec succès.", "text-success");
        document.getElementById('quartiers-password').value = '';
    }
}

function decouperEnLots(tableau, tailleLot = 1000) {
    const lots = [];

    for (let index = 0; index < tableau.length; index += tailleLot) {
        lots.push(tableau.slice(index, index + tailleLot));
    }

    return lots;
}

async function supprimerObjetsStorageDuCompte() {
    const { data, error } = await window._supabase.rpc('get_mes_objets_storage_a_supprimer');
    if (error) throw error;

    const objets = Array.isArray(data) ? data.filter((item) => item?.bucket_id && item?.name) : [];
    if (objets.length === 0) return 0;

    const objetsParBucket = new Map();

    objets.forEach((objet) => {
        if (!objetsParBucket.has(objet.bucket_id)) {
            objetsParBucket.set(objet.bucket_id, []);
        }

        objetsParBucket.get(objet.bucket_id).push(objet.name);
    });

    for (const [bucketId, chemins] of objetsParBucket.entries()) {
        const lots = decouperEnLots(chemins, 1000);

        for (const lot of lots) {
            const { error: removeError } = await window._supabase.storage
                .from(bucketId)
                .remove(lot);

            if (removeError) {
                throw removeError;
            }
        }
    }

    return objets.length;
}

function nettoyerEtatLocalApresSuppressionCompte() {
    [
        'userPseudo',
        'userAvatar',
        'modeAuteur',
        'afficherCommentaires',
        'currentOeuvreId',
        'currentChapitreId',
        'modeEditionHistoire'
    ].forEach((cle) => localStorage.removeItem(cle));
}

async function supprimerMonCompte() {
    const feedback = document.getElementById('securite-feedback');
    const btn = document.getElementById('btn-delete-account');

    const confirmation = await window.siteConfirm(
        "Confirmez-vous la suppression définitive de votre compte et de toutes vos données ? Cette action effacera votre profil, vos histoires, vos chapitres, vos commentaires, vos favoris et vos fichiers liés. Elle est irréversible.",
        {
            confirmText: 'Supprimer définitivement',
            cancelText: 'Annuler',
            danger: true
        }
    );

    if (!confirmation || !btn) return;

    btn.disabled = true;
    btn.innerText = "Anéantissement...";
    afficherFeedback(feedback, "Purge des archives personnelles en cours...", "");

    try {
        await supprimerObjetsStorageDuCompte();

        afficherFeedback(feedback, "Suppression du compte dans le Sanctuaire...", "");

        const { error } = await window._supabase.rpc('supprimer_mon_compte_complet');
        if (error) throw error;

        try {
            await window._supabase.auth.signOut();
        } catch (_) {
            // Le compte peut déjà avoir disparu côté Auth avant le signOut local.
        }

        nettoyerEtatLocalApresSuppressionCompte();
        await window.siteAlert("Votre compte et toutes les données qui lui étaient liées ont été supprimés.");
        window.changerDePage('accueil');
    } catch (erreur) {
        afficherFeedback(feedback, "Échec de l'anéantissement : " + erreur.message, "text-error");
        btn.disabled = false;
        btn.innerText = "Pulvériser mon existence";
        return;
    }

    btn.disabled = false;
    btn.innerText = "Pulvériser mon existence";
}

// =====================================
// CHARGEMENT DES DONNÉES (Fetch Isolé)
// =====================================

async function remplirDonneesProfil() {
    const { data: authData } = await window._supabase.auth.getSession();
    const session = authData?.session;
    
    if (!session) {
        window.changerDePage('accueil');
        return;
    }

    const { data: profil, error } = await window._supabase
        .from('noms_de_plume')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

    const pseudoInput = document.getElementById('quartiers-pseudo');
    const avatarPreview = document.getElementById('quartiers-avatar-preview');
    const switchAuteur = document.getElementById('switch-auteur');
    const switchComs = document.getElementById('switch-coms');

    // Pré-remplir l'email actuel dans le champ email
    const emailInput = document.getElementById('quartiers-email');
    if (emailInput && session.user.email) {
        emailInput.placeholder = "Email actuel : " + session.user.email;
    }

    if (profil) {
        if (pseudoInput && profil.pseudo && profil.pseudo !== "null") {
            pseudoInput.value = profil.pseudo;
        }
        if (avatarPreview && profil.avatar_url && profil.avatar_url !== "null") {
            avatarPreview.src = profil.avatar_url;
        }
        if (switchAuteur) {
            switchAuteur.checked = profil.mode_auteur === true;
            localStorage.setItem('modeAuteur', profil.mode_auteur === true);
            const btnForge = document.getElementById('btn-atelier-nav');
            if (btnForge) btnForge.style.display = profil.mode_auteur === true ? "block" : "none";
        }
        if (switchComs) {
            switchComs.checked = profil.afficher_commentaires !== false;
            localStorage.setItem('afficherCommentaires', profil.afficher_commentaires !== false);
        }
    } else {
        if (switchAuteur) {
            switchAuteur.checked = true;
            localStorage.setItem('modeAuteur', 'true');
            const btnForge = document.getElementById('btn-atelier-nav');
            if (btnForge) btnForge.style.display = "block";
        }
        if (switchComs) {
            switchComs.checked = true;
            localStorage.setItem('afficherCommentaires', 'true');
        }
    }
}

// =====================================
// SAUVEGARDE DE L'IDENTITÉ
// =====================================

window.sauvegarderIdentite = async function() {
    const feedback = document.getElementById('identite-feedback');
    const pseudo = document.getElementById('quartiers-pseudo').value.trim();
    const fileInput = document.getElementById('quartiers-avatar-file');
    const file = fileInput.files[0];

    const { data: authData, error: authErr } = await window._supabase.auth.getSession();
    const session = authData?.session;
    if (!session) return;
    const userId = session.user.id;

    if (!pseudo) {
        afficherFeedback(feedback, "Un Nom de Plume est nécessaire.", "text-error");
        return;
    }

    const btn = document.getElementById('btn-save-identite');
    btn.disabled = true;
    afficherFeedback(feedback, "Forgeage en cours...", "");

    let finalAvatarUrl = null;

    if (file) {
        try {
            const options = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 800,
                useWebWorker: true
            };
            
            let fichierUpload = file;
            if (typeof imageCompression === 'function') {
                fichierUpload = await imageCompression(file, options);
            }

            const ext = file.name.split('.').pop();
            const nomFichier = `avatar_${userId}_${Date.now()}.${ext}`;

            const { data: uploadData, error: uploadErr } = await window._supabase
                .storage
                .from('avatars')
                .upload(nomFichier, fichierUpload, { cacheControl: '3600', upsert: true });

            if (uploadErr) throw uploadErr;

            const { data: urlData } = window._supabase.storage.from('avatars').getPublicUrl(nomFichier);
            finalAvatarUrl = urlData.publicUrl;

        } catch (err) {
            afficherFeedback(feedback, "Échec de l'absorption du Portrait : " + err.message, "text-error");
            btn.disabled = false;
            btn.innerText = "Sceller l'Identité";
            return;
        }
    }

    let updatePayload = { pseudo: pseudo };
    if (finalAvatarUrl) {
        updatePayload.avatar_url = finalAvatarUrl;
    }

    const { error: updateErr } = await safePartialUpdate(userId, updatePayload);

    if (updateErr) {
        afficherFeedback(feedback, "Le pacte a été rejeté : " + updateErr.message, "text-error");
    } else {
        afficherFeedback(feedback, "Identité forgée avec succès dans le marbre du Sanctuaire.", "text-success");
        
        let metaDataPayload = { pseudo: pseudo };
        if (finalAvatarUrl) metaDataPayload.avatar_url = finalAvatarUrl;
        
        await window._supabase.auth.updateUser({ data: metaDataPayload });

        const headerName = document.getElementById('user-name');
        if (headerName) headerName.innerText = "Comte " + pseudo;
        
        const headerAvatar = document.getElementById('header-avatar');
        if (headerAvatar && finalAvatarUrl) headerAvatar.src = finalAvatarUrl;
        
        const profileDropdownAvatar = document.getElementById('profile-avatar-preview');
        if (profileDropdownAvatar && finalAvatarUrl) profileDropdownAvatar.src = finalAvatarUrl;
    }

    btn.disabled = false;
    btn.innerText = "Sceller l'Identité";
};

// =====================================
// SAUVEGARDE DES PRÉFÉRENCES (Switches)
// =====================================

window.switcherPreference = async function(colonneSQL, valeurBool) {
    const feedback = document.getElementById('preferences-feedback');
    
    const { data: authData } = await window._supabase.auth.getSession();
    const session = authData?.session;
    if (!session) return;

    afficherFeedback(feedback, "Gravure des lois...", "");

    const payload = {};
    payload[colonneSQL] = valeurBool;

    const { error } = await safePartialUpdate(session.user.id, payload);

    if (error) {
        afficherFeedback(feedback, "Échec du décret : " + error.message, "text-error", true);
    } else {
        afficherFeedback(feedback, "Loi décrétée dans la base de données.", "text-success", true);
        
        if (colonneSQL === 'mode_auteur') {
            await window._supabase.auth.updateUser({
                data: {
                    mode_auteur: valeurBool
                }
            });
            localStorage.setItem('modeAuteur', valeurBool);
            const btnForge = document.getElementById('btn-atelier-nav');
            if (btnForge) btnForge.style.display = valeurBool ? "block" : "none";
        } else if (colonneSQL === 'afficher_commentaires') {
            localStorage.setItem('afficherCommentaires', valeurBool);
        }
    }
};


// =====================================
// BOÎTES À OUTILS
// =====================================

function afficherFeedback(element, message, className = "", clearAfter = false) {
    if (!element) return;
    element.className = 'text-small mt-10 ' + className;
    element.innerText = message;
    
    if (clearAfter) {
        setTimeout(() => element.innerText = "", 3000);
    }
}

async function safePartialUpdate(userId, partialPayload) {
    const { data: existing } = await window._supabase
        .from('noms_de_plume')
        .select('user_id')
        .eq('user_id', userId)
        .single();
    
    if (existing) {
        const res = await window._supabase
            .from('noms_de_plume')
            .update(partialPayload)
            .eq('user_id', userId)
            .select();
            
        if (!res.error && (!res.data || res.data.length === 0)) {
            return { error: { message: "Vos règles RLS Supabase bloquent l'UPDATE." } };
        }
        return res;
    } else {
        const insertPayload = { user_id: userId, ...partialPayload };
        const res = await window._supabase
            .from('noms_de_plume')
            .insert(insertPayload)
            .select();
            
        if (!res.error && (!res.data || res.data.length === 0)) {
            return { error: { message: "Vos règles RLS Supabase bloquent l'INSERT." } };
        }
        return res;
    }
}

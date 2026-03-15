// ==========================================
// VOS QUARTIERS (parametre.js)
// Gestion du profil, sécurité, et paramètres
// ==========================================

window.chargerQuartiers = async function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // 1. Initialiser le comportement de la Sidebar (Onglets)
    initialiserNavigationQuartiers();

    // 2. Charger les données actuelles de l'utilisateur
    await remplirDonneesProfil();

    // 3. Attacher les Event Listeners
    attacherÉcouteursQuartiers();
};

function initialiserNavigationQuartiers() {
    const tabBtns = document.querySelectorAll('.quartier-tab-btn');
    const sections = document.querySelectorAll('.quartier-section');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Nettoyer les statuts actifs
            tabBtns.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            // Activer la cible
            e.target.classList.add('active');
            const targetId = e.target.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });
}

// =====================================
// RÉCUPÉRATION & REMPLISSAGE
// =====================================

async function remplirDonneesProfil() {
    const { data: { session } } = await window._supabase.auth.getSession();
    if (!session) {
        window.changerDePage('accueil');
        return;
    }

    const userId = session.user.id;

    // Récupérer la ligne 'noms_de_plume'
    const { data: profil, error } = await window._supabase
        .from('noms_de_plume')
        .select('*')
        .eq('user_id', userId)
        .single();

    if (profil) {
        // --- IDENTITÉ ---
        document.getElementById('quartiers-pseudo').value = profil.pseudo || '';
        if (profil.avatar_url) {
            document.getElementById('quartiers-avatar-preview').src = profil.avatar_url;
        }

        // --- PRÉFÉRENCES ---
        document.getElementById('quartiers-pref-auteur').checked = profil.mode_auteur === true;
        document.getElementById('quartiers-pref-coms').checked = profil.afficher_commentaires !== false; 
    }

    // --- SÉCURITÉ (Indépendant du profil) ---
    document.getElementById('quartiers-email').value = session.user.email || ''; 
}


// =====================================
// BOUTONS & SOUMISSIONS
// =====================================

function attacherÉcouteursQuartiers() {
    // 1. Identité (Pseudo & Avatar)
    const btnSaveIdentite = document.getElementById('btn-save-identite');
    if (btnSaveIdentite) btnSaveIdentite.addEventListener('click', sauvegarderIdentite);

    const inputAvatar = document.getElementById('quartiers-avatar-file');
    if (inputAvatar) {
        inputAvatar.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                document.getElementById('quartiers-avatar-preview').src = URL.createObjectURL(file);
            }
        });
    }

    // 2. Sécurité
    const btnEmail = document.getElementById('btn-update-email');
    if (btnEmail) btnEmail.addEventListener('click', updaterEmail);

    const btnPassword = document.getElementById('btn-update-password');
    if (btnPassword) btnPassword.addEventListener('click', updaterPassword);

    // 3. Préférences (Automatiques au check)
    const prefAuteur = document.getElementById('quartiers-pref-auteur');
    if (prefAuteur) prefAuteur.addEventListener('change', (e) => switcherPreference('mode_auteur', e.target.checked));

    const prefComs = document.getElementById('quartiers-pref-coms');
    if (prefComs) prefComs.addEventListener('change', (e) => switcherPreference('afficher_commentaires', e.target.checked));

    // 4. Compte
    const btnResilier = document.getElementById('btn-delete-account');
    if (btnResilier) btnResilier.addEventListener('click', annihilerCompte);
}

// --- LOGIQUE IDENTITÉ ---

async function sauvegarderIdentite() {
    const feedback = document.getElementById('identite-feedback');
    const btn = document.getElementById('btn-save-identite');
    const pseudo = document.getElementById('quartiers-pseudo').value.trim();
    const fileInput = document.getElementById('quartiers-avatar-file');
    const file = fileInput.files[0];

    const { data: { session } } = await window._supabase.auth.getSession();
    if (!session) return;
    const userId = session.user.id;

    if (!pseudo) {
        afficherFeedback(feedback, "Un nom de plume vocalise votre existence.", "text-error");
        return;
    }

    btn.disabled = true;
    btn.innerText = "Gravure en cours...";
    afficherFeedback(feedback, "", "");

    let finalAvatarUrl = null;

    // A. Étape d'Upload d'Avatar (s'il y a un fichier)
    if (file) {
        try {
            // Demande de l'existant pour écraser le fantôme
            const { data: ancient } = await window._supabase.from('noms_de_plume').select('avatar_url').eq('user_id', userId).single();
            if (ancient && ancient.avatar_url) {
                try {
                    const cheminASupprimer = ancient.avatar_url.split('/').pop();
                    await window._supabase.storage.from('avatars').remove([cheminASupprimer]);
                } catch(e) { console.warn("Impossible d'effacer l'ancien avatar.", e); }
            }

            // Compression de la nouvelle image 
            // 500kb max, résolution type PFP
            const options = {
                maxSizeMB: 0.5,
                maxWidthOrHeight: 800,
                useWebWorker: true
            };
            
            let fichierUpload = file;
            if (typeof imageCompression === 'function') {
                fichierUpload = await imageCompression(file, options);
            }

            // Renommage unique
            const ext = file.name.split('.').pop();
            const nomFichier = `avatar_${userId}_${Date.now()}.${ext}`;

            const { data: uploadData, error: uploadErr } = await window._supabase
                .storage
                .from('avatars')
                .upload(nomFichier, fichierUpload, { cacheControl: '3600', upsert: true });

            if (uploadErr) throw uploadErr;

            finalAvatarUrl = window.SUPABASE_URL + '/storage/v1/object/public/avatars/' + nomFichier;

        } catch (err) {
            afficherFeedback(feedback, "Échec de l'absorption du Portrait : " + err.message, "text-error");
            btn.disabled = false;
            btn.innerText = "Sceller l'Identité";
            return;
        }
    }

    // B. Étape de mise à jour Profil
    let updatePayload = { user_id: userId, pseudo: pseudo };
    if (finalAvatarUrl) {
        updatePayload.avatar_url = finalAvatarUrl;
    }

    const { error: updateErr } = await window._supabase
        .from('noms_de_plume')
        .upsert(updatePayload, { onConflict: 'user_id' });

    if (updateErr) {
        afficherFeedback(feedback, "Le pacte a été rejeté : " + updateErr.message, "text-error");
    } else {
        afficherFeedback(feedback, "Identité forgée avec succès.", "text-success");
        // Update du Header visuel en direct et du LocalStorage
        document.getElementById('user-name').innerText = pseudo;
        localStorage.setItem('userPseudo', pseudo);

        if (finalAvatarUrl) {
            document.getElementById('header-avatar').src = finalAvatarUrl;
            localStorage.setItem('userAvatar', finalAvatarUrl);
        }
    }

    btn.disabled = false;
    btn.innerText = "Sceller l'Identité";
}


// --- LOGIQUE SÉCURITÉ ---

async function updaterEmail() {
    const newEmail = document.getElementById('quartiers-email').value.trim();
    if (!newEmail) return;

    const feedback = document.getElementById('securite-feedback');
    afficherFeedback(feedback, "Envoi en cours...", "");

    const { data, error } = await window._supabase.auth.updateUser({ email: newEmail });
    
    if (error) {
        afficherFeedback(feedback, "Refus du grimoire : " + error.message, "text-error");
    } else {
        afficherFeedback(feedback, "Un corbeau a été envoyé. Veuillez confirmer ce parchemin de contact.", "text-success");
    }
}

async function updaterPassword() {
    const newPass = document.getElementById('quartiers-password').value;
    if (!newPass || newPass.length < 6) {
        afficherFeedback(document.getElementById('securite-feedback'), "Le sceau doit contenir au moins 6 runes.", "text-error");
        return;
    }

    const feedback = document.getElementById('securite-feedback');
    afficherFeedback(feedback, "Forgeage en cours...", "");

    const { data, error } = await window._supabase.auth.updateUser({ password: newPass });
    
    if (error) {
        afficherFeedback(feedback, "Sceau corrompu : " + error.message, "text-error");
    } else {
        afficherFeedback(feedback, "Votre nouveau sceau de sécurité est actif.", "text-success");
        document.getElementById('quartiers-password').value = '';
    }
}


// --- LOGIQUE PRÉFÉRENCES ---

async function switcherPreference(colonneSQL, valeurBool) {
    const feedback = document.getElementById('preferences-feedback');
    
    const { data: { session } } = await window._supabase.auth.getSession();
    if (!session) return;

    afficherFeedback(feedback, "Gravure...", "");

    const payload = { user_id: session.user.id };
    payload[colonneSQL] = valeurBool;

    const { error } = await window._supabase
        .from('noms_de_plume')
        .upsert(payload, { onConflict: 'user_id' });

    if (error) {
        afficherFeedback(feedback, "Échec de la loi : " + error.message, "text-error", true);
    } else {
        afficherFeedback(feedback, "Loi décrétée dans le Sanctuaire.", "text-success", true);
        
        // --- Répercussions directes sur le LocalStorage ---
        if (colonneSQL === 'mode_auteur') {
            localStorage.setItem('modeAuteur', valeurBool);
            const btnForge = document.getElementById('btn-atelier-nav');
            if (btnForge) {
                btnForge.style.display = valeurBool ? "block" : "none";
            }
        } else if (colonneSQL === 'afficher_commentaires') {
            localStorage.setItem('afficherCommentaires', valeurBool);
        }
    }
}


// --- LOGIQUE COMPTE ---

async function annihilerCompte() {
    const verification = confirm("⚠️ ANÉANTISSEMENT ⚠️\n\nÊtes-vous certain de vouloir pulvériser votre existence au sein du Sanctuaire ? Vos écrits disparaîtront avec vous.");
    
    if (!verification) return;

    const feedback = document.getElementById('compte-feedback');
    const { data: { session } } = await window._supabase.auth.getSession();
    if (!session) return;

    document.getElementById('btn-delete-account').disabled = true;
    afficherFeedback(feedback, "Effacement de votre empreinte...", "");

    // Appel distant à la fonction RPC de suppression postgres
    const { data, error } = await window._supabase.rpc('supprimer_mon_compte');

    if (error) {
        afficherFeedback(feedback, "Les instances supérieures refusent votre anéantissement : " + error.message, "text-error");
        document.getElementById('btn-delete-account').disabled = false;
    } else {
        // Succès - Déconnexion forcée
        await window._supabase.auth.signOut();
        window.location.reload();
    }
}


// Fonction outil (Message visuel)
function afficherFeedback(element, message, className = "", clearAfter = false) {
    if (!element) return;
    element.className = 'text-small mt-10 ' + className;
    element.innerText = message;
    
    if (clearAfter) {
        setTimeout(() => element.innerText = "", 3000);
    }
}

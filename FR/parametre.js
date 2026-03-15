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
};

function initialiserSidebarQuartiers() {
    const boutons = document.querySelectorAll('.quartier-tab-btn');
    const sections = document.querySelectorAll('.quartier-section');

    boutons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Retirer l'actif partout
            boutons.forEach(b => b.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));

            // Activer le bouton cliqué
            btn.classList.add('active');

            // Activer la section cible
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
// CHARGEMENT DES DONNÉES (Fetch Isolé)
// =====================================

async function remplirDonneesProfil() {
    const { data: authData } = await window._supabase.auth.getSession();
    const session = authData?.session;
    
    if (!session) {
        window.changerDePage('accueil');
        return;
    }

    // On va chercher les vraies infos dans la base de données
    const { data: profil, error } = await window._supabase
        .from('noms_de_plume')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

    // On pré-remplit les zones (Si rien n'est trouvé, on laisse vide / defaut)
    const pseudoInput = document.getElementById('quartiers-pseudo');
    const avatarPreview = document.getElementById('quartiers-avatar-preview');
    const switchAuteur = document.getElementById('switch-auteur');
    const switchComs = document.getElementById('switch-coms');

    if (profil) {
        if (pseudoInput && profil.pseudo && profil.pseudo !== "null") {
            pseudoInput.value = profil.pseudo;
        }
        if (avatarPreview && profil.avatar_url && profil.avatar_url !== "null") {
            avatarPreview.src = profil.avatar_url;
        }
        
        // Coche les switchs selon la DB (ou True par défaut comme demandé)
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
        // Profil vierge : Les booléens sont TRUE par défaut selon vos consignes
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

    // A. Étape d'Upload Avatar (Si présent)
    if (file) {
        try {
            // Compression
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

            const { data: urlData } = window._supabase.storage.from('avatars').getPublicUrl(nomFichier);
            finalAvatarUrl = urlData.publicUrl;

        } catch (err) {
            afficherFeedback(feedback, "Échec de l'absorption du Portrait : " + err.message, "text-error");
            btn.disabled = false;
            btn.innerText = "Sceller l'Identité";
            return;
        }
    }

    // B. Étape de mise à jour Profil dans la base de données
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
        
        await window._supabase.auth.updateUser({
            data: metaDataPayload
        });

        // Update purement visuel de l'en-tête (Pas de LocalStorage, pas de Auth.js)
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
        
        // Appliquer visuellement la forge et stocker en LocalStorage (Sans interroger de Base de données sur les autres pages)
        if (colonneSQL === 'mode_auteur') {
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

// Fonction outil (Message visuel)
function afficherFeedback(element, message, className = "", clearAfter = false) {
    if (!element) return;
    element.className = 'text-small mt-10 ' + className;
    element.innerText = message;
    
    if (clearAfter) {
        setTimeout(() => element.innerText = "", 3000);
    }
}

// Sauvegarde Mince (Evite l'upsert destructeur)
async function safePartialUpdate(userId, partialPayload) {
    // 1. Vérifier si la ligne existe
    const { data: existing } = await window._supabase
        .from('noms_de_plume')
        .select('user_id')
        .eq('user_id', userId)
        .single();
    
    if (existing) {
        // UPDATE (ne supprime pas les autres colonnes)
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
        // INSERT (crée la ligne vierge + les data fournies)
        // Les boolean mode_auteur et afficher_commentaires gèrent leurs DEFAULT cote DB
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

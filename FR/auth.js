// ==========================================
// LE GARDIEN (auth.js)
// Gestion de la connexion et de l'identité
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    
    const authModal = document.getElementById('auth-modal');
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const submitAuth = document.getElementById('submit-auth');
    const btnLogin = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    const closeModal = document.getElementById('close-modal');
    const btnLogout = document.getElementById('btn-logout');

    let isSignUp = false;

    // 1. Ouvrir la boîte pour connexion
    if(btnLogin) {
        btnLogin.addEventListener('click', () => {
            isSignUp = false;
            authModal.classList.remove('hidden');
            submitAuth.innerText = "Se connecter";
        });
    }

    // 2. Ouvrir la boîte pour inscription
    if(btnSignup) {
        btnSignup.addEventListener('click', () => {
            isSignUp = true;
            authModal.classList.remove('hidden');
            submitAuth.innerText = "Créer mon compte";
        });
    }

    // 3. Fermer la boîte manuellement
    if(closeModal) {
        closeModal.addEventListener('click', () => {
            authModal.classList.add('hidden');
        });
    }

    // 4. Action de validation blindée
    if(submitAuth) {
        submitAuth.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email || !password) {
                alert("Les ténèbres exigent un mail et un mot de passe.");
                return;
            }

            // On bloque le bouton
            submitAuth.innerText = "Incantation...";
            submitAuth.disabled = true;

            try {
                if (isSignUp) {
                    const { data, error } = await window._supabase.auth.signUp({ email, password });
                    if (error) throw error; // S'il y a une erreur, on saute directement au "catch"
                    
                    alert("Compte créé ! Bienvenue dans le Sanctuaire.");
                    authModal.classList.add('hidden'); // Succès, on ferme la boîte
                    emailInput.value = '';
                } else {
                    const { data, error } = await window._supabase.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                    
                    // Succès, on ferme la boîte
                    authModal.classList.add('hidden');
                    emailInput.value = '';
                }
            } catch (erreur) {
                // Si ça plante (mauvais mot de passe, etc.), on affiche l'erreur MAIS on ne ferme pas la boîte
                alert("Refus du Sanctuaire : " + erreur.message);
            } finally {
                // FINALLY : Ce bloc s'exécute TOUJOURS, qu'il y ait eu une erreur ou non !
                // C'est la garantie absolue que ton bouton ne restera jamais bloqué.
                submitAuth.innerText = isSignUp ? "Créer mon compte" : "Se connecter";
                submitAuth.disabled = false;
                passwordInput.value = ''; // On vide toujours le mot de passe par sécurité
            }
        });
    }

    // 5. Déconnexion
    if(btnLogout) {
        btnLogout.addEventListener('click', async () => {
            try {
                await window._supabase.auth.signOut();
                alert("Vous avez quitté le sanctuaire.");
                window.changerDePage('accueil'); // Retour au Hall de force
            } catch (err) {
                console.error("Erreur de déconnexion", err);
            }
        });
    }
});

// ==========================================
// SURVEILLANCE DE L'ÉTAT (Le Radar)
// ==========================================
window._supabase.auth.onAuthStateChange(async (event, session) => {
    try {
        const authContainer = document.getElementById('auth-container');
        const userContainer = document.getElementById('user-container');
        const userNameDisplay = document.getElementById('user-name');
        const headerAvatar = document.getElementById('header-avatar');
        const btnForge = document.getElementById('btn-atelier-nav');
        
        if (session) {
            // Le Seigneur est connecté
            if(authContainer) authContainer.classList.add('hidden');
            if(userContainer) userContainer.classList.remove('hidden');
            
            // 1. Récupérer les vraies données depuis Supabase
            const { data: profil } = await window._supabase
                .from('noms_de_plume')
                .select('*')
                .eq('user_id', session.user.id)
                .maybeSingle();

            let finalPseudo = session.user.email.split('@')[0];
            let finalAvatar = 'default-avatar.png';
            let isAuteur = false;

            if (profil) {
                // Ignore les valeurs NULL corrompues de Supabase
                if (profil.pseudo && profil.pseudo !== "null") finalPseudo = profil.pseudo;
                if (profil.avatar_url && profil.avatar_url !== "null") finalAvatar = profil.avatar_url;
                isAuteur = profil.mode_auteur === true;
                
                // Mettre à jour le localStorage (Synchronisation)
                localStorage.setItem('userPseudo', finalPseudo);
                localStorage.setItem('userAvatar', finalAvatar);
                localStorage.setItem('modeAuteur', isAuteur);
            } else {
                // S'il y a un lag DB ou un profil vierge, on check le LocalStorage proprement
                let storedPseudo = localStorage.getItem('userPseudo');
                if (storedPseudo && storedPseudo !== "undefined" && storedPseudo !== "null") finalPseudo = storedPseudo;
                
                let storedAvatar = localStorage.getItem('userAvatar');
                if (storedAvatar && storedAvatar !== "undefined" && storedAvatar !== "null") finalAvatar = storedAvatar;
                
                isAuteur = localStorage.getItem('modeAuteur') === 'true';
            }

            // Gestion du Pseudo
            if(userNameDisplay) userNameDisplay.innerText = "Comte " + finalPseudo;
            
            // Gestion de l'Avatar
            if (headerAvatar) headerAvatar.src = finalAvatar;
            const previewAvatar = document.getElementById('profile-avatar-preview');
            if (previewAvatar) previewAvatar.src = finalAvatar;

            // Gestion du Menu Auteur (La Forge)
            if (btnForge) {
                btnForge.style.display = isAuteur ? "block" : "none";
            }

            // Identification de l'Admin
            if (session.user.email === "nitroapex@gmail.com") {
                window.estAdmin = true;
            } else {
                window.estAdmin = false;
            }
            
            if(typeof window.activerBouclier === 'function') window.activerBouclier();

        } else {
            // Le Seigneur est un simple visiteur
            if(authContainer) authContainer.classList.remove('hidden');
            if(userContainer) userContainer.classList.add('hidden');
            
            // On cache la forge pour un simple citoyen
            if (btnForge) btnForge.style.display = "none";
            
            window.estAdmin = false;
            if(typeof window.activerBouclier === 'function') window.activerBouclier();
        }
    } catch (e) {
        console.error("Le radar a trébuché :", e);
    }
});
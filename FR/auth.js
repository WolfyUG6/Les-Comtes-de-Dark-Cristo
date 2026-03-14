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
window._supabase.auth.onAuthStateChange((event, session) => {
    try {
        const authContainer = document.getElementById('auth-container');
        const userContainer = document.getElementById('user-container');
        const userNameDisplay = document.getElementById('user-name');
        const headerAvatar = document.getElementById('header-avatar');
        
        if (session) {
            // Le Seigneur est connecté
            if(authContainer) authContainer.classList.add('hidden');
            if(userContainer) userContainer.classList.remove('hidden');
            
            // Gestion du Pseudo
            const nomAAfficher = session.user.user_metadata?.pseudo || session.user.email.split('@')[0];
            if(userNameDisplay) userNameDisplay.innerText = "Comte " + nomAAfficher;
            
            // Gestion de l'Avatar
            const avatarUrl = session.user.user_metadata?.avatar_url || 'default-avatar.png';
            if (headerAvatar) headerAvatar.src = avatarUrl;
            
            const previewAvatar = document.getElementById('profile-avatar-preview');
            if (previewAvatar) previewAvatar.src = avatarUrl;

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
            
            window.estAdmin = false;
            if(typeof window.activerBouclier === 'function') window.activerBouclier();
        }
    } catch (e) {
        console.error("Le radar a trébuché :", e);
    }
});
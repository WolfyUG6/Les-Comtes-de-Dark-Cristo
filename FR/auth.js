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

    // 3. Fermer la boîte
    if(closeModal) {
        closeModal.addEventListener('click', () => {
            authModal.classList.add('hidden');
        });
    }

    // 4. Action de validation (Supabase)
    if(submitAuth) {
        submitAuth.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email || !password) {
                alert("Les ténèbres exigent un mail et un mot de passe.");
                return;
            }

            // On bloque le bouton le temps que Supabase réponde
            submitAuth.innerText = "Incantation...";
            submitAuth.disabled = true;

            if (isSignUp) {
                const { error } = await window._supabase.auth.signUp({ email, password });
                if (error) alert("Erreur : " + error.message);
                else alert("Compte créé ! Bienvenue dans le Sanctuaire.");
            } else {
                const { error } = await window._supabase.auth.signInWithPassword({ email, password });
                if (error) alert("Erreur : " + error.message);
            }
            
            // On nettoie et on ferme
            authModal.classList.add('hidden');
            submitAuth.disabled = false;
            emailInput.value = '';
            passwordInput.value = '';
        });
    }

    // 5. Déconnexion
    if(btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await window._supabase.auth.signOut();
            alert("Vous avez quitté le sanctuaire.");
            window.changerDePage('accueil'); // Retour au Hall de force
        });
    }

    // 6. Navigation du Menu Profil (Connexion au Routeur)
    document.getElementById('btn-quartiers-nav')?.addEventListener('click', () => window.changerDePage('quartiers'));
    document.getElementById('btn-lectures-nav')?.addEventListener('click', () => window.changerDePage('lectures'));
    document.getElementById('btn-atelier-nav')?.addEventListener('click', () => window.changerDePage('studio'));
});

// ==========================================
// SURVEILLANCE DE L'ÉTAT (Le Radar)
// ==========================================
window._supabase.auth.onAuthStateChange((event, session) => {
    const authContainer = document.getElementById('auth-container');
    const userContainer = document.getElementById('user-container');
    const userNameDisplay = document.getElementById('user-name');
    const headerAvatar = document.getElementById('header-avatar');
    
    if (session) {
        // Le Seigneur est connecté
        if(authContainer) authContainer.classList.add('hidden');
        if(userContainer) userContainer.classList.remove('hidden');
        
        // Pseudo
        const nomAAfficher = session.user.user_metadata?.pseudo || session.user.email.split('@')[0];
        if(userNameDisplay) userNameDisplay.innerText = "Comte " + nomAAfficher;
        
        // Avatar
        const avatarUrl = session.user.user_metadata?.avatar_url || 'default-avatar.png';
        if (headerAvatar) headerAvatar.src = avatarUrl;
        
        // (Optionnel) Si la page des Quartiers est affichée au même moment, on met à jour la preview
        const previewAvatar = document.getElementById('profile-avatar-preview');
        if (previewAvatar) previewAvatar.src = avatarUrl;

        // Identification du Maître (L'Admin)
        if (session.user.email === "nitroapex@gmail.com") {
            window.estAdmin = true;
        } else {
            window.estAdmin = false;
        }
        
        // On active le bouclier (Anti-copie) qui est dans config.js
        if(typeof window.activerBouclier === 'function') window.activerBouclier();

    } else {
        // Le Seigneur est un simple visiteur
        if(authContainer) authContainer.classList.remove('hidden');
        if(userContainer) userContainer.classList.add('hidden');
        
        window.estAdmin = false;
        if(typeof window.activerBouclier === 'function') window.activerBouclier();
    }
});
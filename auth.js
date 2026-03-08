// --- LE GARDIEN (auth.js) ---

// On attend que toute la page soit chargée pour activer les boutons
document.addEventListener('DOMContentLoaded', () => {
    
    const authModal = document.getElementById('auth-modal');
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const submitAuth = document.getElementById('submit-auth');
    const userNameDisplay = document.getElementById('user-name');
    const btnLogin = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    const closeModal = document.getElementById('close-modal');
    const btnLogout = document.getElementById('btn-logout');

    let isSignUp = false;

    // 1. Ouvrir pour connexion
    if(btnLogin) {
        btnLogin.addEventListener('click', () => {
            isSignUp = false;
            authModal.style.display = 'block';
            submitAuth.innerText = "Se connecter";
        });
    }

    // 2. Ouvrir pour inscription
    if(btnSignup) {
        btnSignup.addEventListener('click', () => {
            isSignUp = true;
            authModal.style.display = 'block';
            submitAuth.innerText = "Créer mon compte";
        });
    }

    // 3. Fermer la boîte
    if(closeModal) {
        closeModal.addEventListener('click', () => {
            authModal.style.display = 'none';
        });
    }

    // 4. Action de validation (Connexion / Inscription)
    if(submitAuth) {
        submitAuth.addEventListener('click', async () => {
            const email = emailInput.value;
            const password = passwordInput.value;

            if (!email || !password) {
                alert("Les ténèbres exigent un mail et un mot de passe.");
                return;
            }

            if (isSignUp) {
                const { error } = await window._supabase.auth.signUp({ email, password });
                if (error) alert("Erreur : " + error.message);
                else alert("Compte créé ! Bienvenue.");
            } else {
                const { error } = await window._supabase.auth.signInWithPassword({ email, password });
                if (error) alert("Erreur : " + error.message);
            }
            authModal.style.display = 'none';
        });
    }

    // 5. Déconnexion
    if(btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await window._supabase.auth.signOut();
            alert("Vous avez quitté le sanctuaire.");
        });
    }
});

// 6. Surveillance de l'état (Toujours actif, même hors du chargement)
window._supabase.auth.onAuthStateChange((event, session) => {
    const authContainer = document.getElementById('auth-container');
    const userContainer = document.getElementById('user-container');
    const userNameDisplay = document.getElementById('user-name');
    
    if (session) {
        if(authContainer) authContainer.style.display = 'none';
        if(userContainer) userContainer.style.display = 'flex';
        if(userNameDisplay) userNameDisplay.innerText = "Comte " + session.user.email.split('@')[0];
        
        // --- NOUVEAU : Chargement de l'avatar ---
        const avatarUrl = session.user.user_metadata?.avatar_url || 'default-avatar.png';
        const headerAvatar = document.getElementById('header-avatar');
        const previewAvatar = document.getElementById('profile-avatar-preview');
        
        if (headerAvatar) headerAvatar.src = avatarUrl;
        if (previewAvatar) previewAvatar.src = avatarUrl;

    } else {
        if(authContainer) authContainer.style.display = 'flex';
        if(userContainer) userContainer.style.display = 'none';
    }
});
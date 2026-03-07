// --- GESTION DES COMPTES (Le Gardien) ---
const authModal = document.getElementById('auth-modal');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');
const submitAuth = document.getElementById('submit-auth');
const userNameDisplay = document.getElementById('user-name');

let isSignUp = false;

// Ouvrir pour connexion
document.getElementById('btn-login').addEventListener('click', () => {
    isSignUp = false;
    authModal.style.display = 'block';
    submitAuth.innerText = "Se connecter";
});

// Ouvrir pour inscription
document.getElementById('btn-signup').addEventListener('click', () => {
    isSignUp = true;
    authModal.style.display = 'block';
    submitAuth.innerText = "Créer mon compte";
});

// Fermer la boîte
document.getElementById('close-modal').addEventListener('click', () => {
    authModal.style.display = 'none';
});

// Action de validation
submitAuth.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    if (isSignUp) {
        const { error } = await _supabase.auth.signUp({ email, password });
        if (error) alert("Erreur : " + error.message);
        else alert("Compte créé !");
    } else {
        const { error } = await _supabase.auth.signInWithPassword({ email, password });
        if (error) alert("Erreur : " + error.message);
    }
    authModal.style.display = 'none';
});

// Surveillance de l'état (Connecté ou non)
_supabase.auth.onAuthStateChange((event, session) => {
    const authContainer = document.getElementById('auth-container');
    const userContainer = document.getElementById('user-container');
    
    if (session) {
        authContainer.style.display = 'none';
        userContainer.style.display = 'flex';
        userNameDisplay.innerText = "Comte " + session.user.email.split('@')[0];
    } else {
        authContainer.style.display = 'flex';
        userContainer.style.display = 'none';
    }
});

// Déconnexion
document.getElementById('btn-logout').addEventListener('click', async () => {
    await _supabase.auth.signOut();
    alert("Vous avez quitté le sanctuaire.");
});
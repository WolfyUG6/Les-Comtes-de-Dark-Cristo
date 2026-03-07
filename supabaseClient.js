// Connexion à Supabase
const supabaseUrl = 'https://kbpefbjyuuzadssdbahl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGVmYmp5dXV6YWRzc2RiYWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzAzOTcsImV4cCI6MjA4ODQ0NjM5N30.XKqPt0rJO7pAL1M7PapMLf4f7uw2PQQAUhMOG-PexzI';

const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

console.log("Le sanctuaire de Dark & Cristo est connecté.");

// --- LOGIQUE DE CONNEXION ET D'INSCRIPTION ---

// 1. On cible les éléments de la page (les boutons et la boîte)
const btnLogin = document.getElementById('btn-login');
const btnSignup = document.getElementById('btn-signup');
const authModal = document.getElementById('auth-modal');
const closeModal = document.getElementById('close-modal');
const submitAuth = document.getElementById('submit-auth');
const emailInput = document.getElementById('email-input');
const passwordInput = document.getElementById('password-input');

let isSignUp = false; // Ce petit drapeau nous dira si l'utilisateur veut s'inscrire ou se connecter

// 2. Ouvrir la boîte pour "Se connecter"
btnLogin.addEventListener('click', () => {
    isSignUp = false;
    authModal.style.display = 'block';
    submitAuth.innerText = "Se connecter"; // Change le texte du bouton de validation
});

// 3. Ouvrir la boîte pour "Créer un compte"
btnSignup.addEventListener('click', () => {
    isSignUp = true;
    authModal.style.display = 'block';
    submitAuth.innerText = "Créer mon compte";
});

// 4. Fermer la boîte quand on clique sur "Fermer"
closeModal.addEventListener('click', () => {
    authModal.style.display = 'none';
    emailInput.value = ''; // On vide les champs
    passwordInput.value = '';
});

// 5. L'action principale : Quand on clique sur le bouton de validation de la boîte
submitAuth.addEventListener('click', async () => {
    const email = emailInput.value;
    const password = passwordInput.value;

    // Petite vérification de sécurité
    if (!email || !password) {
        alert("Il faut remplir les deux champs pour entrer dans le sanctuaire.");
        return;
    }

    if (isSignUp) {
        // --- MODE CRÉATION DE COMPTE ---
        const { data, error } = await _supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            alert("Erreur lors de la création : " + error.message);
        } else {
            alert("Compte créé avec succès ! Bienvenue parmi les Comtes.");
            authModal.style.display = 'none'; // On cache la boîte
        }
    } else {
        // --- MODE CONNEXION ---
        const { data, error } = await _supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            alert("Erreur de connexion : " + error.message);
        } else {
            alert("Connexion réussie ! Le sanctuaire s'ouvre à vous.");
            authModal.style.display = 'none';
        }
    }
});
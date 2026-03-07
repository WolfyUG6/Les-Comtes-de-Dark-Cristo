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

// --- GESTION DE L'AFFICHAGE SELON LA CONNEXION ---
const authContainer = document.getElementById('auth-container');
const userContainer = document.getElementById('user-container');
const userNameDisplay = document.getElementById('user-name');
const btnLogout = document.getElementById('btn-logout');

// Supabase écoute en permanence si quelqu'un est connecté
_supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
        // Un utilisateur est connecté !
        authContainer.style.display = 'none'; // On cache les boutons de connexion
        userContainer.style.display = 'flex'; // On affiche le menu du profil
        
        // On affiche temporairement le début de son mail (avant qu'il ait choisi un vrai pseudo)
        userNameDisplay.innerText = "Comte " + session.user.email.split('@')[0]; 
    } else {
        // Personne n'est connecté
        authContainer.style.display = 'flex'; // On remet les boutons normaux
        userContainer.style.display = 'none'; // On cache le menu
    }
});

// Action du bouton pour se déconnecter
btnLogout.addEventListener('click', async () => {
    const { error } = await _supabase.auth.signOut();
    if (!error) {
        alert("Vous avez quitté le sanctuaire.");
    }
});

// --- PUBLICATION D'UNE HISTOIRE ---
const btnPublish = document.getElementById('btn-publish');
const publishModal = document.getElementById('publish-modal');
const closePublishModal = document.getElementById('close-publish-modal');
const submitStory = document.getElementById('submit-story');

// 1. Ouvrir et fermer la boîte de publication
btnPublish.addEventListener('click', () => {
    publishModal.style.display = 'block';
});

closePublishModal.addEventListener('click', () => {
    publishModal.style.display = 'none';
});

// 2. Envoyer l'histoire et l'image dans la base de données
submitStory.addEventListener('click', async () => {
    const title = document.getElementById('story-title').value;
    const synopsis = document.getElementById('story-synopsis').value;
    const genre = document.getElementById('story-genre').value;
    const coverInput = document.getElementById('story-cover-file');
    const file = coverInput.files[0]; // On attrape le fichier sélectionné

    // Vérification de connexion
    const { data: { session } } = await _supabase.auth.getSession();
    if (!session) {
        alert("Vous devez être connecté pour publier.");
        return;
    }

    // Vérification des champs obligatoires
    if (!title || !synopsis || !genre) {
        alert("Le titre, le synopsis et le genre sont obligatoires pour sceller une œuvre.");
        return;
    }

    // On change le texte du bouton pendant que l'ordinateur travaille
    submitStory.innerText = "Forgeage en cours...";
    submitStory.disabled = true;

    let imageUrl = null;

    // ETAPE A : Si le joueur a mis une image, on l'envoie dans le Storage
    if (file) {
        // On crée un nom unique pour l'image (pour éviter que deux auteurs écrasent "couverture.jpg")
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

        const { data: uploadData, error: uploadError } = await _supabase.storage
            .from('couvertures')
            .upload(fileName, file);

        if (uploadError) {
            alert("Erreur lors de l'envoi de l'image : " + uploadError.message);
            submitStory.innerText = "Publier";
            submitStory.disabled = false;
            return;
        }

        // On récupère le lien public officiel de l'image stockée
        const { data: urlData } = _supabase.storage
            .from('couvertures')
            .getPublicUrl(fileName);
        
        imageUrl = urlData.publicUrl;
    }

    // ETAPE B : On envoie l'histoire (avec le lien de l'image) dans la table 'histoires'
    const { data, error } = await _supabase
        .from('histoires')
        .insert([
            { 
                titre: title, 
                synopsis: synopsis, 
                genre: genre, 
                auteur: session.user.email,
                image_couverture: imageUrl 
            }
        ]);

    if (error) {
        alert("Erreur lors de la publication : " + error.message);
    } else {
        alert("Votre œuvre a été gravée dans le sanctuaire avec succès !");
        publishModal.style.display = 'none'; // On ferme la boîte
        
        // On vide tous les champs
        document.getElementById('story-title').value = '';
        document.getElementById('story-synopsis').value = '';
        document.getElementById('story-genre').value = '';
        coverInput.value = '';
    }
    
    // On remet le bouton à son état normal
    submitStory.innerText = "Publier";
    submitStory.disabled = false;
});
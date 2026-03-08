// --- VOS QUARTIERS (Gestion du Profil) ---

const btnSaveAvatar = document.getElementById('btn-save-avatar');
const avatarInput = document.getElementById('avatar-input');

// 1. Sauvegarder la nouvelle image
btnSaveAvatar.addEventListener('click', async () => {
    const file = avatarInput.files[0];

    if (!file) {
        alert("Veuillez d'abord choisir un parchemin (image).");
        return;
    }

    btnSaveAvatar.innerText = "Gravure en cours...";

    // On récupère l'utilisateur connecté
    const { data: { session } } = await window._supabase.auth.getSession();
    const userId = session.user.id;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `avatar-${userId}-${Date.now()}.${fileExt}`;

    // On envoie à Supabase. Si c'est plus d'1 Mo, Supabase bloquera direct !
    const { error: uploadError } = await window._supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

    if (uploadError) {
        // C'est ici que l'erreur de taille ou de format de Supabase va s'afficher
        alert("Refus du Sanctuaire : " + uploadError.message);
        btnSaveAvatar.innerText = "Graver ce portrait";
        return;
    }

    // Récupération du lien de l'image
    const { data: urlData } = window._supabase.storage.from('avatars').getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    // Mise à jour du profil
    const { error: updateError } = await window._supabase.auth.updateUser({
        data: { avatar_url: publicUrl }
    });

    if (updateError) {
        alert("Erreur lors de la mise à jour du profil : " + updateError.message);
    } else {
        alert("Portrait mis à jour avec succès !");
        document.getElementById('header-avatar').src = publicUrl;
        document.getElementById('profile-avatar-preview').src = publicUrl;
    }
    
    btnSaveAvatar.innerText = "Graver ce portrait";
});

// 2. Navigation : Ouvrir les Quartiers
document.getElementById('btn-quartiers').addEventListener('click', () => {
    document.getElementById('stories-container').style.display = 'none';
    document.getElementById('oeuvre-page').style.display = 'none';
    document.getElementById('main-genre-menu').style.display = 'none';
    document.getElementById('studio-page').style.display = 'none'; 
    
    document.getElementById('hero-logo-area').style.display = 'none';
    document.getElementById('mini-logo').style.display = 'flex';
    
    document.getElementById('quartiers-page').style.display = 'block';
});

// 3. Navigation : Quitter les Quartiers
document.getElementById('btn-retour-quartiers').addEventListener('click', () => {
    document.getElementById('quartiers-page').style.display = 'none';
    document.getElementById('mini-logo').style.display = 'none';
    document.getElementById('hero-logo-area').style.display = 'block';
    document.getElementById('main-genre-menu').style.display = 'block';
    document.getElementById('stories-container').style.display = 'flex';
    
    // NOUVEAU : On ordonne à l'Archiviste de relire les étagères pour mettre à jour les pseudos !
    loadStories();
});

// --- Changement du Pseudo ---
const btnSavePseudo = document.getElementById('btn-save-pseudo');
const pseudoInput = document.getElementById('pseudo-input');

btnSavePseudo.addEventListener('click', async () => {
    const nouveauPseudo = pseudoInput.value.trim();
    
    if (!nouveauPseudo) {
        alert("Veuillez inscrire un nom valide sur le parchemin.");
        return;
    }

    btnSavePseudo.innerText = "Gravure en cours...";

    // 1. On met à jour le profil
    const { error } = await window._supabase.auth.updateUser({
        data: { pseudo: nouveauPseudo }
    });

    if (error) {
        alert("Refus du Sanctuaire : " + error.message);
    } else {
        // 2. LA MAGIE : On retrouve qui est connecté, et on met à jour tous ses livres !
        const { data: { session } } = await window._supabase.auth.getSession();
        await window._supabase.from('histoires').update({ pseudo_auteur: nouveauPseudo }).eq('auteur', session.user.email);

        alert("Votre nouveau titre est reconnu et vos anciennes œuvres ont été signées à nouveau !");
        document.getElementById('user-name').innerText = "Comte " + nouveauPseudo;
        pseudoInput.value = ''; 
    }
    
    btnSavePseudo.innerText = "Graver ce nom";
});

// --- GESTION DES ONGLETS DANS LES QUARTIERS ---
const btnOngletUtilisateur = document.getElementById('btn-onglet-utilisateur');
const btnOngletLectures = document.getElementById('btn-onglet-lectures');
const ongletUtilisateur = document.getElementById('onglet-utilisateur');
const ongletLectures = document.getElementById('onglet-lectures');

// Clic sur l'onglet "Utilisateur"
btnOngletUtilisateur.addEventListener('click', () => {
    ongletUtilisateur.style.display = 'block';
    ongletLectures.style.display = 'none';
    
    // On allume le bouton Utilisateur en bleu, on éteint l'autre
    btnOngletUtilisateur.style.borderColor = '#00aaff';
    btnOngletUtilisateur.style.color = '#00aaff';
    btnOngletLectures.style.borderColor = '#c4a484';
    btnOngletLectures.style.color = '#c4a484';
});

// Clic sur l'onglet "Mes Lectures"
btnOngletLectures.addEventListener('click', () => {
    ongletUtilisateur.style.display = 'none';
    ongletLectures.style.display = 'block';
    
    // On allume le bouton Mes Lectures en bleu, on éteint l'autre
    btnOngletLectures.style.borderColor = '#00aaff';
    btnOngletLectures.style.color = '#00aaff';
    btnOngletUtilisateur.style.borderColor = '#c4a484';
    btnOngletUtilisateur.style.color = '#c4a484';
});
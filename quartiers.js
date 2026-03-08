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

// --- Changement du Pseudo avec Vérification ---
const btnSavePseudo = document.getElementById('btn-save-pseudo');
const pseudoInput = document.getElementById('pseudo-input');

btnSavePseudo.addEventListener('click', async () => {
    const nouveauPseudo = pseudoInput.value.trim();
    
    if (!nouveauPseudo) {
        alert("Veuillez inscrire un nom valide sur le parchemin.");
        return;
    }

    btnSavePseudo.innerText = "Vérification des archives...";

    // On récupère le Seigneur connecté
    const { data: { session } } = await window._supabase.auth.getSession();
    const userId = session.user.id;

    // 1. L'INQUISITEUR : On vérifie si ce nom existe déjà dans le Registre
    const { data: pseudoPris, error: checkError } = await window._supabase
        .from('noms_de_plume')
        .select('user_id')
        .eq('pseudo', nouveauPseudo)
        .maybeSingle();

    // Si le nom est trouvé ET qu'il n'appartient pas à la personne connectée...
    if (pseudoPris && pseudoPris.user_id !== userId) {
        alert("Les ombres murmurent... Ce Titre de Noblesse est déjà revendiqué par un autre Seigneur !");
        btnSavePseudo.innerText = "Graver ce nom";
        return; // On bloque tout !
    }

    // 2. LE SCEAU : Le nom est libre (ou c'est déjà le nôtre). On le réserve officiellement !
    // On utilise "upsert" pour insérer ou mettre à jour la ligne de l'utilisateur
    const { error: regError } = await window._supabase
        .from('noms_de_plume')
        .upsert({ user_id: userId, pseudo: nouveauPseudo });

    if (regError) {
        alert("Le Registre a rejeté votre demande : " + regError.message);
        btnSavePseudo.innerText = "Graver ce nom";
        return;
    }

    // 3. LA GRAVURE : Maintenant qu'on a l'autorisation, on fait les mises à jour habituelles
    btnSavePseudo.innerText = "Gravure en cours...";

    // Mise à jour du profil caché
    await window._supabase.auth.updateUser({
        data: { pseudo: nouveauPseudo }
    });

    // Mise à jour de toutes ses anciennes œuvres
    await window._supabase.from('histoires').update({ pseudo_auteur: nouveauPseudo }).eq('auteur', session.user.email);

    alert("Votre nouveau titre est reconnu par le Sanctuaire !");
    document.getElementById('user-name').innerText = "Comte " + nouveauPseudo;
    pseudoInput.value = ''; 
    
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
	
	// L'Archiviste part chercher les livres !
    chargerMesLectures();
});

// --- L'ARCHIVISTE PERSONNEL : Charger les œuvres soutenues ---
async function chargerMesLectures() {
    const conteneur = document.getElementById('liste-mes-lectures');
    conteneur.innerHTML = '<p style="color: #c4a484; font-style: italic;">Exploration de vos archives personnelles...</p>';

    const { data: { session } } = await window._supabase.auth.getSession();
    if (!session) return;

    // 1. On regarde dans l'étagère "favoris" ce que l'utilisateur aime
    const { data: mesFavoris, error: favError } = await window._supabase
        .from('favoris')
        .select('histoire_id')
        .eq('user_id', session.user.id);

    if (favError) {
        conteneur.innerHTML = '<p style="color: red;">Erreur : ' + favError.message + '</p>';
        return;
    }

    if (mesFavoris.length === 0) {
        conteneur.innerHTML = '<p style="color: #777; font-style: italic;">Votre table de chevet est vide.</p>';
        return;
    }

    // 2. On récupère les identifiants de ces histoires
    const idsHistoires = mesFavoris.map(fav => fav.histoire_id);

    // 3. On va chercher les vraies histoires qui correspondent à ces ID
    const { data: histoires, error: histError } = await window._supabase
        .from('histoires')
        .select('*')
        .in('id', idsHistoires);

    if (histError) {
        conteneur.innerHTML = '<p style="color: red;">Erreur : ' + histError.message + '</p>';
        return;
    }

    // 4. On dessine les cartes pour chaque histoire trouvée
    conteneur.innerHTML = '';
    histoires.forEach(histoire => {
        const carte = document.createElement('div');
        carte.style.cssText = "background: #0a0a0a; border: 1px solid #00aaff; padding: 15px; display: flex; justify-content: space-between; align-items: center;";

        carte.innerHTML = `
            <div>
                <h3 style="color: #00aaff; font-family: 'Cinzel', serif; margin: 0 0 5px 0;">${histoire.titre}</h3>
                <span style="font-size: 0.8rem; background-color: #5d1a1a; color: white; padding: 2px 6px; text-transform: uppercase;">${histoire.genre}</span>
            </div>
            <div>
                <button class="genre-btn" style="border-color: #c4a484; color: #c4a484;" onclick="ouvrirOeuvre(${histoire.id})">Reprendre la lecture</button>
            </div>
        `;
        conteneur.appendChild(carte);
    });
}
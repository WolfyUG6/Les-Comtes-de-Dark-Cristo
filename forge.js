// --- L'ATELIER (Publication et Gestion Auteur) ---
const btnPublish = document.getElementById('btn-publish');
const publishModal = document.getElementById('publish-modal');
const submitStory = document.getElementById('submit-story');

btnPublish.addEventListener('click', () => publishModal.style.display = 'block');
document.getElementById('close-publish-modal').addEventListener('click', () => publishModal.style.display = 'none');

submitStory.addEventListener('click', async () => {
    const title = document.getElementById('story-title').value;
    const synopsis = document.getElementById('story-synopsis').value;
    const genre = document.getElementById('story-genre').value;
    const file = document.getElementById('story-cover-file').files[0];

    const { data: { session } } = await _supabase.auth.getSession();
    if (!session || !title || !synopsis || !genre) {
        alert("Champs manquants ou non connecté.");
        return;
    }

    submitStory.innerText = "Forgeage...";
    let imageUrl = null;

    if (file) {
        const fileName = `${Date.now()}-${file.name}`;
        const { error: upErr } = await _supabase.storage.from('couvertures').upload(fileName, file);
        if (!upErr) {
            const { data } = _supabase.storage.from('couvertures').getPublicUrl(fileName);
            imageUrl = data.publicUrl;
        }
    }

    const { error } = await _supabase.from('histoires').insert([{ titre: title, synopsis, genre, auteur: session.user.email, image_couverture: imageUrl }]);
    if (error) alert(error.message);
    else {
        alert("Œuvre gravée !");
        location.reload(); // On rafraîchit pour voir l'œuvre
    }
});

// Le Studio (Mon Profil)
document.getElementById('btn-profile').addEventListener('click', async () => {
    document.getElementById('stories-container').style.display = 'none';
    document.getElementById('oeuvre-page').style.display = 'none';
    document.getElementById('studio-page').style.display = 'block';
    // ... (on pourra rajouter la suite de la logique du studio ici)
});

// --- AJOUT DE CHAPITRE DANS L'ATELIER ---
const submitChapitre = document.getElementById('submit-chapitre');

document.getElementById('close-chapitre-modal').addEventListener('click', () => {
    document.getElementById('chapitre-modal').style.display = 'none';
});

submitChapitre.addEventListener('click', async () => {
    const numero = document.getElementById('chapitre-numero').value;
    const titre = document.getElementById('chapitre-titre').value;
    const contenu = document.getElementById('chapitre-contenu').value;

    if (!numero || !titre || !contenu) {
        alert("Champs requis manquants.");
        return;
    }

    submitChapitre.innerText = "Gravure...";
    
    const { error } = await _supabase
        .from('chapitres')
        .insert([{ 
            histoire_id: window.currentOeuvreId, 
            numero: parseInt(numero), 
            titre, 
            contenu 
        }]);

    if (error) alert(error.message);
    else {
        alert("Chapitre ajouté !");
        document.getElementById('chapitre-modal').style.display = 'none';
        chargerChapitres(window.currentOeuvreId); // On recharge la liste
    }
    submitChapitre.innerText = "Publier le Chapitre";
});

// Quitter le Studio pour retourner aux archives
document.getElementById('btn-retour-studio').addEventListener('click', () => {
    document.getElementById('studio-page').style.display = 'none';
    document.getElementById('stories-container').style.display = 'flex';
});
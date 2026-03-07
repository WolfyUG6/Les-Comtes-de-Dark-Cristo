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
document.getElementById('btn-profile').addEventListener('click', () => {
    document.getElementById('stories-container').style.display = 'none';
    document.getElementById('oeuvre-page').style.display = 'none';
    document.getElementById('studio-page').style.display = 'block';
    
    // On invoque la magie pour charger les œuvres de l'auteur
    chargerMesOeuvres();
});

// --- LE SORTILÈGE POUR CHARGER VOS ŒUVRES ---
async function chargerMesOeuvres() {
    const conteneur = document.getElementById('mes-oeuvres-liste');
    conteneur.innerHTML = '<p style="color: #c4a484; font-style: italic;">Recherche de vos créations dans l\'Abysse...</p>';

    // 1. On vérifie qui est le Bâtisseur (l'utilisateur connecté)
    const { data: { session } } = await window._supabase.auth.getSession();
    if (!session) return;

    // 2. On fouille l'étagère (Supabase) pour trouver SES œuvres
    const { data: mesHistoires, error } = await window._supabase
        .from('histoires')
        .select('*')
        .eq('auteur', session.user.email);

    if (error) {
        conteneur.innerHTML = '<p style="color: red;">Erreur : ' + error.message + '</p>';
        return;
    }

    // 3. Si l'auteur n'a rien écrit
    if (mesHistoires.length === 0) {
        conteneur.innerHTML = '<p style="color: #777; font-style: italic;">Vous n\'avez encore forgé aucune œuvre.</p>';
        return;
    }

    // 4. On affiche chaque œuvre trouvée
    conteneur.innerHTML = '';
    mesHistoires.forEach(histoire => {
        const carte = document.createElement('div');
        carte.style.cssText = "background: #0a0a0a; border: 1px solid #5d1a1a; padding: 15px; display: flex; justify-content: space-between; align-items: center;";
        
        carte.innerHTML = `
            <div>
                <h3 style="color: #c4a484; font-family: 'Cinzel', serif; margin: 0 0 5px 0;">${histoire.titre}</h3>
                <span style="font-size: 0.8rem; background-color: #5d1a1a; color: white; padding: 2px 6px; text-transform: uppercase;">${histoire.genre}</span>
            </div>
            <div>
                <button class="genre-btn" style="border-color: #00aaff; color: #00aaff;" onclick="ouvrirGestionOeuvre(${histoire.id}, '${histoire.titre.replace(/'/g, "\\'")}')">Gérer</button>
            </div>
        `;
        conteneur.appendChild(carte);
    });
}

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

// --- GESTION DE L'ŒUVRE (Le Panneau d'Administration) ---

// 1. Ouvrir le panneau de gestion pour une œuvre spécifique
window.ouvrirGestionOeuvre = function(idHistoire, titreHistoire) {
    const container = document.getElementById('gestion-chapitres-container');
    container.style.display = 'block'; // On affiche la zone cachée
    
    // On met le titre et un bouton rouge pour supprimer TOUTE l'histoire
    document.getElementById('gestion-titre-oeuvre').innerHTML = `
        ${titreHistoire} 
        <button class="genre-btn" style="border-color: red; color: red; font-size: 0.7rem; margin-left: 20px;" onclick="supprimerOeuvre(${idHistoire})">🗑️ Supprimer l'œuvre</button>
    `;

    // On charge les chapitres
    chargerChapitresAdmin(idHistoire);
};

// 2. Charger et lister les chapitres dans l'Atelier
window.chargerChapitresAdmin = async function(idHistoire) {
    const liste = document.getElementById('liste-chapitres-admin');
    liste.innerHTML = '<p style="color: #c4a484; font-style: italic;">Lecture des parchemins...</p>';

    const { data: chapitres, error } = await window._supabase
        .from('chapitres')
        .select('*')
        .eq('histoire_id', idHistoire)
        .order('numero', { ascending: true });

    if (error) {
        liste.innerHTML = '<p style="color: red;">Erreur : ' + error.message + '</p>';
        return;
    }

    if (chapitres.length === 0) {
        liste.innerHTML = '<p style="color: #777; font-style: italic;">Aucun chapitre pour le moment.</p>';
        return;
    }

    liste.innerHTML = '';
    chapitres.forEach(chap => {
        const div = document.createElement('div');
        div.style.cssText = "background: #111; border: 1px solid #333; padding: 10px; display: flex; justify-content: space-between; align-items: center;";
        
        div.innerHTML = `
            <span style="color: #e0d7c6; font-family: 'Cinzel', serif;">Chapitre ${chap.numero} : ${chap.titre}</span>
            <div>
                <button class="genre-btn" style="font-size: 0.7rem; margin-right: 10px; border-color: #c4a484; color: #c4a484;" onclick="alert('La modification arrive bientôt !')">Modifier</button>
                <button class="genre-btn" style="font-size: 0.7rem; border-color: red; color: red;" onclick="supprimerChapitre(${chap.id}, ${idHistoire})">Supprimer</button>
            </div>
        `;
        liste.appendChild(div);
    });
};

// 3. Le pouvoir de Destruction : Supprimer une œuvre
window.supprimerOeuvre = async function(idHistoire) {
    if(confirm("Êtes-vous sûr de vouloir jeter cette œuvre dans les abysses ? Cette action est irréversible.")) {
        const { error } = await window._supabase.from('histoires').delete().eq('id', idHistoire);
        if(error) alert("Erreur : " + error.message);
        else {
            alert("L'œuvre a été consumée par les ténèbres.");
            document.getElementById('gestion-chapitres-container').style.display = 'none';
            chargerMesOeuvres(); // On rafraîchit la liste des œuvres
        }
    }
};

// 4. Le pouvoir de Destruction : Supprimer un chapitre
window.supprimerChapitre = async function(idChapitre, idHistoire) {
    if(confirm("Détruire ce parchemin à jamais ?")) {
        const { error } = await window._supabase.from('chapitres').delete().eq('id', idChapitre);
        if(error) alert("Erreur : " + error.message);
        else {
            chargerChapitresAdmin(idHistoire); // On rafraîchit la liste des chapitres
        }
    }
};

// 5. Fermer le panneau de gestion
document.getElementById('btn-fermer-gestion').addEventListener('click', () => {
    document.getElementById('gestion-chapitres-container').style.display = 'none';
});
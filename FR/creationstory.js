// ==========================================
// CRÉATION D'UNE OEUVRE (creationstory.js)
// Formulaire de publication
// ==========================================

window.chargerCreationStory = function() {
    console.log("Chargement de la page de création d'œuvre");
    
    // Nettoyage de l'ardoise (utile si on revient via le cache)
    document.getElementById('story-title').value = '';
    document.getElementById('story-synopsis').value = '';
    document.getElementById('story-genre').value = '';
    document.getElementById('story-age').value = '';
    document.getElementById('story-status').value = '✍️ En cours'; 
    document.getElementById('story-sensible').checked = false;
    document.getElementById('story-cover-file').value = '';

    const btnSubmit = document.getElementById('submit-story');
    if (btnSubmit) {
        btnSubmit.innerText = "Forger l'Histoire";
        btnSubmit.disabled = false;
    }
};

// --- GESTION DES CLICS (Délégation d'événements) ---
if (!window.creationStoryEventHooked) {
    document.addEventListener('click', async (e) => {
        // Redirection Bouton Retour
        if (e.target && e.target.id === 'btn-retour-creation') {
            window.changerDePage('studio');
            return;
        }

        // Soumission du Formulaire
        if (e.target && e.target.id === 'submit-story') {
            const btnSubmit = document.getElementById('submit-story');
            
            const title = document.getElementById('story-title').value;
            const synopsis = document.getElementById('story-synopsis').value;
            const genre = document.getElementById('story-genre').value;
            const classification = document.getElementById('story-age').value;
            const statut = document.getElementById('story-status').value;
            const file = document.getElementById('story-cover-file').files[0];
            const isSensible = document.getElementById('story-sensible').checked;

            const { data: { session } } = await window._supabase.auth.getSession();
            
            if (!session) {
                alert("Erreur critique : Tu as été déconnecté par le vide spatial. Reconnecte-toi.");
                return;
            }

            if (!title || !synopsis || !genre || !classification) {
                alert("Les fondations sont instables ! Remplissez tous les champs obligatoires (Titre, Synopsis, Genre, Classification).");
                return;
            }

            btnSubmit.innerText = "Forgeage en cours...";
            btnSubmit.disabled = true;

            let imageUrl = null;

            // 1. Dépôt de la couverture si fichier présent
            if (file) {
                btnSubmit.innerText = "Téléversement de l'image...";
                const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`; // Sécurité nom de fichier
                const { error: upErr } = await window._supabase.storage.from('couvertures').upload(fileName, file);
                
                if (!upErr) {
                    const { data } = window._supabase.storage.from('couvertures').getPublicUrl(fileName);
                    imageUrl = data.publicUrl;
                } else {
                    alert("L'image a été rejetée par le portail : " + upErr.message);
                    btnSubmit.innerText = "Forger l'Histoire";
                    btnSubmit.disabled = false;
                    return; // On arrête là si l'image plante
                }
            }

            btnSubmit.innerText = "Écriture dans le registre...";

            // 2. Gravure du Grimoire (Table "histoires")
            const monPseudo = session.user.user_metadata?.pseudo || session.user.email.split('@')[0];
            
            const { data: nouvelleHistoire, error } = await window._supabase.from('histoires').insert([{ 
                titre: title, 
                synopsis: synopsis, 
                genre: genre, 
                classification: classification, 
                statut: statut,
                auteur: session.user.email, // RLS requirement !
                image_couverture: imageUrl,
                pseudo_auteur: monPseudo,
                contenu_sensible: isSensible 
            }]).select(); // Le select() nous renvoie la ligne avec son nouvel ID (très utile pour ouvrir Gestion)

            if (error) {
                alert("Le registre Supabase a refusé l'inscription : " + error.message);
                btnSubmit.innerText = "Forger l'Histoire";
                btnSubmit.disabled = false;
            } else {
                alert("Un nouveau grimoire est apparu dans l'Atelier !");
                // On met éventuellement en cache et on redirige pour ouvrir les modifications de ce grimoire !
                if (nouvelleHistoire && nouvelleHistoire.length > 0) {
                    const idNouvelleOuevre = nouvelleHistoire[0].id;
                    window.currentOeuvreId = idNouvelleOuevre;
                    localStorage.setItem('currentOeuvreId', idNouvelleOuevre);
                }
                
                // Recharge obligatoire si on utilise la fonction pour l'atelier
                if (typeof window.chargerMesOeuvres === 'function') window.chargerMesOeuvres(); 

                window.changerDePage('studio'); // Retour l'atelier
            }
        }
    });

    window.creationStoryEventHooked = true;
}

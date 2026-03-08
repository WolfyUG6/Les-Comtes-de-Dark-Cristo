// --- LE GRIMOIRE (Lecture et affichage des chapitres) ---
const oeuvrePage = document.getElementById('oeuvre-page');

// Revenir à l'accueil
document.getElementById('btn-retour').addEventListener('click', () => {
    // 1. On cache la page de l'œuvre
    oeuvrePage.style.display = 'none';
    
    // 2. On remet le grand logo et on cache le petit
    document.getElementById('mini-logo').style.display = 'none';
    document.getElementById('hero-logo-area').style.display = 'block';
    
    // 3. On réaffiche la liste des histoires
    storiesContainer.style.display = 'flex';
});

// Ouvrir une œuvre spécifique
window.ouvrirOeuvre = async function(idHistoire) {
    storiesContainer.style.display = 'none';
    oeuvrePage.style.display = 'block';

    // -- NOUVEAU : On cache le grand logo et on affiche le bandeau --
    document.getElementById('hero-logo-area').style.display = 'none';
    document.getElementById('mini-logo').style.display = 'flex';

    document.getElementById('oeuvre-titre').innerText = "Ouverture du grimoire...";

    const { data: histoire, error } = await _supabase
    // ... ne touche pas au reste de la fonction qui charge la base de données ...
        .from('histoires')
        .select('*')
        .eq('id', idHistoire)
        .single();

    if (error) {
        alert("Erreur de chargement : " + error.message);
        return;
    }

    // Remplissage des infos
    document.getElementById('oeuvre-cover').src = histoire.image_couverture || '';
    document.getElementById('oeuvre-genre').innerText = histoire.genre;
    document.getElementById('oeuvre-titre').innerText = histoire.titre;
    document.getElementById('oeuvre-auteur').innerText = "Comte " + (histoire.pseudo_auteur || histoire.auteur.split('@')[0]);
    document.getElementById('oeuvre-synopsis').innerText = histoire.synopsis;
	document.getElementById('oeuvre-likes').innerText = histoire.likes || 0;
	
	// --- NOUVEAU : GESTION DU BOUTON SOUTENIR ---
    const btnSoutenir = document.getElementById('btn-soutenir');
    
    // 1. On remet le bouton à neuf par défaut (très important si on passe d'une histoire à l'autre)
    btnSoutenir.innerText = "Soutenir l'œuvre";
    btnSoutenir.style.backgroundColor = "transparent";
    btnSoutenir.style.color = "#ff0055";
    btnSoutenir.disabled = false;

    // 2. On vérifie si notre lecteur connecté a déjà posé son sceau sur CE livre
    const { data: { session: sessionActuelle } } = await window._supabase.auth.getSession();
    
    if (sessionActuelle) {
        const { data: aDejaSoutenu } = await window._supabase
            .from('favoris')
            .select('id')
            .eq('user_id', sessionActuelle.user.id)
            .eq('histoire_id', idHistoire)
            .maybeSingle(); // maybeSingle évite une erreur rouge si ça ne trouve rien

        // Si l'Archiviste trouve une trace de son passage...
        if (aDejaSoutenu) {
            // On bloque la magie !
            btnSoutenir.innerText = "Œuvre soutenue 🩸";
            btnSoutenir.style.backgroundColor = "#5d1a1a";
            btnSoutenir.style.color = "white";
            btnSoutenir.disabled = true; // Empêche de recliquer
        }
    }

    window.currentOeuvreId = idHistoire;
    
    // Vérification si l'utilisateur est l'auteur pour afficher le bouton d'ajout de chapitre
    const { data: { session } } = await _supabase.auth.getSession();
    if (session && session.user.email === histoire.auteur) {
        document.getElementById('btn-add-chapitre').style.display = 'block';
    } else {
        document.getElementById('btn-add-chapitre').style.display = 'none';
    }
	
    chargerChapitres(idHistoire);
};

// Charger la liste des chapitres
async function chargerChapitres(idHistoire) {
    const chapitresListe = document.getElementById('chapitres-liste');
    chapitresListe.innerHTML = '<p style="color: #c4a484; font-style: italic;">Recherche des écrits...</p>';

    const { data: chapitres, error } = await _supabase
        .from('chapitres')
        .select('*')
        .eq('histoire_id', idHistoire)
        .order('numero', { ascending: true });

    if (error) {
        chapitresListe.innerHTML = '<p style="color: red;">Erreur : ' + error.message + '</p>';
        return;
    }

    if (chapitres.length === 0) {
        chapitresListe.innerHTML = '<p style="color: #777; font-style: italic;">Aucun chapitre forgé.</p>';
        return;
    }

    chapitresListe.innerHTML = '';
    const ul = document.createElement('ul');
    ul.style.listStyleType = 'none';
    ul.style.padding = '0';

    chapitres.forEach(chapitre => {
        const li = document.createElement('li');
        li.style.cssText = "background: #0a0a0a; border: 1px solid #333; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;";
        
        const datePub = new Date(chapitre.date_publication).toLocaleDateString('fr-FR');

        li.innerHTML = `
            <div>
                <span style="color: #00aaff; font-weight: bold; margin-right: 10px;">Chapitre ${chapitre.numero}</span>
                <span style="color: #e0d7c6;">${chapitre.titre}</span>
            </div>
            <div style="display: flex; gap: 15px; align-items: center;">
                <span style="color: #555; font-size: 0.8rem;">${datePub}</span>
                <button class="genre-btn" style="padding: 5px 15px; font-size: 0.8rem;" onclick="alert('Lecture bientôt disponible !')">Lire</button>
            </div>
        `;
        ul.appendChild(li);
    });
    chapitresListe.appendChild(ul);
}

// --- LE POUVOIR DE SOUTIEN (Ajouter aux lectures) ---
const btnSoutenir = document.getElementById('btn-soutenir');

btnSoutenir.addEventListener('click', async () => {
    // 1. On vérifie qui est le lecteur connecté
    const { data: { session } } = await window._supabase.auth.getSession();

    if (!session) {
        alert("Les ombres refusent votre requête : vous devez être connecté pour soutenir une œuvre.");
        return;
    }

    btnSoutenir.innerText = "Sceau en cours...";

    // 2. On grave le lien entre l'utilisateur et l'œuvre dans la table favoris
    const { error } = await window._supabase
        .from('favoris')
        .insert([{ 
            user_id: session.user.id, 
            histoire_id: window.currentOeuvreId 
        }]);

    if (error) {
        alert("Erreur du Sanctuaire : " + error.message);
        btnSoutenir.innerText = "Soutenir l'œuvre";
    } else {
            // 1. On attrape le compteur visuel et on lui ajoute +1
            const compteurLikes = document.getElementById('oeuvre-likes');
            const nombreActuel = parseInt(compteurLikes.innerText) || 0;
            const nouveauNombre = nombreActuel + 1;
            compteurLikes.innerText = nouveauNombre; // Met à jour l'écran tout de suite

            // 2. L'Archiviste retourne écrire ce nouveau total sur l'étagère "histoires"
            await window._supabase
                .from('histoires')
                .update({ likes: nouveauNombre })
                .eq('id', window.currentOeuvreId);

            // 3. On confirme visuellement à l'utilisateur
            alert("L'œuvre a été ajoutée à vos lectures !");
            btnSoutenir.innerText = "Œuvre soutenue 🩸";
            btnSoutenir.style.backgroundColor = "#5d1a1a";
            btnSoutenir.style.color = "white";

            // On désactive le bouton pour éviter de spammer les likes
            btnSoutenir.disabled = true;
        }
});
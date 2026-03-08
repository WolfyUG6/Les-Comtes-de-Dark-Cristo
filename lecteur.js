// --- LE GRIMOIRE (Lecture et affichage des chapitres) ---
const oeuvrePage = document.getElementById('oeuvre-page');

// Revenir à l'accueil
document.getElementById('btn-retour').addEventListener('click', () => {
    window.changerDePage('accueil');
});

// Revenir à l'accueil
document.getElementById('btn-retour').addEventListener('click', () => {
    window.changerDePage('accueil');
});

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
            btnSoutenir.innerText = "Œuvre soutenue 🩸";
            btnSoutenir.style.backgroundColor = "#5d1a1a";
            btnSoutenir.style.color = "white";
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

// --- LE POUVOIR DE SOUTIEN (Ajouter ou Retirer) ---
const btnSoutenir = document.getElementById('btn-soutenir');

btnSoutenir.addEventListener('click', async () => {
    const { data: { session } } = await window._supabase.auth.getSession();
    
    if (!session) {
        alert("Les ombres refusent votre requête : vous devez être connecté pour soutenir une œuvre.");
        return;
    }

    // On fige le bouton pendant que l'Archiviste travaille pour éviter les double-clics frénétiques
    btnSoutenir.innerText = "Pacte en cours...";
    btnSoutenir.disabled = true; 

    // 1. On vérifie si le pacte existe déjà
    const { data: exist } = await window._supabase
        .from('favoris')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('histoire_id', window.currentOeuvreId)
        .maybeSingle();

    const compteurLikes = document.getElementById('oeuvre-likes');
    let nombreActuel = parseInt(compteurLikes.innerText) || 0;

    if (exist) {
        // --- CAS 1 : IL AVAIT DÉJÀ LIKÉ, ON ANNULE LE PACTE ---
        
        // A. On efface la trace dans l'étagère favoris
        await window._supabase.from('favoris').delete().eq('id', exist.id);
        
        // B. On fait -1 sur l'affichage (sans jamais descendre sous 0)
        nombreActuel = Math.max(0, nombreActuel - 1);
        compteurLikes.innerText = nombreActuel;
        
        // C. On met à jour le total sur l'étagère histoires
        await window._supabase.from('histoires').update({ likes: nombreActuel }).eq('id', window.currentOeuvreId);

        // D. On remet le bouton à son état d'origine
        btnSoutenir.innerText = "Soutenir l'œuvre";
        btnSoutenir.style.backgroundColor = "transparent";
        btnSoutenir.style.color = "#ff0055";

    } else {
        // --- CAS 2 : IL N'AVAIT PAS LIKÉ, ON CRÉE LE PACTE ---
        
        // A. On ajoute son nom dans l'étagère favoris
        await window._supabase.from('favoris').insert([{ user_id: session.user.id, histoire_id: window.currentOeuvreId }]);

        // B. On fait +1 sur l'affichage
        nombreActuel += 1;
        compteurLikes.innerText = nombreActuel;

        // C. On met à jour le total sur l'étagère histoires
        await window._supabase.from('histoires').update({ likes: nombreActuel }).eq('id', window.currentOeuvreId);

        // D. On change l'aspect du bouton
        btnSoutenir.innerText = "Œuvre soutenue 🩸";
        btnSoutenir.style.backgroundColor = "#5d1a1a";
        btnSoutenir.style.color = "white";
    }

    // On libère le bouton pour qu'il puisse re-cliquer plus tard s'il le souhaite !
    btnSoutenir.disabled = false; 
});
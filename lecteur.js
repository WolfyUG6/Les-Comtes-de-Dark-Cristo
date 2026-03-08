// --- LE GRIMOIRE (Lecture et affichage des chapitres) ---
const oeuvrePage = document.getElementById('oeuvre-page');

// Revenir à l'accueil
document.getElementById('btn-retour').addEventListener('click', () => {
    window.changerDePage('accueil');
});

// Ouvrir une œuvre spécifique
window.ouvrirOeuvre = async function(idHistoire) {
    // 1. On utilise le Chef d'Orchestre pour tout nettoyer et afficher la bonne page
    window.changerDePage('oeuvre');

    document.getElementById('oeuvre-titre').innerText = "Ouverture du grimoire...";

    // 2. On va chercher l'histoire dans l'étagère Supabase
    const { data: histoire, error } = await window._supabase
        .from('histoires')
        .select('*')
        .eq('id', idHistoire)
        .single();

    if (error) {
        alert("Erreur de chargement : " + error.message);
        return;
    }

    // 3. Remplissage des informations sur la page
    document.getElementById('oeuvre-cover').src = histoire.image_couverture || '';
    document.getElementById('oeuvre-genre').innerText = histoire.genre;
    document.getElementById('oeuvre-titre').innerText = histoire.titre;
    document.getElementById('oeuvre-auteur').innerText = "Comte " + (histoire.pseudo_auteur || histoire.auteur.split('@')[0]);
    document.getElementById('oeuvre-synopsis').innerText = histoire.synopsis;
    
    // --- L'ARCHIVISTE COMPTE DIRECTEMENT LES PACTES DANS LES FAVORIS ---
    const { count: totalLikes } = await window._supabase
        .from('favoris')
        .select('*', { count: 'exact', head: true })
        .eq('histoire_id', idHistoire);
        
    document.getElementById('oeuvre-likes').innerText = totalLikes || 0;

    window.currentOeuvreId = idHistoire;
    
    // 4. Vérification si l'utilisateur est l'auteur (pour le bouton "Ajouter Chapitre")
    const { data: { session } } = await window._supabase.auth.getSession();
    if (session && session.user.email === histoire.auteur) {
        document.getElementById('btn-add-chapitre').style.display = 'block';
    } else {
        document.getElementById('btn-add-chapitre').style.display = 'none';
    }

    // --- 5. GESTION VISUELLE DU BOUTON SOUTENIR ---
    const btnSoutenir = document.getElementById('btn-soutenir');
    if (btnSoutenir) {
        // On remet le bouton à zéro par défaut
        btnSoutenir.innerText = "Soutenir l'œuvre";
        btnSoutenir.style.backgroundColor = "transparent";
        btnSoutenir.style.color = "#ff0055";
        btnSoutenir.disabled = false;

        // Si le lecteur est connecté, on vérifie s'il a déjà versé son sang (liké)
        if (session) {
            const { data: aDejaSoutenu } = await window._supabase
                .from('favoris')
                .select('id')
                .eq('user_id', session.user.id)
                .eq('histoire_id', idHistoire)
                .maybeSingle();

            // S'il avait déjà liké, on rougit le bouton !
            if (aDejaSoutenu) {
                btnSoutenir.innerText = "Œuvre soutenue 🩸";
                btnSoutenir.style.backgroundColor = "#5d1a1a";
                btnSoutenir.style.color = "white";
            }
        }
    }
    
    // 6. On appelle la fonction pour charger les chapitres
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

    btnSoutenir.innerText = "Pacte en cours...";
    btnSoutenir.disabled = true; 

    // 1. On vérifie si le pacte existe déjà
    const { data: exist } = await window._supabase
        .from('favoris')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('histoire_id', window.currentOeuvreId)
        .maybeSingle();

    if (exist) {
        // On détruit sa trace
        await window._supabase.from('favoris').delete().eq('id', exist.id);
        btnSoutenir.innerText = "Soutenir l'œuvre";
        btnSoutenir.style.backgroundColor = "transparent";
        btnSoutenir.style.color = "#ff0055";
    } else {
        // On crée sa trace
        await window._supabase.from('favoris').insert([{ user_id: session.user.id, histoire_id: window.currentOeuvreId }]);
        btnSoutenir.innerText = "Œuvre soutenue 🩸";
        btnSoutenir.style.backgroundColor = "#5d1a1a";
        btnSoutenir.style.color = "white";
    }

    // 2. L'Archiviste recompte le vrai nombre de pactes dans l'étagère favoris
    const { count } = await window._supabase
        .from('favoris')
        .select('*', { count: 'exact', head: true })
        .eq('histoire_id', window.currentOeuvreId);

    // 3. On affiche le résultat sans toucher à l'histoire !
    document.getElementById('oeuvre-likes').innerText = count || 0;

    btnSoutenir.disabled = false; 
});
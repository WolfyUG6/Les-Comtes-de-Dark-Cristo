// ==========================================
// L'ESPACE PERSONNEL (favoris.js)
// Gestion des pactes, lectures en cours et archives
// ==========================================

window.chargerFavoris = async function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    // 1. Gestion des onglets
    initialiserOngletsFavoris();

    // 2. Charger les pactes (Favoris)
    await chargerMesPactes();

    // 3. Ecouteur de tri
    const sortSelect = document.getElementById('sort-pactes');
    if (sortSelect) {
        sortSelect.addEventListener('change', chargerMesPactes);
    }
};

function initialiserOngletsFavoris() {
    const boutons = document.querySelectorAll('.btn-tab-favoris');
    const contenus = document.querySelectorAll('.tab-content-favoris');

    boutons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Retirer l'état actif de tous les boutons
            boutons.forEach(b => {
                b.classList.remove('btn-primary', 'shadow-active');
            });
            // Activer le bouton cliqué
            e.target.classList.add('btn-primary', 'shadow-active');

            // Masquer tous les contenus
            contenus.forEach(c => c.classList.add('hidden'));

            // Afficher le contenu ciblé
            const cibleId = e.target.getAttribute('data-tab');
            const cibleDiv = document.getElementById(cibleId);
            if (cibleDiv) {
                cibleDiv.classList.remove('hidden');
            }
        });
    });
}

async function chargerMesPactes() {
    const grille = document.getElementById('pactes-grid');
    if (!grille) return;

    grille.innerHTML = '<p class="loading-text text-center">Interrogation des registres...</p>';

    // 1. Vérifier que l'utilisateur est connecté
    const { data: { session } } = await window._supabase.auth.getSession();
    if (!session) {
        grille.innerHTML = '<p class="text-error text-center">Vous devez avoir scellé un pacte avec le Sanctuaire (être connecté) pour voir vos lectures.</p>';
        return;
    }

    const userId = session.user.id;

    // 2. Récupérer les données des oeuvres favorites de l'utilisateur
    // On récupère "histoire_id" et "created_at" (qui représente la date du pacte)
    const { data: pactesRefs, error: errRefs } = await window._supabase
        .from('favoris')
        .select('histoire_id, created_at')
        .eq('user_id', userId);

    if (errRefs) {
        grille.innerHTML = `<p class="text-error text-center">Erreur lors de l'accès aux archives : ${errRefs.message}</p>`;
        return;
    }

    if (!pactesRefs || pactesRefs.length === 0) {
        grille.innerHTML = `
            <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 50px;">
                <h2 style="font-family: 'Cinzel', serif; color: var(--text-title); font-size: 2rem;">Le silence règne ici...</h2>
                <p class="text-muted-italic text-center mt-10" style="font-size: 1.1rem;">Aucun pacte n'a encore été scellé.</p>
            </div>
        `;
        return;
    }

    // Extraction de la liste des IDs pour faire une seconde requête ciblée
    const idsHistoires = pactesRefs.map(p => p.histoire_id);

    // 3. Récupérer le détail des histoires correspondantes
    const { data: histoires, error: errHistoires } = await window._supabase
        .from('histoires')
        .select('*')
        .in('id', idsHistoires);

    if (errHistoires) {
        grille.innerHTML = `<p class="text-error text-center">Erreur lors de la lecture des grimoires : ${errHistoires.message}</p>`;
        return;
    }

    // 3.5 Pré-calculer les likes et chapitres pour éviter les requêtes N+1
    const { data: allLikes } = await window._supabase
        .from('favoris')
        .select('histoire_id')
        .in('histoire_id', idsHistoires);
        
    const { data: allChapitres } = await window._supabase
        .from('chapitres')
        .select('histoire_id')
        .in('histoire_id', idsHistoires)
        .eq('est_publie', true);

    const likesParHistoire = new Map();
    if (allLikes) {
        allLikes.forEach(like => {
            likesParHistoire.set(like.histoire_id, (likesParHistoire.get(like.histoire_id) || 0) + 1);
        });
    }

    const chapitresParHistoire = new Map();
    if (allChapitres) {
        allChapitres.forEach(chap => {
            chapitresParHistoire.set(chap.histoire_id, (chapitresParHistoire.get(chap.histoire_id) || 0) + 1);
        });
    }

    // 4. Fusionner les données pour le tri (Histoires + Date d'ajout)
    let oeuvresFusionnees = histoires.map(h => {
        const reference = pactesRefs.find(p => p.histoire_id === h.id);
        return {
            ...h,
            date_pacte: reference ? new Date(reference.created_at) : new Date(0)
        };
    });

    // 5. Appliquer le tri selon le Selecteur
    const sortSelect = document.getElementById('sort-pactes');
    const sortBy = sortSelect ? sortSelect.value : 'recent';

    oeuvresFusionnees.sort((a, b) => {
        if (sortBy === 'recent') {
            return b.date_pacte - a.date_pacte; // Du plus récent au plus ancien
        } else if (sortBy === 'ancien') {
            return a.date_pacte - b.date_pacte; // Du plus ancien au plus récent
        } else if (sortBy === 'az') {
            return a.titre.localeCompare(b.titre); // Alphabétique
        } else if (sortBy === 'za') {
            return b.titre.localeCompare(a.titre); // Anti-Alphabétique
        }
        return 0;
    });

    // 6. Dessiner les cartes
    grille.innerHTML = '';
    grille.className = 'stories-grid'; // Re-base class standard de base.css pour la grille

    for (const h of oeuvresFusionnees) {
        if (!h) continue; 

        // Style pour l'âge (comme sur la page d'accueil)
        let classeAge = 'tag-age';
        if (h.classification === 'Tout public') classeAge += ' age-tout-public';
        else if (h.classification === 'R15') classeAge += ' age-r15';
        else if (h.classification === 'R16') classeAge += ' age-r16';
        else if (h.classification === 'R18') classeAge += ' age-r18';

        const imageCouverture = window.getStoryCoverUrl(h.image_couverture);
        const htmlImage = `<img src="${imageCouverture}" alt="Couverture" class="story-cover-image">`;

        const tagSensible = h.contenu_sensible 
            ? `<span class="tag tag-sensible">⚠️ Sensible</span>` 
            : `<span class="tag tag-sensible-off">Sensible</span>`;

        // Nombre de favoris (Likes) pour cette histoire (données précalculées)
        const likes = likesParHistoire.get(h.id) || 0;

        // Nombre de chapitres publiés (données précalculées)
        const nbChapitres = chapitresParHistoire.get(h.id) || 0;

        // -- CORRECTION CSS -- (Ajout de l'encapsulateur story-card-wrapper)
        const wrapper = document.createElement('div');
        wrapper.className = "story-card-wrapper";
        
        const card = document.createElement('div');
        card.className = "story-card";
        
        // Raccourcir le synopsis s'il est trop long
        let synopsisCourt = h.synopsis || "Aucun synopsis disponible.";
        if (synopsisCourt.length > 150) synopsisCourt = synopsisCourt.substring(0, 150) + "...";

        // Date du pacte formatée pour l'esthétique
        const dateAjout = h.date_pacte.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });

        card.innerHTML = `
            <div class="story-cover" onclick="localStorage.setItem('currentOeuvreId', ${h.id}); window.changerDePage('oeuvre');" style="cursor:pointer;">
                ${htmlImage}
            </div>
            <div class="story-info">
                <h3 class="story-title" onclick="localStorage.setItem('currentOeuvreId', ${h.id}); window.changerDePage('oeuvre');" style="cursor:pointer;">${h.titre}</h3>
                <span class="story-author">Par ${h.pseudo_auteur || h.auteur.split('@')[0]}</span>
                
                <div class="story-tags">
                    <span class="tag tag-genre">${h.genre}</span>
                    <span class="tag ${classeAge}">${h.classification || 'Tout public'}</span>
                    ${tagSensible}
                </div>
                
                <p class="story-synopsis">${synopsisCourt}</p>
                
                <div class="story-stats">
                    <span title="Vues">👁️ ${h.vues || 0}</span>
                    <span title="Pactes scellés">❤️ ${likes || 0}</span>
                    <span title="Chapitres">📜 ${nbChapitres || 0}</span>
                </div>
                
                <div class="text-center text-muted-italic text-small" style="margin-bottom: 10px;">
                    Pacte scellé le : ${dateAjout}
                </div>

                <div style="display: flex; justify-content: center;">
                    <button class="genre-btn btn-primary shadow-active btn-lire-oeuvre" onclick="localStorage.setItem('currentOeuvreId', ${h.id}); window.changerDePage('oeuvre');">Reprendre la Lecture</button>
                </div>
            </div>
        `;
        
        wrapper.appendChild(card);
        grille.appendChild(wrapper);
    }
}

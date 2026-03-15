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

    // 2. Récupérer les favoris de l'utilisateur
    // On fait une jointure implicite avec Supabase en demandant les infos de l'histoire liées
    const { data: pactes, error } = await window._supabase
        .from('favoris')
        .select(`
            histoire_id,
            histoires (
                id,
                titre,
                synopsis,
                image_couverture,
                genre,
                classification,
                statut,
                pseudo_auteur,
                auteur,
                vues,
                contenu_sensible
            )
        `)
        .eq('user_id', userId);

    if (error) {
        grille.innerHTML = `<p class="text-error text-center">Erreur lors de l'accès aux archives : ${error.message}</p>`;
        return;
    }

    if (!pactes || pactes.length === 0) {
        grille.innerHTML = `
            <div style="grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 50px;">
                <h2 style="font-family: 'Cinzel', serif; color: var(--text-title); font-size: 2rem;">Le silence règne ici...</h2>
                <p class="text-muted-italic text-center mt-10" style="font-size: 1.1rem;">Aucun pacte n'a encore été scellé.</p>
            </div>
        `;
        return;
    }

    // 3. Dessiner les cartes
    grille.innerHTML = '';

    for (const pacte of pactes) {
        const h = pacte.histoires;
        // Si l'histoire a été supprimée mais le favoris est resté (théoriquement bloqué par le onDelete cascade)
        if (!h) continue; 

        // Style pour l'âge (comme sur la page d'accueil)
        let classeAge = 'tag-age';
        if (h.classification === 'Tout public') classeAge += ' age-tout-public';
        else if (h.classification === 'R15') classeAge += ' age-r15';
        else if (h.classification === 'R16') classeAge += ' age-r16';
        else if (h.classification === 'R18') classeAge += ' age-r18';

        const imgPlaceholder = `<div class="story-cover-placeholder">Livre Perdu</div>`;
        const imgValide = `<img src="${h.image_couverture}" alt="Couverture" class="story-cover-image">`;
        const htmlImage = h.image_couverture ? imgValide : imgPlaceholder;

        const tagSensible = h.contenu_sensible 
            ? `<span class="tag tag-sensible">⚠️ Sensible</span>` 
            : `<span class="tag tag-sensible-off">Sensible</span>`;

        // Nombre de favoris (Likes) pour cette histoire (requête par histoire)
        const { count: likes } = await window._supabase
            .from('favoris')
            .select('*', { count: 'exact', head: true })
            .eq('histoire_id', h.id);

        // Nombre de chapitres
        const { count: nbChapitres } = await window._supabase
            .from('chapitres')
            .select('*', { count: 'exact', head: true })
            .eq('histoire_id', h.id)
            .eq('est_publie', true);

        const card = document.createElement('div');
        card.className = "story-card";
        
        // Raccourcir le synopsis s'il est trop long
        let synopsisCourt = h.synopsis || "Aucun synopsis disponible.";
        if (synopsisCourt.length > 150) synopsisCourt = synopsisCourt.substring(0, 150) + "...";

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
                
                <button class="genre-btn btn-primary shadow-active btn-lire-oeuvre" onclick="localStorage.setItem('currentOeuvreId', ${h.id}); window.changerDePage('oeuvre');">Reprendre la Lecture</button>
            </div>
        `;
        grille.appendChild(card);
    }
}

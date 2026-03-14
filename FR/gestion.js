// ==========================================
// LE GESTIONNAIRE DE GRIMOIRE (gestion.js)
// Affichage des infos et tri des chapitres
// ==========================================

window.chargerGestionOeuvre = async function() {
    // 0. Restauration de l'ID après un F5
    if (!window.currentOeuvreId) window.currentOeuvreId = localStorage.getItem('currentOeuvreId');

    const infoPanel = document.getElementById('info-histoire-panel');
    if (!infoPanel || !window.currentOeuvreId) {
        window.changerDePage('studio'); // Retour au studio si rien n'est trouvé
        return;
    }

    infoPanel.innerHTML = '<p class="loading-text">Déchiffrage des runes en cours...</p>';

    // 1. Récupération des infos de l'histoire
    const { data: histoire, error: errHistoire } = await window._supabase
        .from('histoires')
        .select('*')
        .eq('id', window.currentOeuvreId)
        .single();

    if (errHistoire || !histoire) {
        infoPanel.innerHTML = `<p class="text-error">Erreur : L'œuvre est introuvable dans les abysses.</p>`;
        return;
    }

    // 2. Affichage des infos avec le style de base.css
    const imgHtml = histoire.image_couverture 
        ? `<img src="${histoire.image_couverture}" class="book-cover">` 
        : `<div class="book-cover-placeholder">Pas de couverture</div>`;

    infoPanel.innerHTML = `
        ${imgHtml}
        <div class="book-info-content">
            <h2 class="story-title-m0">${histoire.titre}</h2>
            <div class="story-tags mb-15">
                <span class="tag tag-genre">${histoire.genre}</span>
                <span class="tag tag-statut">${histoire.statut || '✍️ En cours'}</span>
                <span class="tag tag-age">${histoire.classification || 'Tout public'}</span>
                ${histoire.contenu_sensible ? `<span class="tag tag-sensible">⚠️ Sensible</span>` : ''}
            </div>
            <p class="book-synopsis">${histoire.synopsis}</p>
        </div>
    `;

    // 3. On lance la récupération des chapitres
    chargerChapitresCategories();
};

window.chargerChapitresCategories = async function() {
    const listeBrouillons = document.getElementById('liste-brouillons');
    const listeProgrammes = document.getElementById('liste-programmes');
    const listePublies = document.getElementById('liste-publies');

    if (!listeBrouillons) return;

    listeBrouillons.innerHTML = '<p class="loading-text">Recherche...</p>';
    listeProgrammes.innerHTML = '<p class="loading-text">Recherche...</p>';
    listePublies.innerHTML = '<p class="loading-text">Recherche...</p>';

    const { data: chapitres, error } = await window._supabase
        .from('chapitres')
        .select('*')
        .eq('histoire_id', window.currentOeuvreId)
        .order('numero', { ascending: true }); // On trie par numéro de chapitre (1, 2, 3...)

    if (error) {
        listeBrouillons.innerHTML = `<p class="text-error">Erreur: ${error.message}</p>`;
        return;
    }

    listeBrouillons.innerHTML = '';
    listeProgrammes.innerHTML = '';
    listePublies.innerHTML = '';

    let countBrouillons = 0, countProgrammes = 0, countPublies = 0;
    const maintenant = new Date(); // L'heure exacte actuelle

    chapitres.forEach(chap => {
        const dateChap = chap.date_publication ? new Date(chap.date_publication) : new Date();
        
        // Création de la barre du chapitre
        const div = document.createElement('div');
        div.className = "chapter-item";
        
        let infoDate = '';
        if (chap.est_publie && dateChap > maintenant) {
            const dateAffichee = dateChap.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            infoDate = `<span class="scheduled-date">(Prévu le ${dateAffichee})</span>`;
        } else if (chap.est_publie) {
            const dateAffichee = dateChap.toLocaleDateString('fr-FR');
            infoDate = `<span class="published-date">(Publié le ${dateAffichee})</span>`;
        }

        div.innerHTML = `
            <div>
                <strong class="chapter-title">Chapitre ${chap.numero} : ${chap.titre}</strong>
                ${infoDate}
            </div>
            <div>
                <button class="genre-btn btn-outline-blue btn-small" onclick="window.ouvrirEditeurChapitre(${chap.id})">Modifier</button>
                <button class="genre-btn btn-outline-red btn-small-last" onclick="supprimerChapitre(${chap.id})">Supprimer</button>
            </div>
        `;

        // ⚖️ L'Aiguilleur : On range le chapitre dans la bonne case !
        if (!chap.est_publie) {
            listeBrouillons.appendChild(div);
            countBrouillons++;
        } else if (dateChap > maintenant) {
            listeProgrammes.appendChild(div);
            countProgrammes++;
        } else {
            listePublies.appendChild(div);
            countPublies++;
        }
    });

    // Messages si les cases sont vides
    if (countBrouillons === 0) listeBrouillons.innerHTML = '<p class="text-muted-italic text-small">Aucun parchemin en brouillon.</p>';
    if (countProgrammes === 0) listeProgrammes.innerHTML = '<p class="text-muted-italic text-small">Aucun parchemin en attente.</p>';
    if (countPublies === 0) listePublies.innerHTML = '<p class="text-muted-italic text-small">Aucun parchemin visible.</p>';
};

// --- LE POUVOIR DE DESTRUCTION ---
window.supprimerChapitre = async function(id) {
    if(confirm("Détruire ce parchemin à jamais ? Cette action est irréversible.")) {
        const { error } = await window._supabase.from('chapitres').delete().eq('id', id);
        if(error) alert("Supabase a bloqué la destruction : " + error.message);
        else window.chargerChapitresCategories(); // On recharge la liste instantanément
    }
};

// --- SAUTS VERS L'ÉDITEUR ---
window.ouvrirEditeurChapitre = function(idChapitre) {
    window.currentChapitreId = idChapitre;
    localStorage.setItem('currentChapitreId', idChapitre);
    window.changerDePage('editeur-chapitre');
};

// --- ECOUTE DES CLICS DE NAVIGATION ---
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btn-retour-gestion') {
        window.changerDePage('studio');
    }
    if (e.target && e.target.id === 'btn-add-chapitre') {
        window.currentChapitreId = null; // C'est une création
        localStorage.removeItem('currentChapitreId');
        window.changerDePage('editeur-chapitre');
    }
});
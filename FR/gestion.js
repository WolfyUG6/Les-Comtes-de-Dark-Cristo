// ==========================================
// LE GESTIONNAIRE DE GRIMOIRE (gestion.js)
// Affichage des infos et tri des chapitres
// ==========================================

window.chargerGestionOeuvre = async function() {
    const infoPanel = document.getElementById('info-histoire-panel');
    if (!infoPanel || !window.currentOeuvreId) return;

    infoPanel.innerHTML = '<p class="loading-text">Déchiffrage des runes en cours...</p>';

    // 1. Récupération des infos de l'histoire
    const { data: histoire, error: errHistoire } = await window._supabase
        .from('histoires')
        .select('*')
        .eq('id', window.currentOeuvreId)
        .single();

    if (errHistoire || !histoire) {
        infoPanel.innerHTML = `<p style="color: var(--accent-red);">Erreur : L'œuvre est introuvable dans les abysses.</p>`;
        return;
    }

    // 2. Affichage des infos avec le style de base.css
    const imgHtml = histoire.image_couverture 
        ? `<img src="${histoire.image_couverture}" style="width: 160px; height: 230px; object-fit: cover; border: 1px solid var(--border-color); border-radius: 5px;">` 
        : `<div style="width: 160px; height: 230px; background: #000; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; color: var(--text-muted); text-align: center;">Pas de couverture</div>`;

    infoPanel.innerHTML = `
        ${imgHtml}
        <div style="flex: 1;">
            <h2 style="margin: 0 0 10px 0;">${histoire.titre}</h2>
            <div class="story-tags" style="margin-bottom: 15px;">
                <span class="tag tag-genre">${histoire.genre}</span>
                <span class="tag tag-statut">${histoire.statut || '✍️ En cours'}</span>
                <span class="tag tag-age">${histoire.classification || 'Tout public'}</span>
                ${histoire.contenu_sensible ? `<span class="tag tag-sensible">⚠️ Sensible</span>` : ''}
            </div>
            <p style="color: var(--text-muted); line-height: 1.6; font-size: 0.95rem;">${histoire.synopsis}</p>
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
        listeBrouillons.innerHTML = `<p style="color: var(--accent-red);">Erreur: ${error.message}</p>`;
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
        div.style.cssText = "background: var(--bg-box); border: 1px solid var(--border-color); padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; transition: 0.3s;";
        
        let infoDate = '';
        if (chap.est_publie && dateChap > maintenant) {
            const dateAffichee = dateChap.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            infoDate = `<span style="font-size: 0.8rem; color: #ffd700; margin-left: 10px; font-style: italic;">(Prévu le ${dateAffichee})</span>`;
        } else if (chap.est_publie) {
            const dateAffichee = dateChap.toLocaleDateString('fr-FR');
            infoDate = `<span style="font-size: 0.8rem; color: var(--text-muted); margin-left: 10px; font-style: italic;">(Publié le ${dateAffichee})</span>`;
        }

        div.innerHTML = `
            <div>
                <strong style="color: var(--text-main); font-family: 'Cinzel', serif;">Chapitre ${chap.numero} : ${chap.titre}</strong>
                ${infoDate}
            </div>
            <div>
                <button class="genre-btn" style="font-size: 0.75rem; border-color: var(--accent-blue); color: var(--accent-blue); margin-right: 10px;" onclick="alert('Modifier arrivera plus tard !')">Modifier</button>
                <button class="genre-btn" style="font-size: 0.75rem; border-color: var(--accent-red); color: var(--accent-red);" onclick="supprimerChapitre(${chap.id})">Supprimer</button>
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
    if (countBrouillons === 0) listeBrouillons.innerHTML = '<p style="color: var(--text-muted); font-style: italic; font-size: 0.9rem;">Aucun parchemin en brouillon.</p>';
    if (countProgrammes === 0) listeProgrammes.innerHTML = '<p style="color: var(--text-muted); font-style: italic; font-size: 0.9rem;">Aucun parchemin en attente.</p>';
    if (countPublies === 0) listePublies.innerHTML = '<p style="color: var(--text-muted); font-style: italic; font-size: 0.9rem;">Aucun parchemin visible.</p>';
};

// --- LE POUVOIR DE DESTRUCTION ---
window.supprimerChapitre = async function(id) {
    if(confirm("Détruire ce parchemin à jamais ? Cette action est irréversible.")) {
        const { error } = await window._supabase.from('chapitres').delete().eq('id', id);
        if(error) alert("Supabase a bloqué la destruction : " + error.message);
        else window.chargerChapitresCategories(); // On recharge la liste instantanément
    }
};

// --- ECOUTE DES CLICS DE NAVIGATION ---
document.addEventListener('click', (e) => {
    if (e.target && e.target.id === 'btn-retour-gestion') {
        window.changerDePage('studio');
    }
    // Les autres boutons (Modifier, Ajouter) sont justes des alertes pour le moment
});
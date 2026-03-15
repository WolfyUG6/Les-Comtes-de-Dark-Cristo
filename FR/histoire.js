// ==========================================
// LE GRIMOIRE (histoire.js)
// Présentation de l'œuvre et liste des chapitres
// ==========================================

window.chargerPageHistoire = async function() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const idHistoire = localStorage.getItem('currentOeuvreId');
    const infoPanel = document.getElementById('histoire-presentation-panel');
    
    if (!idHistoire || !infoPanel) {
        window.changerDePage('accueil');
        return;
    }

    infoPanel.innerHTML = '<p class="loading-text">Déchiffrage des runes en cours...</p>';

    // 1. Récupération des infos de l'histoire
    const { data: histoire, error: errHistoire } = await window._supabase
        .from('histoires')
        .select('*')
        .eq('id', idHistoire)
        .single();

    if (errHistoire || !histoire) {
        infoPanel.innerHTML = `<p class="text-error text-center">Erreur : L'œuvre est introuvable dans les abysses.</p>`;
        return;
    }

    // 2. Gestion des tags
    let classeAge = 'tag-age';
    if (histoire.classification === 'Tout public') classeAge += ' age-tout-public';
    else if (histoire.classification === 'R15') classeAge += ' age-r15';
    else if (histoire.classification === 'R16') classeAge += ' age-r16';
    else if (histoire.classification === 'R18') classeAge += ' age-r18';

    const tagSensible = histoire.contenu_sensible 
        ? `<span class="tag tag-sensible">⚠️ Sensible</span>` 
        : `<span class="tag tag-sensible-off">Sensible</span>`;

    const imgHtml = histoire.image_couverture 
        ? `<img src="${histoire.image_couverture}" class="book-cover" alt="Couverture">` 
        : `<div class="book-cover-placeholder">Pas de couverture</div>`;

    // 3. Récupération des likes (pactes)
    const { count: totalLikes } = await window._supabase
        .from('favoris')
        .select('*', { count: 'exact', head: true })
        .eq('histoire_id', idHistoire);

    // 4. Affichage du panneau
    infoPanel.innerHTML = `
        ${imgHtml}
        <div class="book-info-content">
            <h2 class="story-title-m0">${histoire.titre}</h2>
            <div class="story-tags mb-15 mt-15">
                <span class="tag tag-genre">${histoire.genre}</span>
                <span class="tag tag-statut">${histoire.statut || '✍️ En cours'}</span>
                <span class="tag ${classeAge}">${histoire.classification || 'Tout public'}</span>
                ${tagSensible}
            </div>
            
            <div class="story-tags mb-15">
                <span class="tag">👁️ ${histoire.vues || 0} Vues</span>
                <span class="tag" id="histoire-likes-count">❤️ ${totalLikes || 0} Pactes</span>
                <span class="tag">📝 <span id="histoire-mots-count">...</span> Mots</span>
            </div>
            
            <span class="text-small text-muted-italic mb-15">Auteur : Comte ${histoire.pseudo_auteur || histoire.auteur.split('@')[0]}</span>
            
            <p class="book-synopsis mt-15">${histoire.synopsis}</p>
        </div>
    `;

    // 5. Gestion du bouton Suivre l'Histoire
    const btnSuivre = document.getElementById('btn-suivre-histoire');
    if (btnSuivre) {
        const { data: { session } } = await window._supabase.auth.getSession();
        
        btnSuivre.innerText = "Soutenir l'œuvre";
        btnSuivre.className = "genre-btn btn-primary shadow-active"; // Reset classes
        btnSuivre.disabled = false;
        
        // On détache les anciens event listeners (technique du clone)
        const nouveauBtn = btnSuivre.cloneNode(true);
        btnSuivre.parentNode.replaceChild(nouveauBtn, btnSuivre);

        if (session) {
            const { data: aDejaSoutenu } = await window._supabase
                .from('favoris')
                .select('id')
                .eq('user_id', session.user.id)
                .eq('histoire_id', idHistoire)
                .maybeSingle();

            if (aDejaSoutenu) {
                nouveauBtn.innerText = "Œuvre soutenue 🩸";
                nouveauBtn.className = "genre-btn btn-danger shadow-active";
            }

            nouveauBtn.addEventListener('click', async () => {
                nouveauBtn.innerText = "Pacte en cours...";
                nouveauBtn.disabled = true; 

                const { data: exist } = await window._supabase
                    .from('favoris')
                    .select('id')
                    .eq('user_id', session.user.id)
                    .eq('histoire_id', idHistoire)
                    .maybeSingle();

                if (exist) {
                    await window._supabase.from('favoris').delete().eq('id', exist.id);
                    nouveauBtn.innerText = "Soutenir l'œuvre";
                    nouveauBtn.className = "genre-btn btn-primary shadow-active";
                } else {
                    await window._supabase.from('favoris').insert([{ user_id: session.user.id, histoire_id: idHistoire }]);
                    nouveauBtn.innerText = "Œuvre soutenue 🩸";
                    nouveauBtn.className = "genre-btn btn-danger shadow-active";
                }

                // Maj du compteur
                const { count } = await window._supabase
                    .from('favoris')
                    .select('*', { count: 'exact', head: true })
                    .eq('histoire_id', idHistoire);
                
                const spanLikes = document.getElementById('histoire-likes-count');
                if(spanLikes) spanLikes.innerHTML = `❤️ ${count || 0} Pactes`;

                nouveauBtn.disabled = false;
            });
        } else {
            nouveauBtn.addEventListener('click', () => {
                alert("Les ombres refusent votre requête : vous devez être connecté pour soutenir une œuvre.");
            });
        }
    }

    // 6. Chargement des chapitres
    chargerListeChapitres(idHistoire);
};

async function chargerListeChapitres(idHistoire) {
    const chapitresListe = document.getElementById('lecteur-chapitres-liste');
    if (!chapitresListe) return;

    chapitresListe.innerHTML = '<p class="loading-text">Recherche des écrits...</p>';

    const { data: chapitres, error } = await window._supabase
        .from('chapitres')
        .select('*')
        .eq('histoire_id', idHistoire)
        .eq('est_publie', true) // Uniquement les chapitres marqués comme "Publiés" par l'auteur
        .order('numero', { ascending: true }); // Tri par numéro

    if (error) {
        chapitresListe.innerHTML = `<p class="text-error">Erreur de lecture : ${error.message}</p>`;
        return;
    }

    if (chapitres.length === 0) {
        chapitresListe.innerHTML = '<p class="text-muted-italic text-center mt-15">Aucun chapitre n\'est disponible pour le moment.</p>';
        const spanMots = document.getElementById('histoire-mots-count');
        if (spanMots) spanMots.innerText = "0";
        return;
    }

    chapitresListe.innerHTML = '';
    let totalMotsOeuvre = 0;
    const maintenant = new Date(); // L'heure magique !
    
    let prochainChapitre = null;
    let chapitresPublies = 0;

    chapitres.forEach(chap => {
        const dateChap = chap.date_publication ? new Date(chap.date_publication) : new Date();
        
        if (dateChap > maintenant) {
            // C'est un chapitre programmé (dans le futur)
            // On cherche le plus proche de nous (celui avec la date la plus petite)
            if (!prochainChapitre || dateChap < prochainChapitre.date) {
                prochainChapitre = { date: dateChap, numero: chap.numero };
            }
        } else {
            // C'est un chapitre publié
            chapitresPublies++;
            totalMotsOeuvre += chap.nombre_mots || 0;
            const dateAffichee = dateChap.toLocaleDateString('fr-FR');
            
            const div = document.createElement('div');
            div.className = "chapter-item";
            div.innerHTML = `
                <div>
                    <strong class="chapter-title">Chapitre ${chap.numero} : ${chap.titre}</strong>
                    <span class="published-date ml-10">(Publié le ${dateAffichee})</span>
                </div>
                <div>
                    <button class="genre-btn btn-outline-blue btn-small" onclick="alert('Lectorat en construction...')">Lire</button>
                </div>
            `;
            chapitresListe.appendChild(div);
        }
    });
    
    // Si aucun chapitre n'est publié, on affiche un message dans la liste
    if (chapitresPublies === 0) {
        chapitresListe.innerHTML = '<p class="text-muted-italic text-center mt-15">L\'œuvre n\'a pas encore de parchemin lisible.</p>';
    }

    // --- MISE À JOUR DE LA BOÎTE DE PROGRAMMATION ---
    const boxProchain = document.getElementById('prochain-chapitre-box');
    if (boxProchain) {
        if (prochainChapitre) {
            const dateAffichee = prochainChapitre.date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            boxProchain.innerHTML = `
                <div style="font-family: 'Cinzel', serif; color: var(--text-title); margin-bottom: 5px;">Prochaine publication :</div>
                <div style="color: #ffd700; font-weight: bold; letter-spacing: 1px;">Le ${dateAffichee}</div>
            `;
        } else {
            boxProchain.innerHTML = `
                <div style="color: var(--text-muted); font-style: italic;">Aucune publication programmée</div>
            `;
        }
    }

    // Mise à jour du compteur de mots global
    const spanMots = document.getElementById('histoire-mots-count');
    if (spanMots) {
        spanMots.innerText = totalMotsOeuvre.toLocaleString('fr-FR');
    }
}

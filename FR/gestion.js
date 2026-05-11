// ==========================================
// LE GESTIONNAIRE DE GRIMOIRE (gestion.js)
// Affichage des infos et tri des chapitres
// ==========================================

window.volumesOeuvreCache = [];
window.histoireGestionCache = null;

function escapeGestionHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function getVolumeCoverUrl(volume, histoire) {
    return window.getStoryCoverUrl(volume?.image_couverture || histoire?.image_couverture);
}

function getVolumeTitle(volumeId) {
    if (!volumeId) return 'Générale';
    const volume = (window.volumesOeuvreCache || []).find((item) => Number(item.id) === Number(volumeId));
    return volume?.titre || 'Générale';
}

function getNomFichierVolumeCover(file, session, histoireId) {
    const nomNettoye = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${session.user.id}/histoire-${histoireId}/${Date.now()}-${nomNettoye}`;
}

async function uploadVolumeCover(file, histoireId, session) {
    if (!file) return null;

    let fichierAEnvoyer = file;
    try {
        fichierAEnvoyer = await imageCompression(file, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1920,
            useWebWorker: true
        });
    } catch (compressionError) {
        console.error("Erreur de compression de couverture de volume :", compressionError);
    }

    const chemin = getNomFichierVolumeCover(file, session, histoireId);
    const { error } = await window._supabase.storage
        .from('VolumeCover')
        .upload(chemin, fichierAEnvoyer, { cacheControl: '3600', upsert: false });

    if (error) throw error;

    const { data } = window._supabase.storage.from('VolumeCover').getPublicUrl(chemin);
    return data.publicUrl;
}

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

    window.histoireGestionCache = histoire;

    // 2. Affichage des infos avec le style de base.css
    const imageCouverture = window.getStoryCoverUrl(histoire.image_couverture);
    const imgHtml = `<img src="${imageCouverture}" class="book-cover">`;

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

    // 3. On lance la récupération des volumes et chapitres
    await chargerVolumesOeuvre();
    chargerChapitresCategories();
};

window.chargerVolumesOeuvre = async function() {
    const liste = document.getElementById('volumes-liste');
    if (!liste || !window.currentOeuvreId) return;

    liste.innerHTML = '<p class="loading-text">Lecture des volumes...</p>';

    const { data: volumes, error } = await window._supabase
        .from('volumes')
        .select('*')
        .eq('histoire_id', window.currentOeuvreId)
        .order('ordre', { ascending: true })
        .order('id', { ascending: true });

    if (error) {
        liste.innerHTML = `<p class="text-error">Erreur volumes : ${error.message}</p>`;
        return;
    }

    window.volumesOeuvreCache = volumes || [];
    afficherVolumesOeuvre();
};

function afficherVolumesOeuvre() {
    const liste = document.getElementById('volumes-liste');
    const histoire = window.histoireGestionCache;
    if (!liste || !histoire) return;

    liste.innerHTML = '';

    const volumeGeneral = document.createElement('article');
    volumeGeneral.className = 'volume-item volume-general';
    volumeGeneral.innerHTML = `
        <img src="${window.getStoryCoverUrl(histoire.image_couverture)}" alt="Couverture générale" class="volume-cover-thumb">
        <div class="volume-info">
            <h3>Générale</h3>
            <p>Volume par défaut, non modifiable. Les chapitres sans volume restent ici.</p>
        </div>
        <span class="tag tag-statut">Base</span>
    `;
    liste.appendChild(volumeGeneral);

    if (!window.volumesOeuvreCache || window.volumesOeuvreCache.length === 0) {
        const vide = document.createElement('p');
        vide.className = 'text-muted-italic text-small';
        vide.innerText = "Aucun volume personnalisé pour le moment.";
        liste.appendChild(vide);
        return;
    }

    window.volumesOeuvreCache.forEach((volume) => {
        const item = document.createElement('article');
        item.className = 'volume-item';
        item.innerHTML = `
            <img src="${getVolumeCoverUrl(volume, histoire)}" alt="Couverture ${escapeGestionHtml(volume.titre)}" class="volume-cover-thumb">
            <div class="volume-info">
                <h3>${escapeGestionHtml(volume.titre)}</h3>
                <p>Ordre ${volume.ordre || 1}</p>
            </div>
            <button class="genre-btn btn-outline-red btn-small-last" type="button" data-volume-delete="${volume.id}">Supprimer</button>
        `;
        liste.appendChild(item);
    });
}

async function creerVolumeDepuisFormulaire(form) {
    const titreInput = document.getElementById('volume-title');
    const fileInput = document.getElementById('volume-cover-file');
    const submit = document.getElementById('btn-create-volume');
    const titre = titreInput?.value.trim();
    const file = fileInput?.files?.[0] || null;

    if (!titre) {
        await window.siteAlert("Donnez un nom au volume avant de le créer.", { danger: true });
        return;
    }

    const { data: { session } } = await window._supabase.auth.getSession();
    if (!session) {
        await window.siteAlert("Vous devez être connecté pour créer un volume.", { danger: true });
        return;
    }

    if (submit) {
        submit.disabled = true;
        submit.innerText = "Création...";
    }

    try {
        const imageUrl = file ? await uploadVolumeCover(file, window.currentOeuvreId, session) : null;
        const prochainOrdre = (window.volumesOeuvreCache || []).reduce((max, volume) => Math.max(max, Number(volume.ordre) || 0), 0) + 1;

        const { error } = await window._supabase
            .from('volumes')
            .insert([{
                histoire_id: window.currentOeuvreId,
                titre,
                image_couverture: imageUrl,
                ordre: prochainOrdre
            }]);

        if (error) throw error;

        form.reset();
        await window.chargerVolumesOeuvre();
    } catch (error) {
        await window.siteAlert("Impossible de créer le volume : " + error.message, { danger: true });
    } finally {
        if (submit) {
            submit.disabled = false;
            submit.innerText = "Créer le volume";
        }
    }
}

async function supprimerVolume(volumeId) {
    const volume = (window.volumesOeuvreCache || []).find((item) => Number(item.id) === Number(volumeId));
    if (!volume) return;

    const confirmation = await window.siteConfirm(`Supprimer le volume "${volume.titre}" ? Les chapitres associés retourneront dans Générale.`, {
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        danger: true
    });
    if (!confirmation) return;

    const { error } = await window._supabase
        .from('volumes')
        .delete()
        .eq('id', volumeId);

    if (error) {
        await window.siteAlert("Impossible de supprimer le volume : " + error.message, { danger: true });
        return;
    }

    await window.chargerVolumesOeuvre();
    window.chargerChapitresCategories();
}

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
                <strong class="chapter-title">Chapitre ${chap.numero} : ${escapeGestionHtml(chap.titre)}</strong>
                <span class="tag tag-volume">${escapeGestionHtml(getVolumeTitle(chap.volume_id))}</span>
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
    const confirmation = await window.siteConfirm("Détruire ce parchemin à jamais ? Cette action est irréversible.", {
        confirmText: 'Supprimer',
        cancelText: 'Annuler',
        danger: true
    });
    if (!confirmation) return;

    const { error } = await window._supabase.from('chapitres').delete().eq('id', id);
    if(error) await window.siteAlert("Supabase a bloqué la destruction : " + error.message, { danger: true });
    else window.chargerChapitresCategories(); // On recharge la liste instantanément
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
    if (e.target && e.target.id === 'btn-edit-histoire') {
        localStorage.setItem('modeEditionHistoire', 'true'); 
        window.changerDePage('creation-story');
    }
    if (e.target && e.target.id === 'btn-add-chapitre') {
        window.currentChapitreId = null; // C'est une création
        localStorage.removeItem('currentChapitreId');
        window.changerDePage('editeur-chapitre');
    }

    const boutonSuppressionVolume = e.target.closest('[data-volume-delete]');
    if (boutonSuppressionVolume) {
        supprimerVolume(boutonSuppressionVolume.dataset.volumeDelete);
    }
});

document.addEventListener('submit', (e) => {
    if (e.target && e.target.id === 'volume-create-form') {
        e.preventDefault();
        creerVolumeDepuisFormulaire(e.target);
    }
});

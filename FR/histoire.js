// ==========================================
// LE GRIMOIRE (histoire.js)
// Présentation de l'œuvre et liste des chapitres
// ==========================================

const COMMENTAIRES_MIN = 50;
const COMMENTAIRES_MAX = 1000;
const COMMENTAIRES_TABLE = 'commentaires';

window._commentairesInstances = window._commentairesInstances || {};

function getCommentaireElements(section) {
    return {
        feedback: section.querySelector('[data-role="feedback"]'),
        form: section.querySelector('[data-role="form"]'),
        message: section.querySelector('[data-role="message"]'),
        compteur: section.querySelector('[data-role="compteur"]'),
        liste: section.querySelector('[data-role="liste"]'),
        vide: section.querySelector('[data-role="vide"]'),
        tri: section.querySelector('[data-role="tri"]')
    };
}

function getCommentaireInstanceFromNode(node) {
    const section = node?.closest?.('[data-commentaires-root]');
    if (!section) return null;
    return window._commentairesInstances[section.id] || null;
}

function setCommentaireFeedback(instance, message = '', className = '') {
    if (!instance?.elements?.feedback) return;

    instance.elements.feedback.innerText = message;
    instance.elements.feedback.className = `commentaires-feedback text-small mt-15 ${className}`.trim();
    instance.elements.feedback.classList.toggle('hidden', !message);
}

function escapeCommentaireHtml(value = '') {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formaterDateCommentaire(value) {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    return date.toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formaterMessageCommentaire(message = '') {
    const escaped = escapeCommentaireHtml(message);
    const avecMentions = escaped.replace(
        /(^|[\s(])@([A-Za-z0-9_.-]{1,50})/g,
        '$1<span class="comment-mention">@$2</span>'
    );

    return avecMentions.replace(/\r?\n/g, '<br>');
}

function mettreAJourCompteurCommentaire(textarea, compteur) {
    if (!textarea || !compteur) return;
    compteur.innerText = `${textarea.value.length} / ${COMMENTAIRES_MAX}`;
}

function validerMessageCommentaire(message) {
    const texte = (message || '').trim();

    if (!texte) {
        return "Le message est obligatoire.";
    }

    if (texte.length < COMMENTAIRES_MIN) {
        return `Le message doit contenir au moins ${COMMENTAIRES_MIN} caracteres.`;
    }

    if (texte.length > COMMENTAIRES_MAX) {
        return `Le message ne peut pas depasser ${COMMENTAIRES_MAX} caracteres.`;
    }

    return '';
}

function estAuteurParent(histoire, session) {
    if (!histoire || !session?.user) return false;

    if (histoire.auteur_user_id && histoire.auteur_user_id === session.user.id) {
        return true;
    }

    return Boolean(histoire.auteur && session.user.email && histoire.auteur === session.user.email);
}

function resetCommentaireForm(instance) {
    if (!instance?.elements?.form || !instance.elements.message) return;

    instance.elements.form.reset();
    instance.commentaireEnEdition = null;
    mettreAJourCompteurCommentaire(instance.elements.message, instance.elements.compteur);
}

function renderCommentaires(instance) {
    const { liste, vide } = instance.elements;
    if (!liste || !vide) return;

    if (!instance.commentaires?.length) {
        liste.innerHTML = '';
        vide.classList.remove('hidden');
        return;
    }

    vide.classList.add('hidden');
    liste.innerHTML = instance.commentaires.map((commentaire) => {
        const estAuteurCommentaire = instance.session?.user?.id === commentaire.user_id;
        const peutModifier = estAuteurCommentaire;
        const peutSupprimer = estAuteurCommentaire || instance.estAuteurHistoire;
        const enEdition = String(instance.commentaireEnEdition) === String(commentaire.id);
        const dateAffichee = formaterDateCommentaire(commentaire.created_at);
        const pseudo = escapeCommentaireHtml(commentaire.pseudo_auteur || 'Comte inconnu');
        const message = formaterMessageCommentaire(commentaire.contenu || '');
        const texteEdition = escapeCommentaireHtml(commentaire.contenu || '');

        return `
            <article class="commentaire-item card" data-comment-id="${commentaire.id}">
                <div class="commentaire-meta">
                    <span class="commentaire-pseudo">${pseudo}</span>
                    <span class="commentaire-date">${dateAffichee}</span>
                </div>

                ${
                    enEdition
                        ? `
                            <div class="commentaire-edition mt-15">
                                <textarea class="custom-input commentaires-textarea" data-role="edit-message" minlength="${COMMENTAIRES_MIN}" maxlength="${COMMENTAIRES_MAX}">${texteEdition}</textarea>
                                <div class="commentaires-form-footer mt-15">
                                    <span class="commentaires-limites text-small text-muted">${COMMENTAIRES_MIN} a ${COMMENTAIRES_MAX} caracteres</span>
                                    <div class="commentaire-actions">
                                        <button type="button" class="genre-btn btn-primary btn-small" data-action="save-edit">Enregistrer</button>
                                        <button type="button" class="genre-btn btn-outline-blue btn-small-last" data-action="cancel-edit">Annuler</button>
                                    </div>
                                </div>
                            </div>
                        `
                        : `<div class="commentaire-message mt-15">${message}</div>`
                }

                ${
                    !enEdition && (peutModifier || peutSupprimer)
                        ? `
                            <div class="commentaire-actions mt-15">
                                ${peutModifier ? '<button type="button" class="genre-btn btn-outline-blue btn-small" data-action="edit">Modifier</button>' : ''}
                                ${peutSupprimer ? '<button type="button" class="genre-btn btn-outline-red btn-small-last" data-action="delete">Supprimer</button>' : ''}
                            </div>
                        `
                        : ''
                }
            </article>
        `;
    }).join('');
}

async function chargerCommentairesInstance(instance) {
    if (!instance?.section) return;

    const triAscendant = instance.elements.tri?.value === 'anciens';
    instance.elements.liste.innerHTML = '<p class="loading-text">Chargement des commentaires...</p>';
    setCommentaireFeedback(instance);

    const histoireIdCible = instance.cibleType === 'chapitre'
        ? instance.chapitreReference?.histoire_id
        : instance.histoire.id;
    const chapitreIdCible = instance.cibleType === 'chapitre'
        ? instance.chapitreReference?.id
        : null;

    let requete = window._supabase
        .from(COMMENTAIRES_TABLE)
        .select('id, user_id, pseudo_auteur, histoire_id, chapitre_id, cible_type, contenu, created_at, updated_at')
        .eq('histoire_id', histoireIdCible)
        .eq('cible_type', instance.cibleType)
        .order('created_at', { ascending: triAscendant });

    if (instance.cibleType === 'chapitre') {
        requete = requete.eq('chapitre_id', chapitreIdCible);
    } else {
        requete = requete.is('chapitre_id', null);
    }

    const { data, error } = await requete;

    if (error) {
        instance.commentaires = [];
        instance.elements.liste.innerHTML = '';
        instance.elements.vide.classList.add('hidden');
        setCommentaireFeedback(instance, `Impossible de charger les commentaires : ${error.message}`, 'text-error');
        return;
    }

    instance.commentaires = data || [];
    renderCommentaires(instance);
}

window.recupererContexteCommentaires = async function() {
    const { data: authData } = await window._supabase.auth.getSession();
    const session = authData?.session || null;

    if (!session) {
        return {
            session: null,
            pseudo: null,
            peutAfficherCommentaires: false,
            profil: null
        };
    }

    const { data: profil, error } = await window._supabase
        .from('noms_de_plume')
        .select('pseudo, afficher_commentaires')
        .eq('user_id', session.user.id)
        .maybeSingle();

    if (error) {
        return {
            session,
            pseudo: session.user.user_metadata?.pseudo || localStorage.getItem('userPseudo') || session.user.email?.split('@')[0] || 'Comte',
            peutAfficherCommentaires: false,
            profil: null
        };
    }

    return {
        session,
        profil: profil || null,
        pseudo: profil?.pseudo || session.user.user_metadata?.pseudo || localStorage.getItem('userPseudo') || session.user.email?.split('@')[0] || 'Comte',
        peutAfficherCommentaires: profil ? profil.afficher_commentaires !== false : true
    };
};

async function recupererReferenceChapitre(chapitreId) {
    if (!chapitreId) return null;

    const { data, error } = await window._supabase
        .from('chapitres')
        .select('id, histoire_id')
        .eq('id', chapitreId)
        .single();

    if (error || !data) {
        return null;
    }

    return data;
}

window.initialiserBlocCommentaires = async function({ sectionId, cibleType, histoire, chapitreId = null }) {
    const section = document.getElementById(sectionId);
    if (!section || !histoire?.id) return;

    const elements = getCommentaireElements(section);
    const contexte = await window.recupererContexteCommentaires();

    if (!contexte.session || !contexte.peutAfficherCommentaires) {
        section.classList.add('hidden');
        delete window._commentairesInstances[sectionId];
        return;
    }

    const instance = {
        sectionId,
        section,
        elements,
        session: contexte.session,
        pseudo: contexte.pseudo,
        profil: contexte.profil,
        histoire,
        chapitreId,
        chapitreReference: null,
        cibleType,
        estAuteurHistoire: estAuteurParent(histoire, contexte.session),
        commentaires: [],
        commentaireEnEdition: null
    };

    if (cibleType === 'chapitre') {
        instance.chapitreReference = await recupererReferenceChapitre(chapitreId);

        if (!instance.chapitreReference) {
            section.classList.remove('hidden');
            window._commentairesInstances[sectionId] = instance;
            instance.elements.liste.innerHTML = '';
            instance.elements.vide.classList.add('hidden');
            setCommentaireFeedback(instance, "Impossible de verifier le chapitre avant de charger les commentaires.", 'text-error');
            return;
        }

        instance.histoire = {
            ...histoire,
            id: instance.chapitreReference.histoire_id
        };
    }

    section.classList.remove('hidden');
    window._commentairesInstances[sectionId] = instance;
    resetCommentaireForm(instance);
    await chargerCommentairesInstance(instance);
};

async function publierCommentaire(instance) {
    const message = instance.elements.message?.value || '';
    const erreurValidation = validerMessageCommentaire(message);

    if (erreurValidation) {
        setCommentaireFeedback(instance, erreurValidation, 'text-error');
        return;
    }

    const bouton = instance.elements.form?.querySelector('button[type="submit"]');
    if (bouton) {
        bouton.disabled = true;
        bouton.innerText = 'Publication...';
    }

    const payload = {
        user_id: instance.session.user.id,
        pseudo_auteur: instance.pseudo,
        histoire_id: instance.histoire.id,
        chapitre_id: instance.cibleType === 'chapitre' ? instance.chapitreId : null,
        cible_type: instance.cibleType,
        contenu: message.trim()
    };

    const { error } = await window._supabase.from(COMMENTAIRES_TABLE).insert([payload]);

    if (bouton) {
        bouton.disabled = false;
        bouton.innerText = 'Publier';
    }

    if (error) {
        setCommentaireFeedback(instance, `Impossible de publier ce commentaire : ${error.message}`, 'text-error');
        return;
    }

    await chargerCommentairesInstance(instance);
    resetCommentaireForm(instance);
    setCommentaireFeedback(instance, 'Commentaire publie avec succes.', 'text-success');
}

async function publierCommentaireChapitre(instance) {
    const message = instance.elements.message?.value || '';
    const erreurValidation = validerMessageCommentaire(message);

    if (erreurValidation) {
        setCommentaireFeedback(instance, erreurValidation, 'text-error');
        return;
    }

    const referenceChapitre = await recupererReferenceChapitre(instance.chapitreId);
    if (!referenceChapitre) {
        setCommentaireFeedback(instance, "Impossible de verifier les informations du chapitre avant publication.", 'text-error');
        return;
    }

    instance.chapitreReference = referenceChapitre;
    instance.histoire = {
        ...instance.histoire,
        id: referenceChapitre.histoire_id
    };

    const payload = {
        cible_type: 'chapitre',
        histoire_id: referenceChapitre.histoire_id,
        chapitre_id: referenceChapitre.id,
        pseudo_auteur: instance.pseudo,
        user_id: instance.session.user.id,
        contenu: message.trim()
    };

    const bouton = instance.elements.form?.querySelector('button[type="submit"]');
    if (bouton) {
        bouton.disabled = true;
        bouton.innerText = 'Publication...';
    }

    const { data, error } = await window._supabase
        .from(COMMENTAIRES_TABLE)
        .insert([payload])
        .select('id, cible_type, histoire_id, chapitre_id, pseudo_auteur, user_id, contenu')
        .single();

    if (bouton) {
        bouton.disabled = false;
        bouton.innerText = 'Publier';
    }

    if (error) {
        setCommentaireFeedback(instance, `Impossible de publier ce commentaire de chapitre : ${error.message}`, 'text-error');
        return;
    }

    const insertionValide = data
        && data.cible_type === 'chapitre'
        && String(data.chapitre_id) === String(referenceChapitre.id)
        && String(data.histoire_id) === String(referenceChapitre.histoire_id)
        && String(data.user_id) === String(instance.session.user.id)
        && data.pseudo_auteur === instance.pseudo
        && data.contenu === payload.contenu;

    if (!insertionValide) {
        setCommentaireFeedback(instance, "Le commentaire n'a pas ete confirme par la base pour ce chapitre.", 'text-error');
        return;
    }

    await chargerCommentairesInstance(instance);
    resetCommentaireForm(instance);
    setCommentaireFeedback(instance, 'Commentaire de chapitre publie avec succes.', 'text-success');
}

async function enregistrerEditionCommentaire(instance, card) {
    const commentaireId = card?.dataset?.commentId;
    if (!commentaireId) return;

    const textarea = card.querySelector('[data-role="edit-message"]');
    const message = textarea?.value || '';
    const erreurValidation = validerMessageCommentaire(message);

    if (erreurValidation) {
        setCommentaireFeedback(instance, erreurValidation, 'text-error');
        return;
    }

    const { error } = await window._supabase
        .from(COMMENTAIRES_TABLE)
        .update({
            contenu: message.trim(),
            pseudo_auteur: instance.pseudo,
            updated_at: new Date().toISOString()
        })
        .eq('id', commentaireId)
        .eq('user_id', instance.session.user.id);

    if (error) {
        setCommentaireFeedback(instance, `Impossible de modifier ce commentaire : ${error.message}`, 'text-error');
        return;
    }

    instance.commentaireEnEdition = null;
    await chargerCommentairesInstance(instance);
    setCommentaireFeedback(instance, 'Commentaire modifie avec succes.', 'text-success');
}

async function supprimerCommentaireInstance(instance, commentaireId) {
    const { error } = await window._supabase
        .from(COMMENTAIRES_TABLE)
        .delete()
        .eq('id', commentaireId);

    if (error) {
        setCommentaireFeedback(instance, `Impossible de supprimer ce commentaire : ${error.message}`, 'text-error');
        return;
    }

    instance.commentaireEnEdition = null;
    await chargerCommentairesInstance(instance);
    setCommentaireFeedback(instance, 'Commentaire supprime.', 'text-success');
}

if (!window.commentairesEventsHooked) {
    document.addEventListener('input', (event) => {
        if (event.target?.matches?.('[data-role="message"]')) {
            const instance = getCommentaireInstanceFromNode(event.target);
            if (!instance) return;
            mettreAJourCompteurCommentaire(event.target, instance.elements.compteur);
        }
    });

    document.addEventListener('change', async (event) => {
        if (event.target?.matches?.('[data-role="tri"]')) {
            const instance = getCommentaireInstanceFromNode(event.target);
            if (!instance) return;
            await chargerCommentairesInstance(instance);
        }
    });

    document.addEventListener('submit', async (event) => {
        if (!event.target?.matches?.('[data-role="form"]')) return;
        event.preventDefault();

        const instance = getCommentaireInstanceFromNode(event.target);
        if (!instance) return;

        if (instance.cibleType === 'chapitre') {
            await publierCommentaireChapitre(instance);
        } else {
            await publierCommentaire(instance);
        }
    });

    document.addEventListener('click', async (event) => {
        const action = event.target?.dataset?.action;
        if (!action) return;

        const instance = getCommentaireInstanceFromNode(event.target);
        if (!instance) return;

        const card = event.target.closest('[data-comment-id]');
        const commentaireId = card?.dataset?.commentId;
        if (!commentaireId) return;

        if (action === 'edit') {
            instance.commentaireEnEdition = commentaireId;
            setCommentaireFeedback(instance);
            renderCommentaires(instance);
            return;
        }

        if (action === 'cancel-edit') {
            instance.commentaireEnEdition = null;
            setCommentaireFeedback(instance);
            renderCommentaires(instance);
            return;
        }

        if (action === 'save-edit') {
            await enregistrerEditionCommentaire(instance, card);
            return;
        }

        if (action === 'delete') {
            const ok = window.confirm('Supprimer ce commentaire ? Cette action est irreversible.');
            if (!ok) return;
            await supprimerCommentaireInstance(instance, commentaireId);
        }
    });

    window.commentairesEventsHooked = true;
}

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

    // 7. Chargement des commentaires globaux
    await window.initialiserBlocCommentaires({
        sectionId: 'commentaires-histoire-section',
        cibleType: 'histoire',
        histoire
    });
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
                    <button class="genre-btn btn-outline-blue btn-small" onclick="localStorage.setItem('currentChapitreId', ${chap.id}); window.changerDePage('lecture');">Lire</button>
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

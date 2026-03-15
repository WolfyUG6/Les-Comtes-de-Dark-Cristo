// ==========================================
// LE GARDIEN (auth.js)
// Gestion de la connexion et de l'identité
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    
    const authModal = document.getElementById('auth-modal');
    const emailInput = document.getElementById('email-input');
    const passwordInput = document.getElementById('password-input');
    const submitAuth = document.getElementById('submit-auth');
    const btnLogin = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    const closeModal = document.getElementById('close-modal');
    const btnLogout = document.getElementById('btn-logout');

    let isSignUp = false;

    if(btnLogin) {
        btnLogin.addEventListener('click', () => {
            isSignUp = false;
            authModal.classList.remove('hidden');
            submitAuth.innerText = "Se connecter";
        });
    }

    if(btnSignup) {
        btnSignup.addEventListener('click', () => {
            isSignUp = true;
            authModal.classList.remove('hidden');
            submitAuth.innerText = "Créer mon compte";
        });
    }

    if(closeModal) {
        closeModal.addEventListener('click', () => {
            authModal.classList.add('hidden');
        });
    }

    if(submitAuth) {
        submitAuth.addEventListener('click', async () => {
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!email || !password) {
                alert("Les ténèbres exigent un mail et un mot de passe.");
                return;
            }

            submitAuth.innerText = "Incantation...";
            submitAuth.disabled = true;

            try {
                if (isSignUp) {
                    const { data, error } = await window._supabase.auth.signUp({ email, password });
                    if (error) throw error;
                    alert("Compte créé ! Bienvenue dans le Sanctuaire.");
                    authModal.classList.add('hidden');
                    emailInput.value = '';
                } else {
                    const { data, error } = await window._supabase.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                    authModal.classList.add('hidden');
                    emailInput.value = '';
                }
            } catch (erreur) {
                alert("Refus du Sanctuaire : " + erreur.message);
            } finally {
                submitAuth.innerText = isSignUp ? "Créer mon compte" : "Se connecter";
                submitAuth.disabled = false;
                passwordInput.value = '';
            }
        });
    }

    if(btnLogout) {
        btnLogout.addEventListener('click', async () => {
            try {
                await window._supabase.auth.signOut();
                alert("Vous avez quitté le sanctuaire.");
                window.changerDePage('accueil');
            } catch (err) {
                console.error("Erreur de déconnexion", err);
            }
        });
    }
});

// ==========================================
// SURVEILLANCE DE L'ÉTAT (Le Radar)
// Version stable : lit user_metadata en priorité
// puis tente noms_de_plume en fallback silencieux
// ==========================================
window._supabase.auth.onAuthStateChange((event, session) => {
    try {
        const authContainer = document.getElementById('auth-container');
        const userContainer = document.getElementById('user-container');
        const userNameDisplay = document.getElementById('user-name');
        const headerAvatar = document.getElementById('header-avatar');
        const btnForge = document.getElementById('btn-atelier-nav');

        if (session) {
            if(authContainer) authContainer.classList.add('hidden');
            if(userContainer) userContainer.classList.remove('hidden');

            // Priorité 1 : user_metadata (toujours disponible, même au F5)
            let finalPseudo = session.user.user_metadata?.pseudo || null;
            let finalAvatar = session.user.user_metadata?.avatar_url || null;
            let isAuteur = session.user.user_metadata?.mode_auteur === true;

            // Priorité 2 : localStorage (fallback si user_metadata vide)
            if (!finalPseudo) {
                const stored = localStorage.getItem('userPseudo');
                if (stored && stored !== "undefined" && stored !== "null") finalPseudo = stored;
            }
            if (!finalAvatar) {
                const stored = localStorage.getItem('userAvatar');
                if (stored && stored !== "undefined" && stored !== "null") finalAvatar = stored;
            }
            if (!isAuteur) {
                isAuteur = localStorage.getItem('modeAuteur') === 'true';
            }

            // Priorité 3 : email comme dernier recours
            if (!finalPseudo) finalPseudo = session.user.email.split('@')[0];
            if (!finalAvatar) finalAvatar = 'default-avatar.png';

            // Affichage
            if(userNameDisplay) userNameDisplay.innerText = "Comte " + finalPseudo;
            if(headerAvatar) headerAvatar.src = finalAvatar;

            const previewAvatar = document.getElementById('profile-avatar-preview');
            if (previewAvatar) previewAvatar.src = finalAvatar;

            if (btnForge) {
                btnForge.style.display = isAuteur ? "block" : "none";
            }

            // Tentative silencieuse de migration pour les anciens comptes
            // Si user_metadata.pseudo est vide, on essaie de le remplir depuis noms_de_plume
            if (!session.user.user_metadata?.pseudo) {
                window._supabase
                    .from('noms_de_plume')
                    .select('pseudo, avatar_url, mode_auteur')
                    .eq('user_id', session.user.id)
                    .maybeSingle()
                    .then(({ data: profil }) => {
                        if (profil && profil.pseudo) {
                            // On migre les données vers user_metadata pour les prochains F5
                            window._supabase.auth.updateUser({
                                data: {
                                    pseudo: profil.pseudo,
                                    avatar_url: profil.avatar_url || undefined,
                                    mode_auteur: profil.mode_auteur === true
                                }
                            }).then(() => {
                                // Mise à jour visuelle immédiate
                                if(userNameDisplay) userNameDisplay.innerText = "Comte " + profil.pseudo;
                                if(headerAvatar && profil.avatar_url) headerAvatar.src = profil.avatar_url;
                                if(btnForge) btnForge.style.display = profil.mode_auteur === true ? "block" : "none";
                                localStorage.setItem('userPseudo', profil.pseudo);
                                if(profil.avatar_url) localStorage.setItem('userAvatar', profil.avatar_url);
                                localStorage.setItem('modeAuteur', profil.mode_auteur === true);
                            });
                        }
                    })
                    .catch(() => {}); // Silencieux si ça plante
            }

            // Admin
            if (session.user.email === "nitroapex@gmail.com") {
                window.estAdmin = true;
            } else {
                window.estAdmin = false;
            }

            if(typeof window.activerBouclier === 'function') window.activerBouclier();

        } else {
            if(authContainer) authContainer.classList.remove('hidden');
            if(userContainer) userContainer.classList.add('hidden');
            if (btnForge) btnForge.style.display = "none";
            window.estAdmin = false;
            if(typeof window.activerBouclier === 'function') window.activerBouclier();
        }
    } catch (e) {
        console.error("Le radar a trébuché :", e);
    }
});

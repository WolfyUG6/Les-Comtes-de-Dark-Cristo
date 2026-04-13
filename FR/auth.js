// ==========================================
// LE GARDIEN (auth.js)
// Gestion de la connexion, de l'inscription
// et de la récupération de mot de passe
// ==========================================

window._authRefs = null;
window._authModalMode = 'login';
window._authPasswordRecoveryPending = false;

function getAuthRefs() {
    return window._authRefs;
}

window.getAuthCanonicalAppUrl = function() {
    const url = new URL(window.location.href);
    url.hash = '';
    url.search = '';

    if (url.hostname === 'wolfyug6.github.io') {
        url.pathname = '/Les-Comtes-de-Dark-Cristo/FR/maitre.html';
    }

    return url.toString();
};

window.getAuthSignupRedirectUrl = function() {
    return window.getAuthCanonicalAppUrl();
};

window.getAuthRecoveryRedirectUrl = function() {
    const url = new URL(window.getAuthCanonicalAppUrl());
    url.searchParams.set('auth', 'recovery');
    return url.toString();
};

window.estDansFluxRecuperationMotDePasse = function() {
    const params = new URLSearchParams(window.location.search);
    return params.get('auth') === 'recovery';
};

window.nettoyerUrlRecuperationMotDePasse = function() {
    const params = new URLSearchParams(window.location.search);
    const contientFluxRecovery = params.get('auth') === 'recovery';
    const contientHashAuth = typeof estHashAuthSupabase === 'function' && estHashAuthSupabase(window.location.hash);

    if (!contientFluxRecovery && !contientHashAuth) return;

    const url = new URL(window.location.href);
    url.searchParams.delete('auth');
    url.hash = '';
    window.history.replaceState({}, document.title, url.toString());
};

function nettoyerChampsAuth({ garderEmail = false } = {}) {
    const refs = getAuthRefs();
    if (!refs) return;

    if (!garderEmail) refs.emailInput.value = '';
    refs.passwordInput.value = '';
    refs.resetPasswordInput.value = '';
    refs.resetPasswordConfirm.value = '';
}

window.mettreAJourModeAuthModal = function(mode = 'login') {
    const refs = getAuthRefs();
    if (!refs) return;

    window._authModalMode = mode;
    const estInscription = mode === 'signup';
    const estRecovery = mode === 'recovery';

    refs.authStandardPanel.classList.toggle('hidden', estRecovery);
    refs.authRecoveryPanel.classList.toggle('hidden', !estRecovery);
    refs.forgotPasswordLink.classList.toggle('hidden', estInscription || estRecovery);

    if (estRecovery) {
        refs.authModalTitle.innerText = 'Réinitialiser votre mot de passe';
        refs.submitAuth.innerText = 'Mettre à jour';
    } else if (estInscription) {
        refs.authModalTitle.innerText = 'Créer un compte';
        refs.submitAuth.innerText = 'Créer mon compte';
    } else {
        refs.authModalTitle.innerText = 'Entrez dans le Sanctuaire';
        refs.submitAuth.innerText = 'Se connecter';
    }
};

window.ouvrirModaleAuth = function(mode = 'login') {
    const refs = getAuthRefs();
    if (!refs) return;

    window.mettreAJourModeAuthModal(mode);
    refs.authModal.classList.remove('hidden');
    refs.submitAuth.disabled = false;
    refs.closeModal.disabled = false;
    refs.forgotPasswordLink.disabled = false;
    refs.forgotPasswordLink.innerText = 'Mot de passe oublié ?';

    if (mode === 'recovery') {
        refs.resetPasswordInput.focus();
    } else {
        refs.emailInput.focus();
    }
};

window.ouvrirModaleRecuperationMotDePasse = function() {
    window._authPasswordRecoveryPending = true;
    window.ouvrirModaleAuth('recovery');
};

window.fermerModaleAuth = function() {
    const refs = getAuthRefs();
    if (!refs) return;

    refs.authModal.classList.add('hidden');
    refs.submitAuth.disabled = false;
    refs.closeModal.disabled = false;
    refs.forgotPasswordLink.disabled = false;
    refs.forgotPasswordLink.innerText = 'Mot de passe oublié ?';
    nettoyerChampsAuth();
    window.mettreAJourModeAuthModal('login');
};

window.demanderReinitialisationMotDePasse = async function() {
    const refs = getAuthRefs();
    if (!refs) return;

    const email = refs.emailInput.value.trim();
    if (!email) {
        await window.siteAlert("Entrez votre adresse e-mail avant de demander une réinitialisation.");
        return;
    }

    refs.forgotPasswordLink.disabled = true;
    refs.submitAuth.disabled = true;
    refs.forgotPasswordLink.innerText = 'Envoi...';

    try {
        const { error } = await window._supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.getAuthRecoveryRedirectUrl()
        });

        if (error) throw error;

        refs.passwordInput.value = '';
        await window.siteAlert("Si cette adresse existe dans le Sanctuaire, un e-mail de récupération vient d’être envoyé.");
    } catch (erreur) {
        await window.siteAlert("Impossible d’envoyer l’e-mail de récupération : " + erreur.message, { danger: true });
    } finally {
        refs.forgotPasswordLink.disabled = false;
        refs.submitAuth.disabled = false;
        refs.forgotPasswordLink.innerText = 'Mot de passe oublié ?';
    }
};

window.finaliserReinitialisationMotDePasse = async function() {
    const refs = getAuthRefs();
    if (!refs) return;

    const nouveauMotDePasse = refs.resetPasswordInput.value;
    const confirmation = refs.resetPasswordConfirm.value;

    if (!nouveauMotDePasse || !confirmation) {
        await window.siteAlert("Entrez et confirmez votre nouveau mot de passe.");
        return;
    }

    if (nouveauMotDePasse !== confirmation) {
        await window.siteAlert("La confirmation du mot de passe ne correspond pas.", { danger: true });
        refs.resetPasswordConfirm.value = '';
        refs.resetPasswordConfirm.focus();
        return;
    }

    refs.submitAuth.disabled = true;
    refs.closeModal.disabled = true;
    refs.submitAuth.innerText = 'Mise à jour...';

    try {
        const { error } = await window._supabase.auth.updateUser({
            password: nouveauMotDePasse
        });

        if (error) throw error;

        window._authPasswordRecoveryPending = false;
        window.nettoyerUrlRecuperationMotDePasse();
        await window.siteAlert("Votre mot de passe a bien été mis à jour.");
        window.fermerModaleAuth();
    } catch (erreur) {
        await window.siteAlert("Impossible de mettre à jour le mot de passe : " + erreur.message, { danger: true });
    } finally {
        refs.submitAuth.disabled = false;
        refs.closeModal.disabled = false;
        if (window._authModalMode === 'recovery') {
            refs.submitAuth.innerText = 'Mettre à jour';
        }
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    window._authRefs = {
        authModal: document.getElementById('auth-modal'),
        authModalTitle: document.getElementById('auth-modal-title'),
        authStandardPanel: document.getElementById('auth-standard-panel'),
        authRecoveryPanel: document.getElementById('auth-recovery-panel'),
        emailInput: document.getElementById('email-input'),
        passwordInput: document.getElementById('password-input'),
        resetPasswordInput: document.getElementById('reset-password-input'),
        resetPasswordConfirm: document.getElementById('reset-password-confirm'),
        submitAuth: document.getElementById('submit-auth'),
        btnLogin: document.getElementById('btn-login'),
        btnSignup: document.getElementById('btn-signup'),
        closeModal: document.getElementById('close-modal'),
        btnLogout: document.getElementById('btn-logout'),
        forgotPasswordLink: document.getElementById('forgot-password-link')
    };

    const refs = getAuthRefs();
    if (!refs) return;

    window.mettreAJourModeAuthModal('login');

    if (refs.btnLogin) {
        refs.btnLogin.addEventListener('click', () => {
            nettoyerChampsAuth();
            window.ouvrirModaleAuth('login');
        });
    }

    if (refs.btnSignup) {
        refs.btnSignup.addEventListener('click', () => {
            nettoyerChampsAuth();
            window.ouvrirModaleAuth('signup');
        });
    }

    if (refs.closeModal) {
        refs.closeModal.addEventListener('click', () => {
            refs.authModal.classList.add('hidden');
            refs.submitAuth.disabled = false;
            refs.closeModal.disabled = false;
            refs.forgotPasswordLink.disabled = false;
            refs.forgotPasswordLink.innerText = 'Mot de passe oublié ?';
            nettoyerChampsAuth();
            window.mettreAJourModeAuthModal('login');
        });
    }

    if (refs.forgotPasswordLink) {
        refs.forgotPasswordLink.addEventListener('click', async () => {
            if (window._authModalMode !== 'login') return;
            await window.demanderReinitialisationMotDePasse();
        });
    }

    if (refs.submitAuth) {
        refs.submitAuth.addEventListener('click', async () => {
            if (window._authModalMode === 'recovery') {
                await window.finaliserReinitialisationMotDePasse();
                return;
            }

            const email = refs.emailInput.value.trim();
            const password = refs.passwordInput.value;
            const estInscription = window._authModalMode === 'signup';

            if (!email || !password) {
                await window.siteAlert("Les ténèbres exigent un mail et un mot de passe.");
                return;
            }

            refs.submitAuth.innerText = "Incantation...";
            refs.submitAuth.disabled = true;

            try {
                if (estInscription) {
                    const { data, error } = await window._supabase.auth.signUp({
                        email,
                        password,
                        options: {
                            emailRedirectTo: window.getAuthSignupRedirectUrl()
                        }
                    });
                    if (error) throw error;

                    if (data?.session) {
                        await window.siteAlert("Compte créé et accès ouvert. Bienvenue dans le Sanctuaire.");
                    } else {
                        await window.siteAlert("Un e-mail de confirmation vient d'être envoyé. Ouvrez ce message et confirmez votre compte avant de pouvoir l'utiliser pleinement.");
                    }

                    refs.authModal.classList.add('hidden');
                    refs.emailInput.value = '';
                } else {
                    const { error } = await window._supabase.auth.signInWithPassword({ email, password });
                    if (error) throw error;
                    refs.authModal.classList.add('hidden');
                    refs.emailInput.value = '';
                }
            } catch (erreur) {
                await window.siteAlert("Refus du Sanctuaire : " + erreur.message, { danger: true });
            } finally {
                refs.submitAuth.innerText = estInscription ? "Créer mon compte" : "Se connecter";
                refs.submitAuth.disabled = false;
                refs.passwordInput.value = '';
            }
        });
    }

    if (refs.btnLogout) {
        refs.btnLogout.addEventListener('click', async () => {
            try {
                await window._supabase.auth.signOut();
                await window.siteAlert("Vous avez quitté le sanctuaire.");
                window.changerDePage('accueil');
            } catch (err) {
                console.error("Erreur de déconnexion", err);
            }
        });
    }

    const { data: { session } } = await window._supabase.auth.getSession();
    if (window._authPasswordRecoveryPending || (window.estDansFluxRecuperationMotDePasse() && session)) {
        window.ouvrirModaleRecuperationMotDePasse();
    }
});

// ==========================================
// SURVEILLANCE DE L'ÉTAT (Le Radar)
// Version stable : lit user_metadata en priorité
// puis tente noms_de_plume en fallback silencieux
// ==========================================
window._supabase.auth.onAuthStateChange((event, session) => {
    try {
        if (event === 'PASSWORD_RECOVERY') {
            window._authPasswordRecoveryPending = true;
            if (typeof window.ouvrirModaleRecuperationMotDePasse === 'function') {
                window.ouvrirModaleRecuperationMotDePasse();
            }
        }

        const authContainer = document.getElementById('auth-container');
        const userContainer = document.getElementById('user-container');
        const userNameDisplay = document.getElementById('user-name');
        const headerAvatar = document.getElementById('header-avatar');
        const btnForge = document.getElementById('btn-atelier-nav');

        if (session) {
            if (authContainer) authContainer.classList.add('hidden');
            if (userContainer) userContainer.classList.remove('hidden');

            let finalPseudo = session.user.user_metadata?.pseudo || null;
            let finalAvatar = session.user.user_metadata?.avatar_url || null;
            let isAuteur = session.user.user_metadata?.mode_auteur === true;

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

            if (!finalPseudo) finalPseudo = session.user.email.split('@')[0];
            if (!finalAvatar) finalAvatar = 'default-avatar.png';

            if (userNameDisplay) userNameDisplay.innerText = "Comte " + finalPseudo;
            if (headerAvatar) headerAvatar.src = finalAvatar;

            const previewAvatar = document.getElementById('profile-avatar-preview');
            if (previewAvatar) previewAvatar.src = finalAvatar;

            if (btnForge) {
                btnForge.style.display = isAuteur ? "block" : "none";
            }

            if (!session.user.user_metadata?.pseudo) {
                window._supabase
                    .from('noms_de_plume')
                    .select('pseudo, avatar_url, mode_auteur')
                    .eq('user_id', session.user.id)
                    .maybeSingle()
                    .then(({ data: profil }) => {
                        if (profil && profil.pseudo) {
                            window._supabase.auth.updateUser({
                                data: {
                                    pseudo: profil.pseudo,
                                    avatar_url: profil.avatar_url || undefined,
                                    mode_auteur: profil.mode_auteur === true
                                }
                            }).then(() => {
                                if (userNameDisplay) userNameDisplay.innerText = "Comte " + profil.pseudo;
                                if (headerAvatar && profil.avatar_url) headerAvatar.src = profil.avatar_url;
                                if (btnForge) btnForge.style.display = profil.mode_auteur === true ? "block" : "none";
                                localStorage.setItem('userPseudo', profil.pseudo);
                                if (profil.avatar_url) localStorage.setItem('userAvatar', profil.avatar_url);
                                localStorage.setItem('modeAuteur', profil.mode_auteur === true);
                            });
                        }
                    })
                    .catch(() => {});
            }

            window.estAdmin = session.user.email === "nitroapex@gmail.com";
            if (typeof window.activerBouclier === 'function') window.activerBouclier();
        } else {
            if (authContainer) authContainer.classList.remove('hidden');
            if (userContainer) userContainer.classList.add('hidden');
            if (btnForge) btnForge.style.display = "none";
            window.estAdmin = false;
            if (typeof window.activerBouclier === 'function') window.activerBouclier();
        }
    } catch (e) {
        console.error("Le radar a trébuché :", e);
    }
});

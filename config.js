// Le Cœur du Sanctuaire - Configuration Supabase
const supabaseUrl = 'https://kbpefbjyuuzadssdbahl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGVmYmp5dXV6YWRzc2RiYWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzAzOTcsImV4cCI6MjA4ODQ0NjM5N30.XKqPt0rJO7pAL1M7PapMLf4f7uw2PQQAUhMOG-PexzI';

// Initialisation de la connexion unique
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// On rend la connexion accessible aux autres fichiers
window._supabase = _supabase;

// --- LE CHEF D'ORCHESTRE (Gestion propre du SPA) ---
window.changerDePage = function(pageDemandee) {
    // 1. On ferme TOUTES les pages du sanctuaire
    document.getElementById('stories-container').style.display = 'none';
    document.getElementById('oeuvre-page').style.display = 'none';
    document.getElementById('studio-page').style.display = 'none';
    document.getElementById('quartiers-page').style.display = 'none';
    document.getElementById('creation-page').style.display = 'none';
    document.getElementById('gestion-page').style.display = 'none'; // <-- L'oubli était ici
	document.getElementById('lecture-page').style.display = 'none';
	document.getElementById('editeur-chapitre-page').style.display = 'none';

    // 2. On cache tous les éléments d'en-tête (logos, menus)
    document.getElementById('hero-logo-area').style.display = 'none';
    document.getElementById('mini-logo').style.display = 'none';
    document.getElementById('main-genre-menu').style.display = 'none';

    // 3. On allume UNIQUEMENT ce qui est nécessaire pour la page demandée
    if (pageDemandee === 'accueil') {
        document.getElementById('stories-container').style.display = 'flex';
        document.getElementById('hero-logo-area').style.display = 'block';
        document.getElementById('main-genre-menu').style.display = 'block';
    } 
    else if (pageDemandee === 'oeuvre') {
        document.getElementById('oeuvre-page').style.display = 'block';
        document.getElementById('mini-logo').style.display = 'flex';
    } 
    else if (pageDemandee === 'studio') {
        document.getElementById('studio-page').style.display = 'block';
        document.getElementById('mini-logo').style.display = 'flex';
    } 
    else if (pageDemandee === 'quartiers') {
        document.getElementById('quartiers-page').style.display = 'block';
        document.getElementById('mini-logo').style.display = 'flex';
    }
    else if (pageDemandee === 'creation') {
        document.getElementById('creation-page').style.display = 'block';
        document.getElementById('mini-logo').style.display = 'flex';
    }
    else if (pageDemandee === 'gestion') { // <-- Et ici !
        document.getElementById('gestion-page').style.display = 'block';
        document.getElementById('mini-logo').style.display = 'flex';
    }
	else if (pageDemandee === 'editeur-chapitre') { 
        document.getElementById('editeur-chapitre-page').style.display = 'block';
        document.getElementById('mini-logo').style.display = 'flex';
    }
	else if (pageDemandee === 'lecture') { 
        document.getElementById('lecture-page').style.display = 'block';
        document.getElementById('mini-logo').style.display = 'flex';
    }
};

// --- LE MÉCANISME DU PIÉDESTAL (Interrupteur 3 positions) ---
window.changerTheme = function(state) {
    const toggleContainer = document.getElementById('footer-toggle');
    if (!toggleContainer) return;
    
    const buttons = toggleContainer.querySelectorAll('.toggle-btn');
    
    // 1. On éteint tous les boutons
    buttons.forEach(b => b.classList.remove('active'));
    
    // 2. On allume le bon bouton
    const btnActif = toggleContainer.querySelector(`[data-state="${state}"]`);
    if (btnActif) btnActif.classList.add('active');
    
    // 3. On déplace la lueur rouge
    toggleContainer.setAttribute('data-active', state);
    
    // 4. On applique la magie sur tout le site
    if (state == 1) {
        document.body.className = ''; 
    } else if (state == 2) {
        document.body.className = 'theme-abysse'; 
    } else if (state == 3) {
        document.body.className = 'theme-lumiere'; 
    }
};
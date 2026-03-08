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
};
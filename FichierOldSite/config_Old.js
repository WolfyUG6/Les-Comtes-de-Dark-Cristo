// ==========================================
// CONFIG.JS - Le Cœur du Sanctuaire
// ==========================================

// 1. Connexion à Supabase
const supabaseUrl = 'https://kbpefbjyuuzadssdbahl.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImticGVmYmp5dXV6YWRzc2RiYWhsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NzAzOTcsImV4cCI6MjA4ODQ0NjM5N30.XKqPt0rJO7pAL1M7PapMLf4f7uw2PQQAUhMOG-PexzI';

// Initialisation de la connexion unique
const _supabase = supabase.createClient(supabaseUrl, supabaseKey);

// On rend la connexion accessible aux autres fichiers
window._supabase = _supabase;

// ==========================================
// LE GARDIEN DES PARCHEMINS (Anti-Copie)
// ==========================================

window.estAdmin = false; // Par défaut, tout le monde est un simple mortel

window.activerBouclier = function() {
    if (window.estAdmin) {
        document.body.classList.remove('protection-active'); // On lève le bouclier pour le Maître
    } else {
        document.body.classList.add('protection-active'); // On abaisse le bouclier pour les autres
    }
};

// 1. Bloquer le clic droit
document.addEventListener('contextmenu', function(e) {
    if (!window.estAdmin) {
        e.preventDefault(); // Annule l'ouverture du menu
    }
});

// 2. Bloquer le CTRL+C (Copier) et autres raccourcis curieux
document.addEventListener('keydown', function(e) {
    if (!window.estAdmin) {
        // Si la personne appuie sur CTRL + (C ou U ou S ou P)
        if (e.ctrlKey && (e.key === 'c' || e.key === 'C' || e.key === 'u' || e.key === 'U' || e.key === 's' || e.key === 'S' || e.key === 'p' || e.key === 'P')) {
            e.preventDefault(); // On bloque l'action
        }
    }
});

// On active le bouclier par défaut dès l'ouverture de la porte du Sanctuaire
window.activerBouclier();
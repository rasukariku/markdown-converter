// =========================================================================
// MODULE-LEVEL CONSTANTS
// =========================================================================

// Ekstraksi string statis untuk menjaga keterbacaan dan pemeliharaan kode
const LOCAL_STORAGE_THEME_KEY = 'theme';
const CSS_CLASS_LIGHT_MODE = 'light-mode';
const THEME_STATE_LIGHT = 'light';
const THEME_STATE_DARK = 'dark';

// =========================================================================
// THEME INITIALIZATION
// =========================================================================

/**
 * Menginisialisasi sistem tema dengan menerapkan preferensi yang tersimpan di localStorage
 * dan mendaftarkan event listener untuk tombol toggle tema.
 */
function initializeTheme() {
    // Terapkan tema yang tersimpan saat pemuatan halaman pertama kali
    if (localStorage.getItem(LOCAL_STORAGE_THEME_KEY) === THEME_STATE_LIGHT) {
        document.body.classList.add(CSS_CLASS_LIGHT_MODE);
    }

    // Cache elemen DOM untuk mencegah query berulang dan menjamin null safety
    const themeToggleButton = document.getElementById('theme-toggle');
    
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            // classList.toggle() mengembalikan nilai true jika kelas ditambahkan, dan false jika dihapus.
            // Metode ini lebih efisien dibanding pengecekan manual classList.contains().
            const isLightMode = document.body.classList.toggle(CSS_CLASS_LIGHT_MODE);
            
            localStorage.setItem(
                LOCAL_STORAGE_THEME_KEY, 
                isLightMode ? THEME_STATE_LIGHT : THEME_STATE_DARK
            );
        });
    } else {
        console.warn('Theme toggle button (#theme-toggle) not found in DOM.');
    }
}

// Eksekusi inisialisasi secara instan saat modul diimpor
initializeTheme();
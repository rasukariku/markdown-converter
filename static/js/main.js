import { dom, state } from './core/state.js';
import { initializeTurndown } from './core/turndown.js';
import { syncRawToRendered, syncRenderedToRaw } from './core/sync.js';
import { formatDoc, insertHorizontalRule, toggleToolbar, setDirection, toggleFullscreen } from './editor/core-actions.js';
import { initializeDialogs, initializeFindReplace } from './editor/dialogs.js';
import { initializePasteInterceptors } from './editor/paste.js';
import { initializeClipboard } from './editor/clipboard.js';
import { initializeTables } from './features/tables.js';
import { initializeExport } from './features/export.js';
import { initializeStats } from './features/stats.js';
import { initializeDrag } from './features/drag.js';
import { initializeAutosave } from './features/autosave.js';
import { typeWriter, resetTypewriter } from './ui/typewriter.js';
import { openWin, closeWin } from './ui/modals.js';
import { applyLanguage, translations } from './ui/language.js';
import { initializeFormatCycle, checkToolbarActive } from './ui/toolbar.js';

// KUNCI PERBAIKAN: Impor file tema agar fungsionalitas Dark/Light toggle aktif sepenuhnya
import './ui/theme.js';

// =====================================================================
// GLOBAL SCOPE BRIDGES & MODULAR INITIALIZATION
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Inisialisasi Engine Core Utama
    const { standardTurndown, dedicatedExportTurndown } = initializeTurndown();
    const updateCounter = initializeStats(translations);

    // 2. Deklarasi Fungsi Sinkronisasi Terikat (Bound Functions)
    const boundFormatDoc = (cmd, value) => formatDoc(
        cmd, 
        value, 
        () => syncRenderedToRaw(standardTurndown, updateCounter), 
        checkToolbarActive
    );
    const boundSyncRenderedToRaw = () => syncRenderedToRaw(standardTurndown, updateCounter);

    // 3. KUNCI PERBAIKAN: Ekspos Jembatan Fungsi ke Global Scope Secepat Mungkin.
    // Ini mengeliminasi timing bug / race condition sehingga inline onclick handlers 
    // pada HTML aman digunakan langsung sejak DOM siap, tanpa terpengaruh delay plugin.
    window.formatDoc = boundFormatDoc;
    window.toggleFullscreen = toggleFullscreen;
    window.insertHorizontalRule = () => insertHorizontalRule(boundFormatDoc);
    window.setDirection = (dir) => setDirection(dir, boundFormatDoc, boundSyncRenderedToRaw);
    window.toggleToolbar = toggleToolbar;
    window.openWin = openWin;
    window.closeWin = closeWin;
    window.resetTypewriter = resetTypewriter;

    // 4. Daftarkan Event Listener Utama pada Input Editor
    dom.rawMarkdownInput.addEventListener('input', () => syncRawToRendered(updateCounter));
    dom.renderedOutput.addEventListener('input', boundSyncRenderedToRaw);

    // 5. Inisialisasi Seluruh Modul Fitur & Dialog
    initializeDialogs(boundFormatDoc);
    initializeFindReplace(boundFormatDoc, boundSyncRenderedToRaw);
    initializePasteInterceptors(standardTurndown, updateCounter);
    initializeClipboard(); // Kunci Perbaikan: Sekarang aman dipanggil karena modul mengekspor fungsi ini
    initializeTables(boundSyncRenderedToRaw);
    initializeExport(dedicatedExportTurndown, boundSyncRenderedToRaw, updateCounter);
    initializeDrag();
    initializeAutosave(boundSyncRenderedToRaw, updateCounter);
    initializeFormatCycle();

    // 6. Daftarkan Handler Tombol Raw Markdown Modal secara Manual
    document.getElementById('btn-open-raw').onclick = () => {
        openWin('win-raw');
        boundSyncRenderedToRaw();
        dom.rawMarkdownInput.focus();
    };

    document.getElementById('btn-copy-raw').onclick = function() {
        navigator.clipboard.writeText(dom.rawMarkdownInput.value);
        this.innerText = "Copied!";
        setTimeout(() => this.innerText = "Copy Markdown", 2000);
    };

    // 7. Mulai Jalankan Typewriter dan Terapkan Konfigurasi Bahasa
    typeWriter();
    applyLanguage(updateCounter);

    // 8. Muat Draft dari Penyimpanan Lokal (LocalStorage) Jika Ada
    const savedDraft = localStorage.getItem('massivemark_draft_md');
    if (savedDraft) {
        dom.rawMarkdownInput.value = savedDraft;
        syncRawToRendered(updateCounter);
    }
});
import { dom, state } from './core/state.js';
import { initializeTurndown } from './core/turndown.js';
import { syncRawToRendered, syncRenderedToRaw } from './core/sync.js';
import { formatDoc, insertHorizontalRule, toggleToolbar, setDirection, toggleFullscreen } from './editor/core-actions.js';
import { initializeDialogs, initializeFindReplace } from './editor/dialogs.js';
import { initializePasteInterceptors } from './editor/paste.js';
import { initializeClipboard } from './editor/clipboard.js';
import { initializeTables } from './features/tables.js';
import { initializeExport, safeCopyToClipboard } from './features/export.js';
import { initializeStats } from './features/stats.js';
import { initializeDrag } from './features/drag.js';
import { initializeAutosave } from './features/autosave.js';
import { typeWriter, resetTypewriter } from './ui/typewriter.js';
import { openWin, closeWin } from './ui/modals.js';
import { applyLanguage, translations } from './ui/language.js';
import { initializeFormatCycle, checkToolbarActive } from './ui/toolbar.js';

// FIXED: Initialize live markdown preview events and theme configs
import { initializeLivePreview } from './editor/live-preview.js';
import './ui/theme.js';

// =====================================================================
// GLOBAL SCOPE BRIDGES & MODULAR INITIALIZATION
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. Core Engine Initialization (Saves and registers standard, dedicated, and Notion-compatible Turndown engines)
    const { standardTurndown, dedicatedExportTurndown, notionExportTurndown } = initializeTurndown();
    
    // Stop initialization to prevent console clutter if the network blocks Turndown
    if (!standardTurndown || !dedicatedExportTurndown || !notionExportTurndown) {
        console.error("Startup cancelled. Critical dependencies not found.");
        return;
    }

    const updateCounter = initializeStats(translations);

    // 2. Bound Synchronization Functions (Isolates instance sync operations)
    const boundFormatDoc = (cmd, value) => formatDoc(
        cmd, 
        value, 
        () => syncRenderedToRaw(standardTurndown, updateCounter), 
        checkToolbarActive
    );
    const boundSyncRenderedToRaw = () => syncRenderedToRaw(standardTurndown, updateCounter);

    // 3. Expose Bound Functions to the Global Window Scope for legacy inline elements
    window.formatDoc = boundFormatDoc;
    window.toggleFullscreen = toggleFullscreen;
    window.insertHorizontalRule = () => insertHorizontalRule(boundFormatDoc);
    window.setDirection = (dir) => setDirection(dir, boundFormatDoc, boundSyncRenderedToRaw);
    window.toggleToolbar = toggleToolbar;
    window.openWin = openWin;
    window.closeWin = closeWin;
    window.resetTypewriter = resetTypewriter;
    
    // FIXED: Expose sync function to the window scope for Live Preview triggers
    window.triggerSync = boundSyncRenderedToRaw;

    // 4. Register Input Events to Trigger Real-Time Sync
    if (dom.rawMarkdownInput) {
        dom.rawMarkdownInput.addEventListener('input', () => syncRawToRendered(updateCounter));
    }
    if (dom.renderedOutput) {
        dom.renderedOutput.addEventListener('input', boundSyncRenderedToRaw);
    }

    // 5. Initialize Feature, Live Preview, and Dialog Modules
    initializeDialogs(boundFormatDoc);
    initializeFindReplace(boundFormatDoc, boundSyncRenderedToRaw);
    initializePasteInterceptors(standardTurndown, updateCounter);
    initializeClipboard();
    initializeTables(boundSyncRenderedToRaw);
    
    // Passes the Notion-mode Turndown instance to the exporter
    initializeExport(dedicatedExportTurndown, notionExportTurndown, boundSyncRenderedToRaw, updateCounter);
    
    // FIXED: Safe Copy Bridge imported to allow raw text copy fallbacks over non-secure LAN environments
    const copyRawBtn = document.getElementById('btn-copy-raw');
    if (copyRawBtn) {
        copyRawBtn.onclick = function() {
            if (dom.rawMarkdownInput) {
                const textToCopy = dom.rawMarkdownInput.value;
                const currentLang = localStorage.getItem('appLang') || 'id';
                
                const feedbackText = currentLang === 'id' ? '✅ Berhasil Disalin!' : '✅ Copied!';
                const originalText = currentLang === 'id' ? 'Salin Markdown' : 'Copy Markdown';
                
                safeCopyToClipboard(textToCopy, () => {
                    copyRawBtn.innerText = feedbackText;
                    setTimeout(() => {
                        copyRawBtn.innerText = originalText;
                    }, 2000);
                }, (err) => {
                    console.error("Secure copy action failed inside raw-copy module:", err);
                });
            }
        };
    }

    initializeDrag();
    initializeAutosave(boundSyncRenderedToRaw, updateCounter);
    initializeFormatCycle();
    initializeLivePreview(); // Triggers real-time math interactions and selection updates

    // 7. Initialize Typewriter and Apply Language Settings
    typeWriter();
    applyLanguage(updateCounter);

    // 8. Load Draft from LocalStorage if Available
    const savedDraft = localStorage.getItem('massivemark_draft_md');
    if (savedDraft && dom.rawMarkdownInput) {
        dom.rawMarkdownInput.value = savedDraft;
        syncRawToRendered(updateCounter);
    }
});
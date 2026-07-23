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
import { applyLanguage, translations, initializeThirdPartyEmojiPicker } from './ui/language.js';
import { initializeFormatCycle, checkToolbarActive } from './ui/toolbar.js';

import { initializeLivePreview } from './editor/live-preview.js';
import './ui/theme.js';

// =====================================================================
// IMMEDIATE TOP-LEVEL GLOBAL BRIDGES (Prevents inline onclick exceptions)
// =====================================================================
window.openWin = openWin;
window.closeWin = closeWin;
window.toggleFullscreen = toggleFullscreen;
window.toggleToolbar = toggleToolbar;
window.resetTypewriter = resetTypewriter;

// =====================================================================
// FAULT-TOLERANT INITIALIZATION LOOP
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Initialize Turndown Conversion Engines
    let standardTurndown = null;
    let dedicatedExportTurndown = null;
    let notionExportTurndown = null;

    try {
        const engines = initializeTurndown();
        standardTurndown = engines.standardTurndown;
        dedicatedExportTurndown = engines.dedicatedExportTurndown;
        notionExportTurndown = engines.notionExportTurndown;
    } catch (err) {
        console.error("[CRITICAL] Failed to initialize Turndown engines:", err);
    }

    // 2. Initialize Metrics Counter
    let updateCounter = () => {};
    try {
        updateCounter = initializeStats(translations);
    } catch (err) {
        console.error("[WARN] Failed to initialize stats module:", err);
    }

    // 3. Bound Synchronization Functions
    const boundFormatDoc = (cmd, value) => formatDoc(
        cmd, 
        value, 
        () => standardTurndown && syncRenderedToRaw(standardTurndown, updateCounter), 
        checkToolbarActive
    );
    const boundSyncRenderedToRaw = () => standardTurndown && syncRenderedToRaw(standardTurndown, updateCounter);

    // 4. Update Window Scope Bridges with Bound Logic
    window.formatDoc = boundFormatDoc;
    window.insertHorizontalRule = () => insertHorizontalRule(boundFormatDoc);
    window.setDirection = (dir) => setDirection(dir, boundFormatDoc, boundSyncRenderedToRaw);
    window.triggerSync = boundSyncRenderedToRaw;

    // 5. Register Real-Time Input Sync Listeners
    try {
        if (dom.rawMarkdownInput) {
            dom.rawMarkdownInput.addEventListener('input', () => syncRawToRendered(updateCounter));
        }
        if (dom.renderedOutput) {
            dom.renderedOutput.addEventListener('input', boundSyncRenderedToRaw);
        }
    } catch (err) {
        console.error("[WARN] Failed to attach input sync listeners:", err);
    }

    // 6. Isolated Feature Module Initializations (Guarantees runtime fault isolation)
    const modules = [
        { name: 'Dialogs', fn: () => initializeDialogs(boundFormatDoc) },
        { name: 'FindReplace', fn: () => initializeFindReplace(boundFormatDoc, boundSyncRenderedToRaw) },
        { name: 'PasteInterceptors', fn: () => standardTurndown && initializePasteInterceptors(standardTurndown, updateCounter) },
        { name: 'Clipboard', fn: () => initializeClipboard() },
        { name: 'Tables', fn: () => initializeTables(boundSyncRenderedToRaw) },
        { name: 'Export', fn: () => dedicatedExportTurndown && notionExportTurndown && initializeExport(dedicatedExportTurndown, notionExportTurndown, boundSyncRenderedToRaw, updateCounter) },
        { name: 'Drag', fn: () => initializeDrag() },
        { name: 'Autosave', fn: () => initializeAutosave(boundSyncRenderedToRaw, updateCounter) },
        { name: 'FormatCycle', fn: () => initializeFormatCycle() },
        { name: 'LivePreview', fn: () => initializeLivePreview() },
        { name: 'EmojiPicker', fn: () => initializeThirdPartyEmojiPicker() }
    ];

    modules.forEach(mod => {
        try {
            mod.fn();
        } catch (err) {
            console.error(`[WARN] Failed to initialize module [${mod.name}]:`, err);
        }
    });

    // 7. Register Raw Copy Modal Handler
    try {
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
    } catch (err) {
        console.error("[WARN] Failed to bind raw copy button:", err);
    }

    // 8. Start Typewriter Animation and Apply Language Settings
    try {
        typeWriter();
        applyLanguage(updateCounter);
    } catch (err) {
        console.error("[WARN] Failed to start Typewriter or apply Language:", err);
    }

    // 9. Restore Draft from LocalStorage if Available
    try {
        const savedDraft = localStorage.getItem('massivemark_draft_md');
        if (savedDraft && dom.rawMarkdownInput) {
            dom.rawMarkdownInput.value = savedDraft;
            syncRawToRendered(updateCounter);
        }
    } catch (err) {
        console.error("[WARN] Failed to restore local draft:", err);
    }
});
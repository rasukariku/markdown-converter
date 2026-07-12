import { dom, state } from '../core/state.js';

// =========================================================================
// MODULE-LEVEL CONSTANTS
// =========================================================================

// Extract UI state colors to prevent inline magic strings
const COLOR_SAVING = '#f59e0b';
const COLOR_SAVED = '#10b981';

// Extract HTML/SVG templates to declutter the logic flow
const HTML_SAVING = '<span style="font-size:12px">⏳</span> Saving...';
const HTML_SAVED = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> Saved';

// Extract selectors and configuration values
const MEDIA_SELECTOR = 'img, table, mjx-container, hr';
const TOOLBAR_TOGGLE_CMDS = ['bold', 'italic', 'underline', 'strikeThrough', 'superscript', 'subscript'];
const SAVE_DELAY_MS = 1000;
const HIDE_DELAY_MS = 2500;

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Initializes the auto-save UI indicator and editor state reset logic.
 * 
 * @param {Function} syncRenderedToRaw - Callback to sync the visual editor to raw markdown.
 * @param {Function} updateCounter - Callback to update the document statistics.
 */
export function initializeAutosave(syncRenderedToRaw, updateCounter) {
    let typingTimer, hideTimer;

    function triggerSavingUI() {
        if (!dom.autoSaveStatus) return;
        
        const hasMedia = dom.renderedOutput.querySelector(MEDIA_SELECTOR);
        if (dom.renderedOutput.innerText.trim() === '' && !hasMedia) {
            dom.autoSaveStatus.style.display = 'none';
            return;
        }
        
        clearTimeout(hideTimer);
        dom.autoSaveStatus.style.display = 'flex';
        dom.autoSaveStatus.style.color = COLOR_SAVING;
        dom.autoSaveStatus.innerHTML = HTML_SAVING;
        
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            dom.autoSaveStatus.style.color = COLOR_SAVED;
            dom.autoSaveStatus.innerHTML = HTML_SAVED;
            
            hideTimer = setTimeout(() => {
                dom.autoSaveStatus.style.display = 'none';
            }, HIDE_DELAY_MS);
        }, SAVE_DELAY_MS);
    }

    dom.renderedOutput.addEventListener('input', triggerSavingUI);
    dom.rawMarkdownInput.addEventListener('input', triggerSavingUI);

    function resetToolbarState() {
        TOOLBAR_TOGGLE_CMDS.forEach(cmd => {
            if (document.queryCommandState(cmd)) {
                document.execCommand(cmd, false, null);
            }
        });
        document.querySelectorAll('.tool-btn.active').forEach(btn => btn.classList.remove('active'));
    }

    function forceStateZero() {
        const textOnly = dom.renderedOutput.innerText.trim();
        const hasMedia = dom.renderedOutput.querySelector(MEDIA_SELECTOR);
        
        // Combined conditions to prevent redundant DOM reads
        if (textOnly === '' && !hasMedia && dom.renderedOutput.innerHTML !== '') {
            dom.renderedOutput.innerHTML = '';
            resetToolbarState();
            syncRenderedToRaw();
            updateCounter();
        }
    }

    dom.renderedOutput.addEventListener('input', forceStateZero);
    dom.renderedOutput.addEventListener('keyup', forceStateZero);

    dom.renderedOutput.addEventListener('keydown', function(e) {
        if (e.key === 'Backspace' || e.key === 'Delete') {
            const sel = window.getSelection();
            if (sel.rangeCount > 0) {
                const selectedTextLength = sel.toString().trim().length;
                const totalTextLength = dom.renderedOutput.innerText.trim().length;
                
                if (selectedTextLength >= totalTextLength && totalTextLength > 0) {
                    e.preventDefault();
                    dom.renderedOutput.innerHTML = '';
                    resetToolbarState();
                    syncRenderedToRaw();
                    updateCounter();
                }
            }
        }
    });
}
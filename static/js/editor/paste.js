import { dom } from '../core/state.js';
import { sanitizeAIText, syncRenderedToRaw, parseMarkdownWithMath } from '../core/sync.js';

// =========================================================================
// MODULE-LEVEL CONSTANTS
// =========================================================================

// Asynchronous delay to ensure paste execution completes before layout sanitization
const PASTE_SYNC_DELAY_MS = 50;

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Initializes paste event interceptors for the visual editor and raw markdown textareas.
 * 
 * @param {object} standardTurndown - Standard Turndown service instance.
 * @param {Function} updateCounter - Callback to update document stats.
 */
export function initializePasteInterceptors(standardTurndown, updateCounter) {
    
    // 1. Paste Interceptor for WYSIWYG visual editor
    dom.renderedOutput.addEventListener('paste', function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        
        const clipboardData = e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData);
        const plainData = clipboardData ? clipboardData.getData('text/plain') : '';
        
        // Execute AI formatting sanitization on pasted plain text
        const processedText = sanitizeAIText(plainData);
        
        // Render equations securely without losing LaTeX backslash syntax
        const parsedHTML = parseMarkdownWithMath(processedText);
        
        document.execCommand('insertHTML', false, parsedHTML);
        
        // Clear inline style overrides that may be carried over from external editors
        setTimeout(() => {
            dom.renderedOutput.querySelectorAll('*').forEach((el) => {
                if (el.style.margin) el.style.margin = '';
                if (el.style.padding) el.style.padding = '';
                if (el.style.lineHeight) el.style.lineHeight = '';
            });
            
            // FIXED: Defensively handle asynchronous MathJax typesetting after a paste event
            if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
                window.MathJax.typesetPromise([dom.renderedOutput]).then(() => {
                    dom.renderedOutput.querySelectorAll('mjx-container').forEach((node) => { 
                        node.setAttribute('contenteditable', 'false'); 
                    });
                    updateCounter(); 
                    syncRenderedToRaw(standardTurndown, updateCounter); 
                });
            } else {
                updateCounter(); 
                syncRenderedToRaw(standardTurndown, updateCounter); 
            }
        }, PASTE_SYNC_DELAY_MS);
    });

    // 2. Paste Interceptor for raw markdown textareas (Modal input)
    dom.rawMarkdownInput.addEventListener('paste', function(e) {
        e.preventDefault();
        
        const clipboardData = e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData);
        const plainData = clipboardData ? clipboardData.getData('text/plain') : '';
        const processedText = sanitizeAIText(plainData);
        
        const target = dom.rawMarkdownInput;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        
        // Insert processed text exactly at the current cursor position
        target.value = target.value.substring(0, start) + processedText + target.value.substring(end);
        target.selectionStart = target.selectionEnd = start + processedText.length;
        
        // FIXED: Immediately synchronize raw markdown changes into the WYSIWYG editor
        syncRawToRendered(updateCounter);
    });
}
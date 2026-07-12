import { dom, state } from '../core/state.js';

// =========================================================================
// MODULE-LEVEL CONSTANTS
// =========================================================================

// Extract SVG icon paths to prevent inline clutter and improve readability
const SVG_ICON_EXPAND = '<path d="M7 14l5-5 5 5H7z"/>';
const SVG_ICON_COLLAPSE = '<path d="M7 10l5 5 5-5H7z"/>';
const SVG_ICON_FULLSCREEN = '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>';
const SVG_ICON_EXIT_FULLSCREEN = '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>';

// Extract magic string for font enforcement
const FONT_NAME_TIMES_NEW_ROMAN = 'Times New Roman';

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Executes a document command and synchronizes the editor state.
 * 
 * @param {string} cmd - The execCommand identifier.
 * @param {string|boolean} value - The value argument for the command.
 * @param {Function} syncRenderedToRaw - Callback to sync the visual editor to raw markdown.
 * @param {Function} checkToolbarActive - Callback to update toolbar button active states.
 */
export function formatDoc(cmd, value, syncRenderedToRaw, checkToolbarActive) {
    try {
        document.execCommand(cmd, false, value);
        
        // Enforce Times New Roman font after specific structural changes
        if (cmd === 'createLink' || cmd === 'unlink' || cmd === 'insertHTML') {
            document.execCommand('fontName', false, FONT_NAME_TIMES_NEW_ROMAN);
        }
    } catch (e) {
        console.warn('execCommand failed:', cmd, e);
    }
    
    dom.renderedOutput.focus();
    checkToolbarActive();
    syncRenderedToRaw();
}

/**
 * Inserts a horizontal rule into the editor.
 * 
 * @param {Function} formatDoc - The core formatting function.
 */
export function insertHorizontalRule(formatDoc) {
    formatDoc('insertHorizontalRule');
}

/**
 * Toggles the expansion state of the main toolbar and updates the icon.
 */
export function toggleToolbar() {
    // classList.toggle() returns true if the class was added, false if removed.
    // This eliminates the need for a secondary DOM query via classList.contains().
    const isExpanded = dom.mainToolbar.classList.toggle('expanded');
    dom.iconExpand.innerHTML = isExpanded ? SVG_ICON_EXPAND : SVG_ICON_COLLAPSE;
}

/**
 * Sets the text direction (LTR/RTL) for the current selection or block.
 * 
 * @param {string} dir - The direction attribute value ('ltr' or 'rtl').
 * @param {Function} formatDoc - The core formatting function.
 * @param {Function} syncRenderedToRaw - Callback to sync the visual editor to raw markdown.
 */
export function setDirection(dir, formatDoc, syncRenderedToRaw) {
    const sel = window.getSelection();
    
    if (sel.rangeCount > 0) {
        let node = sel.anchorNode;
        
        // Traverse up to the nearest element node if currently on a text node
        if (node.nodeType === 3) {
            node = node.parentNode;
        }
        
        if (node.tagName !== 'DIV' && node.tagName !== 'P') {
            const htmlContent = `<div dir="${dir}">${sel.toString()}</div>`;
            formatDoc('insertHTML', htmlContent);
        } else {
            node.setAttribute('dir', dir);
        }
        
        syncRenderedToRaw();
    }
}

/**
 * Toggles the fullscreen mode for the editor container.
 */
export function toggleFullscreen() {
    // Capture the new state directly from the toggle operation
    const isFS = dom.editorContainer.classList.toggle('fullscreen');
    
    // Pass the boolean state to toggle() to guarantee synchronization
    document.body.classList.toggle('is-fullscreen', isFS);
    
    dom.btnFullscreen.innerHTML = isFS ? SVG_ICON_FULLSCREEN : SVG_ICON_EXIT_FULLSCREEN;
    document.body.style.overflow = isFS ? 'hidden' : '';
}
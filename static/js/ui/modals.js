// =========================================================================
// MODULE-LEVEL CONSTANTS
// =========================================================================

// Extract CSS classes and style values to prevent inline magic strings
const CSS_CLASS_ACTIVE = 'active';
const CSS_CLASS_MODAL_OVERLAY = 'modal-overlay';
const STYLE_OVERFLOW_HIDDEN = 'hidden';
const STYLE_OVERFLOW_DEFAULT = '';

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Opens a modal window by adding the active class and disabling body scroll.
 * 
 * @param {string} id - The DOM ID of the modal element to open.
 */
export function openWin(id) {
    const modalElement = document.getElementById(id);
    if (modalElement) {
        modalElement.classList.add(CSS_CLASS_ACTIVE);
        document.body.style.overflow = STYLE_OVERFLOW_HIDDEN;
    }
}

/**
 * Closes a modal window by removing the active class and restoring body scroll.
 * 
 * @param {string} id - The DOM ID of the modal element to close.
 */
export function closeWin(id) {
    const modalElement = document.getElementById(id);
    if (modalElement) {
        modalElement.classList.remove(CSS_CLASS_ACTIVE);
        document.body.style.overflow = STYLE_OVERFLOW_DEFAULT;
    }
}

// =========================================================================
// GLOBAL EVENT LISTENERS
// =========================================================================

/**
 * Closes any modal when the user clicks directly on its overlay background.
 * Note: Attached at the module level to ensure a single global interceptor.
 */
window.addEventListener('click', (e) => {
    if (e.target.classList.contains(CSS_CLASS_MODAL_OVERLAY)) {
        e.target.classList.remove(CSS_CLASS_ACTIVE);
        document.body.style.overflow = STYLE_OVERFLOW_DEFAULT;
    }
});
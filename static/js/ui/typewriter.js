import { dom } from '../core/state.js';

// =========================================================================
// MODULE-LEVEL CONSTANTS
// =========================================================================

// Extract magic numbers to improve maintainability and clarify animation timing
const TYPING_SPEED_MS = 120;
const DELETING_SPEED_MS = 80;
const PAUSE_AFTER_TYPING_MS = 2500;
const PAUSE_AFTER_DELETING_MS = 800;
const DEFAULT_LANGUAGE = 'id';

// Define supported titles to prevent undefined reference errors
const TITLES = Object.freeze({
    'id': 'MARKDOWN CONVERTER',
    'en': 'MARKDOWN CONVERTER'
});

// =========================================================================
// STATE VARIABLES
// =========================================================================

// Module-scoped state required for the animation loop closure
let typeIndex = 0;
let isDeleting = false;
let typewriterTimer = null;

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Executes the typewriter animation loop, handling typing, deleting, 
 * and pausing states based on the current application language.
 */
export function typeWriter() {
    const currentLangVal = localStorage.getItem('appLang') || DEFAULT_LANGUAGE;
    
    // Fallback to default language if the stored language is not supported
    const currentText = TITLES[currentLangVal] || TITLES[DEFAULT_LANGUAGE];

    if (!isDeleting && typeIndex <= currentText.length) {
        dom.typewriterTitle.innerText = currentText.substring(0, typeIndex);
        typeIndex++;
        typewriterTimer = setTimeout(typeWriter, TYPING_SPEED_MS);
    } else if (isDeleting && typeIndex >= 0) {
        dom.typewriterTitle.innerText = currentText.substring(0, typeIndex);
        typeIndex--;
        typewriterTimer = setTimeout(typeWriter, DELETING_SPEED_MS);
    } else {
        isDeleting = !isDeleting;
        const pauseDuration = isDeleting ? PAUSE_AFTER_TYPING_MS : PAUSE_AFTER_DELETING_MS;
        typewriterTimer = setTimeout(typeWriter, pauseDuration);
    }
}

/**
 * Resets the typewriter animation to its initial state and restarts the loop.
 */
export function resetTypewriter() {
    if (typewriterTimer) {
        clearTimeout(typewriterTimer);
    }
    
    typeIndex = 0;
    isDeleting = false;
    dom.typewriterTitle.innerText = '';
    
    typeWriter();
}
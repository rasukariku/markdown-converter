import { dom } from '../core/state.js';

// =========================================================================
// MODULE-LEVEL CONSTANTS
// =========================================================================

// Extract magic numbers to improve maintainability and clarify UI timing
const CYCLE_INTERVAL_MS = 2500;
const OPACITY_TRANSITION_DELAY_MS = 300;

// Extract format cycle array to prevent inline clutter
const FORMATS_CYCLE = ["WORD", "PDF", "HTML"];

// Define command mappings once to prevent array recreation on every event trigger
const TOOLBAR_COMMANDS = [
    { id: 'btn-bold', cmd: 'bold' },
    { id: 'btn-italic', cmd: 'italic' },
    { id: 'btn-underline', cmd: 'underline' },
    { id: 'btn-strike', cmd: 'strikeThrough' },
    { id: 'btn-ul', cmd: 'insertUnorderedList' },
    { id: 'btn-ol', cmd: 'insertOrderedList' },
    { id: 'btn-align-left', cmd: 'justifyLeft' },
    { id: 'btn-align-center', cmd: 'justifyCenter' },
    { id: 'btn-align-right', cmd: 'justifyRight' },
    { id: 'btn-align-justify', cmd: 'justifyFull' },
    { id: 'btn-sup', cmd: 'superscript' },
    { id: 'btn-sub', cmd: 'subscript' }
];

// Cache DOM button references at module initialization to eliminate redundant DOM queries
// during high-frequency user interactions (keyup, mouseup, click).
const CACHED_TOOLBAR_BUTTONS = TOOLBAR_COMMANDS
    .map(item => ({ element: document.getElementById(item.id), cmd: item.cmd }))
    .filter(item => item.element !== null);

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Initializes the continuous format cycle animation for the UI.
 */
export function initializeFormatCycle() {
    let fIdx = 0;
    
    setInterval(() => {
        fIdx = (fIdx + 1) % FORMATS_CYCLE.length;
        dom.cycleText.style.opacity = 0;
        
        setTimeout(() => {
            dom.cycleText.innerText = FORMATS_CYCLE[fIdx];
            dom.cycleText.style.opacity = 1;
        }, OPACITY_TRANSITION_DELAY_MS);
    }, CYCLE_INTERVAL_MS);
}

/**
 * Evaluates the current document selection and updates the active state 
 * of the toolbar buttons accordingly.
 */
export function checkToolbarActive() {
    CACHED_TOOLBAR_BUTTONS.forEach(({ element, cmd }) => {
        const isActive = document.queryCommandState(cmd);
        if (isActive) {
            element.classList.add('active');
        } else {
            element.classList.remove('active');
        }
    });
}

// =========================================================================
// EVENT LISTENERS
// =========================================================================

// Attach listeners only if the rendered output exists to prevent fatal null reference crashes
if (dom.renderedOutput) {
    ['keyup', 'mouseup', 'click'].forEach(evt => 
        dom.renderedOutput.addEventListener(evt, checkToolbarActive)
    );
}
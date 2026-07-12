import { dom } from '../core/state.js';

// =========================================================================
// MODULE-LEVEL CONSTANTS
// =========================================================================

// Pre-compile regular expressions to eliminate runtime parsing overhead during high-frequency events
const RE_NEWLINES = /\n/g;
const RE_WORDS = /\s+/;
const RE_SENTENCES = /[.!?]+(?=\s|$)/;
const RE_PARAGRAPHS = /\n+/;

// Extract magic numbers and UI strings to improve maintainability
const DRAG_BOUNDARY_PX = 15;
const DEFAULT_TRANSITION = 'opacity 0.3s ease, box-shadow 0.3s ease';

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Initializes the document statistics engine, selection tracking, 
 * and the draggable word counter pill.
 * 
 * @param {object} translations - The dictionary containing localized UI strings.
 * @returns {Function} The updateCounter function for external invocation.
 */
export function initializeStats(translations) {
    
    function updateCounter() {
        const sel = window.getSelection();
        let text = ' ';
        let isSelected = false;
        const currentLangValue = localStorage.getItem('appLang') || 'id';
        const isId = currentLangValue === 'id';

        if (sel && sel.rangeCount > 0 && sel.anchorNode && dom.renderedOutput.contains(sel.anchorNode) && sel.toString().trim().length > 0) {
            text = sel.toString();
            isSelected = true;
        } else {
            text = dom.renderedOutput.innerText || ' ';
        }

        dom.selectionInfo.style.display = isSelected ? 'block' : 'none';
        dom.selectionInfo.innerText = translations[currentLangValue].selection;

        const cText = text.trim();
        const charCount = cText.replace(RE_NEWLINES, '').length;
        const wordCount = cText === '' ? 0 : cText.split(RE_WORDS).filter(w => w.length > 0).length;
        const sentenceCount = cText === '' ? 0 : cText.split(RE_SENTENCES).filter(s => s.trim().length > 0).length;
        const paragraphCount = cText === '' ? 0 : cText.split(RE_PARAGRAPHS).filter(p => p.trim().length > 0).length;

        dom.charCount.innerText = `${charCount}${isId ? ' Karakter' : ' Characters'}`;
        dom.wordCount.innerText = `${wordCount}${isId ? ' Kata' : ' Words'}`;
        dom.sentenceCount.innerText = `${sentenceCount}${isId ? ' Kalimat' : ' Sentences'}`;
        dom.paragraphCount.innerText = `${paragraphCount}${isId ? ' Paragraf' : ' Paragraphs'}`;
        
        const readTime = Math.ceil(wordCount / 200);
        dom.readTime.innerText = `${readTime}${isId ? ' Mnt Baca' : ' Min Read'}`;
    }

    ['input', 'keyup', 'mouseup'].forEach(evt => dom.renderedOutput.addEventListener(evt, updateCounter));

    document.addEventListener('selectionchange', () => {
        if (document.activeElement === dom.renderedOutput || dom.renderedOutput.contains(document.activeElement)) {
            updateCounter();
            
            const sel = window.getSelection();
            const mathElements = dom.renderedOutput.querySelectorAll('mjx-container');
            
            if (!sel.rangeCount || sel.isCollapsed) {
                mathElements.forEach(el => el.classList.remove('math-selected'));
                return;
            }
            
            mathElements.forEach(el => {
                if (sel.containsNode(el, true)) {
                    el.classList.add('math-selected');
                } else {
                    el.classList.remove('math-selected');
                }
            });
        } else {
            dom.renderedOutput.querySelectorAll('mjx-container').forEach(el => el.classList.remove('math-selected'));
        }
    });

    new MutationObserver(updateCounter).observe(dom.renderedOutput, { childList: true, characterData: true, subtree: true });

    // Draggable Word Counter Logic
    let isDraggingCounter = false;
    let counterOffsetX = 0;
    let counterOffsetY = 0;
    
    // Cache container dimensions to prevent synchronous layout recalculations (reflows)
    // during high-frequency mousemove events.
    let cachedPillWidth = 0;
    let cachedPillHeight = 0;

    dom.wordCounterPill.addEventListener('mousedown', (e) => {
        isDraggingCounter = true;
        const rect = dom.wordCounterPill.getBoundingClientRect();
        
        // Cache dimensions once at the start of the drag operation
        cachedPillWidth = dom.wordCounterPill.offsetWidth;
        cachedPillHeight = dom.wordCounterPill.offsetHeight;

        counterOffsetX = e.clientX - rect.left;
        counterOffsetY = e.clientY - rect.top;
        
        dom.wordCounterPill.style.bottom = 'auto';
        dom.wordCounterPill.style.right = 'auto';
        dom.wordCounterPill.style.transition = 'none';
        dom.wordCounterPill.style.left = `${rect.left}px`;
        dom.wordCounterPill.style.top = `${rect.top}px`;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDraggingCounter) return;
        e.preventDefault();
        
        const newLeft = e.clientX - counterOffsetX;
        const newTop = e.clientY - counterOffsetY;
        
        // Use cached dimensions to avoid triggering layout thrashing
        const boundedLeft = Math.max(DRAG_BOUNDARY_PX, Math.min(newLeft, window.innerWidth - cachedPillWidth - DRAG_BOUNDARY_PX));
        const boundedTop = Math.max(DRAG_BOUNDARY_PX, Math.min(newTop, window.innerHeight - cachedPillHeight - DRAG_BOUNDARY_PX));
        
        dom.wordCounterPill.style.left = `${boundedLeft}px`; 
        dom.wordCounterPill.style.top = `${boundedTop}px`; 
    });

    document.addEventListener('mouseup', () => {
        if (isDraggingCounter) {
            isDraggingCounter = false;
            dom.wordCounterPill.style.transition = DEFAULT_TRANSITION;
        }
    });

    return updateCounter;
}
import { dom } from '../core/state.js';

// =========================================================================
// MODULE-LEVEL CONSTANTS
// =========================================================================

const RE_NEWLINES = /\n/g;
const RE_WORDS = /\s+/;
const RE_SENTENCES = /[.!?]+(?=\s|$)/;
const RE_PARAGRAPHS = /\n+/;

const DRAG_BOUNDARY_PX = 15;
const DEFAULT_TRANSITION = 'opacity 0.3s ease, box-shadow 0.3s ease';

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Initializes document metrics, word counting, and selection tracking.
 * 
 * @param {object} translations - Localized string map.
 * @returns {Function} Update counter function.
 */
export function initializeStats(translations) {
    
    function updateCounter() {
        if (!dom.renderedOutput) return;

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

        if (dom.selectionInfo) {
            dom.selectionInfo.style.display = isSelected ? 'block' : 'none';
            dom.selectionInfo.innerText = translations[currentLangValue] ? translations[currentLangValue].selection : '';
        }

        const cText = text.trim();
        const charCount = cText.replace(RE_NEWLINES, '').length;
        const wordCount = cText === '' ? 0 : cText.split(RE_WORDS).filter(w => w.length > 0).length;
        const sentenceCount = cText === '' ? 0 : cText.split(RE_SENTENCES).filter(s => s.trim().length > 0).length;
        const paragraphCount = cText === '' ? 0 : cText.split(RE_PARAGRAPHS).filter(p => p.trim().length > 0).length;

        if (dom.charCount) dom.charCount.innerText = `${charCount}${isId ? ' Karakter' : ' Characters'}`;
        if (dom.wordCount) dom.wordCount.innerText = `${wordCount}${isId ? ' Kata' : ' Words'}`;
        if (dom.sentenceCount) dom.sentenceCount.innerText = `${sentenceCount}${isId ? ' Kalimat' : ' Sentences'}`;
        if (dom.paragraphCount) dom.paragraphCount.innerText = `${paragraphCount}${isId ? ' Paragraf' : ' Paragraphs'}`;
        
        const readTime = Math.ceil(wordCount / 200);
        if (dom.readTime) dom.readTime.innerText = `${readTime}${isId ? ' Mnt Baca' : ' Min Read'}`;
    }

    if (dom.renderedOutput) {
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
    }

    // Draggable Word Counter Logic
    let isDraggingCounter = false;
    let counterOffsetX = 0;
    let counterOffsetY = 0;
    let cachedPillWidth = 0;
    let cachedPillHeight = 0;

    if (dom.wordCounterPill) {
        dom.wordCounterPill.addEventListener('mousedown', (e) => {
            isDraggingCounter = true;
            const rect = dom.wordCounterPill.getBoundingClientRect();
            
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
    }

    return updateCounter;
}
import { dom } from '../core/state.js';

let activeMathContainer = null;
let mathPopup = null;

let transformX = 0;
let transformY = 0;

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

function copyToClipboardSecure(plainText, htmlContent) {
    const copyBtn = document.getElementById('math-popup-copy');

    if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });
        const item = new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob });
        
        navigator.clipboard.write([item])
            .then(() => {
                copyBtn.innerText = '✅ Copied!';
                setTimeout(() => { copyBtn.innerText = '📋 Copy'; }, 1500);
            })
            .catch(err => {
                console.warn('Modern ClipboardItem rejected, using synchronous fallback...', err);
                executeFallbackCopy(plainText);
            });
    } else {
        executeFallbackCopy(plainText);
    }
}

function executeFallbackCopy(text) {
    const copyBtn = document.getElementById('math-popup-copy');
    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = text;
    tempTextarea.style.position = 'fixed';
    tempTextarea.style.opacity = '0';
    tempTextarea.style.pointerEvents = 'none';
    
    document.body.appendChild(tempTextarea);
    tempTextarea.select();
    
    try {
        document.execCommand('copy');
        copyBtn.innerText = '✅ Copied!';
    } catch (err) {
        console.error('Fallback copy failed:', err);
    } finally {
        document.body.removeChild(tempTextarea);
        setTimeout(() => { copyBtn.innerText = '📋 Copy'; }, 1500);
    }
}

function ensureMathPopupExists() {
    if (mathPopup) return;

    mathPopup = document.createElement('div');
    mathPopup.id = 'math-floating-popup';
    mathPopup.className = 'math-popup-container';
    mathPopup.innerHTML = `
        <div class="math-popup-toolbar" id="math-popup-header">
            <span class="math-popup-title">LaTeX Editor</span>
            <div style="display:flex; gap:6px; align-items:center;">
                <button type="button" class="math-popup-btn" id="math-popup-copy">📋 Copy</button>
                <button type="button" class="math-popup-btn" id="math-popup-close">✕</button>
            </div>
        </div>
        <textarea id="math-popup-textarea" placeholder="Type LaTeX here..."></textarea>
    `.trim();

    document.body.appendChild(mathPopup);

    const header = document.getElementById('math-popup-header');
    makePopupDraggable(mathPopup, header);

    const textarea = document.getElementById('math-popup-textarea');
    textarea.addEventListener('input', () => {
        if (!activeMathContainer) return;
        
        const newLatex = textarea.value.trim();
        const wrapper = activeMathContainer.closest ? activeMathContainer.closest('.math-wrapper') : null;
        if (wrapper) {
            updateMathElementInPlace(wrapper, newLatex);
        }
    });

    document.getElementById('math-popup-copy').onclick = () => {
        if (!activeMathContainer) return;
        
        const mmlContainer = activeMathContainer.querySelector('mjx-assistive-mml');
        const latex = textarea.value.trim();
        const isDisplay = activeMathContainer.getAttribute('data-math-display') === 'true' || 
                          (activeMathContainer.closest && activeMathContainer.closest('.math-wrapper')?.getAttribute('data-math-display') === 'true');
        const formattedPlain = isDisplay ? `$$ ${latex} $$` : `$${latex}$`;
        
        if (mmlContainer && mmlContainer.firstElementChild) {
            const mmlClone = mmlContainer.firstElementChild.cloneNode(true);
            
            const attributesToRemove = [
                'class', 'style', 'id', 'data-semantic-type', 'data-semantic-role',
                'data-semantic-id', 'data-semantic-parent'
            ];
            
            mmlClone.querySelectorAll('*').forEach(el => {
                attributesToRemove.forEach(attr => el.removeAttribute(attr));
            });

            copyToClipboardSecure(formattedPlain, mmlClone.outerHTML);
        } else {
            executeFallbackCopy(formattedPlain);
        }
    };

    document.getElementById('math-popup-close').onclick = () => {
        mathPopup.classList.remove('active');
        activeMathContainer = null;
    };
}

function makePopupDraggable(popupEl, headerEl) {
    let isDragging = false;
    let startX, startY;

    headerEl.addEventListener('mousedown', (e) => {
        if (e.target.closest('.math-popup-btn')) return;
        isDragging = true;
        startX = e.clientX - transformX;
        startY = e.clientY - transformY;
        
        popupEl.style.cursor = 'grabbing';
        headerEl.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        
        transformX = e.clientX - startX;
        transformY = e.clientY - startY;
        
        popupEl.style.transform = `translate3d(${transformX}px, ${transformY}px, 0)`;
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            popupEl.style.cursor = '';
            headerEl.style.cursor = '';
        }
    });
}

function positionPopup(targetEl, popupEl) {
    const rect = targetEl.getBoundingClientRect();
    
    transformX = 0;
    transformY = 0;
    popupEl.style.transform = 'translate3d(0, 0, 0)';
    
    const popupWidth = popupEl.offsetWidth || 350;
    const popupHeight = popupEl.offsetHeight || 140;
    
    let top = rect.top + window.scrollY - popupHeight - 12;
    if (top < window.scrollY) {
        top = rect.bottom + window.scrollY + 12;
    }
    
    let left = rect.left + window.scrollX + (rect.width / 2) - (popupWidth / 2);
    left = Math.max(10, Math.min(left, window.innerWidth - popupWidth - 10));
    
    popupEl.style.top = `${top}px`;
    popupEl.style.left = `${left}px`;
    popupEl.style.bottom = 'auto';
    popupEl.style.right = 'auto';
}

function updateMathElementInPlace(wrapper, newLatex) {
    const isDisplay = wrapper.getAttribute('data-math-display') === 'true';
    const rawLine = wrapper.querySelector('.math-raw-line');
    const previewContainer = wrapper.querySelector('.math-preview-rendered');
    
    if (!rawLine || !previewContainer) return;
    
    rawLine.textContent = newLatex;
    
    const formatted = isDisplay ? `$$ ${newLatex} $$` : `$${newLatex}$`;
    previewContainer.innerHTML = formatted;
    
    if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
        window.MathJax.typesetPromise([previewContainer]).then(() => {
            previewContainer.querySelectorAll('mjx-container').forEach(node => {
                node.setAttribute('contenteditable', 'false');
            });
            
            if (typeof window.triggerSync === 'function') {
                window.triggerSync();
            }
        }).catch(err => {
            console.error("MathJax interactive update error:", err);
        });
    } else {
        if (typeof window.triggerSync === 'function') {
            window.triggerSync();
        }
    }
}

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

export function initializeLivePreview() {
    if (!dom.renderedOutput) return;

    ensureMathPopupExists();

    dom.renderedOutput.addEventListener('click', (e) => {
        const wrapper = e.target.closest('.math-wrapper');
        if (wrapper) {
            e.preventDefault();
            e.stopPropagation();
            
            const mathEl = wrapper.querySelector('mjx-container') || wrapper;
            activeMathContainer = mathEl;
            
            const rawLine = wrapper.querySelector('.math-raw-line');
            const rawTex = rawLine ? rawLine.textContent.trim() : '';
            
            const textarea = document.getElementById('math-popup-textarea');
            textarea.value = rawTex;
            
            mathPopup.classList.add('active');
            positionPopup(wrapper, mathPopup);
            textarea.focus();
            return;
        }

        // FIXED: Intercept selection click events over Horizontal Rules (HR) to force immediate focusing
        const hrRaw = e.target.closest('.hr-raw-line');
        if (hrRaw) {
            e.preventDefault();
            e.stopPropagation();
            
            // Clean up focused active classes from other horizontal lines
            dom.renderedOutput.querySelectorAll('.hr-raw-line.hr-focused').forEach(el => {
                if (el !== hrRaw) el.classList.remove('hr-focused');
            });

            hrRaw.classList.add('hr-focused');
            hrRaw.focus();
            
            // Move insertion cursor caret to the end of the input field
            const sel = window.getSelection();
            const range = document.createRange();
            range.selectNodeContents(hrRaw);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
            return;
        }

        if (mathPopup && !e.target.closest('#math-floating-popup')) {
            mathPopup.classList.remove('active');
            activeMathContainer = null;
        }
    });

    // FIXED: Bind selectionchange observers to toggle .hr-focused classes dynamically across all browsers
    document.addEventListener('selectionchange', () => {
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            let node = sel.anchorNode;
            if (node) {
                if (node.nodeType === 3) {
                    node = node.parentNode;
                }
                
                const currentHr = node.closest ? node.closest('.hr-raw-line') : null;
                
                // Strip the focused class from all inactive horizontal lines
                dom.renderedOutput.querySelectorAll('.hr-raw-line.hr-focused').forEach(el => {
                    if (el !== currentHr) {
                        el.classList.remove('hr-focused');
                    }
                });
                
                // Apply focus class to the active horizontal line
                if (currentHr && dom.renderedOutput.contains(currentHr)) {
                    currentHr.classList.add('hr-focused');
                }
            }
        }
    });

    dom.renderedOutput.addEventListener('input', (e) => {
        let target = e.target;
        if (target.nodeType === 3) {
            target = target.parentNode;
        }
        
        while (target && target !== dom.renderedOutput && !['P', 'DIV'].includes(target.tagName)) {
            target = target.parentNode;
        }
        
        if (target && target !== dom.renderedOutput) {
            const text = target.textContent.trim();
            if (/^(-{3,}|\*{3,}|_{3,}|={3,})$/.test(text)) {
                target.className = 'hr-raw-line';
                target.setAttribute('data-chars', text);
                
                if (typeof window.triggerSync === 'function') {
                    window.triggerSync();
                }
            }
        }

        const hrRaw = e.target.closest('.hr-raw-line');
        if (hrRaw) {
            const text = hrRaw.textContent.trim();
            hrRaw.setAttribute('data-chars', text);
            
            if (typeof window.triggerSync === 'function') {
                window.triggerSync();
            }
        }
    });

    dom.renderedOutput.addEventListener('keydown', (e) => {
        const key = e.key;
        let target = window.getSelection().anchorNode;
        if (!target) return;
        
        if (target.nodeType === 3) {
            target = target.parentNode;
        }
        
        while (target && target !== dom.renderedOutput && !['P', 'DIV'].includes(target.tagName)) {
            target = target.parentNode;
        }
        
        if (target && target !== dom.renderedOutput) {
            const text = target.textContent.trim();
            
            if (key === 'Enter' && /^(-{3,}|\*{3,}|_{3,}|={3,})$/.test(text)) {
                e.preventDefault();
                
                target.className = 'hr-raw-line';
                target.setAttribute('data-chars', text);
                
                const newPara = document.createElement('p');
                newPara.innerHTML = '<br>';
                target.parentNode.insertBefore(newPara, target.nextSibling);
                
                const sel = window.getSelection();
                const range = document.createRange();
                range.setStart(newPara, 0);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                
                newPara.focus();
                
                if (typeof window.triggerSync === 'function') {
                    window.triggerSync();
                }
                return;
            }
            
            if (key === 'Enter' && (target.classList.contains('hr-raw-line') || target.classList.contains('hr-focused'))) {
                e.preventDefault();
                
                // Strip the focused class prior to moving the cursor to trigger instant visual collapse
                target.classList.remove('hr-focused');

                const newPara = document.createElement('p');
                newPara.innerHTML = '<br>';
                target.parentNode.insertBefore(newPara, target.nextSibling);
                
                const sel = window.getSelection();
                const range = document.createRange();
                range.setStart(newPara, 0);
                range.collapse(true);
                sel.removeAllRanges();
                sel.addRange(range);
                
                newPara.focus();
                
                if (typeof window.triggerSync === 'function') {
                    window.triggerSync();
                }
            }
        }
    });

    dom.renderedOutput.addEventListener('focusout', (e) => {
        const hrRaw = e.target.closest('.hr-raw-line');
        if (hrRaw) {
            setTimeout(() => {
                if (document.activeElement !== hrRaw) {
                    if (hrRaw.textContent.trim() === '') {
                        hrRaw.remove();
                    }
                    if (typeof window.triggerSync === 'function') {
                        window.triggerSync();
                    }
                }
            }, 150);
        }
    });
}
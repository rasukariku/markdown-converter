import { dom } from '../core/state.js';

// =========================================================================
// MODULE-LEVEL CONSTANTS & HELPERS
// =========================================================================

const RE_LINE_BREAK = /<br\s*\/?>/gi;
const WRAPPER_PARAGRAPH = '<p align="left" style="text-align: left; margin: 0; padding: 0;">';

const MATHML_ATTRIBUTES_TO_REMOVE = [
    'class', 'style', 'id', 'data-semantic-type', 'data-semantic-role',
    'data-semantic-id', 'data-semantic-parent'
];

/**
 * Validated mapping of alphanumeric characters to serif bold mathematical unicode symbols.
 */
const BOLD_MATH_MAP = Object.freeze({
    '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗',
    'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣',
    'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭',
    'u': '🇺', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
    'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉',
    'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓',
    'U': '🇺', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
    '-': '−', '=': '='
});

/**
 * Converts standard alphanumeric strings into mathematical bold representations.
 * 
 * @param {string} str - Input text string.
 * @returns {string} String transformed with Unicode bold math characters.
 */
function toBoldMath(str) {
    if (!str) return str;
    return str.split('').map(c => BOLD_MATH_MAP[c] || c).join('');
}

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Initializes clipboard operations with dual-payload generation:
 * - text/html: Native Word/Google Docs HTML with inline styles and MathML Unicode transformation.
 * - text/plain: Clean Markdown with raw LaTeX delimiters ($...$ and $$...$$) for WhatsApp/Notion.
 */
export function initializeClipboard() {
    
    dom.renderedOutput.addEventListener('copy', function(e) {
        const selection = window.getSelection();
        if (!selection.rangeCount || !dom.renderedOutput.contains(selection.anchorNode)) return;

        e.preventDefault();

        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(fragment);

        // =================================================================
        // 1. PLAIN TEXT MARKDOWN PAYLOAD (WhatsApp, Notion, Notepad)
        // =================================================================
        const plainDiv = tempDiv.cloneNode(true);

        // Replace interactive math wrappers with pure Markdown LaTeX strings
        plainDiv.querySelectorAll('.math-wrapper').forEach(wrapper => {
            const rawEl = wrapper.querySelector('.math-raw-line');
            const rawText = rawEl ? rawEl.textContent.trim() : '';
            const isDisplay = wrapper.getAttribute('data-math-display') === 'true';
            const formatted = isDisplay ? `\n\n$$ ${rawText} $$\n\n` : `$${rawText}$`;
            
            if (wrapper.parentNode) {
                wrapper.parentNode.replaceChild(document.createTextNode(formatted), wrapper);
            }
        });

        // Convert horizontal rules
        plainDiv.querySelectorAll('.hr-raw-line').forEach(hr => {
            if (hr.parentNode) {
                hr.parentNode.replaceChild(document.createTextNode('\n\n---\n\n'), hr);
            }
        });

        // Convert remaining standalone MathJax nodes
        plainDiv.querySelectorAll('mjx-container').forEach(node => {
            const rawTex = node.getAttribute('data-raw-tex');
            const isDisplay = node.getAttribute('data-math-display') === 'true';
            if (rawTex && node.parentNode) {
                const mathText = isDisplay ? `\n\n$$ ${rawTex} $$\n\n` : `$${rawTex}$`;
                node.parentNode.replaceChild(document.createTextNode(mathText), node);
            }
        });

        const plainMarkdownText = plainDiv.innerText;

        // =================================================================
        // 2. RICH TEXT HTML PAYLOAD (Microsoft Word, Google Docs)
        // =================================================================
        let tempHtml = `${WRAPPER_PARAGRAPH}${tempDiv.innerHTML}</p>`;
        tempHtml = tempHtml.replace(RE_LINE_BREAK, `</p>${WRAPPER_PARAGRAPH}`);
        tempDiv.innerHTML = tempHtml;

        // Apply explicit inline styles across elements for Word compatibility
        tempDiv.querySelectorAll('*').forEach(el => {
            const tag = el.tagName;
            
            el.style.fontFamily = "'Times New Roman', serif";
            el.style.color = "black";
            
            if (tag === 'P' || tag === 'LI' || tag === 'SPAN') {
                el.style.fontSize = '12pt';
                el.style.lineHeight = '1.5';
                el.style.textAlign = 'justify';
            } else if (tag === 'H1') {
                el.style.fontSize = '20pt';
                el.style.fontWeight = 'bold';
                el.style.marginTop = '12pt';
                el.style.marginBottom = '6pt';
                el.style.textAlign = 'left';
            } else if (tag === 'H2') {
                el.style.fontSize = '16pt';
                el.style.fontWeight = 'bold';
                el.style.marginTop = '12pt';
                el.style.marginBottom = '6pt';
                el.style.textAlign = 'left';
            } else if (tag === 'H3') {
                el.style.fontSize = '14pt';
                el.style.fontWeight = 'bold';
                el.style.marginTop = '12pt';
                el.style.marginBottom = '6pt';
                el.style.textAlign = 'left';
            } else if (tag === 'BLOCKQUOTE') {
                el.style.borderLeft = '3.5pt solid #3b82f6';
                el.style.paddingLeft = '12pt';
                el.style.marginLeft = '0';
                el.style.color = '#555555';
                el.style.fontStyle = 'italic';
                el.style.backgroundColor = '#f9fafb';
            } else if (tag === 'TABLE') {
                el.style.borderCollapse = 'collapse';
                el.style.width = '100%';
                el.setAttribute('border', '1');
                el.setAttribute('cellspacing', '0');
                el.setAttribute('cellpadding', '6');
            } else if (tag === 'TH' || tag === 'TD') {
                el.style.border = '1px solid #000000';
                el.style.padding = '8px';
                el.style.textAlign = 'left';
                el.style.verticalAlign = 'top';
            } else if (tag === 'TH') {
                el.style.backgroundColor = '#f3f4f6';
                el.style.fontWeight = 'bold';
            } else if (tag === 'CODE') {
                el.style.fontFamily = "'Consolas', 'Courier New', monospace";
                el.style.backgroundColor = '#f4f4f5';
                el.style.padding = '2px 4px';
                el.style.borderRadius = '4px';
                el.style.fontSize = '10pt';
            } else if (tag === 'PRE') {
                el.style.backgroundColor = '#f4f4f5';
                el.style.padding = '12px';
                el.style.borderRadius = '6px';
                el.style.border = '1px solid #e4e4e7';
            }
        });

        // Convert horizontal rules to Word-compatible styled dividers
        tempDiv.querySelectorAll('hr').forEach(hr => {
            const hrWrapper = document.createElement('div');
            hrWrapper.style.marginTop = '18pt';
            hrWrapper.style.marginBottom = '18pt';
            hrWrapper.setAttribute('align', 'center');

            const newHr = document.createElement('hr');
            newHr.style.border = '0';
            newHr.style.borderTop = '1.5pt solid black';
            newHr.style.margin = '0';
            newHr.setAttribute('size', '2');
            newHr.setAttribute('color', 'black');

            hrWrapper.appendChild(newHr);
            hr.parentNode.replaceChild(hrWrapper, hr);
        });

        // Convert MathJax elements into Word MathML structures
        tempDiv.querySelectorAll('mjx-container').forEach(node => {
            const mmlContainer = node.querySelector('mjx-assistive-mml');

            if (mmlContainer && mmlContainer.firstElementChild) {
                const mmlClone = mmlContainer.firstElementChild.cloneNode(true);

                mmlClone.querySelectorAll('mn, mi, mo, mtext').forEach(token => {
                    const variantParent = token.closest('[mathvariant]');
                    if (variantParent) {
                        const variant = variantParent.getAttribute('mathvariant');
                        if (variant) {
                            token.setAttribute('mathvariant', variant);
                            if (variant.includes('bold')) {
                                token.textContent = toBoldMath(token.textContent);
                            }
                        }
                    }
                });

                mmlClone.querySelectorAll('*').forEach(el => {
                    MATHML_ATTRIBUTES_TO_REMOVE.forEach(attr => el.removeAttribute(attr));
                });

                const wrapper = document.createElement('span');
                wrapper.appendChild(document.createTextNode('\u200B'));
                wrapper.appendChild(mmlClone);
                wrapper.appendChild(document.createTextNode('\u200B'));
                node.parentNode.replaceChild(wrapper, node);
            } else {
                const rawTex = node.getAttribute('data-raw-tex');
                if (rawTex) {
                    const textSpan = document.createElement('span');
                    textSpan.innerText = `$$ ${rawTex} $$`;
                    node.parentNode.replaceChild(textSpan, node);
                }
            }
        });

        // Write both payloads to clipboard
        e.clipboardData.setData('text/html', tempDiv.outerHTML);
        e.clipboardData.setData('text/plain', plainMarkdownText);
    });
}
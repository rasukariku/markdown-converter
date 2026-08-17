import { dom } from '../core/state.js';
import { sanitizeLatexSymbolsInText, collapseAllArrows } from '../core/sync.js';

const MATHML_ATTRIBUTES_TO_REMOVE = [
    'class', 'style', 'id', 'data-semantic-type', 'data-semantic-role',
    'data-semantic-id', 'data-semantic-parent'
];

const BOLD_MATH_MAP = Object.freeze({
    '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗',
    'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣',
    'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭',
    'u': '🇺', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
    'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': '𝐃', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉',
    'K': '𝐊', 'L': '🇱', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓',
    'U': '🇺', 'V': '𝐕', 'W': '🇼', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
    '-': '−', '=': '='
});

function toBoldMath(str) {
    if (!str) return str;
    return str.split('').map(c => BOLD_MATH_MAP[c] || c).join('');
}

/**
 * Recursively cleans text nodes inside a DOM subtree to strip lingering TeX commands and collapse duplicate arrows.
 * 
 * @param {Node} node - Target DOM node.
 */
function sanitizeDomTextNodes(node) {
    if (!node) return;

    if (node.nodeType === Node.TEXT_NODE) {
        if (node.nodeValue) {
            node.nodeValue = sanitizeLatexSymbolsInText(node.nodeValue);
        }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
        if (['MATH', 'CODE', 'PRE'].includes(node.tagName)) return;
        node.childNodes.forEach(child => sanitizeDomTextNodes(child));
    }
}

export function initializeClipboard() {
    if (!dom.renderedOutput) return;

    dom.renderedOutput.addEventListener('copy', function(e) {
        const selection = window.getSelection();
        if (!selection.rangeCount || !dom.renderedOutput.contains(selection.anchorNode)) return;

        e.preventDefault();

        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(fragment);

        // Execute string-level arrow deduplication on full HTML fragment
        tempDiv.innerHTML = collapseAllArrows(tempDiv.innerHTML);

        // =================================================================
        // 1. PLAIN TEXT MARKDOWN PAYLOAD (WhatsApp, Notion, Notepad)
        // =================================================================
        const plainDiv = tempDiv.cloneNode(true);

        plainDiv.querySelectorAll('.math-wrapper').forEach(wrapper => {
            const rawEl = wrapper.querySelector('.math-raw-line');
            const rawText = rawEl ? rawEl.textContent.trim() : '';
            const isDisplay = wrapper.getAttribute('data-math-display') === 'true';
            const formatted = isDisplay ? `\n\n$$ ${rawText} $$\n\n` : `$${rawText}$`;
            
            if (wrapper.parentNode) {
                wrapper.parentNode.replaceChild(document.createTextNode(formatted), wrapper);
            }
        });

        plainDiv.querySelectorAll('.hr-raw-line').forEach(hr => {
            if (hr.parentNode) {
                hr.parentNode.replaceChild(document.createTextNode('\n\n---\n\n'), hr);
            }
        });

        plainDiv.querySelectorAll('mjx-container').forEach(node => {
            const rawTex = node.getAttribute('data-raw-tex');
            const isDisplay = node.getAttribute('data-math-display') === 'true';
            if (rawTex && node.parentNode) {
                const mathText = isDisplay ? `\n\n$$ ${rawTex} $$\n\n` : `$${rawTex}$`;
                node.parentNode.replaceChild(document.createTextNode(mathText), node);
            }
        });

        const plainMarkdownText = collapseAllArrows(plainDiv.innerText);

        // =================================================================
        // 2. RICH TEXT HTML PAYLOAD (Microsoft Word, Google Docs)
        // =================================================================
        // Target .math-wrapper containers atomically to purge hidden .math-raw-line nodes
        tempDiv.querySelectorAll('.math-wrapper').forEach(wrapper => {
            const mmlContainer = wrapper.querySelector('mjx-assistive-mml');
            const rawEl = wrapper.querySelector('.math-raw-line');
            const rawTex = rawEl ? rawEl.textContent.trim() : '';

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

                const mathSpan = document.createElement('span');
                mathSpan.appendChild(document.createTextNode('\u200B'));
                mathSpan.appendChild(mmlClone);
                mathSpan.appendChild(document.createTextNode('\u200B'));

                if (wrapper.parentNode) {
                    wrapper.parentNode.replaceChild(mathSpan, wrapper);
                }
            } else if (rawTex) {
                const textSpan = document.createElement('span');
                textSpan.innerText = sanitizeLatexSymbolsInText(rawTex);
                if (wrapper.parentNode) {
                    wrapper.parentNode.replaceChild(textSpan, wrapper);
                }
            }
        });

        // Target remaining standalone MathJax containers
        tempDiv.querySelectorAll('mjx-container').forEach(node => {
            const mmlContainer = node.querySelector('mjx-assistive-mml');
            if (mmlContainer && mmlContainer.firstElementChild) {
                const mmlClone = mmlContainer.firstElementChild.cloneNode(true);
                mmlClone.querySelectorAll('*').forEach(el => {
                    MATHML_ATTRIBUTES_TO_REMOVE.forEach(attr => el.removeAttribute(attr));
                });
                const mathSpan = document.createElement('span');
                mathSpan.appendChild(document.createTextNode('\u200B'));
                mathSpan.appendChild(mmlClone);
                mathSpan.appendChild(document.createTextNode('\u200B'));
                if (node.parentNode) {
                    node.parentNode.replaceChild(mathSpan, node);
                }
            } else {
                const rawTex = node.getAttribute('data-raw-tex');
                if (rawTex && node.parentNode) {
                    const textSpan = document.createElement('span');
                    textSpan.innerText = sanitizeLatexSymbolsInText(rawTex);
                    node.parentNode.replaceChild(textSpan, node);
                }
            }
        });

        // Clean DOM text nodes
        sanitizeDomTextNodes(tempDiv);

        // Apply inline styles for Word compatibility
        tempDiv.querySelectorAll('*').forEach(el => {
            const tag = el.tagName;
            
            if (!['TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'UL', 'OL', 'LI'].includes(tag)) {
                el.style.fontFamily = "'Times New Roman', serif";
                el.style.color = "#000000";
            }

            if (tag === 'P' || tag === 'LI') {
                el.style.fontSize = '12pt';
                el.style.lineHeight = '1.5';
                el.style.textAlign = 'justify';
                el.style.marginTop = '0pt';
                el.style.marginBottom = '6pt';
            } else if (tag === 'H1') {
                el.style.fontSize = '18pt';
                el.style.fontWeight = 'bold';
                el.style.marginTop = '12pt';
                el.style.marginBottom = '6pt';
                el.style.textAlign = 'left';
            } else if (tag === 'H2') {
                el.style.fontSize = '15pt';
                el.style.fontWeight = 'bold';
                el.style.marginTop = '12pt';
                el.style.marginBottom = '6pt';
                el.style.textAlign = 'left';
            } else if (tag === 'H3') {
                el.style.fontSize = '13pt';
                el.style.fontWeight = 'bold';
                el.style.marginTop = '12pt';
                el.style.marginBottom = '6pt';
                el.style.textAlign = 'left';
            } else if (tag === 'BLOCKQUOTE') {
                el.style.borderLeft = '3.5pt solid #3b82f6';
                el.style.paddingLeft = '12pt';
                el.style.marginLeft = '0pt';
                el.style.color = '#555555';
                el.style.fontStyle = 'italic';
            } else if (tag === 'TABLE') {
                el.style.borderCollapse = 'collapse';
                el.style.width = '100%';
                el.style.marginTop = '10pt';
                el.style.marginBottom = '10pt';
                el.setAttribute('border', '1');
                el.setAttribute('cellspacing', '0');
                el.setAttribute('cellpadding', '6');
            } else if (tag === 'TH' || tag === 'TD') {
                el.style.border = '1px solid #000000';
                el.style.padding = '6pt 8pt';
                el.style.textAlign = 'left';
                el.style.verticalAlign = 'top';
            } else if (tag === 'TH') {
                el.style.backgroundColor = '#f3f4f6';
                el.style.fontWeight = 'bold';
            } else if (tag === 'CODE') {
                el.style.fontFamily = "'Consolas', 'Courier New', monospace";
                el.style.backgroundColor = '#f4f4f5';
                el.style.padding = '2pt 4pt';
                el.style.fontSize = '10pt';
            } else if (tag === 'PRE') {
                el.style.backgroundColor = '#f4f4f5';
                el.style.padding = '10pt';
                el.style.border = '1px solid #e4e4e7';
            }
        });

        // Convert horizontal rules to Word-compatible dividers
        tempDiv.querySelectorAll('.hr-raw-line, hr').forEach(hr => {
            const hrWrapper = document.createElement('div');
            hrWrapper.style.marginTop = '12pt';
            hrWrapper.style.marginBottom = '12pt';
            hrWrapper.setAttribute('align', 'center');

            const newHr = document.createElement('hr');
            newHr.style.border = '0';
            newHr.style.borderTop = '1.5pt solid #000000';
            newHr.style.margin = '0';
            newHr.setAttribute('size', '2');
            newHr.setAttribute('color', 'black');

            hrWrapper.appendChild(newHr);
            if (hr.parentNode) {
                hr.parentNode.replaceChild(hrWrapper, hr);
            }
        });

        // Final safety string pass to collapse any arrows created during element manipulation
        const finalWordHtml = collapseAllArrows(tempDiv.innerHTML);

        e.clipboardData.setData('text/html', finalWordHtml);
        e.clipboardData.setData('text/plain', plainMarkdownText);
    });
}
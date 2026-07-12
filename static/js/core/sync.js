import { dom, state } from './state.js';

// =========================================================================
// PRE-COMPILED REGULAR EXPRESSIONS
// =========================================================================
// Pre-compile regexes to eliminate runtime parsing overhead during high-frequency input events.
const RE_SPECIAL_CHARS = /[\u00A0\u202F\u200B-\u200D\uFEFF]/g;
const RE_CRLF = /\r\n/g;
const RE_CR = /\r/g;
const RE_AI_BOLD_LIST = /^[ \t]*\*\*([a-zA-Z0-9]{1,3}[\.\)])[ \t]+(.*?)\*\*/gm;
const RE_AI_BOLD_LIST_END = /^[ \t]*\*\*([a-zA-Z0-9]{1,3}[\.\)])\*\*[ \t]+/gm;
const RE_HR_INLINE = /([^\n])[ \t]*(\*{3,}|-{3,}|_{3,})[ \t]*$/gm;
const RE_HR_START = /^[ \t]*(\*{3,}|-{3,}|_{3,})[ \t]*([^\n])/gm;
const RE_HR_STANDALONE = /^[ \t]*(\*{3,}|-{3,}|_{3,})[ \t]*$/gm;
const RE_INLINE_MATH = /\\\([\s\S]*?\\\)/g;
const RE_DISPLAY_MATH = /\\\[[\s\S]*?\\\]/g;
const RE_BOLD_MATH = /\*\*(\$\$?)([^\$\n]+)\1\*\*/g;
const RE_MATH_CONTENT = /(\$\$?)([^\$]+)\1/g;
const RE_MATH_BOLD = /\*\*[ \t]*([^\*\n]+)[ \t]*\*\*/g;
const RE_MATH_FRAC = /([-]?\d+)[ \t]*\/[ \t]*([-]?\d+)/g;
const RE_MATH_SPACES = /[ \t]{2,}/g;
const RE_EXCESS_NEWLINES = /\n{3,}/g;
const RE_MATRIX_MATH = /(?:\\mathbf|\\boldsymbol)\{\s*\\begin\{([a-zA-Z]*matrix)\}([\s\S]*?)\\end\{\1\}\s*\}/g;
const RE_BACKSLASH_ESCAPE = /\\\\/g;

// Comprehensive HTML entity decoder for MathJax attributes
const RE_HTML_ENTITIES = /&amp;|&lt;|&gt;|&quot;|&#39;/g;
const HTML_ENTITY_MAP = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'"
};

// Extract magic string to module-level constant
const STORAGE_KEY = 'massivemark_draft_md';

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================
function decodeHtmlEntities(text) {
    return text.replace(RE_HTML_ENTITIES, (match) => HTML_ENTITY_MAP[match]);
}

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================
export function sanitizeAIText(plainData) {
    plainData = plainData.replace(RE_SPECIAL_CHARS, ' ');
    plainData = plainData.replace(RE_CRLF, '\n');
    plainData = plainData.replace(RE_CR, '\n');
    plainData = plainData.replace(RE_AI_BOLD_LIST, '$1 **$2**');
    plainData = plainData.replace(RE_AI_BOLD_LIST_END, '$1 ');
    plainData = plainData.replace(RE_HR_INLINE, '$1\n\n$2\n\n');
    plainData = plainData.replace(RE_HR_START, '\n\n$1\n\n$2');
    plainData = plainData.replace(RE_HR_STANDALONE, '\n\n---\n\n');

    let processedText = plainData.replace(RE_INLINE_MATH, (m) => '$' + m.slice(2, -2).trim() + '$');
    processedText = processedText.replace(RE_DISPLAY_MATH, (m) => '$$' + m.slice(2, -2).trim() + '$$');
    processedText = processedText.replace(RE_BOLD_MATH, '$1\\mathbf{$2}$1');

    processedText = processedText.replace(RE_MATH_CONTENT, (match, dollar, mathContent) => {
        let cleanMath = mathContent;
        cleanMath = cleanMath.replace(RE_MATH_BOLD, '\\mathbf{$1}');
        cleanMath = cleanMath.replace(RE_MATH_FRAC, '\\frac{$1}{$2}');
        cleanMath = cleanMath.replace(RE_MATH_SPACES, ' ');
        return dollar + cleanMath + dollar;
    });

    return processedText.replace(RE_EXCESS_NEWLINES, '\n\n');
}

export function syncRawToRendered(updateCounter) {
    if (state.isSyncing) return;
    state.isSyncing = true;

    const rawText = dom.rawMarkdownInput.value;
    if (!rawText.trim()) {
        dom.renderedOutput.innerHTML = '';
        state.isSyncing = false;
        updateCounter();
        return;
    }

    const processedText = rawText.replace(RE_MATRIX_MATH, (match, matrixType, content) => {
        const formattedContent = content
            .split('\\\\')
            .map(row => row
                .split('&')
                .map(cell => cell.trim() === '' ? cell : `\\mathbf{${cell.trim()}}`)
                .join(' & ')
            )
            .join(' \\\\\n');

        return `\\begin{${matrixType}}\n${formattedContent}\n\\end{${matrixType}}`;
    });

    const parsedHTML = marked.parse(processedText.replace(RE_BACKSLASH_ESCAPE, '\\\\\\\\'));
    dom.renderedOutput.innerHTML = parsedHTML;

    MathJax.typesetPromise([dom.renderedOutput])
        .then(() => {
            dom.renderedOutput.querySelectorAll('mjx-container').forEach(node => {
                node.setAttribute('contenteditable', 'false');
            });
            dom.renderedOutput.querySelectorAll('hr').forEach(hr => {
                hr.style.borderTop = '2px solid var(--border-color)';
                hr.style.margin = '20px 0';
                hr.style.clear = 'both';
            });
            updateCounter();
            localStorage.setItem(STORAGE_KEY, rawText);
            state.isSyncing = false;
        })
        .catch(err => {
            console.error('MathJax typeset error:', err);
            state.isSyncing = false;
        });
}

export function syncRenderedToRaw(standardTurndown, updateCounter) {
    if (state.isSyncing) return;
    state.isSyncing = true;

    const clone = dom.renderedOutput.cloneNode(true);

    clone.querySelectorAll('mjx-container').forEach(node => {
        const rawTex = node.getAttribute('data-raw-tex');
        const isDisplay = node.getAttribute('data-math-display') === 'true';

        if (rawTex) {
            const cleanTex = decodeHtmlEntities(rawTex);
            const mathText = isDisplay ? `\n\n$$${cleanTex}$$\n\n` : `$${cleanTex}$`;
            node.parentNode.replaceChild(document.createTextNode(mathText), node);
        }
    });

    let md = standardTurndown.turndown(clone.innerHTML);
    md = md.replace(RE_EXCESS_NEWLINES, '\n\n');
    md = md.replace(/(?:\n\n---\n\n){2,}/g, '\n\n---\n\n');

    dom.rawMarkdownInput.value = md;
    updateCounter();
    localStorage.setItem(STORAGE_KEY, md);
    state.isSyncing = false;
}
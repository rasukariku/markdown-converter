import { dom, state } from './state.js';

// =========================================================================
// PRE-COMPILED REGULAR EXPRESSIONS
// =========================================================================
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

// Decoders for MathJax attributes
const RE_HTML_ENTITIES = /&amp;|&lt;|&gt;|&quot;|&#39;/g;
const HTML_ENTITY_MAP = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'"
};

const STORAGE_KEY = 'massivemark_draft_md';

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================
function decodeHtmlEntities(text) {
    return text.replace(RE_HTML_ENTITIES, (match) => HTML_ENTITY_MAP[match]);
}

/**
 * Creates an interactive math wrapper matching the Obsidian-style.
 */
function createInteractiveMathWrapper(mathContent, isDisplay) {
    const cleanContent = mathContent.trim();
    const wrapperClass = isDisplay ? 'math-wrapper display-math-wrapper' : 'math-wrapper inline-math-wrapper';
    const displayClass = isDisplay ? 'display-math-raw' : 'inline-math-raw';
    const displayAttr = isDisplay ? 'true' : 'false';
    const delim = isDisplay ? '$$' : '$';

    const previewLaTeX = isDisplay ? `$$ ${cleanContent} $$` : `$${cleanContent}$`;

    if (isDisplay) {
        return `
            <div class="${wrapperClass}" contenteditable="false" data-math-display="${displayAttr}">
                <p class="math-raw-line ${displayClass}" contenteditable="true" data-delimiter-left="${delim}" data-delimiter-right="${delim}">${cleanContent}</p>
                <div class="math-preview-rendered" style="cursor: pointer;">${previewLaTeX}</div>
            </div>
        `.trim();
    } else {
        return `
            <span class="${wrapperClass}" contenteditable="false" data-math-display="${displayAttr}">
                <span class="math-raw-line ${displayClass}" contenteditable="true" data-delimiter-left="${delim}" data-delimiter-right="${delim}">${cleanContent}</span>
                <span class="math-preview-rendered" style="cursor: pointer;">$${cleanContent}$</span>
            </span>
        `.trim();
    }
}

/**
 * Protects math equations and horizontal dividers from the Markdown parser.
 */
export function parseMarkdownWithMath(text) {
    if (!text) return '';

    const mathBlocks = [];

    // 1. Protect Display Math ($$...$$) multi-line blocks
    let processedText = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, math) => {
        const placeholder = `@@@MATH_DISPLAY_${mathBlocks.length}@@@`;
        const wrapper = createInteractiveMathWrapper(math, true);
        mathBlocks.push({ placeholder, wrapper });
        return placeholder;
    });

    // 2. Protect Inline Math ($...$) blocks
    processedText = processedText.replace(/\$([^\$\s\n](?:[^\$\n]*?[^\$\s\n])?)\$/g, (match, math) => {
        const placeholder = `@@@MATH_INLINE_${mathBlocks.length}@@@`;
        const wrapper = createInteractiveMathWrapper(math, false);
        mathBlocks.push({ placeholder, wrapper });
        return placeholder;
    });

    // 4. Invoke Marked Parser on isolated structural contents
    let parsedHTML = marked.parse(processedText);

    // 5. Restore math elements inside parsed HTML
    mathBlocks.forEach(({ placeholder, wrapper }) => {
        const pWrappedPlaceholder = `<p>${placeholder}</p>`;
        if (parsedHTML.includes(pWrappedPlaceholder)) {
            parsedHTML = parsedHTML.split(pWrappedPlaceholder).join(wrapper);
        } else {
            parsedHTML = parsedHTML.split(placeholder).join(wrapper);
        }
    });

    // KUNCI PERBAIKAN UTAMA: Konversi tag HR alami hasil parsing marked menjadi block editable murni
    parsedHTML = parsedHTML.replace(/<hr\s*\/?>/gi, `<p class="hr-raw-line" contenteditable="true" data-chars="---">---</p>`);

    return parsedHTML;
}

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

    const parsedHTML = parseMarkdownWithMath(processedText);
    dom.renderedOutput.innerHTML = parsedHTML;

    if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
        window.MathJax.typesetPromise([dom.renderedOutput])
            .then(() => {
                dom.renderedOutput.querySelectorAll('mjx-container').forEach(node => {
                    node.setAttribute('contenteditable', 'false');
                });
                updateCounter();
                localStorage.setItem(STORAGE_KEY, rawText);
                state.isSyncing = false;
            })
            .catch(err => {
                console.error('MathJax typeset error:', err);
                state.isSyncing = false;
            });
    } else {
        updateCounter();
        localStorage.setItem(STORAGE_KEY, rawText);
        state.isSyncing = false;
    }
}

export function syncRenderedToRaw(standardTurndown, updateCounter) {
    if (state.isSyncing) return;
    state.isSyncing = true;

    const clone = dom.renderedOutput.cloneNode(true);

    clone.querySelectorAll('.math-wrapper').forEach(wrapper => {
        const rawEl = wrapper.querySelector('.math-raw-line');
        const rawText = rawEl ? rawEl.textContent.trim() : '';
        const isDisplay = wrapper.getAttribute('data-math-display') === 'true';
        const formattedLaTeX = isDisplay ? `\n\n$$ ${rawText} $$\n\n` : `$${rawText}$`;
        
        if (wrapper.parentNode) {
            wrapper.parentNode.replaceChild(document.createTextNode(formattedLaTeX), wrapper);
        }
    });

    clone.querySelectorAll('.hr-raw-line').forEach(rawLine => {
        const rawText = rawLine.innerText.trim();
        if (rawLine.parentNode) {
            rawLine.parentNode.replaceChild(document.createTextNode('\n\n' + rawText + '\n\n'), rawLine);
        }
    });

    clone.querySelectorAll('mjx-container').forEach(node => {
        const rawTex = node.getAttribute('data-raw-tex');
        const isDisplay = node.getAttribute('data-math-display') === 'true';

        if (rawTex && node.parentNode) {
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
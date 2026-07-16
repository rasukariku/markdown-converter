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
 * Membuat struktur markup pembungkus interaktif matematika Obsidian-Style.
 * 
 * @param {string} mathContent - Teks LaTeX matematika mentah.
 * @param {boolean} isDisplay - Penanda jenis block (display math) atau inline math.
 * @returns {string} Untaian elemen HTML pembungkus interaktif.
 */
function createInteractiveMathWrapper(mathContent, isDisplay) {
    const cleanContent = mathContent.trim();
    const wrapperClass = isDisplay ? 'math-wrapper display-math-wrapper' : 'math-wrapper inline-math-wrapper';
    const displayAttr = isDisplay ? 'true' : 'false';
    const rawLaTeX = isDisplay ? `$$${cleanContent}$$` : `$${cleanContent}$`;

    return `
        <span class="${wrapperClass}" contenteditable="false" data-math-display="${displayAttr}">
            <span class="math-raw" contenteditable="true">${rawLaTeX}</span>
            <span class="math-preview">${rawLaTeX}</span>
            <span class="math-toolbar">
                <button type="button" class="math-toolbar-btn math-copy-btn" title="Copy LaTeX">📋 Copy</button>
                <button type="button" class="math-toolbar-btn math-code-toggle" title="Toggle Code">&lt;/&gt;</button>
            </span>
        </span>
    `.trim();
}

/**
 * Melindungi blok matematika dari parser Marked Markdown (Obsidian-Style Parser).
 * KUNCI PERBAIKAN: Mengintegrasikan komponen interaktif penyuntingan LaTeX di tempat (Live Preview).
 * 
 * @param {string} text - Teks Markdown input mentah.
 * @returns {string} HTML hasil render dengan komponen interaktif terintegrasi.
 */
export function parseMarkdownWithMath(text) {
    if (!text) return '';

    const mathBlocks = [];

    // 1. Proteksi & Konstruksi Display Math ($$...$$) secara multi-line
    let processedText = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, math) => {
        const placeholder = `@@@MATH_DISPLAY_${mathBlocks.length}@@@`;
        const wrapper = createInteractiveMathWrapper(math, true);
        mathBlocks.push({ placeholder, wrapper });
        return placeholder;
    });

    // 2. Proteksi & Konstruksi Inline Math ($...$) bebas lookbehind demi performa browser maksimal
    processedText = processedText.replace(/\$([^\$\s\n](?:[^\$\n]*?[^\$\s\n])?)\$/g, (match, math) => {
        const placeholder = `@@@MATH_INLINE_${mathBlocks.length}@@@`;
        const wrapper = createInteractiveMathWrapper(math, false);
        mathBlocks.push({ placeholder, wrapper });
        return placeholder;
    });

    // 3. Jalankan parser Markdown Marked pada teks terisolasi
    let parsedHTML = marked.parse(processedText);

    // 4. Kembalikan komponen matematika interaktif ke dalam HTML hasil parse dengan metode split-join
    mathBlocks.forEach(({ placeholder, wrapper }) => {
        parsedHTML = parsedHTML.split(placeholder).join(wrapper);
    });

    // 5. KUNCI PERBAIKAN: Konversi tag <hr> statis menjadi komponen HR interaktif Obsidian-Style
    parsedHTML = parsedHTML.replace(/<hr\s*\/?>/gi, `
        <div class="hr-wrapper" contenteditable="false">
            <span class="hr-raw" contenteditable="true">---</span>
            <div class="hr-line"></div>
        </div>
    `.trim());

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

    MathJax.typesetPromise([dom.renderedOutput])
        .then(() => {
            dom.renderedOutput.querySelectorAll('mjx-container').forEach(node => {
                node.setAttribute('contenteditable', 'false');
            });
            // HR dinamis ditangani terpisah oleh parseMarkdownWithMath, tidak perlu timpa style hr statis
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

    // KUNCI PERBAIKAN SINKRONISASI: Ganti komponen pembungkus matematika dengan kode LaTeX mentah murni
    clone.querySelectorAll('.math-wrapper').forEach(wrapper => {
        const rawEl = wrapper.querySelector('.math-raw');
        const rawText = rawEl ? rawEl.innerText.trim() : '';
        wrapper.parentNode.replaceChild(document.createTextNode(rawText), wrapper);
    });

    // KUNCI PERBAIKAN SINKRONISASI: Ganti komponen HR interaktif dengan penanda Markdown aslinya
    clone.querySelectorAll('.hr-wrapper').forEach(wrapper => {
        const rawEl = wrapper.querySelector('.hr-raw');
        const rawText = rawEl ? rawEl.innerText.trim() : '---';
        wrapper.parentNode.replaceChild(document.createTextNode('\n\n' + rawText + '\n\n'), wrapper);
    });

    // Cadangan pembersihan MathJax mjx-container reguler jika ada yang terlewat
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
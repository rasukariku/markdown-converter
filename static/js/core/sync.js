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
 * Membuat komponen berdampingan (Sibling-Based) untuk input teks mentah dan kartu pratinjau rumus.
 * Menghilangkan nesting contenteditable="false" yang merusak fungsionalitas kursor teks browser.
 * 
 * @param {string} mathContent - Teks LaTeX matematika mentah.
 * @param {boolean} isDisplay - Penanda jenis block (display math) atau inline math.
 * @returns {string} Markup HTML terpisah.
 */
function createInteractiveMathWrapper(mathContent, isDisplay) {
    const cleanContent = mathContent.trim();
    const rawLaTeX = isDisplay ? `$$ ${cleanContent} $$` : `$${cleanContent}$`;
    const displayClass = isDisplay ? 'display-math-raw' : 'inline-math-raw';

    if (isDisplay) {
        return `
            <p class="math-raw-line ${displayClass}" contenteditable="true">${rawLaTeX}</p>
            <div class="math-preview-card" contenteditable="false">
                <div class="math-preview-rendered">${rawLaTeX}</div>
                <button type="button" class="math-code-toggle">&lt;/&gt;</button>
            </div>
        `.trim();
    } else {
        return `
            <span class="math-raw-line ${displayClass}" contenteditable="true">${rawLaTeX}</span>
            <span class="math-preview-card" contenteditable="false">
                <span class="math-preview-rendered">${rawLaTeX}</span>
                <button type="button" class="math-code-toggle" style="display:none;">&lt;/&gt;</button>
            </span>
        `.trim();
    }
}

/**
 * Melindungi blok matematika dari parser Marked Markdown (Obsidian-Style Parser).
 * KUNCI PERBAIKAN: Mengisolasi formula matematika sebelum Marked berjalan menggunakan markup berdampingan.
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

    // 2. Proteksi & Konstruksi Inline Math ($...$) bebas lookbehind untuk kompatibilitas WebKit/Safari
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

    // 5. KUNCI PERBAIKAN: Konversi tag <hr> statis menjadi komponen HR interaktif Obsidian-Style berdampingan
    parsedHTML = parsedHTML.replace(/<hr\s*\/?>/gi, `
        <div class="hr-raw-line" contenteditable="true">---</div>
        <div class="hr-preview-line" contenteditable="false"></div>
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

    // KUNCI PERBAIKAN SINKRONISASI: Hapus semua visual preview card pembantu sebelum konversi markdown
    clone.querySelectorAll('.math-preview-card').forEach(card => card.remove());
    clone.querySelectorAll('.hr-preview-line').forEach(line => line.remove());

    // KUNCI PERBAIKAN SINKRONISASI: Kembalikan teks asli dari kotak raw matematika murni
    clone.querySelectorAll('.math-raw-line').forEach(rawLine => {
        const rawText = rawLine.innerText.trim();
        rawLine.parentNode.replaceChild(document.createTextNode(rawText), rawLine);
    });

    // KUNCI PERBAIKAN SINKRONISASI: Kembalikan teks pembatas asli dari kotak raw pemisah
    clone.querySelectorAll('.hr-raw-line').forEach(rawLine => {
        const rawText = rawLine.innerText.trim();
        rawLine.parentNode.replaceChild(document.createTextNode('\n\n' + rawText + '\n\n'), rawLine);
    });

    // Cadangan pembersihan MathJax mjx-container jika ada yang terlewat di luar wrapper
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
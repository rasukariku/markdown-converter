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
 * Membuat komponen pembungkus matematika Obsidian-style.
 * KUNCI PERBAIKAN: Rumus inline dipisahkan tanpa kartu preview agar mengalir rapi di dalam baris kalimat.
 */
function createInteractiveMathWrapper(mathContent, isDisplay) {
    const cleanContent = mathContent.trim();
    const wrapperClass = isDisplay ? 'math-wrapper display-math-wrapper' : 'math-wrapper inline-math-wrapper';
    const displayClass = isDisplay ? 'display-math-raw' : 'inline-math-raw';
    const displayAttr = isDisplay ? 'true' : 'false';
    const delim = isDisplay ? '$$' : '$';

    if (isDisplay) {
        // Display Math: Menggunakan kartu preview besar dengan tombol kontrol penuh
        return `
            <div class="${wrapperClass}" contenteditable="false" data-math-display="${displayAttr}">
                <p class="math-raw-line ${displayClass}" contenteditable="true" data-delimiter-left="${delim}" data-delimiter-right="${delim}">${cleanContent}</p>
                <div class="math-preview-card" contenteditable="false">
                    <div class="math-preview-rendered">$$ ${cleanContent} $$</div>
                    <div class="math-toolbar">
                        <button type="button" class="math-toolbar-btn math-copy-btn" title="Copy LaTeX">📋 Copy</button>
                        <button type="button" class="math-toolbar-btn math-code-toggle" title="Toggle Code">&lt;/&gt;</button>
                    </div>
                </div>
            </div>
        `.trim();
    } else {
        // Inline Math: Sangat ringan, tanpa kartu preview atau tombol melayang agar mengalir selaras teks kalimat
        return `
            <span class="${wrapperClass}" contenteditable="false" data-math-display="${displayAttr}">
                <span class="math-raw-line ${displayClass}" contenteditable="true" data-delimiter-left="${delim}" data-delimiter-right="${delim}">${cleanContent}</span>
                <span class="math-preview-rendered" style="cursor: pointer;">$${cleanContent}$</span>
            </span>
        `.trim();
    }
}

/**
 * Melindungi blok matematika & garis pembatas dari parser Marked Markdown (Obsidian-Style Parser).
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

    // 2. Proteksi & Konstruksi Inline Math ($...$) bebas dari lookbehind
    processedText = processedText.replace(/\$([^\$\s\n](?:[^\$\n]*?[^\$\s\n])?)\$/g, (match, math) => {
        const placeholder = `@@@MATH_INLINE_${mathBlocks.length}@@@`;
        const wrapper = createInteractiveMathWrapper(math, false);
        mathBlocks.push({ placeholder, wrapper });
        return placeholder;
    });

    // 3. KUNCI PERBAIKAN: Proteksi pembatas garis (HR) sebelum Marked berjalan agar terdeteksi sempurna walau di dalam list
    processedText = processedText.replace(/(?m)^([ \t]*)(-{3,}|\*{3,}|_{3,})[ \t]*$/g, (match, indent, chars) => {
        const placeholder = `@@@HR_PH_${mathBlocks.length}@@@`;
        const indentWidth = indent ? indent.length * 8 : 0;
        const wrapper = `
            <div class="hr-wrapper" contenteditable="false" style="margin-left: ${indentWidth}px;">
                <div class="hr-raw-line" contenteditable="true">${chars}</div>
                <div class="hr-preview-line" contenteditable="false"></div>
            </div>
        `.trim();
        mathBlocks.push({ placeholder, wrapper });
        return placeholder;
    });

    // 4. Jalankan parser Markdown Marked pada teks terisolasi
    let parsedHTML = marked.parse(processedText);

    // 5. Kembalikan komponen matematika & HR interaktif ke dalam HTML hasil parse dengan metode split-join
    mathBlocks.forEach(({ placeholder, wrapper }) => {
        parsedHTML = parsedHTML.split(placeholder).join(wrapper);
    });

    // Cadangan konversi tag <hr> statis sisa jika ada yang terlewat
    parsedHTML = parsedHTML.replace(/<hr\s*\/?>/gi, `
        <div class="hr-wrapper" contenteditable="false">
            <div class="hr-raw-line" contenteditable="true">---</div>
            <div class="hr-preview-line" contenteditable="false"></div>
        </div>
    `.trim());

    return parsedHTML;
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

    // Hapus semua visual preview card pembantu sebelum konversi markdown
    clone.querySelectorAll('.math-preview-card').forEach(card => card.remove());
    clone.querySelectorAll('.hr-preview-line').forEach(line => line.remove());

    // KUNCI PERBAIKAN SINKRONISASI: Kembalikan teks asli dengan merakit delimiters dollar ($ atau $$) secara dinamis
    clone.querySelectorAll('.math-raw-line').forEach(rawLine => {
        const rawText = rawLine.innerText.trim();
        const isDisplay = rawLine.classList.contains('display-math-raw');
        const formattedLaTeX = isDisplay ? `$$ ${rawText} $$` : `$${rawText}$`;
        rawLine.parentNode.replaceChild(document.createTextNode(formattedLaTeX), rawLine);
    });

    // Kembalikan teks pembatas asli dari kotak raw pemisah
    clone.querySelectorAll('.hr-raw-line').forEach(rawLine => {
        const rawText = rawLine.innerText.trim();
        rawLine.parentNode.replaceChild(document.createTextNode('\n\n' + rawText + '\n\n'), rawLine);
    });

    // Cadangan pembersihan MathJax mjx-container jika ada yang terlewat
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
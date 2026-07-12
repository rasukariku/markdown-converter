import { dom } from '../core/state.js';
import { openWin } from '../ui/modals.js';

// =========================================================================
// MODULE-LEVEL CONSTANTS & HELPERS
// =========================================================================

// Pre-compile regular expressions untuk mengurangi overhead runtime parsing
const RE_EXCESS_NEWLINES = /\n{3,}/g;
const RE_EXCESS_HR = /(?:\n\n---\n\n){2,}/g;
const RE_BACKSLASH_ESCAPE = /\\/g;

// Kamus pemecah entitas HTML untuk memulihkan sintaks MathJax murni
const RE_HTML_ENTITIES = /&amp;|&lt;|&gt;|&quot;|&#39;/g;
const HTML_ENTITY_MAP = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'"
};

/**
 * Mendekode entitas HTML mentah dari MathJax menjadi karakter strings asli.
 * 
 * @param {string} text - Teks HTML terenkripsi.
 * @returns {string} Teks terdekode bersih.
 */
function decodeHtmlEntities(text) {
    return text.replace(RE_HTML_ENTITIES, (match) => HTML_ENTITY_MAP[match]);
}

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Menginisialisasi sistem ekspor universal (Universal Export Modal) dan logika formulir konversi.
 * 
 * @param {object} dedicatedExportTurndown - Instansi Turndown yang dikonfigurasi khusus untuk ekspor.
 * @param {Function} syncRenderedToRaw - Callback untuk sinkronisasi editor visual ke raw markdown.
 * @param {Function} updateCounter - Callback untuk memperbarui statistik dokumen.
 */
export function initializeExport(dedicatedExportTurndown, syncRenderedToRaw, updateCounter) {
    
    // Cache referensi DOM tombol ekspor modal
    const btnOpenUni = document.getElementById('btn-open-uni');
    const btnCopyUniversal = document.getElementById('btn-copy-universal');

    /**
     * Memproses klon konten visual editor dan mengonversinya menjadi markdown universal.
     */
    function renderUniversalExport() {
        const clone = dom.renderedOutput.cloneNode(true);
        let md = dedicatedExportTurndown.turndown(clone.innerHTML);
        
        md = md.replace(RE_EXCESS_NEWLINES, '\n\n');
        md = md.replace(RE_EXCESS_HR, '\n\n---\n\n');
        
        dom.universalMarkdownInput.value = md;
    }

    // Aksi Klik: Buka Modal Ekspor Universal
    btnOpenUni.onclick = () => {
        // KUNCI PERBAIKAN: Fungsi openWin sekarang diimpor eksplisit dan aman dipanggil
        openWin('win-uni');
        renderUniversalExport();
        dom.universalMarkdownInput.focus();
    };

    // Sinkronisasi Dua Arah: Input pada Universal Modal mentransfer konten ke editor visual
    dom.universalMarkdownInput.addEventListener('input', function() {
        const rawText = dom.universalMarkdownInput.value;
        const parsedHTML = marked.parse(rawText.replace(RE_BACKSLASH_ESCAPE, '\\\\\\\\'));
        
        dom.renderedOutput.innerHTML = parsedHTML;
        
        MathJax.typesetPromise([dom.renderedOutput]).then(() => {
            dom.renderedOutput.querySelectorAll('mjx-container').forEach(node => {
                node.setAttribute('contenteditable', 'false');
            });
            updateCounter();
            syncRenderedToRaw();
        });
    });

    // Aksi Klik: Salin hasil ekspor ke Clipboard
    btnCopyUniversal.onclick = function() {
        navigator.clipboard.writeText(dom.universalMarkdownInput.value);
        this.innerText = 'Copied!';
        setTimeout(() => { this.innerText = 'Copy Export'; }, 2000);
    };

    // Event Submit Form: Siapkan teks Markdown bersih untuk dikirim ke Backend Flask
    dom.convertForm.addEventListener('submit', function(e) {
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
        
        dom.hiddenFormInput.value = dedicatedExportTurndown.turndown(clone.innerHTML);
        dom.fabMenu.classList.remove('active');
    });
}
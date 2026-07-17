import { dom } from '../core/state.js';
import { openWin } from '../ui/modals.js';
import { parseMarkdownWithMath } from '../core/sync.js';

// =========================================================================
// MODULE-LEVEL CONSTANTS & HELPERS
// =========================================================================

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
        
        md = md.replace(/\n{3,}/g, '\n\n');
        md = md.replace(/(?:\n\n---\n\n){2,}/g, '\n\n---\n\n');
        
        dom.universalMarkdownInput.value = md;
    }

    // Aksi Klik: Buka Modal Ekspor Universal
    btnOpenUni.onclick = () => {
        openWin('win-uni');
        renderUniversalExport();
        dom.universalMarkdownInput.focus();
    };

    // Sinkronisasi Dua Arah: Input pada Universal Modal mentransfer konten ke editor visual secara aman
    dom.universalMarkdownInput.addEventListener('input', function() {
        const rawText = dom.universalMarkdownInput.value;
        
        // Gunakan parser matematika universal yang aman dari stripping backslash
        const parsedHTML = parseMarkdownWithMath(rawText);
        
        dom.renderedOutput.innerHTML = parsedHTML;
        
        // KUNCI PERBAIKAN: Berikan pengaman asinkronisasi (Null-Safety) untuk ekspor universal modal
        if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
            window.MathJax.typesetPromise([dom.renderedOutput]).then(() => {
                dom.renderedOutput.querySelectorAll('mjx-container').forEach(node => {
                    node.setAttribute('contenteditable', 'false');
                });
                updateCounter();
                syncRenderedToRaw();
            });
        } else {
            updateCounter();
            syncRenderedToRaw();
        }
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
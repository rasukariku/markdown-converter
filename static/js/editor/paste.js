import { dom } from '../core/state.js';
import { sanitizeAIText, syncRawToRendered } from '../core/sync.js';

// =========================================================================
// MODULE-LEVEL CONSTANTS
// =========================================================================

// Pre-compile regex untuk pencarian backslash guna mengoptimalkan pemrosesan teks pasting matematika
const RE_BACKSLASH_ESCAPE = /\\/g;

// Jeda asinkron untuk memastikan operasi penempelan HTML (insertHTML) telah tuntas sebelum proses parsing gaya
const PASTE_SYNC_DELAY_MS = 50;

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Menginisialisasi pencegat penempelan teks (Paste Interceptors) untuk editor WYSIWYG
 * visual maupun textarea modal markdown mentah.
 * 
 * @param {object} standardTurndown - Instansi dari layanan Turndown standar.
 * @param {Function} updateCounter - Callback untuk memperbarui statistik dokumen.
 */
export function initializePasteInterceptors(standardTurndown, updateCounter) {
    
    // 1. Paste Interceptor untuk Editor Visual (WYSIWYG)
    dom.renderedOutput.addEventListener('paste', function(e) {
        e.preventDefault();
        e.stopImmediatePropagation();
        
        const clipboardData = e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData);
        const plainData = clipboardData ? clipboardData.getData('text/plain') : '';
        
        // Lakukan sanitasi AI pada teks biasa yang ditempelkan
        const processedText = sanitizeAIText(plainData);
        const parsedHTML = marked.parse(processedText.replace(RE_BACKSLASH_ESCAPE, '\\\\\\\\'));
        
        document.execCommand('insertHTML', false, parsedHTML);
        
        // Pembersihan gaya inline tak dikenal yang mungkin terbawa dari penempelan teks luar (Rich Text)
        setTimeout(() => {
            dom.renderedOutput.querySelectorAll('*').forEach((el) => {
                if (el.style.margin) el.style.margin = '';
                if (el.style.padding) el.style.padding = '';
                if (el.style.lineHeight) el.style.lineHeight = '';
            });
            
            // Format ulang MathJax kontainer agar rapi dan tidak contenteditable
            MathJax.typesetPromise([dom.renderedOutput]).then(() => {
                dom.renderedOutput.querySelectorAll('mjx-container').forEach((node) => { 
                    node.setAttribute('contenteditable', 'false'); 
                });
                updateCounter(); 
                syncRenderedToRaw(standardTurndown, updateCounter); 
            });
        }, PASTE_SYNC_DELAY_MS);
    });

    // 2. Paste Interceptor untuk Textarea Markdown Mentah (Modal)
    dom.rawMarkdownInput.addEventListener('paste', function(e) {
        e.preventDefault();
        
        const clipboardData = e.clipboardData || (e.originalEvent && e.originalEvent.clipboardData);
        const plainData = clipboardData ? clipboardData.getData('text/plain') : '';
        const processedText = sanitizeAIText(plainData);
        
        const target = dom.rawMarkdownInput;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        
        // Sisipkan teks terproses tepat di posisi kursor aktif
        target.value = target.value.substring(0, start) + processedText + target.value.substring(end);
        target.selectionStart = target.selectionEnd = start + processedText.length;
        
        // KUNCI PERBAIKAN: Sinkronisasikan secara instan hasil paste markdown mentah ke editor visual
        syncRawToRendered(updateCounter);
    });
}
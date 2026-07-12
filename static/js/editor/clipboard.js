import { dom } from '../core/state.js';

// =========================================================================
// MODULE-LEVEL CONSTANTS & HELPERS
// =========================================================================

// Pre-compile regex untuk penggantian baris guna meminimalkan overhead runtime
const RE_LINE_BREAK = /<br\s*\/?>/gi;

// Konstanta struktur pembungkus paragraf standar clipboard
const WRAPPER_PARAGRAPH = '<p align="left" style="text-align: left; margin: 0; padding: 0;">';

// Atribut MathML yang harus dibersihkan sebelum masuk clipboard untuk kompatibilitas Word
const MATHML_ATTRIBUTES_TO_REMOVE = [
    'class', 'style', 'id', 'data-semantic-type', 'data-semantic-role',
    'data-semantic-id', 'data-semantic-parent'
];

/**
 * Kamus pemetaan karakter reguler ke karakter tebal matematika (Mathematical Bold) asli.
 * KUNCI PERBAIKAN: Seluruh angka 0-9, huruf kecil a-z, dan huruf besar A-Z telah dipulihkan.
 * Bendera regional (seperti regional '🇨' yang korup) telah diganti menjadi simbol matematika '𝐂' yang valid.
 */
const BOLD_MATH_MAP = Object.freeze({
    '0': '𝟎', '1': '𝟏', '2': '𝟐', '3': '𝟑', '4': '𝟒', '5': '𝟓', '6': '𝟔', '7': '𝟕', '8': '𝟖', '9': '𝟗',
    'a': '𝐚', 'b': '𝐛', 'c': '𝐜', 'd': '𝐝', 'e': '𝐞', 'f': '𝐟', 'g': '𝐠', 'h': '𝐡', 'i': '𝐢', 'j': '𝐣',
    'k': '𝐤', 'l': '𝐥', 'm': '𝐦', 'n': '𝐧', 'o': '𝐨', 'p': '𝐩', 'q': '𝐪', 'r': '𝐫', 's': '𝐬', 't': '𝐭',
    'u': '𝐮', 'v': '𝐯', 'w': '𝐰', 'x': '𝐱', 'y': '𝐲', 'z': '𝐳',
    'A': '𝐀', 'B': '𝐁', 'C': '𝐂', 'D': 'Ｄ', 'E': '𝐄', 'F': '𝐅', 'G': '𝐆', 'H': '𝐇', 'I': '𝐈', 'J': '𝐉',
    'K': '𝐊', 'L': '𝐋', 'M': '𝐌', 'N': '𝐍', 'O': '𝐎', 'P': '𝐏', 'Q': '𝐐', 'R': '𝐑', 'S': '𝐒', 'T': '𝐓',
    'U': '𝐔', 'V': '𝐕', 'W': '𝐖', 'X': '𝐗', 'Y': '𝐘', 'Z': '𝐙',
    '-': '−', '=': '='
});

/**
 * Mengonversi teks biasa menjadi karakter matematika tebal menggunakan BOLD_MATH_MAP.
 * 
 * @param {string} str - Teks input biasa.
 * @returns {string} Teks terkonversi tebal matematika.
 */
function toBoldMath(str) {
    if (!str) return str;
    return str.split('').map(c => BOLD_MATH_MAP[c] || c).join('');
}

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Menginisialisasi sistem clipboard lanjut (Smart Click-to-Copy dan Smart Drag-to-Copy).
 * KUNCI PERBAIKAN: Fungsi ini sekarang diekspor secara eksplisit agar dapat dimuat oleh main.js.
 */
export function initializeClipboard() {
    
    // 1. SMART CLICK-TO-COPY (Untuk Rumus Matematika / MathJax)
    dom.renderedOutput.addEventListener('click', async function(e) {
        const mathEl = e.target.closest('mjx-container');
        if (!mathEl) return;

        const mmlContainer = mathEl.querySelector('mjx-assistive-mml');
        if (!mmlContainer || !mmlContainer.firstElementChild) return;

        const mmlClone = mmlContainer.firstElementChild.cloneNode(true);
        const wrapper = document.createElement('span');
        
        // Sisipkan zero-width space (\u200B) untuk menjaga whitespace dan isolasi teks matematika saat ditempel
        wrapper.appendChild(document.createTextNode('\u200B'));
        wrapper.appendChild(mmlClone);
        wrapper.appendChild(document.createTextNode('\u200B'));

        try {
            const htmlBlob = new Blob([wrapper.outerHTML], { type: 'text/html' });
            const rawTex = mathEl.getAttribute('data-raw-tex') || mathEl.innerText;
            const textBlob = new Blob([rawTex], { type: 'text/plain' });

            await navigator.clipboard.write([
                new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })
            ]);

            mathEl.classList.add('copy-flash');
            setTimeout(() => mathEl.classList.remove('copy-flash'), 300);
        } catch (err) {
            console.error('Failed to copy MathML via click:', err);
        }
    });

    // 2. SMART DRAG-TO-COPY (Penanganan Seleksi Teks & Ekspor Dokumen Penuh)
    dom.renderedOutput.addEventListener('copy', function(e) {
        const selection = window.getSelection();
        if (!selection.rangeCount || !dom.renderedOutput.contains(selection.anchorNode)) return;

        e.preventDefault();

        const range = selection.getRangeAt(0);
        const fragment = range.cloneContents();
        const tempDiv = document.createElement('div');
        tempDiv.appendChild(fragment);

        // Standardisasi baris baru menjadi pembungkus paragraf beraliran kiri (left-aligned)
        let tempHtml = `${WRAPPER_PARAGRAPH}${tempDiv.innerHTML}</p>`;
        tempHtml = tempHtml.replace(RE_LINE_BREAK, `</p>${WRAPPER_PARAGRAPH}`);
        tempDiv.innerHTML = tempHtml;

        // Paksa align="left" secara eksplisit untuk mencegah layout melar (stretching) di Word
        tempDiv.querySelectorAll('*').forEach(el => {
            el.style.textAlign = 'left';
            if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH'].includes(el.tagName)) {
                el.setAttribute('align', 'left');
            }
        });

        // Bungkus garis horizontal (HR) ke dalam pembungkus yang sesuai dengan format pemisah paragraf Word
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

        // Pemrosesan visual kontainer MathJax menjadi struktur MathML asli
        tempDiv.querySelectorAll('mjx-container').forEach(node => {
            const mmlContainer = node.querySelector('mjx-assistive-mml');

            if (mmlContainer && mmlContainer.firstElementChild) {
                const mmlClone = mmlContainer.firstElementChild.cloneNode(true);

                // Konversi token matematika tebal
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

                // Bersihkan atribut non-standar agar diserialisasi rapi oleh pengolah kata
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

        // Bersihkan style inline pada tabel agar default border hitam terpasang dengan rapi di MS Word
        tempDiv.querySelectorAll('table').forEach(table => {
            table.removeAttribute('style');
            table.setAttribute('border', '1');
            table.setAttribute('cellspacing', '0');
            table.setAttribute('cellpadding', '0');
            table.style.borderCollapse = 'collapse';
            table.style.width = '100%';
        });

        e.clipboardData.setData('text/html', tempDiv.outerHTML);
        e.clipboardData.setData('text/plain', tempDiv.innerText);
    });
}
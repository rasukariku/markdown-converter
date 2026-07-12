// Pre-compile regular expressions untuk mengeliminasi overhead kompilasi regex saat traversal DOM
const RE_BORDER_BOTTOM = /border-bottom\s*:\s*[^;]+/i;
const RE_BORDER_NONE = /border-bottom\s*:\s*(none|0px|initial|hidden)/i;

// Menyimpan nilai konversi garis horizontal sebagai konstanta
const HR_REPLACEMENT = '\n\n---\n\n';

// Konfigurasi dasar parser Turndown untuk menghindari duplikasi objek memori
const BASE_TURNDOWN_OPTIONS = {
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*'
};

// Penggunaan Set untuk optimasi pencarian element induk dengan kompleksitas O(1)
const ALLOWED_PARENT_TAGS = new Set(['P', 'DIV', 'LI']);

export function initializeTurndown() {
    marked.setOptions({ breaks: true, gfm: true });

    // Factory function untuk mempermudah instansiasi Turndown dan penggunaan shared rules (DRY Pattern)
    const createTurndownInstance = (keepTags) => {
        const instance = new TurndownService(BASE_TURNDOWN_OPTIONS);
        instance.use(turndownPluginGfm.gfm);
        instance.escape = (string) => string;

        instance.addRule('horizontalRule', {
            filter: 'hr',
            replacement: () => HR_REPLACEMENT
        });

        instance.addRule('borderBottomHR', {
            filter: (node) => {
                if (node.nodeName !== 'P' && node.nodeName !== 'DIV') return false;
                const style = node.getAttribute('style');
                if (!style) return false;
                if (!RE_BORDER_BOTTOM.test(style) || RE_BORDER_NONE.test(style)) return false;
                const textContent = node.textContent.trim();
                return !textContent || textContent === '\u00A0';
            },
            replacement: () => HR_REPLACEMENT
        });

        if (keepTags) {
            instance.keep(keepTags);
        }
        return instance;
    };

    // 1. INISIALISASI STANDARD TURNDOWN
    const standardTurndown = createTurndownInstance(['span', 'font', 'div', 'img', 'a', 'sup', 'sub']);

    standardTurndown.addRule('underline', {
        filter: ['u', 'ins'],
        // KUNCI PERBAIKAN: Menghapus spasi liar pada penulisan tag HTML underline
        replacement: (content) => '<u>' + content + '</u>'
    });

    standardTurndown.addRule('strikethrough', {
        filter: ['del', 's', 'strike'],
        // KUNCI PERBAIKAN: Mengembalikan karakter penanda coretan (strikethrough) Markdown
        replacement: (content) => '~~' + content + '~~'
    });

    standardTurndown.addRule('align', {
        filter: (node) => node.style && node.style.textAlign && !['LI', 'UL', 'OL'].includes(node.nodeName),
        // KUNCI PERBAIKAN: Membersihkan struktur tag div penyeimbang tulisan agar rapi dan kompatibel
        replacement: (content, node) => '\n\n<div align="' + node.style.textAlign + '">\n\n' + content + '\n\n</div>\n\n'
    });

    // 2. INISIALISASI DEDICATED EXPORT TURNDOWN (Untuk Keperluan Ekspor)
    const dedicatedExportTurndown = createTurndownInstance(['span', 'font', 'div', 'img', 'a']);

    dedicatedExportTurndown.addRule('mathjax_universal', {
        filter: (node) => node.nodeName === 'MJX-CONTAINER' || node.hasAttribute('data-raw-tex'),
        replacement: (content, node) => {
            const rawTex = node.getAttribute('data-raw-tex');
            if (!rawTex) return '';

            const cleanTex = rawTex.trim();
            const isDisplay = node.getAttribute('data-math-display') === 'true';
            let isStandalone = false;

            const parent = node.parentElement;
            if (parent && ALLOWED_PARENT_TAGS.has(parent.tagName)) {
                if (parent.textContent.trim() === node.textContent.trim()) {
                    isStandalone = true;
                }
            }

            return (isDisplay || isStandalone) ? `\n\n$$\n${cleanTex}\n$$\n\n` : `$${cleanTex}$`;
        }
    });

    return { standardTurndown, dedicatedExportTurndown };
}
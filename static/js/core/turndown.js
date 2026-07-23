// Pre-compile regular expressions to eliminate runtime compilation overhead during DOM traversal
const RE_BORDER_BOTTOM = /border-bottom\s*:\s*[^;]+/i;
const RE_BORDER_NONE = /border-bottom\s*:\s*(none|0px|initial|hidden)/i;

// Store the horizontal line conversion value as a constant
const HR_REPLACEMENT = '\n\n---\n\n';

// Base configuration of the Turndown parser to prevent redundant memory allocation
const BASE_TURNDOWN_OPTIONS = {
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
    emDelimiter: '*'
};

// Use a Set to optimize parent element lookups with O(1) complexity
const ALLOWED_PARENT_TAGS = new Set(['P', 'DIV', 'LI']);

export function initializeTurndown() {
    // Defensively prevent initialization failures if CDN loading lags behind
    if (typeof marked === 'undefined' || typeof TurndownService === 'undefined') {
        console.error("[CRITICAL] Marked or TurndownService is undefined in global scope.");
        return { standardTurndown: null, dedicatedExportTurndown: null, notionExportTurndown: null };
    }

    try {
        marked.setOptions({ breaks: true, gfm: true });
    } catch (e) {
        console.warn("[WARN] Failed to configure marked options:", e);
    }

    // Factory function to simplify Turndown instantiation and share common rules (DRY pattern)
    const createTurndownInstance = (keepTags) => {
        const instance = new TurndownService(BASE_TURNDOWN_OPTIONS);
        
        // FIXED: Defensive check ensures turndownPluginGfm exists before calling .use()
        if (typeof turndownPluginGfm !== 'undefined' && turndownPluginGfm.gfm) {
            instance.use(turndownPluginGfm.gfm);
        }
        
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

    // 1. STANDARD TURNDOWN INITIALIZATION
    const standardTurndown = createTurndownInstance(['span', 'font', 'div', 'img', 'a', 'sup', 'sub']);

    standardTurndown.addRule('underline', {
        filter: ['u', 'ins'],
        replacement: (content) => '<u>' + content + '</u>'
    });

    standardTurndown.addRule('strikethrough', {
        filter: ['del', 's', 'strike'],
        replacement: (content) => '~~' + content + '~~'
    });

    standardTurndown.addRule('align', {
        filter: (node) => node.style && node.style.textAlign && !['LI', 'UL', 'OL'].includes(node.nodeName),
        replacement: (content, node) => '\n\n<div align="' + node.style.textAlign + '">\n\n' + content + '\n\n</div>\n\n'
    });

    // 2. DEDICATED EXPORT TURNDOWN INITIALIZATION
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

    // 3. NOTION-SPECIFIC EXPORT TURNDOWN INITIALIZATION
    const notionExportTurndown = createTurndownInstance(['span', 'font', 'div', 'img', 'a']);

    notionExportTurndown.addRule('mathjax_notion', {
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

            return (isDisplay || isStandalone) ? `\n\n$$\n${cleanTex}\n$$\n\n` : `$$${cleanTex}$$`;
        }
    });

    return { standardTurndown, dedicatedExportTurndown, notionExportTurndown };
}
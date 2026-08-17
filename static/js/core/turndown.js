const RE_BORDER_BOTTOM = /border-bottom\s*:\s*[^;]+/i;
const RE_BORDER_NONE = /border-bottom\s*:\s*(none|0px|initial|hidden)/i;

const HR_REPLACEMENT = '\n\n───────────────────\n\n';

const BASE_TURNDOWN_OPTIONS = {
    headingStyle: 'atx',
    hr: '---',
    bulletListMarker: '•',
    codeBlockStyle: 'fenced',
    emDelimiter: '_'
};

const UNICODE_BOLD_MAP = Object.freeze({
    'A': '𝗔', 'B': '𝗕', 'C': '𝗖', 'D': '𝗗', 'E': '𝗘', 'F': '𝗙', 'G': '𝗚', 'H': '𝗛', 'I': '𝗜', 'J': '𝗝',
    'K': '𝗞', 'L': '𝗟', 'M': '𝗠', 'N': '𝗡', 'O': '𝗢', 'P': '𝗣', 'Q': '𝗤', 'R': '𝗥', 'S': '𝗦', 'T': '𝗧',
    'U': '𝗨', 'V': '𝗩', 'W': '𝗪', 'X': '𝗫', 'Y': '𝗬', 'Z': '𝗭',
    'a': '𝗮', 'b': '𝗯', 'c': '𝗰', 'd': '𝗱', 'e': '𝗲', 'f': '𝗳', 'g': '𝗴', 'h': '𝗵', 'i': '𝗶', 'j': '𝗷',
    'k': '𝗸', 'l': '𝗹', 'm': '𝗺', 'n': '𝗻', 'o': '𝗼', 'p': '𝗽', 'q': '1', 'r': '𝗿', 's': '𝘀', 't': '𝘁',
    'u': '𝘂', 'v': '𝘃', 'w': '𝘄', 'x': '𝘅', 'y': '𝘆', 'z': '𝘇',
    '0': '𝟬', '1': '𝟭', '2': '𝟮', '3': '𝟯', '4': '𝟰', '5': '𝟱', '6': '𝟲', '7': '𝟳', '8': '𝟴', '9': '𝟵'
});

function toUnicodeSansBold(text) {
    if (!text) return text;
    return text.split('').map(c => UNICODE_BOLD_MAP[c] || c).join('');
}

export function initializeTurndown() {
    if (typeof marked === 'undefined' || typeof TurndownService === 'undefined') {
        console.error("[CRITICAL] Marked or TurndownService is undefined in global scope.");
        return { 
            standardTurndown: null, 
            dedicatedExportTurndown: null, 
            notionExportTurndown: null,
            whatsappExportTurndown: null,
            telegramExportTurndown: null,
            discordExportTurndown: null,
            socialExportTurndown: null
        };
    }

    try {
        marked.setOptions({ breaks: true, gfm: true });
    } catch (e) {
        console.warn("[WARN] Failed to configure marked options:", e);
    }

    const createTurndownInstance = (keepTags) => {
        const instance = new TurndownService(BASE_TURNDOWN_OPTIONS);
        
        if (typeof turndownPluginGfm !== 'undefined' && turndownPluginGfm.gfm) {
            instance.use(turndownPluginGfm.gfm);
        }
        
        instance.escape = (string) => string;

        instance.addRule('horizontalRule', {
            filter: 'hr',
            replacement: () => '\n\n---\n\n'
        });

        if (keepTags) {
            instance.keep(keepTags);
        }
        return instance;
    };

    // 1. STANDARD TURNDOWN
    const standardTurndown = createTurndownInstance(['span', 'font', 'div', 'img', 'a', 'sup', 'sub']);
    standardTurndown.addRule('underline', { filter: ['u', 'ins'], replacement: (content) => '<u>' + content + '</u>' });
    standardTurndown.addRule('strikethrough', { filter: ['del', 's', 'strike'], replacement: (content) => '~~' + content + '~~' });

    // 2. DEDICATED EXPORT TURNDOWN
    const dedicatedExportTurndown = createTurndownInstance(['span', 'font', 'div', 'img', 'a']);

    // 3. NOTION EXPORT TURNDOWN
    const notionExportTurndown = createTurndownInstance(['span', 'font', 'div', 'img', 'a']);

    // 4. WHATSAPP EXPORT TURNDOWN (Functional Substitutions for WhatsApp)
    const whatsappExportTurndown = new TurndownService({
        headingStyle: 'atx',
        bulletListMarker: '•',
        codeBlockStyle: 'fenced',
        emDelimiter: '_'
    });
    if (typeof turndownPluginGfm !== 'undefined' && turndownPluginGfm.gfm) {
        whatsappExportTurndown.use(turndownPluginGfm.gfm);
    }
    whatsappExportTurndown.escape = (string) => string;

    // Convert Headings -> Uppercase Bold Text (*HEADING*)
    whatsappExportTurndown.addRule('whatsapp_headings', {
        filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
        replacement: (content) => '\n\n*' + content.trim().toUpperCase() + '*\n\n'
    });

    // Convert Bold -> Single Asterisk (*bold*)
    whatsappExportTurndown.addRule('whatsapp_bold', {
        filter: ['strong', 'b'],
        replacement: (content) => '*' + content.trim() + '*'
    });

    // Convert Strikethrough -> Single Tilde (~strike~)
    whatsappExportTurndown.addRule('whatsapp_strike', {
        filter: ['del', 's', 'strike'],
        replacement: (content) => '~' + content.trim() + '~'
    });

    // Convert Horizontal Rules -> Decorative Unicode Line
    whatsappExportTurndown.addRule('whatsapp_hr', {
        filter: 'hr',
        replacement: () => HR_REPLACEMENT
    });

    // Convert Links -> Text (URL) so links remain clickable in WhatsApp
    whatsappExportTurndown.addRule('whatsapp_links', {
        filter: 'a',
        replacement: (content, node) => {
            const href = node.getAttribute('href');
            if (!href || href.startsWith('#')) return content;
            if (content.trim() === href.trim()) return href;
            return `${content.trim()} (${href})`;
        }
    });

    // 5. TELEGRAM EXPORT TURNDOWN
    const telegramExportTurndown = new TurndownService({
        headingStyle: 'atx',
        bulletListMarker: '•',
        codeBlockStyle: 'fenced',
        emDelimiter: '_'
    });
    if (typeof turndownPluginGfm !== 'undefined' && turndownPluginGfm.gfm) {
        telegramExportTurndown.use(turndownPluginGfm.gfm);
    }
    telegramExportTurndown.escape = (string) => string;
    telegramExportTurndown.addRule('telegram_headings', {
        filter: ['h1', 'h2', 'h3', 'h4'],
        replacement: (content) => '\n\n*' + content.trim().toUpperCase() + '*\n\n'
    });
    telegramExportTurndown.addRule('telegram_bold', {
        filter: ['strong', 'b'],
        replacement: (content) => '*' + content.trim() + '*'
    });
    telegramExportTurndown.addRule('telegram_underline', {
        filter: ['u', 'ins'],
        replacement: (content) => '__' + content.trim() + '__'
    });
    telegramExportTurndown.addRule('telegram_strike', {
        filter: ['del', 's', 'strike'],
        replacement: (content) => '~' + content.trim() + '~'
    });
    telegramExportTurndown.addRule('telegram_hr', {
        filter: 'hr',
        replacement: () => HR_REPLACEMENT
    });

    // 6. DISCORD EXPORT TURNDOWN (**bold**, *italic*, __underline__, ~~strike~~)
    const discordExportTurndown = new TurndownService({
        headingStyle: 'atx',
        bulletListMarker: '-',
        codeBlockStyle: 'fenced',
        emDelimiter: '*'
    });
    if (typeof turndownPluginGfm !== 'undefined' && turndownPluginGfm.gfm) {
        discordExportTurndown.use(turndownPluginGfm.gfm);
    }
    discordExportTurndown.escape = (string) => string;
    discordExportTurndown.addRule('discord_bold', {
        filter: ['strong', 'b'],
        replacement: (content) => '**' + content.trim() + '**'
    });
    discordExportTurndown.addRule('discord_underline', {
        filter: ['u', 'ins'],
        replacement: (content) => '__' + content.trim() + '__'
    });
    discordExportTurndown.addRule('discord_strike', {
        filter: ['del', 's', 'strike'],
        replacement: (content) => '~~' + content.trim() + '~~'
    });

    // 7. INSTAGRAM & LINKEDIN SOCIAL POST TURNDOWN
    const socialExportTurndown = new TurndownService({
        headingStyle: 'atx',
        bulletListMarker: '•',
        emDelimiter: ''
    });
    socialExportTurndown.escape = (string) => string;
    socialExportTurndown.addRule('social_bold', {
        filter: ['strong', 'b'],
        replacement: (content) => toUnicodeSansBold(content)
    });
    socialExportTurndown.addRule('social_heading', {
        filter: ['h1', 'h2', 'h3', 'h4'],
        replacement: (content) => '\n\n📌 ' + toUnicodeSansBold(content.trim().toUpperCase()) + '\n\n'
    });
    socialExportTurndown.addRule('social_hr', {
        filter: 'hr',
        replacement: () => HR_REPLACEMENT
    });

    return { 
        standardTurndown, 
        dedicatedExportTurndown, 
        notionExportTurndown,
        whatsappExportTurndown,
        telegramExportTurndown,
        discordExportTurndown,
        socialExportTurndown
    };
}
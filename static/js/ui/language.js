import { resetTypewriter } from './typewriter.js';
import { closeWin } from './modals.js';

// =========================================================================
// MODULE-LEVEL CONSTANTS & STATE CACHE
// =========================================================================

const STORAGE_KEY_LANG = 'appLang';
const DEFAULT_LANG = 'id';
const BTN_LANG_TOGGLE_ID = 'lang-toggle';

let cachedUpdateCounter = null;

// =========================================================================
// DATA DEFINITIONS (TRANSLATIONS & UNABRIDGED UNICODE EMOJIS)
// =========================================================================

const translations = Object.freeze({
    'id': {
        'langBtn': 'ID', 'sub1': 'Konversi Teks dari', 'sub2': 'ke',
        'devBy': 'DIBUAT OLEH',
        'placeholder': 'Ketik atau paste konten AI Anda di sini ...',
        'tRaw': 'Paste Markdown (Auto-Format)', 'tUni': 'Ekspor Markdown Universal',
        'tTable': 'Sisipkan Tabel', 'lblCol': 'Jumlah Kolom:', 'lblRow': 'Jumlah Baris:',
        'tLink': 'Sisipkan Tautan', 'lblLinkText': 'Teks Ditampilkan:', 'lblLinkUrl': 'Alamat URL:',
        'tImage': 'Sisipkan Gambar', 'lblImageUrl': 'URL Gambar:',
        'tFind': 'Cari & Ganti', 'lblFind': 'Cari Teks:', 'lblReplace': 'Ganti Menjadi:',
        'tEmoji': 'Pilih Emoticon', 'btnRepAll': 'Ganti Semua', 'btnFindNxt': 'Cari Lanjut', 'btnRep': 'Ganti',
        'selection': '(Teks Diblok)', 'quote': 'Kutipan', 'hr': 'Garis Pemisah',
        
        'btnOpenRaw': 'Ekspor Markdown',
        'menuExportStd': '📤 Ekspor Standard (LaTeX)',
        'menuExportNotion': '📤 Ekspor Mode Notion',
        
        'btnCopyUniversal': 'Salin Ekspor',
        'btnCopyRaw': 'Salin Markdown',

        'tConfirmClear': 'Konfirmasi Hapus Editor',
        'msgConfirmClear': 'Apakah Anda yakin ingin mengosongkan seluruh konten editor? Tindakan ini tidak dapat dibatalkan.',

        'tHrModal': 'Pilih Gaya Garis Pemisah'
    },
    'en': {
        'langBtn': 'EN', 'sub1': 'Convert Text from', 'sub2': 'to',
        'devBy': 'DEVELOPED BY',
        'placeholder': 'Type or paste content from AI here ...',
        'tRaw': 'Paste Markdown (Auto-Format)', 'tUni': 'Universal Markdown Export',
        'tTable': 'Insert Table', 'lblCol': 'Columns:', 'lblRow': 'Rows:',
        'tLink': 'Insert Link', 'lblLinkText': 'Text to display:', 'lblLinkUrl': 'Address URL:',
        'tImage': 'Insert Image', 'lblImageUrl': 'Image URL:',
        'tFind': 'Find & Replace', 'lblFind': 'Find what:', 'lblReplace': 'Replace with:',
        'tEmoji': 'Select Emoticon', 'btnRepAll': 'Replace All', 'btnFindNxt': 'Find Next', 'btnRep': 'Replace',
        'selection': '(Text Selected)', 'quote': 'Quote', 'hr': 'Horizontal Line',
        
        'btnOpenRaw': 'Export Markdown',
        'menuExportStd': '📤 Export Standard (LaTeX)',
        'menuExportNotion': '📤 Export Notion Mode',
        
        'btnCopyUniversal': 'Copy Export',
        'btnCopyRaw': 'Copy Markdown',

        'tConfirmClear': 'Confirm Clear Editor',
        'msgConfirmClear': 'Are you sure you want to clear all editor contents? This action cannot be undone.',

        'tHrModal': 'Select Horizontal Divider'
    }
});

const emojiCategories = Object.freeze({
    'id': {
        "Smileys & Emotion": ["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","😘","🥰","🥲","☺️","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","🥱","😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑","😲","☹️","🙁","😖","😞","😟","😤","😢","😭","😦","😧","😨","😩","🤯","😬","😰","😱","🥵","🥶","😳","🤪","😵","🥴","😠","😡","🤬"], 
        "Gestures & People": ["👋","🤚","🖐","✋","🖖","👌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","👀","👁","👅","👄","💋","🧠","🫀"], 
        "Animals & Nature": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐒","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🐢","🐍","🦎","🦖","🐙","🦑","🦐","🦀","🐡","🐠","🐟","🐬","🐳","🦈","🐊","🐅","🐆","zebra","🦍","🐘","🦛","🦏","🐪","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🐐","🦌","🐕","🐈","🐓","🦃","🦚","🦜","🦢","🕊","🐇","🦝","🦨","🦡","🦦","🦥","🐁","🐀","🐿","🦔","🐉","🐲","🌵","🎄","🌲","🌳","🌴","🌱","🌿","☘️","🍀","🍃","🍂","🍁","🍄","🐚","🪨","🌾","💐","🌷","🌹","🥀","🌺","🌸","🌼","🌻","🌞","🌝","🌛","🌜","🌚","🌕","🌖","🌗","🌘","🌑","🌒","🌓","🌔","🌙","🌎","🌍","🌏","🪐","💫","⭐️","🌟","✨","⚡️","☄️","💥","🔥","🌪","🌈","☀️","🌤","⛅️","🌥","☁️","🌦","🌧","⛈","🌩","🌨","❄️","☃️","⛄️","🌬","💨","💧","💦","☔️","☂️","🌊"], 
        "Objects & Symbols": ["⌚️","📱","💻","⌨️","🖥","🖨","🖱","📷","📸","📹","🎥","📞","☎️","📺","📻","🎙","🧭","⏱","⏲","⏰","🕰","⌛️","⏳","🔋","🔌","💡","🔦","🕯","💸","💵","💴","💶","💷","🪙","💰","💳","💎","⚖️","🧰","🔧","🔨","⚒","🛠","⛏","🔩","⚙️","🧱","⛓","🧲","🔫","💣","🧨","🪓","🔪","🗡","⚔️","🛡","🚬","⚰️","🏺","🔮","📿","🧿","🔭","🔬","💊","💉","🩸","🧬","🦠","🧫","🧪","🌡","🧹","🧺","🧻","Toilet","🚰","Shower","Bathtub","Bath","Soap","Sponge","Razor","Lotion","Bell","Keys","🗝","Door","Chair","Sofa","Bed","Sleeping","Teddy","Frame","Mirror","Window","Shopping","Cart","Gift","Balloon","Ribbon","Magic","Confetti","Party","Doll","Lantern","Wind","RedEnvelope","Envelope","InboxEnvelope","SendEnvelope","Email","HeartEnvelope","Inbox","Outbox","Package","Tag","Mailbox","OpenMailbox","ClosedMailbox","Postbox","Scroll","Page","Doc","Tabs","Receipt","BarChart","UpChart","DownChart","Notebook","Calendar","DateCalendar","Schedule","Bin","Organizer","Ballot","Cabinet","Clipboard","Folder","OpenFolder","Directories","Newspaper","News","Journal","Diary","YellowBook","RedBook","GreenBook","BlueBook","OrangeBook","Books","OpenBook","Bookmark","Pin","Link","Paperclip","Paperclips","Triangle","Ruler","Abacus","Thumbtack","Pushpin","Scissors","Pen","FountainPen","CalligraphyPen","Paintbrush","Crayon","NotebookPen","Pencil","Search","Magnifier","Keylock","Lock","Unlock","Heart","OrangeHeart","YellowHeart","GreenHeart","BlueHeart","PurpleHeart","BlackHeart","WhiteHeart","BrownHeart","BrokenHeart","HeartExclamation","Hearts","SpinningHearts","BeatingHeart","GrowingHeart","SparklingHeart","Cupid","GiftHeart"] 
    },
    'en': { 
        "Smileys & Emotion": ["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","😘","🥰","🥲","☺️","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","🥱","😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑","😲","☹️","🙁","😖","😞","😟","😤","😢","😭","😦","😧","😨","😩","🤯","😬","😰","😱","🥵","🥶","😳","🤪","😵","🥴","😠","😡","🤬"], 
        "Gestures & People": ["👋","🤚","🖐","✋","🖖","👌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","👀","👁","👅","👄","💋","🧠","🫀"], 
        "Animals & Nature": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐒","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🐢","🐍","🦎","🦖","🐙","🦑","🦐","crab","🐡","🐠","🐟","🐬","🐳","🦈","🐊","🐅","🐆","zebra","🦍","🐘","🦛","🦏","🐪","🦒","🦘","buffalo","ox","cow","🐎","🐖","ram","sheep","goat","deer","🐕","🐈","rooster","turkey","peacock","parrot","swan","dove","🐇","raccoon","skunk","badger","otter","sloth","mice","rat","squirrel","hedgehog","dragon","dragon_face","cactus","christmas_tree","evergreen_tree","deciduous_tree","palm_tree","seedling","herb","shamrock","four_leaf_clover","maple_leaf","fallen_leaf","leaf","mushroom","shell","rock","sheaf_of_rice","bouquet","tulip","rose","wilted_flower","hibiscus","cherry_blossom","blossom","sunflower","sun","full_moon_with_face","first_moon_with_face","last_moon_with_face","new_moon_with_face","full_moon","waxing_gibbous_moon","first_quarter_moon","waxing_crescent_moon","new_moon","waning_crescent_moon","last_quarter_moon","waning_gibbous_moon","crescent_moon","globe_americas","globe_africa","globe_asia","ringed_planet","dizzy","star","star2","sparkles","sparkler","zap","comet","boom","fire","tornado","rainbow","sunny","partly_sunny","partly_sunny_rain","cloud","cloud_rain","thunder_cloud_rain","cloud_lightning","snow_cloud","snowflake","snowman","snowman_without_snow","wind_face","dash","droplet","sweat_drops","umbrella","umbrella_with_rain_drops","ocean"], 
        "Objects & Symbols": ["⌚️","📱","💻","⌨️","🖥","🖨","🖱","📷","📸","📹","🎥","📞","☎️","📺","📻","🎙","🧭","⏱","⏲","⏰","🕰","⌛️","⏳","🔋","🔌","💡","🔦","🕯","💸","💵","💴","💶","💷","🪙","💰","💳","💎","⚖️","🧰","🔧","🔨","⚒","🛠","⛏","🔩","⚙️","🧱","⛓","🧲","🔫","💣","🧨","🪓","🔪","🗡","⚔️","🛡","🚬","⚰️","🏺","🔮","📿","🧿","🔭","🔬","💊","💉","🩸","🧬","🦠","🧫","🧪","🌡","🧹","🧺","🧻","Toilet","🚰","Shower","Bathtub","Bath","Soap","Sponge","Razor","Lotion","Bell","Keys","🗝","Door","Chair","Sofa","Bed","Sleeping","Teddy","Frame","Mirror","Window","Shopping","Cart","Gift","Balloon","Ribbon","Magic","Confetti","Party","Doll","Lantern","Wind","RedEnvelope","Envelope","InboxEnvelope","SendEnvelope","Email","HeartEnvelope","Inbox","Outbox","Package","Tag","Mailbox","OpenMailbox","ClosedMailbox","Postbox","Scroll","Page","Doc","Tabs","Receipt","BarChart","UpChart","DownChart","Notebook","Calendar","DateCalendar","Schedule","Bin","Organizer","Ballot","Cabinet","Clipboard","Folder","OpenFolder","Directories","Newspaper","News","Journal","Diary","YellowBook","RedBook","GreenBook","BlueBook","OrangeBook","Books","OpenBook","Bookmark","Pin","Link","Paperclip","Paperclips","Triangle","Ruler","Abacus","Thumbtack","Pushpin","Scissors","Pen","FountainPen","CalligraphyPen","Paintbrush","Crayon","NotebookPen","Pencil","Search","Magnifier","Keylock","Lock","Unlock","Heart","OrangeHeart","YellowHeart","GreenHeart","BlueHeart","PurpleHeart","BlackHeart","WhiteHeart","BrownHeart","BrokenHeart","HeartExclamation","Hearts","SpinningHearts","BeatingHeart","GrowingHeart","SparklingHeart","Cupid","GiftHeart"] 
    }
});

// =========================================================================
// DOM CACHING
// =========================================================================

const langUIElements = {
    sub1: document.getElementById('sub-1'),
    sub2: document.getElementById('sub-2'),
    devBy: document.getElementById('dev-by-text'),
    renderedOutput: document.getElementById('rendered-output'),
    tRaw: document.getElementById('t-raw'),
    tUni: document.getElementById('t-uni'),
    tTable: document.getElementById('t-table'),
    lblCol: document.getElementById('lbl-col'),
    lblRow: document.getElementById('lbl-row'),
    tLink: document.getElementById('t-link'),
    lblLinkText: document.getElementById('lbl-link-text'),
    lblLinkUrl: document.getElementById('lbl-link-url'),
    tImage: document.getElementById('t-image'),
    lblImageUrl: document.getElementById('lbl-image-url'),
    tFind: document.getElementById('t-find'),
    lblFind: document.getElementById('lbl-find'),
    lblReplace: document.getElementById('lbl-replace'),
    tEmoji: document.getElementById('t-emoji'),
    btnReplaceAll: document.getElementById('btn-replace-all'),
    btnFindNext: document.getElementById('btn-find-next'),
    btnReplaceBtn: document.getElementById('btn-replace-btn'),
    btnHr: document.getElementById('btn-hr'),
    emojiGrid: document.getElementById('emoji-grid'),
    langToggle: document.getElementById(BTN_LANG_TOGGLE_ID),
    
    btnOpenRaw: document.getElementById('btn-open-raw'),
    menuExportStd: document.getElementById('menu-export-std'),
    menuExportNotion: document.getElementById('menu-export-notion'),
    
    btnCopyUniversal: document.getElementById('btn-copy-universal'),
    btnCopyRaw: document.getElementById('btn-copy-raw'),

    tConfirmClear: document.getElementById('t-confirm-clear'),
    msgConfirmClear: document.getElementById('msg-confirm-clear'),

    tHrModal: document.getElementById('t-hr-modal')
};

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Renders the emoji picker grid for the targeted locale.
 * 
 * @param {string} lang - Locale identifier ('id' or 'en').
 */
export function renderEmojis(lang) {
    const grid = langUIElements.emojiGrid;
    if (!grid) return;

    let htmlContent = '';
    const categories = emojiCategories[lang];
    
    if (categories) {
        for (const [category, emojiList] of Object.entries(categories)) {
            htmlContent += `<div class="emoji-category-title">${category}</div>`;
            for (const emoji of emojiList) {
                htmlContent += `<button class="emoji-btn">${emoji}</button>`;
            }
        }
    }
    
    grid.innerHTML = htmlContent;

    grid.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.onclick = () => {
            document.execCommand('insertText', false, btn.innerText);
            closeWin('win-emoticon');
        };
    });
}

/**
 * Apply the selected language string map across UI nodes.
 * 
 * @param {Function} [updateCounter] - Optional count stats refresher callback.
 */
export function applyLanguage(updateCounter) {
    if (typeof updateCounter === 'function') {
        cachedUpdateCounter = updateCounter;
    }

    const currentLang = localStorage.getItem(STORAGE_KEY_LANG) || DEFAULT_LANG;
    const t = translations[currentLang] || translations[DEFAULT_LANG];

    if (langUIElements.langToggle) langUIElements.langToggle.innerText = t.langBtn;
    if (langUIElements.sub1) langUIElements.sub1.innerText = t.sub1;
    if (langUIElements.sub2) langUIElements.sub2.innerText = t.sub2;
    if (langUIElements.devBy) langUIElements.devBy.innerText = t.devBy;
    if (langUIElements.renderedOutput) langUIElements.renderedOutput.setAttribute('data-placeholder', t.placeholder);
    if (langUIElements.tRaw) langUIElements.tRaw.innerText = t.tRaw;
    if (langUIElements.tUni) langUIElements.tUni.innerText = t.tUni;
    if (langUIElements.tTable) langUIElements.tTable.innerText = t.tTable;
    if (langUIElements.lblCol) langUIElements.lblCol.innerText = t.lblCol;
    if (langUIElements.lblRow) langUIElements.lblRow.innerText = t.lblRow;
    if (langUIElements.tLink) langUIElements.tLink.innerText = t.tLink;
    if (langUIElements.lblLinkText) langUIElements.lblLinkText.innerText = t.lblLinkText;
    if (langUIElements.lblLinkUrl) langUIElements.lblLinkUrl.innerText = t.lblLinkUrl;
    if (langUIElements.tImage) langUIElements.tImage.innerText = t.tImage;
    if (langUIElements.lblImageUrl) langUIElements.lblImageUrl.innerText = t.lblImageUrl;
    if (langUIElements.tFind) langUIElements.tFind.innerText = t.tFind;
    if (langUIElements.lblFind) langUIElements.lblFind.innerText = t.lblFind;
    if (langUIElements.lblReplace) langUIElements.lblReplace.innerText = t.lblReplace;
    if (langUIElements.tEmoji) langUIElements.tEmoji.innerText = t.tEmoji;
    if (langUIElements.btnReplaceAll) langUIElements.btnReplaceAll.innerText = t.btnRepAll;
    if (langUIElements.btnFindNext) langUIElements.btnFindNext.innerText = t.btnFindNxt;
    if (langUIElements.btnReplaceBtn) langUIElements.btnReplaceBtn.innerText = t.btnRep;
    if (langUIElements.btnHr) langUIElements.btnHr.title = t.hr;
    
    if (langUIElements.btnOpenRaw) langUIElements.btnOpenRaw.title = t.btnOpenRaw;
    if (langUIElements.menuExportStd) langUIElements.menuExportStd.innerText = t.menuExportStd;
    if (langUIElements.menuExportNotion) langUIElements.menuExportNotion.innerText = t.menuExportNotion;

    if (langUIElements.btnCopyUniversal) langUIElements.btnCopyUniversal.innerText = t.btnCopyUniversal;
    if (langUIElements.btnCopyRaw) langUIElements.btnCopyRaw.innerText = t.btnCopyRaw;

    if (langUIElements.tConfirmClear) langUIElements.tConfirmClear.innerText = t.tConfirmClear;
    if (langUIElements.msgConfirmClear) langUIElements.msgConfirmClear.innerText = t.msgConfirmClear;

    if (langUIElements.tHrModal) langUIElements.tHrModal.innerText = t.tHrModal;

    renderEmojis(currentLang);

    if (typeof cachedUpdateCounter === 'function') {
        cachedUpdateCounter();
    }
}

// =========================================================================
// EVENT LISTENERS
// =========================================================================

if (langUIElements.langToggle) {
    langUIElements.langToggle.addEventListener('click', () => {
        const currentLang = localStorage.getItem(STORAGE_KEY_LANG) || DEFAULT_LANG;
        localStorage.setItem(STORAGE_KEY_LANG, currentLang === DEFAULT_LANG ? 'en' : DEFAULT_LANG);
        
        resetTypewriter();
        applyLanguage();
    });
}

export { translations };
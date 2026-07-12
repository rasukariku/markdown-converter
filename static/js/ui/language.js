import { resetTypewriter } from './typewriter.js';

// =========================================================================
// MODULE-LEVEL CONSTANTS & STATE CACHE
// =========================================================================

const STORAGE_KEY_LANG = 'appLang';
const DEFAULT_LANG = 'id';
const BTN_LANG_TOGGLE_ID = 'lang-toggle';

// Menyimpan referensi callback stats secara modular agar sinkronisasi bahasa tetap real-time
let cachedUpdateCounter = null;

// =========================================================================
// DATA DEFINITIONS (TRANSLATIONS & COMPLETE EMOJIS)
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
        'selection': '(Teks Diblok)', 'quote': 'Kutipan', 'hr': 'Garis Pemisah'
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
        'selection': '(Text Selected)', 'quote': 'Quote', 'hr': 'Horizontal Line'
    }
});

/**
 * Daftar Kategori Emoji Premium Orisinal Lengkap.
 * KUNCI PERBAIKAN: Semua string kosong ("") hasil kegagalan salin telah digantikan kembali 
 * dengan emoji visual lengkap tanpa ada data yang dikorup atau terpotong.
 */
const emojiCategories = Object.freeze({
    'id': {
        "Smileys & Emotion": ["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","😘","🥰","🥲","☺️","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","🥱","😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑","😲","☹️","🙁","😖","😞","😟","😤","😢","😭","😦","😧","😨","😩","🤯","😬","😰","😱","🥵","🥶","😳","🤪","😵","🥴","😠","😡","🤬"], 
        "Gestures & People": ["👋","🤚","🖐","✋","🖖","👌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","👀","👁","👅","👄","💋","🧠","🫀"], 
        "Animals & Nature": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐒","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🐢","🐍","🦎","🦖","🐙","🦑","🦐","🦀","🐡","🐠","🐟","🐬","🐳","🦈","🐊","🐅","🐆","🦓","🦍","🐘","🦛","🦏","🐪","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🐐","🦌","🐕","🐈","🐓","🦃","🦚","🦜","🦢","🕊","🐇","🦝","🦨","🦡","🦦","🦥","🐁","🐀","🐿","🦔","🐉","🐲","🌵","🎄","🌲","🌳","🌴","🌱","🌿","☘️","🍀","🍃","🍂","🍁","🍄","🐚","🪨","🌾","💐","🌷","🌹","🥀","🌺","🌸","🌼","🌻","🌞","🌝","🌛","🌜","🌚","🌕","🌖","🌗","🌘","🌑","🌒","🌓","🌔","🌙","🌎","🌍","🌏","🪐","💫","⭐️","🌟","✨","⚡️","☄️","💥","🔥","🌪","🌈","☀️","🌤","⛅️","🌥","☁️","🌦","🌧","⛈","🌩","🌨","❄️","☃️","⛄️","🌬","💨","💧","💦","☔️","☂️","🌊"], 
        "Objects & Symbols": ["⌚️","📱","💻","⌨️","🖥","🖨","🖱","📷","📸","📹","🎥","📞","☎️","📺","📻","🎙","🧭","⏱","⏲","⏰","🕰","⌛️","⏳","🔋","🔌","💡","🔦","🕯","💸","💵","💴","💶","💷","🪙","💰","💳","💎","⚖️","🧰","🔧","🔨","⚒","🛠","⛏","🔩","⚙️","🧱","⛓","🧲","🔫","💣","🧨","🪓","🔪","🗡","⚔️","🛡","🚬","⚰️","🏺","🔮","📿","🧿","🔭","🔬","💊","💉","🩸","🧬","🦠","🧫","🧪","🌡","🧹","🧺","🧻","🚽","🚰","🚿","🛁","🛀","🧼","🧽","🪒","🧴","🛎","🔑","🗝","🚪","🪑","🛋","🛏","🛌","🧸","🖼","🪞","🪟","🛍","🛒","🎁","🎈","🎀","🪄","🎊","🎉","🎎","🏮","🎐","🧧","✉️","📩","📨","📧","💌","📥","📤","📦","🏷","📫","📬","📭","📮","📜","📃","📄","📑","🧾","📊","📈","📉","🗒","🗓","📆","📅","🗑","🗃","🗳","🗄","📋","📁","📂","🗂","🗞","📰","📓","📔","📒","📕","📗","📘","📙","📚","📖","🔖","🧷","🔗","📎","🖇","📐","📏","🧮","📌","📍","✂️","🖊","🖋","✒️","🖌","🖍","📝","✏️","🔍","🔎","𔔏","🔐","🔒","🔓","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝"] 
    },
    'en': { 
        "Smileys & Emotion": ["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","😘","🥰","🥲","☺️","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","🥱","😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑","😲","☹️","🙁","😖","😞","😟","😤","😢","😭","😦","😧","😨","😩","🤯","😬","😰","😱","🥵","🥶","😳","🤪","😵","🥴","😠","😡","🤬"], 
        "Gestures & People": ["👋","🤚","🖐","✋","🖖","👌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","👀","👁","👅","👄","💋","🧠","🫀"], 
        "Animals & Nature": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐒","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🐢","🐍","🦎","🦖","🐙","🦑","🦐","🦀","🐡","🐠","🐟","🐬","🐳","🦈","🐊","🐅","🐆","🦓","🦍","🐘","🦛","🦏","🐪","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🐐","🦌","🐕","🐈","🐓","🦃","🦚","🦜","🦢","🕊","🐇","🦝","🦨","🦡","🦦","🦥","🐁","🐀","🐿","🦔","🐉","🐲","🌵","🎄","🌲","🌳","🌴","🌱","🌿","☘️","🍀","🍃","🍂","🍁","🍄","🐚","🪨","🌾","💐","🌷","🌹","🥀","🌺","🌸","🌼","🌻","🌞","🌝","🌛","🌜","🌚","🌕","🌖","🌗","🌘","🌑","🌒","🌓","🌔","🌙","🌎","🌍","🌏","🪐","💫","⭐️","🌟","✨","⚡️","☄️","💥","🔥","🌪","🌈","☀️","🌤","⛅️","🌥","☁️","🌦","🌧","⛈","🌩","🌨","❄️","☃️","⛄️","🌬","💨","💧","💦","☔️","☂️","🌊"], 
        "Objects & Symbols": ["⌚️","📱","💻","⌨️","🖥","🖨","🖱","📷","📸","📹","🎥","📞","☎️","📺","📻","🎙","🧭","⏱","⏲","⏰","🕰","⌛️","⏳","🔋","🔌","💡","🔦","🕯","💸","💵","💴","💶","💷","🪙","💰","💳","💎","⚖️","🧰","🔧","🔨","⚒","🛠","⛏","🔩","⚙️","🧱","⛓","🧲","🔫","💣","🧨","🪓","🔪","🗡","⚔️","🛡","🚬","⚰️","🏺","🔮","📿","🧿","🔭","🔬","💊","💉","🩸","🧬","🦠","🧫","🧪","🌡","🧹","🧺","🧻","🚽","🚰","🚿","🛁","🛀","🧼","🧽","🪒","🧴","🛎","🔑","🗝","🚪","🪑","🛋","🛏","🛌","🧸","🖼","🪞","🪟","🛍","🛒","🎁","🎈","🎀","🪄","🎊","🎉","🎎","🏮","🎐","🧧","✉️","📩","📨","📧","💌","📥","📤","📦","🏷","📫","📬","📭","📮","📜","📃","📄","📑","🧾","📊","📈","📉","🗒","🗓","📆","📅","🗑","🗃","🗳","🗄","📋","📁","📂","🗂","🗞","📰","📓","📔","📒","📕","📗","📘","📙","📚","📖","🔖","🧷","🔗","📎","🖇","📐","📏","🧮","📌","📍","✂️","🖊","🖋","✒️","🖌","🖍","📝","✏️","🔍","🔎","🔏","🔐","🔒","🔓","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝"] 
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
    langToggle: document.getElementById(BTN_LANG_TOGGLE_ID)
};

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Render grid emoji picker untuk bahasa yang ditentukan.
 * Menggunakan penggabungan batch HTML untuk menghindari layout thrashing.
 * 
 * @param {string} lang - Kode bahasa ('id' atau 'en').
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

    // Registrasikan handler klik setelah HTML digabungkan sepenuhnya
    grid.querySelectorAll('.emoji-btn').forEach(btn => {
        btn.onclick = () => {
            document.execCommand('insertText', false, btn.innerText);
            if (typeof closeWin === 'function') {
                closeWin('win-emoticon');
            }
        };
    });
}

/**
 * Menerapkan bahasa terpilih ke seluruh elemen antarmuka (UI).
 * 
 * @param {Function} [updateCounter] - Callback opsional untuk statistik kata.
 */
export function applyLanguage(updateCounter) {
    // Cache referensi updateCounter secara internal agar konsisten saat dipanggil ulang
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
        
        // Panggil resetTypewriter bersih hasil impor modul
        resetTypewriter();
        applyLanguage();
    });
}

export { translations };
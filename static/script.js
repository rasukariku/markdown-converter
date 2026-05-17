// =====================================================================
// Typewriter Animation
// =====================================================================
const titles = { 'id': "MARKDOWN CONVERTER", 'en': "MARKDOWN CONVERTER" };
const titleElement = document.getElementById("typewriter-title");
let typeIndex = 0;
let isDeleting = false;
let typewriterTimer = null;

function typeWriter() {
    const currentLangVal = localStorage.getItem('appLang') || 'id';
    const currentText = titles[currentLangVal];

    if (!isDeleting && typeIndex <= currentText.length) {
        titleElement.innerText = currentText.substring(0, typeIndex);
        typeIndex++;
        typewriterTimer = setTimeout(typeWriter, 120);
    } else if (isDeleting && typeIndex >= 0) {
        titleElement.innerText = currentText.substring(0, typeIndex);
        typeIndex--;
        typewriterTimer = setTimeout(typeWriter, 80);
    } else {
        isDeleting = !isDeleting;
        typewriterTimer = setTimeout(typeWriter, isDeleting ? 2500 : 800); 
    }
}

function resetTypewriter() {
    if (typewriterTimer) clearTimeout(typewriterTimer);
    typeIndex = 0; isDeleting = false; titleElement.innerText = "";
    typeWriter();
}

// =====================================================================
// Modal System
// =====================================================================
function openWin(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden'; 
}
function closeWin(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = ''; 
}

window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('active');
        document.body.style.overflow = '';
    }
});

// =====================================================================
// DOM References & State
// =====================================================================
const rawMarkdownInput = document.getElementById("raw-markdown");
const universalMarkdownInput = document.getElementById("universal-markdown");
const renderedOutput = document.getElementById("rendered-output");
const hiddenFormInput = document.getElementById("hiddenMarkdownInput");
const mainToolbar = document.getElementById('main-toolbar');
let savedSelection = null;
let isSyncing = false;

// =====================================================================
// Turndown Setup with HR Rule
// =====================================================================
marked.setOptions({ breaks: true, gfm: true });

const standardTurndown = new TurndownService({ 
    headingStyle: 'atx', 
    hr: '---', 
    bulletListMarker: '-', 
    codeBlockStyle: 'fenced', 
    emDelimiter: '*' 
});
standardTurndown.use(turndownPluginGfm.gfm);

standardTurndown.escape = function(string) {
    return string;
};

standardTurndown.addRule('horizontalRule', {
    filter: 'hr',
    replacement: function () {
        return '\n\n---\n\n';
    }
});

// CRITICAL FIX: Catch pasted HRs from Word (empty <p> or <div> with border-bottom)
standardTurndown.addRule('borderBottomHR', {
    filter: function (node) {
        if (node.nodeName !== 'P' && node.nodeName !== 'DIV') return false;
        const style = node.getAttribute('style');
        if (!style) return false;
        
        // Check for border-bottom style that is not 'none' or '0px'
        const hasBorderBottom = /border-bottom\s*:\s*[^;]+/i.test(style) && !/border-bottom\s*:\s*(none|0px|initial|hidden)/i.test(style);
        if (!hasBorderBottom) return false;
        
        // Check if it's effectively empty (ignoring whitespace and empty spans/o:p tags typical of Word)
        const textContent = node.textContent.trim();
        const hasOnlyEmptyElements = !textContent || textContent === '\u00A0'; // &nbsp;
        
        return hasOnlyEmptyElements;
    },
    replacement: function () {
        return '\n\n---\n\n';
    }
});

standardTurndown.addRule('underline', { 
    filter: ['u', 'ins'], 
    replacement: function (content) { return '<u>' + content + '</u>'; } 
});
standardTurndown.addRule('strikethrough', { 
    filter: ['del', 's', 'strike'], 
    replacement: function (content) { return '~~' + content + '~~'; } 
});
standardTurndown.addRule('align', { 
    filter: function (node) { return node.style && node.style.textAlign; }, 
    replacement: function (content, node) { 
        return '\n<div style="text-align: ' + node.style.textAlign + ';">\n' + content + '\n</div>\n'; 
    } 
});
standardTurndown.keep(['span', 'font', 'div', 'img', 'a', 'sup', 'sub']);

// =====================================================================
// Editor Core Functions
// =====================================================================
function formatDoc(cmd, value) { 
    try {
        document.execCommand(cmd, false, value);
        if (cmd === 'createLink' || cmd === 'unlink' || cmd === 'insertHTML') {
            document.execCommand('fontName', false, 'Times New Roman');
        }
    } catch (e) {
        console.warn('execCommand failed:', cmd, e);
    }
    renderedOutput.focus(); 
    checkToolbarActive(); 
    syncRenderedToRaw(); 
}

function insertHorizontalRule() {
    formatDoc('insertHorizontalRule');
}

function toggleToolbar() { 
    const icon = document.getElementById('icon-expand'); 
    mainToolbar.classList.toggle('expanded'); 
    icon.innerHTML = mainToolbar.classList.contains('expanded') 
        ? '<path d="M7 14l5-5 5 5H7z"/>' 
        : '<path d="M7 10l5 5 5-5H7z"/>'; 
}

function setDirection(dir) {
    let sel = window.getSelection();
    if (sel.rangeCount > 0) {
        let node = sel.anchorNode;
        if (node.nodeType === 3) node = node.parentNode;
        if (node.tagName !== 'DIV' && node.tagName !== 'P') {
            formatDoc('insertHTML', '<div dir="' + dir + '">' + sel.toString() + '</div>');
        } else { 
            node.setAttribute('dir', dir); 
        }
        syncRenderedToRaw();
    }
}

function toggleFullscreen() {
    document.querySelector('.editor-container').classList.toggle('fullscreen'); 
    document.body.classList.toggle('is-fullscreen'); 
    const isFS = document.querySelector('.editor-container').classList.contains('fullscreen');
    document.querySelector('#btn-fullscreen svg').innerHTML = isFS 
        ? '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>' 
        : '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>';
    document.body.style.overflow = isFS ? 'hidden' : '';
}

// =====================================================================
// Link Dialog
// =====================================================================
document.getElementById('btn-link').onclick = () => {
    let sel = window.getSelection();
    if(sel.rangeCount > 0) {
        savedSelection = sel.getRangeAt(0).cloneRange();
        document.getElementById('link-text-input').value = sel.toString();
    }
    document.getElementById('link-url-input').value = "https://";
    openWin('win-link');
};

document.getElementById('btn-confirm-link').onclick = () => {
    let text = document.getElementById('link-text-input').value;
    let url = document.getElementById('link-url-input').value;
    closeWin('win-link');
    renderedOutput.focus();
    if (savedSelection) {
        let sel = window.getSelection();
        sel.removeAllRanges(); sel.addRange(savedSelection);
    }
    if(text) { formatDoc('insertHTML', '<a href="' + url + '">' + text + '</a>'); } 
    else { formatDoc('createLink', url); }
};

// =====================================================================
// Image Dialog
// =====================================================================
document.getElementById('btn-image').onclick = () => {
    let sel = window.getSelection();
    if(sel.rangeCount > 0) savedSelection = sel.getRangeAt(0).cloneRange();
    document.getElementById('img-url-input').value = "https://";
    openWin('win-image');
};

document.getElementById('btn-confirm-image').onclick = () => {
    let url = document.getElementById('img-url-input').value;
    closeWin('win-image');
    renderedOutput.focus();
    if (savedSelection) {
        let sel = window.getSelection();
        sel.removeAllRanges(); sel.addRange(savedSelection);
    }
    formatDoc('insertImage', url);
};

// =====================================================================
// Find & Replace
// =====================================================================
function executeFind() {
    let text = document.getElementById('find-input').value;
    if (text) {
        if (!window.find(text, false, false, true, false, true, false)) {
            alert("Text not found / reached end.");
        }
    }
}

function executeReplace() {
    let findText = document.getElementById('find-input').value;
    let replaceText = document.getElementById('replace-input').value;
    let sel = window.getSelection();
    if (sel.toString().toLowerCase() === findText.toLowerCase()) {
        formatDoc('insertText', replaceText);
    } else { executeFind(); }
}

function executeReplaceAll() {
    let findText = document.getElementById('find-input').value;
    let replaceText = document.getElementById('replace-input').value;
    if (!findText) return;

    let range = document.createRange();
    range.selectNodeContents(renderedOutput);
    range.collapse(true);
    let sel = window.getSelection();
    sel.removeAllRanges(); sel.addRange(range);

    let count = 0;
    while (window.find(findText, false, false, true, false, true, false) && count < 1000) {
        document.execCommand('insertText', false, replaceText);
        count++;
    }
    alert(count + " occurrences replaced.");
    syncRenderedToRaw();
}

// =====================================================================
// Emoji Data & Renderer
// =====================================================================
const emojiCategories = {
    'id': { 
        "Smileys & Emotion": ["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","😘","🥰","🥲","☺️","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","🥱","😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑","😲","☹️","🙁","😖","😞","😟","😤","😢","😭","😦","😧","😨","😩","🤯","😬","😰","😱","🥵","🥶","😳","🤪","😵","🥴","😠","😡","🤬"], 
        "Gestures & People": ["👋","🤚","🖐","✋","🖖","👌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","👀","👁","👅","👄","💋","🧠","🫀"], 
        "Animals & Nature": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐒","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🐢","🐍","🦎","🦖","🐙","🦑","🦐","🦀","🐡","🐠","🐟","🐬","🐳","🦈","🐊","🐅","🐆","🦓","🦍","🐘","🦛","🦏","🐪","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🐐","🦌","🐕","🐈","🐓","🦃","🦚","🦜","🦢","🕊","🐇","🦝","🦨","🦡","🦦","🦥","🐁","🐀","🐿","🦔","🐉","🐲","🌵","🎄","🌲","🌳","🌴","🌱","🌿","☘️","🍀","🍃","🍂","🍁","🍄","🐚","🪨","🌾","💐","🌷","🌹","🥀","🌺","🌸","🌼","🌻","🌞","🌝","🌛","🌜","🌚","🌕","🌖","🌗","🌘","🌑","🌒","🌓","🌔","🌙","🌎","🌍","🌏","🪐","💫","⭐️","🌟","✨","⚡️","☄️","💥","🔥","🌪","🌈","☀️","🌤","⛅️","🌥","☁️","🌦","🌧","⛈","🌩","🌨","❄️","☃️","⛄️","🌬","💨","💧","💦","☔️","☂️","🌊"], 
        "Objects & Symbols": ["⌚️","📱","💻","⌨️","🖥","🖨","🖱","📷","📸","📹","🎥","📞","☎️","📺","📻","🎙","🧭","⏱","⏲","⏰","🕰","⌛️","⏳","🔋","🔌","💡","🔦","🕯","💸","💵","💴","💶","💷","🪙","💰","💳","💎","⚖️","🧰","🔧","🔨","⚒","🛠","⛏","🔩","⚙️","🧱","⛓","🧲","🔫","💣","🧨","🪓","🔪","🗡","⚔️","🛡","🚬","⚰️","🏺","🔮","📿","🧿","🔭","🔬","💊","💉","🩸","🧬","🦠","🧫","🧪","🌡","🧹","🧺","🧻","🚽","🚰","🚿","🛁","🛀","🧼","🧽","🪒","🧴","🛎","🔑","🗝","🚪","🪑","🛋","🛏","🛌","🧸","🖼","🪞","🪟","🛍","🛒","🎁","🎈","🎀","🪄","🎊","🎉","🎎","🏮","🎐","🧧","✉️","📩","📨","📧","💌","📥","📤","📦","🏷","📫","📬","📭","📮","📜","📃","📄","📑","🧾","📊","📈","📉","🗒","🗓","📆","📅","🗑","🗃","🗳","🗄","📋","📁","📂","🗂","🗞","📰","📓","📔","📒","📕","📗","📘","📙","📚","📖","🔖","🧷","🔗","📎","🖇","📐","📏","🧮","📌","📍","✂️","🖊","🖋","✒️","🖌","🖍","📝","✏️","🔍","🔎","🔏","🔐","🔒","🔓","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝"] 
    },
    'en': { 
        "Smileys & Emotion": ["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","😘","🥰","🥲","☺️","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","🥱","😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑","😲","☹️","🙁","😖","😞","😟","😤","😢","😭","😦","😧","😨","😩","🤯","😬","😰","😱","🥵","🥶","😳","🤪","😵","🥴","😠","😡","🤬"], 
        "Gestures & People": ["👋","🤚","🖐","✋","🖖","👌","🤏","✌️","🤞","🫰","🤟","🤘","🤙","👈","👉","👆","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","🫶","👐","🤲","🤝","🙏","✍️","💅","🤳","💪","👀","👁","👅","👄","💋","🧠","🫀"], 
        "Animals & Nature": ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🐒","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🐢","🐍","🦎","🦖","🐙","🦑","🦐","🦀","🐡","🐠","🐟","🐬","🐳","🦈","🐊","🐅","🐆","🦓","🦍","🐘","🦛","🦏","🐪","🦒","🦘","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🐐","🦌","🐕","🐈","🐓","🦃","🦚","🦜","🦢","🕊","🐇","🦝","🦨","🦡","🦦","🦥","🐁","🐀","🐿","🦔","🐉","🐲","🌵","🎄","🌲","🌳","🌴","🌱","🌿","☘️","🍀","🍃","🍂","🍁","🍄","🐚","🪨","🌾","💐","🌷","🌹","🥀","🌺","🌸","🌼","🌻","🌞","🌝","🌛","🌜","🌚","🌕","🌖","🌗","🌘","🌑","🌒","🌓","🌔","🌙","🌎","🌍","🌏","🪐","💫","⭐️","🌟","✨","⚡️","☄️","💥","🔥","🌪","🌈","☀️","🌤","⛅️","🌥","☁️","🌦","🌧","⛈","🌩","🌨","❄️","☃️","⛄️","🌬","💨","💧","💦","☔️","☂️","🌊"], 
        "Objects & Symbols": ["⌚️","📱","💻","⌨️","🖥","🖨","🖱","📷","📸","📹","🎥","📞","☎️","📺","📻","🎙","🧭","⏱","⏲","⏰","🕰","⌛️","⏳","🔋","🔌","💡","🔦","🕯","💸","💵","💴","💶","💷","🪙","💰","💳","💎","⚖️","🧰","🔧","🔨","⚒","🛠","⛏","🔩","⚙️","🧱","⛓","🧲","🔫","💣","🧨","🪓","🔪","🗡","⚔️","🛡","🚬","⚰️","🏺","🔮","📿","🧿","🔭","🔬","💊","💉","🩸","🧬","🦠","🧫","🧪","🌡","🧹","🧺","🧻","🚽","🚰","🚿","🛁","🛀","🧼","🧽","🪒","🧴","🛎","🔑","🗝","🚪","🪑","🛋","🛏","🛌","🧸","🖼","🪞","🪟","🛍","🛒","🎁","🎈","🎀","🪄","🎊","🎉","🎎","🏮","🎐","🧧","✉️","📩","📨","📧","💌","📥","📤","📦","🏷","📫","📬","📭","📮","📜","📃","📄","📑","🧾","📊","📈","📉","🗒","🗓","📆","📅","🗑","🗃","🗳","🗄","📋","📁","📂","🗂","🗞","📰","📓","📔","📒","📕","📗","📘","📙","📚","📖","🔖","🧷","🔗","📎","🖇","📐","📏","🧮","📌","📍","✂️","🖊","🖋","✒️","🖌","🖍","📝","✏️","🔍","🔎","🔏","🔐","🔒","🔓","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝"] 
    }
};

function renderEmojis(lang) {
    const grid = document.getElementById('emoji-grid'); 
    grid.innerHTML = '';
    for (const [category, emojiList] of Object.entries(emojiCategories[lang])) {
        let catTitle = document.createElement('div'); 
        catTitle.className = 'emoji-category-title'; 
        catTitle.innerText = category; 
        grid.appendChild(catTitle);
        emojiList.forEach(emoji => { 
            let btn = document.createElement('button'); 
            btn.className = 'emoji-btn'; 
            btn.innerText = emoji; 
            btn.onclick = () => { formatDoc('insertText', emoji); closeWin('win-emoticon'); }; 
            grid.appendChild(btn); 
        });
    }
}

// =====================================================================
// Language System
// =====================================================================
const translations = {
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
        'selection': '(Teks Diblok)','quote': 'Kutipan', 'hr': 'Garis Pemisah'
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
};

function applyLanguage() {
    let currentLang = localStorage.getItem('appLang') || 'id';
    const t = translations[currentLang];

    document.getElementById('lang-toggle').innerText = t.langBtn;
    document.getElementById('sub-1').innerText = t.sub1;
    document.getElementById('sub-2').innerText = t.sub2;
    document.getElementById('dev-by-text').innerText = t.devBy;
    renderedOutput.setAttribute('data-placeholder', t.placeholder);

    document.getElementById('t-raw').innerText = t.tRaw;
    document.getElementById('t-uni').innerText = t.tUni;
    document.getElementById('t-table').innerText = t.tTable;
    document.getElementById('lbl-col').innerText = t.lblCol;
    document.getElementById('lbl-row').innerText = t.lblRow;

    document.getElementById('t-link').innerText = t.tLink;
    document.getElementById('lbl-link-text').innerText = t.lblLinkText;
    document.getElementById('lbl-link-url').innerText = t.lblLinkUrl;

    document.getElementById('t-image').innerText = t.tImage;
    document.getElementById('lbl-image-url').innerText = t.lblImageUrl;

    document.getElementById('t-find').innerText = t.tFind;
    document.getElementById('lbl-find').innerText = t.lblFind;
    document.getElementById('lbl-replace').innerText = t.lblReplace;

    document.getElementById('t-emoji').innerText = t.tEmoji;
    document.getElementById('btn-replace-all').innerText = t.btnRepAll;
    document.getElementById('btn-find-next').innerText = t.btnFindNxt;
    document.getElementById('btn-replace-btn').innerText = t.btnRep;

    const btnHr = document.getElementById('btn-hr');
    if (btnHr) btnHr.title = t.hr;

    renderEmojis(currentLang);
    updateCounter();
}

document.getElementById('lang-toggle').addEventListener('click', () => {
    let currentLang = localStorage.getItem('appLang') || 'id';
    localStorage.setItem('appLang', currentLang === 'id' ? 'en' : 'id');
    resetTypewriter();
    applyLanguage();
});

// =====================================================================
// Theme System
// =====================================================================
if (localStorage.getItem('theme') === 'light') document.body.classList.add('light-mode');

document.getElementById('theme-toggle').addEventListener('click', () => {
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('light-mode') ? 'light' : 'dark');
});

// =====================================================================
// Format Cycle Animation
// =====================================================================
const formats = ["WORD", "PDF", "HTML"];
let fIdx = 0;
setInterval(() => {
    fIdx = (fIdx + 1) % formats.length;
    const el = document.getElementById('cycle-text');
    el.style.opacity = 0;
    setTimeout(() => {
        el.innerText = formats[fIdx];
        el.style.opacity = 1;
    }, 300);
}, 2500);

// =====================================================================
// Sync Engine: Raw Markdown <-> Rendered HTML
// =====================================================================

function syncRawToRendered() {
    if (isSyncing) return;
    isSyncing = true;

    let rawText = rawMarkdownInput.value;
    if (!rawText.trim()) {
        renderedOutput.innerHTML = '';
        isSyncing = false;
        updateCounter();
        return;
    }

    // Normalize matrix math for bold rendering
    let processedText = rawText.replace(
        /(?:\\mathbf|\\boldsymbol)\{\s*\\begin\{([a-zA-Z]*matrix)\}([\s\S]*?)\\end\{\1\}\s*\}/g, 
        function(match, mType, content) {
            return '\\begin{' + mType + '}\n' + 
                content.split('\\\\').map(row => 
                    row.split('&').map(cell => 
                        cell.trim() === '' ? cell : '\\mathbf{' + cell.trim() + '}'
                    ).join(' & ')
                ).join(' \\\\\n') + 
                '\n\\end{' + mType + '}';
        }
    );

    let parsedHTML = marked.parse(processedText.replace(/\\\\/g, '\\\\\\\\'));
    renderedOutput.innerHTML = parsedHTML;

    MathJax.typesetPromise([renderedOutput]).then(() => {
        renderedOutput.querySelectorAll('mjx-container').forEach(node => { 
            node.setAttribute('contenteditable', 'false'); 
        });
        renderedOutput.querySelectorAll('hr').forEach(hr => {
            hr.style.borderTop = '2px solid var(--border-color)';
            hr.style.margin = '20px 0';
            hr.style.clear = 'both';
        });
        updateCounter();
        localStorage.setItem('massivemark_draft_md', rawMarkdownInput.value);
        isSyncing = false;
    }).catch(err => {
        console.error('MathJax typeset error:', err);
        isSyncing = false;
    });
}

function syncRenderedToRaw() {
    if (isSyncing) return;
    isSyncing = true;

    let clone = renderedOutput.cloneNode(true);

    clone.querySelectorAll('mjx-container').forEach(node => {
        let rawTex = node.getAttribute('data-raw-tex');
        let isDisplay = node.getAttribute('data-math-display') === 'true';
        if (rawTex) {
            let cleanTex = rawTex.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            let mathText = isDisplay ? '\n\n$$' + cleanTex + '$$\n\n' : '$' + cleanTex + '$';
            node.parentNode.replaceChild(document.createTextNode(mathText), node);
        }
    });

    let md = standardTurndown.turndown(clone.innerHTML);
    md = md.replace(/\n{3,}/g, '\n\n');
    md = md.replace(/(?:\n\n---\n\n){2,}/g, '\n\n---\n\n');

    rawMarkdownInput.value = md;
    updateCounter();
    localStorage.setItem('massivemark_draft_md', md);
    isSyncing = false;
}

rawMarkdownInput.addEventListener('input', syncRawToRendered);
renderedOutput.addEventListener('input', syncRenderedToRaw);

renderedOutput.addEventListener('paste', function(e) {
    e.preventDefault();
    e.stopImmediatePropagation();

    let clipboardData = (e.originalEvent || e).clipboardData;
    let plainData = clipboardData.getData('text/plain'); //

    let processedText = plainData.replace(/\\\([\s\S]*?\\\)/g, function(m) { return '$' + m.slice(2, -2).trim() + '$'; });
    processedText = processedText.replace(/\\\[[\s\S]*?\\\]/g, function(m) { return '$$' + m.slice(2, -2).trim() + '$$'; });

    let parsedHTML = marked.parse(processedText.replace(/\\\\/g, '\\\\\\\\'));
    
    document.execCommand('insertHTML', false, parsedHTML);

    setTimeout(() => {
        renderedOutput.querySelectorAll('*').forEach(el => {
            if(el.style.margin) el.style.margin = "";
            if(el.style.padding) el.style.padding = "";
            if(el.style.lineHeight) el.style.lineHeight = "";
        });

        MathJax.typesetPromise([renderedOutput]).then(() => {
            renderedOutput.querySelectorAll('mjx-container').forEach(node => { 
                node.setAttribute('contenteditable', 'false'); 
            });
            updateCounter(); 
            syncRenderedToRaw(); 
        });
    }, 50);
});

document.getElementById("btn-open-raw").onclick = () => { 
    openWin('win-raw'); 
    syncRenderedToRaw(); 
    rawMarkdownInput.focus(); 
};

document.getElementById("btn-copy-raw").onclick = function() { 
    navigator.clipboard.writeText(rawMarkdownInput.value); 
    this.innerText = "Copied!"; 
    setTimeout(() => this.innerText = "Copy Markdown", 2000); 
};

// =====================================================================
// Universal Export (Turndown with MathJax)
// =====================================================================
const dedicatedExportTurndown = new TurndownService({ 
    headingStyle: 'atx', 
    hr: '---', 
    bulletListMarker: '-', 
    codeBlockStyle: 'fenced', 
    emDelimiter: '*' 
});
dedicatedExportTurndown.use(turndownPluginGfm.gfm);
dedicatedExportTurndown.escape = function(string) { return string; };

dedicatedExportTurndown.addRule('horizontalRule', {
    filter: 'hr',
    replacement: function () {
        return '\n\n---\n\n';
    }
});

// CRITICAL FIX: Catch pasted HRs from Word for Universal Export
dedicatedExportTurndown.addRule('borderBottomHR_export', {
    filter: function (node) {
        if (node.nodeName !== 'P' && node.nodeName !== 'DIV') return false;
        const style = node.getAttribute('style');
        if (!style) return false;
        const hasBorderBottom = /border-bottom\s*:\s*[^;]+/i.test(style) && !/border-bottom\s*:\s*(none|0px|initial|hidden)/i.test(style);
        if (!hasBorderBottom) return false;
        const textContent = node.textContent.trim();
        const hasOnlyEmptyElements = !textContent || textContent === '\u00A0';
        return hasOnlyEmptyElements;
    },
    replacement: function () {
        return '\n\n---\n\n';
    }
});

dedicatedExportTurndown.keep(['span', 'font', 'div', 'img', 'a']);

dedicatedExportTurndown.addRule('mathjax_universal', {
    filter: function (node) { 
        return node.nodeName === 'MJX-CONTAINER' || node.hasAttribute('data-raw-tex'); 
    },
    replacement: function (content, node) {
        let rawTex = node.getAttribute('data-raw-tex');
        if (!rawTex) return '';
        let cleanTex = rawTex.trim(), 
            isDisplay = node.getAttribute('data-math-display') === 'true', 
            isStandalone = false;
        if (node.parentElement && (node.parentElement.tagName === 'P' || node.parentElement.tagName === 'DIV' || node.parentElement.tagName === 'LI')) {
            if (node.parentElement.textContent.trim() === node.textContent.trim()) isStandalone = true;
        }
        return (isDisplay || isStandalone) ? '\n\n$$\n' + cleanTex + '\n$$\n\n' : '$' + cleanTex + '$';
    }
});

function renderUniversalExport() {
    let clone = renderedOutput.cloneNode(true);
    let md = dedicatedExportTurndown.turndown(clone.innerHTML);
    md = md.replace(/\n{3,}/g, '\n\n');
    md = md.replace(/(?:\n\n---\n\n){2,}/g, '\n\n---\n\n');
    universalMarkdownInput.value = md;
}

document.getElementById("btn-open-uni").onclick = () => { 
    openWin('win-uni'); 
    renderUniversalExport(); 
    universalMarkdownInput.focus(); 
};

universalMarkdownInput.addEventListener('input', function() {
    let rawText = universalMarkdownInput.value;
    let parsedHTML = marked.parse(rawText.replace(/\\\\/g, '\\\\\\\\'));
    renderedOutput.innerHTML = parsedHTML;
    MathJax.typesetPromise([renderedOutput]).then(() => {
        renderedOutput.querySelectorAll('mjx-container').forEach(node => { 
            node.setAttribute('contenteditable', 'false'); 
        });
        updateCounter(); 
        syncRenderedToRaw(); 
    });
});

document.getElementById("btn-copy-universal").onclick = function() { 
    navigator.clipboard.writeText(universalMarkdownInput.value); 
    this.innerText = "Copied!"; 
    setTimeout(() => this.innerText = "Copy Export", 2000); 
};

// =====================================================================
// Dynamic Table System
// =====================================================================
const tableMenu = document.getElementById("table-float-menu");
let activeTableCell = null, activeTableElement = null;

document.getElementById("btn-confirm-table").onclick = () => {
    let cols = parseInt(document.getElementById('table-cols').value) || 3;
    let rows = parseInt(document.getElementById('table-rows').value) || 3;
    cols = Math.max(1, Math.min(20, cols));
    rows = Math.max(1, Math.min(50, rows));

    let tableHTML = '<br><table border="1" style="border-collapse: collapse; width: 100%; border-color: #555; table-layout: fixed;"><tbody>';
    for (let r = 0; r < rows; r++) { 
        tableHTML += '<tr>'; 
        for (let c = 0; c < cols; c++) { 
            tableHTML += '<td style="padding: 10px;"><br></td>'; 
        } 
        tableHTML += '</tr>'; 
    }
    tableHTML += '</tbody></table><br>';

    closeWin('win-table'); 
    formatDoc('insertHTML', tableHTML);
};

renderedOutput.addEventListener('click', (e) => {
    const td = e.target.closest('td, th');
    if (td && renderedOutput.contains(td)) {
        activeTableCell = td; 
        activeTableElement = td.closest('table');
        const rect = activeTableElement.getBoundingClientRect();
        tableMenu.style.display = "flex"; 
        tableMenu.style.top = (rect.top - 45) + "px"; 
        tableMenu.style.left = (rect.left) + "px";
    } else if (!e.target.closest('#table-float-menu')) { 
        tableMenu.style.display = "none"; 
        activeTableCell = null; 
        activeTableElement = null; 
    }
});

window.addEventListener('scroll', () => { tableMenu.style.display = "none"; });

document.getElementById("btn-del-table").onclick = () => { 
    if (activeTableElement) { 
        activeTableElement.remove(); 
        tableMenu.style.display = "none"; 
        syncRenderedToRaw(); 
    } 
};

document.getElementById("btn-copy-table").onclick = async () => {
    if (!activeTableElement) return;

    let tableClone = activeTableElement.cloneNode(true);
    tableClone.removeAttribute('style');
    tableClone.setAttribute('border', '1');
    tableClone.style.borderCollapse = 'collapse';
    
    tableClone.querySelectorAll('td, th').forEach(c => { 
        c.removeAttribute('style'); 
        c.style.border = '1px solid #000'; 
        c.style.padding = '8px'; 
        c.style.textAlign = 'left';
    });

    try {
        const htmlBlob = new Blob([tableClone.outerHTML], {type: 'text/html'});
        const textBlob = new Blob([activeTableElement.innerText], {type: 'text/plain'});
        await navigator.clipboard.write([new ClipboardItem({'text/html': htmlBlob, 'text/plain': textBlob})]);
        
        activeTableElement.classList.add('copy-flash');
        setTimeout(() => activeTableElement.classList.remove('copy-flash'), 300);

        const copyBtn = document.getElementById("btn-copy-table");
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = "✅ Copied!";
        setTimeout(() => { copyBtn.innerHTML = originalText; }, 1500);

    } catch(err) { 
        console.error('Gagal copy Table', err); 
        alert("Gagal menyalin tabel!");
    }
};

document.getElementById("btn-add-row").onclick = () => { 
    if (!activeTableCell) return; 
    const tr = activeTableCell.closest('tr'); 
    const newRow = tr.cloneNode(true); 
    newRow.querySelectorAll('td, th').forEach(c => c.innerHTML = '<br>'); 
    tr.parentNode.insertBefore(newRow, tr.nextSibling); 
    syncRenderedToRaw(); 
};

document.getElementById("btn-del-row").onclick = () => { 
    if (!activeTableCell) return; 
    activeTableCell.closest('tr').remove(); 
    tableMenu.style.display = "none"; 
    syncRenderedToRaw(); 
};

document.getElementById("btn-add-col").onclick = () => { 
    if (!activeTableElement || !activeTableCell) return; 
    const index = Array.from(activeTableCell.parentNode.children).indexOf(activeTableCell); 
    activeTableElement.querySelectorAll('tr').forEach(tr => { 
        const cell = tr.children[index]; 
        if (cell) { 
            const newCell = cell.cloneNode(false); 
            newCell.innerHTML = '<br>'; 
            tr.insertBefore(newCell, cell.nextSibling); 
        } 
    }); 
    syncRenderedToRaw(); 
};

document.getElementById("btn-del-col").onclick = () => { 
    if (!activeTableElement || !activeTableCell) return; 
    const index = Array.from(activeTableCell.parentNode.children).indexOf(activeTableCell); 
    activeTableElement.querySelectorAll('tr').forEach(tr => { 
        if (tr.children[index]) tr.children[index].remove(); 
    }); 
    tableMenu.style.display = "none"; 
    syncRenderedToRaw(); 
};

// =====================================================================
// Toolbar Active State Tracking
// =====================================================================
function checkToolbarActive() {
    const cmds = [
        {id:'btn-bold', cmd:'bold'}, 
        {id:'btn-italic', cmd:'italic'}, 
        {id:'btn-underline', cmd:'underline'}, 
        {id:'btn-strike', cmd:'strikeThrough'}, 
        {id:'btn-ul', cmd:'insertUnorderedList'}, 
        {id:'btn-ol', cmd:'insertOrderedList'}, 
        {id:'btn-align-left', cmd:'justifyLeft'}, 
        {id:'btn-align-center', cmd:'justifyCenter'}, 
        {id:'btn-align-right', cmd:'justifyRight'}, 
        {id:'btn-align-justify', cmd:'justifyFull'}, 
        {id:'btn-sup', cmd:'superscript'}, 
        {id:'btn-sub', cmd:'subscript'}
    ];
    cmds.forEach(item => { 
        let btn = document.getElementById(item.id); 
        if (btn) {
            document.queryCommandState(item.cmd) ? btn.classList.add('active') : btn.classList.remove('active');
        }
    });
}

['keyup', 'mouseup', 'click'].forEach(evt => renderedOutput.addEventListener(evt, checkToolbarActive));

// =====================================================================
// Statistics Engine
// =====================================================================
function updateCounter() {
    let sel = window.getSelection(); 
    let text = "", isSelected = false;
    let currentLangValue = localStorage.getItem('appLang') || 'id';

    if (sel && sel.rangeCount > 0 && sel.anchorNode && renderedOutput.contains(sel.anchorNode) && sel.toString().trim().length > 0) { 
        text = sel.toString(); 
        isSelected = true; 
    } else { 
        text = renderedOutput.innerText || ""; 
    }

    const infoEl = document.getElementById('selection-info');
    infoEl.style.display = isSelected ? "block" : "none"; 
    infoEl.innerText = translations[currentLangValue].selection; 

    let cText = text.trim();
    let charCount = cText.replace(/\n/g, '').length;
    let wordCount = (cText === "" ? 0 : cText.split(/\s+/).filter(w => w.length > 0).length);

    const sentenceCount = cText === "" ? 0 : cText.split(/[.!?]+(?=\s|$)/).filter(s => s.trim().length > 0).length;
    const paragraphCount = cText === "" ? 0 : cText.split(/\n+/).filter(p => p.trim().length > 0).length;
    
    document.getElementById('char-count').innerText = charCount + (currentLangValue === 'id' ? " Karakter" : " Characters");
    document.getElementById('word-count').innerText = wordCount + (currentLangValue === 'id' ? " Kata" : " Words");
    document.getElementById('sentence-count').innerText = sentenceCount + (currentLangValue === 'id' ? " Kalimat" : " Sentences");
    document.getElementById('paragraph-count').innerText = paragraphCount + (currentLangValue === 'id' ? " Paragraf" : " Paragraphs");

    let readTime = Math.ceil(wordCount / 200);
    document.getElementById('read-time').innerText = readTime + (currentLangValue === 'id' ? " Mnt Baca" : " Min Read");
}

['input', 'keyup', 'mouseup'].forEach(e => renderedOutput.addEventListener(e, updateCounter));
document.addEventListener('selectionchange', () => { 
    if (document.activeElement === renderedOutput || renderedOutput.contains(document.activeElement)) {
        updateCounter(); 
        
        const sel = window.getSelection();
        const mathElements = renderedOutput.querySelectorAll('mjx-container');
        
        if (!sel.rangeCount || sel.isCollapsed) {
            mathElements.forEach(el => el.classList.remove('math-selected'));
            return;
        }
        
        mathElements.forEach(el => {
            if (sel.containsNode(el, true)) {
                el.classList.add('math-selected');
            } else {
                el.classList.remove('math-selected');
            }
        });
        
    } else {
        renderedOutput.querySelectorAll('mjx-container').forEach(el => el.classList.remove('math-selected'));
    }
});

new MutationObserver(updateCounter).observe(renderedOutput, { childList: true, characterData: true, subtree: true });

// =====================================================================
// Draggable Word Counter
// =====================================================================
const counterPill = document.getElementById('word-counter-pill'); 
let isDraggingCounter = false, counterOffsetX, counterOffsetY;

counterPill.addEventListener('mousedown', (e) => { 
    isDraggingCounter = true; 
    const rect = counterPill.getBoundingClientRect(); 
    counterOffsetX = e.clientX - rect.left; 
    counterOffsetY = e.clientY - rect.top; 
    counterPill.style.bottom = 'auto'; 
    counterPill.style.right = 'auto'; 
    counterPill.style.transition = 'none'; 
    counterPill.style.left = rect.left + 'px'; 
    counterPill.style.top = rect.top + 'px'; 
});

document.addEventListener('mousemove', (e) => { 
    if (!isDraggingCounter) return; 
    e.preventDefault(); 
    let newLeft = e.clientX - counterOffsetX;
    let newTop = e.clientY - counterOffsetY;

    newLeft = Math.max(15, Math.min(newLeft, window.innerWidth - counterPill.offsetWidth - 15));
    newTop = Math.max(15, Math.min(newTop, window.innerHeight - counterPill.offsetHeight - 15));

    counterPill.style.left = newLeft + 'px'; 
    counterPill.style.top = newTop + 'px'; 
});

document.addEventListener('mouseup', () => { 
    if (isDraggingCounter) { 
        isDraggingCounter = false; 
        counterPill.style.transition = 'opacity 0.3s ease, box-shadow 0.3s ease'; 
    } 
});

// =====================================================================
// Draggable FAB Menu
// =====================================================================
const fabContainer = document.getElementById('fab-container');
const fabMenu = document.getElementById('fab-menu');
const fabMainBtn = document.getElementById('fab-main-btn');
let isFabDragging = false, fabOffsetX, fabOffsetY, fabDragDistance = 0;

fabContainer.addEventListener('mousedown', (e) => {
    if (e.target.closest('.fab-menu')) return;
    isFabDragging = true; 
    fabDragDistance = 0;
    const rect = fabContainer.getBoundingClientRect();
    fabOffsetX = e.clientX - rect.left; 
    fabOffsetY = e.clientY - rect.top;

    fabContainer.style.bottom = 'auto'; 
    fabContainer.style.right = 'auto';
    fabContainer.style.margin = '0';
    fabContainer.style.left = rect.left + 'px';
    fabContainer.style.top = rect.top + 'px';
});

document.addEventListener('mousemove', (e) => {
    if (!isFabDragging) return;
    fabDragDistance++;
    let newLeft = e.clientX - fabOffsetX;
    let newTop = e.clientY - fabOffsetY;

    newLeft = Math.max(15, Math.min(newLeft, window.innerWidth - fabContainer.offsetWidth - 15));
    newTop = Math.max(15, Math.min(newTop, window.innerHeight - fabContainer.offsetHeight - 15));

    fabContainer.style.left = newLeft + 'px';
    fabContainer.style.top = newTop + 'px';
});

document.addEventListener('mouseup', () => { 
    if (isFabDragging) isFabDragging = false; 
});

function updateFabMenuPosition() {
    const rect = fabContainer.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const menuHeightApprox = 180; 

    fabMenu.classList.remove('open-up', 'open-down');
    if (spaceBelow < menuHeightApprox) {
        fabMenu.classList.add('open-up'); 
    } else {
        fabMenu.classList.add('open-down'); 
    }
}
updateFabMenuPosition();

fabMainBtn.addEventListener('click', function(e) {
    e.stopPropagation();
    if (fabDragDistance < 5) {
        updateFabMenuPosition();
        fabMenu.classList.toggle('active');
    }
});

document.addEventListener('click', function(e) {
    if (fabMenu.classList.contains('active') && !e.target.closest('#fab-container')) {
        fabMenu.classList.remove('active');
    }
});

// =====================================================================
// Form Submission: Prepare Markdown for Backend
// =====================================================================
document.getElementById('convertForm').addEventListener('submit', function(e) {
    let clone = renderedOutput.cloneNode(true);

    clone.querySelectorAll('mjx-container').forEach(node => {
        let rawTex = node.getAttribute('data-raw-tex');
        let isDisplay = node.getAttribute('data-math-display') === 'true';
        if (rawTex) {
            let cleanTex = rawTex.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            let mathText = isDisplay ? '\n\n$$' + cleanTex + '$$\n\n' : '$' + cleanTex + '$';
            node.parentNode.replaceChild(document.createTextNode(mathText), node);
        }
    });

    hiddenFormInput.value = standardTurndown.turndown(clone.innerHTML);
    fabMenu.classList.remove('active');
});

// =====================================================================
// BUG FIX: Editor State Reset (Force Empty Content)
// =====================================================================
// Force the browser to reset active formatting commands in memory
function resetToolbarState() {
    const toggleCmds = ['bold', 'italic', 'underline', 'strikeThrough', 'superscript', 'subscript'];
    toggleCmds.forEach(cmd => {
        // Toggle off the command if it is still registered as active
        if (document.queryCommandState(cmd)) {
            document.execCommand(cmd, false, null);
        }
    });
    // Remove the visual active state from all toolbar buttons
    document.querySelectorAll('.tool-btn.active').forEach(btn => btn.classList.remove('active'));
}

function forceStateZero() {
    let textOnly = renderedOutput.innerText.trim();
    let hasMedia = renderedOutput.querySelector('img, table, mjx-container, hr');
    
    // If visually empty (no text and no media elements), force absolute clear
    if (textOnly === '' && !hasMedia) {
        if (renderedOutput.innerHTML !== '') {
            renderedOutput.innerHTML = ''; 
            resetToolbarState(); // Clear residual formatting states
            syncRenderedToRaw();
            updateCounter();
        }
    }
}

// Monitor input events to trigger state reset if the editor becomes empty
renderedOutput.addEventListener('input', forceStateZero);
renderedOutput.addEventListener('keyup', forceStateZero);

// Intercept "Select All + Delete/Backspace" actions to ensure a complete DOM reset
renderedOutput.addEventListener('keydown', function(e) {
    if (e.key === 'Backspace' || e.key === 'Delete') {
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            const selectedTextLength = sel.toString().trim().length;
            const totalTextLength = renderedOutput.innerText.trim().length;
            
            // If the selected text equals the total text content, execute a complete reset
            if (selectedTextLength >= totalTextLength && totalTextLength > 0) {
                e.preventDefault(); 
                renderedOutput.innerHTML = ''; 
                resetToolbarState(); // Clear residual formatting states
                syncRenderedToRaw();
                updateCounter();
            }
        }
    }
});

// =====================================================================
// ADVANCED CLIPBOARD 1: Smart Click-to-Copy (Math & Tables)
// =====================================================================
renderedOutput.addEventListener('click', async function(e) {
    const mathEl = e.target.closest('mjx-container');
    if (mathEl) {
        let mmlContainer = mathEl.querySelector('mjx-assistive-mml');
        if (mmlContainer && mmlContainer.firstElementChild) {
            let mmlClone = mmlContainer.firstElementChild.cloneNode(true);
            
            let wrapper = document.createElement('span');

            wrapper.appendChild(document.createTextNode('\u200B')); 
            wrapper.appendChild(mmlClone);
            wrapper.appendChild(document.createTextNode('\u200B'));

            try {
                const htmlBlob = new Blob([wrapper.outerHTML], {type: 'text/html'});
                const textBlob = new Blob([mathEl.getAttribute('data-raw-tex') || mathEl.innerText], {type: 'text/plain'});
                await navigator.clipboard.write([new ClipboardItem({'text/html': htmlBlob, 'text/plain': textBlob})]);
                
                mathEl.classList.add('copy-flash');
                setTimeout(() => mathEl.classList.remove('copy-flash'), 300);
            } catch(err) { console.error('Gagal copy MathML', err); }
        }
        return; 
    }
});

// =====================================================================
// ADVANCED CLIPBOARD 2: Smart Drag-to-Copy (Full Document Export)
// =====================================================================
renderedOutput.addEventListener('copy', function(e) {
    const selection = window.getSelection();
    if (!selection.rangeCount || !renderedOutput.contains(selection.anchorNode)) return;

    e.preventDefault(); 

    const range = selection.getRangeAt(0);
    const fragment = range.cloneContents();
    const tempDiv = document.createElement('div');
    tempDiv.appendChild(fragment);

    let tempHtml = `<p align="left" style="text-align: left; margin: 0; padding: 0;">` + tempDiv.innerHTML + `</p>`;
    tempHtml = tempHtml.replace(/<br\s*\/?>/gi, '</p><p align="left" style="text-align: left; margin: 0; padding: 0;">');
    tempDiv.innerHTML = tempHtml;

    tempDiv.querySelectorAll('*').forEach(el => {
        el.style.textAlign = 'left';
        if (['P', 'DIV', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TD', 'TH'].includes(el.tagName)) {
            el.setAttribute('align', 'left');
        }
    });

    tempDiv.querySelectorAll('hr').forEach(hr => {
        let hrWrapper = document.createElement('div');
        hrWrapper.style.marginTop = '18pt';
        hrWrapper.style.marginBottom = '18pt';
        hrWrapper.setAttribute('align', 'center');
        
        let newHr = document.createElement('hr');
        newHr.style.border = '0';
        newHr.style.borderTop = '1.5pt solid black';
        newHr.style.margin = '0';
        newHr.setAttribute('size', '2');
        newHr.setAttribute('color', 'black');
        
        hrWrapper.appendChild(newHr);
        hr.parentNode.replaceChild(hrWrapper, hr);
    });

    function toBoldMath(str) {
        if (!str) return str;
        const map = {'0':'𝟎','1':'𝟏','2':'𝟐','3':'𝟑','4':'𝟒','5':'𝟓','6':'𝟔','7':'𝟕','8':'𝟖','9':'𝟗','a':'𝐚','b':'𝐛','c':'𝐜','d':'𝐝','e':'𝐞','f':'𝐟','g':'𝐠','h':'𝐡','i':'𝐢','j':'𝐣','k':'𝐤','l':'𝐥','m':'𝐦','n':'𝐧','o':'𝐨','p':'𝐩','q':'𝐪','r':'𝐫','s':'𝐬','t':'𝐭','u':'𝐮','v':'𝐯','w':'𝐰','x':'𝐱','y':'𝐲','z':'𝐳','A':'𝐀','B':'𝐁','C':'𝐂','D':'𝐃','E':'𝐄','F':'𝐅','G':'𝐆','H':'𝐇','I':'𝐈','J':'𝐉','K':'𝐊','L':'𝐋','M':'𝐌','N':'𝐍','O':'𝐎','P':'𝐏','Q':'𝐐','R':'𝐑','S':'𝐒','T':'𝐓','U':'𝐔','V':'𝐕','W':'𝐖','X':'𝐗','Y':'𝐘','Z':'𝐙','-':'−','=':'='};
        return str.split('').map(c => map[c] || c).join('');
    }

    tempDiv.querySelectorAll('mjx-container').forEach(node => {
        let mmlContainer = node.querySelector('mjx-assistive-mml');
        if (mmlContainer && mmlContainer.firstElementChild) {
            let mmlClone = mmlContainer.firstElementChild.cloneNode(true);
            
            mmlClone.querySelectorAll('mn, mi, mo, mtext').forEach(token => {
                let variantParent = token.closest('[mathvariant]');
                if (variantParent) {
                    let variant = variantParent.getAttribute('mathvariant');
                    if (variant) { 
                        token.setAttribute('mathvariant', variant); 
                        if (variant.includes('bold')) token.textContent = toBoldMath(token.textContent); 
                    }
                }
            });
            
            mmlClone.querySelectorAll('*').forEach(el => { 
                ['class', 'style', 'id', 'data-semantic-type', 'data-semantic-role', 'data-semantic-id', 'data-semantic-parent'].forEach(attr => el.removeAttribute(attr)); 
            });
            
            let wrapper = document.createElement('span');
            wrapper.appendChild(document.createTextNode('\u200B')); 
            wrapper.appendChild(mmlClone);
            wrapper.appendChild(document.createTextNode('\u200B'));

            node.parentNode.replaceChild(wrapper, node);
        } else {
            let rawTex = node.getAttribute('data-raw-tex');
            if (rawTex) { 
                let textSpan = document.createElement('span'); 
                textSpan.innerText = '$$ ' + rawTex + ' $$'; 
                node.parentNode.replaceChild(textSpan, node); 
            }
        }
    });

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

// =====================================================================
// Visual Auto-Save Indicator
// =====================================================================
let typingTimer;
const saveStatus = document.getElementById('auto-save-status');

function triggerSavingUI() {
    if (!saveStatus) return;
    
    saveStatus.style.color = '#f59e0b'; 
    saveStatus.innerHTML = '<span style="font-size:12px">⏳</span> Saving...';
    
    clearTimeout(typingTimer);
    
    typingTimer = setTimeout(() => {
        saveStatus.style.color = '#10b981'; 
        saveStatus.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg> Saved';
        
        setTimeout(() => {
            saveStatus.style.color = 'var(--text-muted)';
        }, 2000);
    }, 1000);
}

document.getElementById('rendered-output').addEventListener('input', triggerSavingUI);
document.getElementById('raw-markdown').addEventListener('input', triggerSavingUI);

// =====================================================================
// Initialization
// =====================================================================
document.addEventListener('DOMContentLoaded', () => {
    typeWriter();
    applyLanguage();

    const savedDraft = localStorage.getItem('massivemark_draft_md');
    if(savedDraft) {
        rawMarkdownInput.value = savedDraft;
        syncRawToRendered();
    }
});
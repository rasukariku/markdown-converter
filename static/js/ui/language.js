import { resetTypewriter } from "./typewriter.js";
import { closeWin } from "./modals.js";

const STORAGE_KEY_LANG = "appLang";
const DEFAULT_LANG = "id";
const BTN_LANG_TOGGLE_ID = "lang-toggle";

let cachedUpdateCounter = null;

const translations = Object.freeze({
  id: {
    langBtn: "ID",
    sub1: "Konversi Teks dari",
    sub2: "ke",
    devBy: "DIBUAT OLEH",
    placeholder: "Ketik atau paste konten AI Anda di sini ...",
    tRaw: "Paste Markdown (Auto-Format)",
    tUni: "Ekspor Markdown Universal",
    tTable: "Sisipkan Tabel",
    lblCol: "Jumlah Kolom:",
    lblRow: "Jumlah Baris:",
    tLink: "Sisipkan Tautan",
    lblLinkText: "Teks Ditampilkan:",
    lblLinkUrl: "Alamat URL:",
    tImage: "Sisipkan Gambar",
    lblImageUrl: "URL Gambar:",
    tFind: "Cari & Ganti",
    lblFind: "Cari Teks:",
    lblReplace: "Ganti Menjadi:",
    tEmoji: "Pilih Emoticon",
    btnRepAll: "Ganti Semua",
    btnFindNxt: "Cari Lanjut",
    btnRep: "Ganti",
    selection: "(Teks Diblok)",
    quote: "Kutipan",
    hr: "Garis Pemisah",

    btnOpenRaw: "Ekspor Markdown",
    menuExportStd: "📤 Standard Markdown (LaTeX)",
    menuExportNotion: "📤 Notion (KaTeX)",
    menuExportWhatsApp: "💬 WhatsApp Mode",
    menuExportTelegram: "✈️ Telegram Mode",
    menuExportDiscord: "🎮 Discord Mode",
    menuExportSocial: "📱 Instagram & LinkedIn (Post / Bio)",

    btnCopyUniversal: "Salin Ekspor",
    btnCopyRaw: "Salin Markdown",

    tConfirmClear: "Konfirmasi Hapus Editor",
    msgConfirmClear:
      "Apakah Anda yakin ingin mengosongkan seluruh konten editor? Tindakan ini tidak dapat dibatalkan.",

    tHrModal: "Pilih Gaya Garis Pemisah",
    tMathModal: "Sisipkan Rumus Matematika (LaTeX)",
    btnMath: "Rumus Matematika",
  },
  en: {
    langBtn: "EN",
    sub1: "Convert Text from",
    sub2: "to",
    devBy: "DEVELOPED BY",
    placeholder: "Type or paste content from AI here ...",
    tRaw: "Paste Markdown (Auto-Format)",
    tUni: "Universal Markdown Export",
    tTable: "Insert Table",
    lblCol: "Columns:",
    lblRow: "Rows:",
    tLink: "Insert Link",
    lblLinkText: "Text to display:",
    lblLinkUrl: "Address URL:",
    tImage: "Insert Image",
    lblImageUrl: "Image URL:",
    tFind: "Find & Replace",
    lblFind: "Find what:",
    lblReplace: "Replace with:",
    tEmoji: "Select Emoticon",
    btnRepAll: "Replace All",
    btnFindNxt: "Find Next",
    btnRep: "Replace",
    selection: "(Text Selected)",
    quote: "Quote",
    hr: "Horizontal Line",

    btnOpenRaw: "Export Markdown",
    menuExportStd: "📤 Standard Markdown (LaTeX)",
    menuExportNotion: "📤 Notion (KaTeX)",
    menuExportWhatsApp: "💬 WhatsApp Mode",
    menuExportTelegram: "✈️ Telegram Mode",
    menuExportDiscord: "🎮 Discord Mode",
    menuExportSocial: "📱 Instagram & LinkedIn (Post / Bio)",

    btnCopyUniversal: "Copy Export",
    btnCopyRaw: "Copy Markdown",

    tConfirmClear: "Confirm Clear Editor",
    msgConfirmClear:
      "Are you sure you want to clear all editor contents? This action cannot be undone.",

    tHrModal: "Select Horizontal Divider",
    tMathModal: "Insert Math Formula (LaTeX)",
    btnMath: "Math Formula",
  },
});

const langUIElements = {
  get sub1() {
    return document.getElementById("sub-1");
  },
  get sub2() {
    return document.getElementById("sub-2");
  },
  get devBy() {
    return document.getElementById("dev-by-text");
  },
  get renderedOutput() {
    return document.getElementById("rendered-output");
  },
  get tRaw() {
    return document.getElementById("t-raw");
  },
  get tUni() {
    return document.getElementById("t-uni");
  },
  get tTable() {
    return document.getElementById("t-table");
  },
  get lblCol() {
    return document.getElementById("lbl-col");
  },
  get lblRow() {
    return document.getElementById("lbl-row");
  },
  get tLink() {
    return document.getElementById("t-link");
  },
  get lblLinkText() {
    return document.getElementById("lbl-link-text");
  },
  get lblLinkUrl() {
    return document.getElementById("lbl-link-url");
  },
  get tImage() {
    return document.getElementById("t-image");
  },
  get lblImageUrl() {
    return document.getElementById("lbl-image-url");
  },
  get tFind() {
    return document.getElementById("t-find");
  },
  get lblFind() {
    return document.getElementById("lbl-find");
  },
  get lblReplace() {
    return document.getElementById("lbl-replace");
  },
  get tEmoji() {
    return document.getElementById("t-emoji");
  },
  get btnReplaceAll() {
    return document.getElementById("btn-replace-all");
  },
  get btnFindNext() {
    return document.getElementById("btn-find-next");
  },
  get btnReplaceBtn() {
    return document.getElementById("btn-replace-btn");
  },
  get btnHr() {
    return document.getElementById("btn-hr");
  },
  get langToggle() {
    return document.getElementById("lang-toggle");
  },

  get btnOpenRaw() {
    return document.getElementById("btn-open-raw");
  },
  get menuExportStd() {
    return document.getElementById("menu-export-std");
  },
  get menuExportNotion() {
    return document.getElementById("menu-export-notion");
  },
  get menuExportWhatsApp() {
    return document.getElementById("menu-export-whatsapp");
  },
  get menuExportTelegram() {
    return document.getElementById("menu-export-telegram");
  },
  get menuExportDiscord() {
    return document.getElementById("menu-export-discord");
  },
  get menuExportSocial() {
    return document.getElementById("menu-export-social");
  },

  get btnCopyUniversal() {
    return document.getElementById("btn-copy-universal");
  },
  get btnCopyRaw() {
    return document.getElementById("btn-copy-raw");
  },

  get tConfirmClear() {
    return document.getElementById("t-confirm-clear");
  },
  get msgConfirmClear() {
    return document.getElementById("msg-confirm-clear");
  },

  get tHrModal() {
    return document.getElementById("t-hr-modal");
  },
  get tMathModal() {
    return document.getElementById("t-math-modal");
  },
  get btnMath() {
    return document.getElementById("btn-math");
  },
};

export function initializeThirdPartyEmojiPicker() {
  const picker = document.getElementById("emoji-picker-element");
  if (picker) {
    picker.addEventListener("emoji-click", (event) => {
      const unicodeChar = event.detail?.unicode || event.detail?.emoji?.unicode;
      if (unicodeChar) {
        document.execCommand("insertText", false, unicodeChar);
        closeWin("win-emoticon");
      }
    });
  }
}

export function applyLanguage(updateCounter) {
  if (typeof updateCounter === "function") {
    cachedUpdateCounter = updateCounter;
  }

  const currentLang = localStorage.getItem(STORAGE_KEY_LANG) || DEFAULT_LANG;
  const t = translations[currentLang] || translations[DEFAULT_LANG];

  if (langUIElements.langToggle)
    langUIElements.langToggle.innerText = t.langBtn;
  if (langUIElements.sub1) langUIElements.sub1.innerText = t.sub1;
  if (langUIElements.sub2) langUIElements.sub2.innerText = t.sub2;
  if (langUIElements.devBy) langUIElements.devBy.innerText = t.devBy;
  if (langUIElements.renderedOutput)
    langUIElements.renderedOutput.setAttribute(
      "data-placeholder",
      t.placeholder,
    );
  if (langUIElements.tRaw) langUIElements.tRaw.innerText = t.tRaw;
  if (langUIElements.tUni) langUIElements.tUni.innerText = t.tUni;
  if (langUIElements.tTable) langUIElements.tTable.innerText = t.tTable;
  if (langUIElements.lblCol) langUIElements.lblCol.innerText = t.lblCol;
  if (langUIElements.lblRow) langUIElements.lblRow.innerText = t.lblRow;
  if (langUIElements.tLink) langUIElements.tLink.innerText = t.tLink;
  if (langUIElements.lblLinkText)
    langUIElements.lblLinkText.innerText = t.lblLinkText;
  if (langUIElements.lblLinkUrl)
    langUIElements.lblLinkUrl.innerText = t.lblLinkUrl;
  if (langUIElements.tImage) langUIElements.tImage.innerText = t.tImage;
  if (langUIElements.lblImageUrl)
    langUIElements.lblImageUrl.innerText = t.lblImageUrl;
  if (langUIElements.tFind) langUIElements.tFind.innerText = t.tFind;
  if (langUIElements.lblFind) langUIElements.lblFind.innerText = t.lblFind;
  if (langUIElements.lblReplace)
    langUIElements.lblReplace.innerText = t.lblReplace;
  if (langUIElements.tEmoji) langUIElements.tEmoji.innerText = t.tEmoji;
  if (langUIElements.btnReplaceAll)
    langUIElements.btnReplaceAll.innerText = t.btnRepAll;
  if (langUIElements.btnFindNext)
    langUIElements.btnFindNext.innerText = t.btnFindNxt;
  if (langUIElements.btnReplaceBtn)
    langUIElements.btnReplaceBtn.innerText = t.btnRep;
  if (langUIElements.btnHr) langUIElements.btnHr.title = t.hr;

  if (langUIElements.btnOpenRaw) langUIElements.btnOpenRaw.title = t.btnOpenRaw;
  if (langUIElements.menuExportStd)
    langUIElements.menuExportStd.innerText = t.menuExportStd;
  if (langUIElements.menuExportNotion)
    langUIElements.menuExportNotion.innerText = t.menuExportNotion;
  if (langUIElements.menuExportWhatsApp)
    langUIElements.menuExportWhatsApp.innerText = t.menuExportWhatsApp;
  if (langUIElements.menuExportTelegram)
    langUIElements.menuExportTelegram.innerText = t.menuExportTelegram;
  if (langUIElements.menuExportDiscord)
    langUIElements.menuExportDiscord.innerText = t.menuExportDiscord;
  if (langUIElements.menuExportSocial)
    langUIElements.menuExportSocial.innerText = t.menuExportSocial;

  if (langUIElements.btnCopyUniversal)
    langUIElements.btnCopyUniversal.innerText = t.btnCopyUniversal;
  if (langUIElements.btnCopyRaw)
    langUIElements.btnCopyRaw.innerText = t.btnCopyRaw;

  if (langUIElements.tConfirmClear)
    langUIElements.tConfirmClear.innerText = t.tConfirmClear;
  if (langUIElements.msgConfirmClear)
    langUIElements.msgConfirmClear.innerText = t.msgConfirmClear;

  if (langUIElements.tHrModal) langUIElements.tHrModal.innerText = t.tHrModal;
  if (langUIElements.tMathModal)
    langUIElements.tMathModal.innerText = t.tMathModal;
  if (langUIElements.btnMath) langUIElements.btnMath.title = t.btnMath;

  if (typeof cachedUpdateCounter === "function") {
    cachedUpdateCounter();
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (langUIElements.langToggle) {
    langUIElements.langToggle.addEventListener("click", () => {
      const currentLang =
        localStorage.getItem(STORAGE_KEY_LANG) || DEFAULT_LANG;
      localStorage.setItem(
        STORAGE_KEY_LANG,
        currentLang === DEFAULT_LANG ? "en" : DEFAULT_LANG,
      );

      resetTypewriter();
      applyLanguage();
    });
  }
});

export { translations };

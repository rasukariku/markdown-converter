import { dom } from "../core/state.js";
import { openWin, closeWin } from "../ui/modals.js";
import {
  parseMarkdownWithMath,
  sanitizeAIText,
  collapseAllArrows,
} from "../core/sync.js";

const RE_HTML_ENTITIES = /&amp;|&lt;|&gt;|&quot;|&#39;/g;
const HTML_ENTITY_MAP = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

const UNICODE_BOLD_MAP = Object.freeze({
  A: "𝗔",
  B: "𝗕",
  C: "𝗖",
  D: "𝗗",
  E: "𝗘",
  F: "𝗙",
  G: "𝗚",
  H: "𝗛",
  I: "𝗜",
  J: "𝗝",
  K: "𝗞",
  L: "𝗟",
  M: "𝗠",
  N: "𝗡",
  O: "𝗢",
  P: "𝗣",
  Q: "𝗤",
  R: "𝗥",
  S: "𝗦",
  T: "𝗧",
  U: "𝗨",
  V: "𝗩",
  W: "𝗪",
  X: "𝗫",
  Y: "𝗬",
  Z: "𝗭",
  a: "𝗮",
  b: "𝗯",
  c: "𝗰",
  d: "𝗱",
  e: "𝗲",
  f: "𝗳",
  g: "𝗴",
  h: "𝗵",
  i: "𝗶",
  j: "𝗷",
  k: "𝗸",
  l: "𝗹",
  m: "𝗺",
  n: "𝗻",
  o: "𝗼",
  p: "𝗽",
  q: "1",
  r: "𝗿",
  s: "𝘀",
  t: "𝘁",
  u: "𝘂",
  v: "𝘃",
  w: "𝘄",
  x: "𝘅",
  y: "𝘆",
  z: "𝘇",
  0: "𝟬",
  1: "𝟭",
  2: "𝟮",
  3: "𝟯",
  4: "𝟰",
  5: "𝟱",
  6: "𝟲",
  7: "𝟳",
  8: "𝟴",
  9: "𝟵",
});

function toUnicodeSansBold(text) {
  if (!text) return text;
  return text
    .split("")
    .map((c) => UNICODE_BOLD_MAP[c] || c)
    .join("");
}

function decodeHtmlEntities(text) {
  return text.replace(RE_HTML_ENTITIES, (match) => HTML_ENTITY_MAP[match]);
}

/**
 * Functional substitution post-processor for WhatsApp exports.
 * Strips all # headers, converts **bold** to *bold*, converts links, and normalizes dividers.
 *
 * @param {string} text - Raw exported text.
 * @returns {string} WhatsApp-compatible text.
 */
function sanitizeForWhatsApp(text) {
  if (!text) return "";

  return (
    text
      // Convert Markdown ATX headings (# Heading) to WhatsApp Bold (*HEADING*)
      .replace(
        /^(?:[ \t]*)(?:#{1,6})[ \t]*(.+)$/gm,
        (m, title) => `*${title.trim()}*`,
      )
      // Convert double-asterisk bold (**text**) to WhatsApp single-asterisk bold (*text*)
      .replace(/\*\*([^\*\n]+)\*\*/g, "*$1*")
      // Convert double-tilde strikethrough (~~text~~) to WhatsApp single-tilde (~text~)
      .replace(/~~([^~\n]+)~~/g, "~$1~")
      // Convert double-underscore (__text__) to single underscore (_text_)
      .replace(/__([^_\n]+)__/g, "_$1_")
      // Convert Markdown links [Text](URL) to Text (URL)
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
      // Replace horizontal rules (---) with Unicode divider lines
      .replace(
        /^(?:[ \t]*)(?:-{3,}|\*{3,}|_{3,})(?:[ \t]*)$/gm,
        "───────────────────",
      )
      // Collapse triple/quadruple asterisks resulting from nested replacements (* * -> *)
      .replace(/\*{2,}/g, "*")
  );
}

/**
 * Functional substitution post-processor for Telegram exports.
 *
 * @param {string} text - Raw exported text.
 * @returns {string} Telegram-compatible text.
 */
function sanitizeForTelegram(text) {
  if (!text) return "";

  return text
    .replace(
      /^(?:[ \t]*)(?:#{1,6})[ \t]*(.+)$/gm,
      (m, title) => `*${title.trim()}*`,
    )
    .replace(/\*\*([^\*\n]+)\*\*/g, "*$1*")
    .replace(/~~([^~\n]+)~~/g, "~$1~")
    .replace(
      /^(?:[ \t]*)(?:-{3,}|\*{3,}|_{3,})(?:[ \t]*)$/gm,
      "───────────────────",
    )
    .replace(/\*{2,}/g, "*");
}

/**
 * Functional substitution post-processor for Discord exports.
 *
 * @param {string} text - Raw exported text.
 * @returns {string} Discord-compatible text.
 */
function sanitizeForDiscord(text) {
  if (!text) return "";

  return text.replace(
    /^(?:[ \t]*)(?:-{3,}|\*{3,}|_{3,})(?:[ \t]*)$/gm,
    "───────────────────",
  );
}

/**
 * Functional substitution post-processor for Instagram & LinkedIn social post exports.
 * Converts headings and bold text to Unicode Sans-Serif Bold characters.
 *
 * @param {string} text - Raw exported text.
 * @returns {string} Social post-compatible text.
 */
function sanitizeForSocial(text) {
  if (!text) return "";

  return text
    .replace(
      /^(?:[ \t]*)(?:#{1,6})[ \t]*(.+)$/gm,
      (m, title) => `\n📌 ${toUnicodeSansBold(title.trim().toUpperCase())}\n`,
    )
    .replace(/\*\*([^\*\n]+)\*\*/g, (m, boldText) =>
      toUnicodeSansBold(boldText),
    )
    .replace(/\*([^\*\n]+)\*/g, (m, boldText) => toUnicodeSansBold(boldText))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1: $2")
    .replace(
      /^(?:[ \t]*)(?:-{3,}|\*{3,}|_{3,})(?:[ \t]*)$/gm,
      "───────────────────",
    );
}

export function safeCopyToClipboard(text, successCallback, failureCallback) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard
      .writeText(text)
      .then(successCallback)
      .catch((err) => {
        console.warn(
          "Secure API failed, executing legacy copy fallback...",
          err,
        );
        fallbackCopyToClipboard(text, successCallback, failureCallback);
      });
  } else {
    fallbackCopyToClipboard(text, successCallback, failureCallback);
  }
}

function fallbackCopyToClipboard(text, successCallback, failureCallback) {
  const tempTextarea = document.createElement("textarea");
  tempTextarea.value = text;
  tempTextarea.style.position = "fixed";
  tempTextarea.style.top = "0";
  tempTextarea.style.left = "0";
  tempTextarea.style.width = "2em";
  tempTextarea.style.height = "2em";
  tempTextarea.style.padding = "0";
  tempTextarea.style.border = "none";
  tempTextarea.style.outline = "none";
  tempTextarea.style.boxShadow = "none";
  tempTextarea.style.background = "transparent";

  document.body.appendChild(tempTextarea);
  tempTextarea.focus();
  tempTextarea.select();

  try {
    const successful = document.execCommand("copy");
    if (successful) {
      if (typeof successCallback === "function") successCallback();
    } else {
      if (typeof failureCallback === "function") failureCallback();
    }
  } catch (err) {
    console.error("Legacy fallback copy failed:", err);
    if (typeof failureCallback === "function") failureCallback(err);
  } finally {
    document.body.removeChild(tempTextarea);
  }
}

export function initializeExport(
  dedicatedExportTurndown,
  notionExportTurndown,
  whatsappExportTurndown,
  telegramExportTurndown,
  discordExportTurndown,
  socialExportTurndown,
  boundSyncRenderedToRaw,
  updateCounter,
) {
  const btnOpenRaw = document.getElementById("btn-open-raw");
  const dropdownMenu = document.getElementById("markdown-dropdown-menu");
  const menuExportStd = document.getElementById("menu-export-std");
  const menuExportNotion = document.getElementById("menu-export-notion");
  const menuExportWhatsApp = document.getElementById("menu-export-whatsapp");
  const menuExportTelegram = document.getElementById("menu-export-telegram");
  const menuExportDiscord = document.getElementById("menu-export-discord");
  const menuExportSocial = document.getElementById("menu-export-social");

  const btnCopyUniversal = document.getElementById("btn-copy-universal");
  const btnApplyUniversal = document.getElementById("btn-apply-universal");
  const tUni = document.getElementById("t-uni");

  const btnClearAll = document.getElementById("btn-clear-all");
  const btnExecuteClear = document.getElementById("btn-execute-clear");
  const btnUploadDoc = document.getElementById("btn-upload-doc");
  const fileUploadInput = document.getElementById("file-upload-input");

  function applyUniversalToEditor() {
    if (!dom.universalMarkdownInput || !dom.renderedOutput) return;
    const rawText = dom.universalMarkdownInput.value;
    const processedText = sanitizeAIText(rawText);
    const parsedHTML = parseMarkdownWithMath(processedText);

    dom.renderedOutput.innerHTML = parsedHTML;

    if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
      window.MathJax.typesetPromise([dom.renderedOutput]).then(() => {
        if (dom.renderedOutput) {
          dom.renderedOutput
            .querySelectorAll("mjx-container")
            .forEach((node) => {
              node.setAttribute("contenteditable", "false");
            });
        }
        updateCounter();
        boundSyncRenderedToRaw();
      });
    } else {
      updateCounter();
      boundSyncRenderedToRaw();
    }
  }

  if (btnApplyUniversal) {
    btnApplyUniversal.onclick = (e) => {
      e.preventDefault();
      applyUniversalToEditor();
      closeWin("win-uni");
    };
  }

  if (btnClearAll) {
    btnClearAll.onclick = (e) => {
      e.preventDefault();
      openWin("win-confirm-clear");
    };
  }

  if (btnExecuteClear) {
    btnExecuteClear.onclick = (e) => {
      e.preventDefault();
      if (dom.renderedOutput) dom.renderedOutput.innerHTML = "";
      if (dom.rawMarkdownInput) dom.rawMarkdownInput.value = "";
      if (dom.universalMarkdownInput) dom.universalMarkdownInput.value = "";
      localStorage.removeItem("massivemark_draft_md");
      updateCounter();
      boundSyncRenderedToRaw();
      closeWin("win-confirm-clear");
    };
  }

  if (btnUploadDoc && fileUploadInput) {
    btnUploadDoc.onclick = (e) => {
      e.preventDefault();
      fileUploadInput.click();
    };

    fileUploadInput.onchange = async () => {
      const file = fileUploadInput.files[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);

      btnUploadDoc.style.opacity = "0.5";

      try {
        const response = await fetch("/upload_parse", {
          method: "POST",
          body: formData,
        });

        const result = await response.json();
        btnUploadDoc.style.opacity = "1";
        fileUploadInput.value = "";

        if (result.status === "success") {
          const sanitizedMarkdown = sanitizeAIText(result.markdown);

          openWin("win-uni");
          if (tUni) tUni.innerText = `Uploaded File: ${file.name}`;
          if (dom.universalMarkdownInput)
            dom.universalMarkdownInput.value = sanitizedMarkdown;

          applyUniversalToEditor();
          if (dom.universalMarkdownInput) dom.universalMarkdownInput.focus();
        } else {
          alert(`Upload Error: ${result.message}`);
        }
      } catch (err) {
        btnUploadDoc.style.opacity = "1";
        fileUploadInput.value = "";
        console.error("Document upload request failed:", err);
        alert("Failed to upload and convert the document.");
      }
    };
  }

  if (btnOpenRaw) {
    btnOpenRaw.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (dropdownMenu) dropdownMenu.classList.toggle("active");
    };
  }

  window.addEventListener("click", (e) => {
    if (dropdownMenu && !e.target.closest(".toolbar-dropdown")) {
      dropdownMenu.classList.remove("active");
    }
  });

  /**
   * Renders universal export output according to the chosen platform specification:
   * - Standard & Obsidian: Traditional LaTeX math ($inline$ and $$display$$)
   * - Notion: KaTeX delimiters ($$inline$$ and $$\ndisplay\n$$)
   * - WhatsApp / Telegram / Discord / Social: Sanitized Unicode math characters
   *
   * @param {string} mode - 'standard' | 'notion' | 'whatsapp' | 'telegram' | 'discord' | 'social'
   */
  function renderUniversalExport(mode) {
    if (!dom.renderedOutput || !dom.universalMarkdownInput) return;

    const clone = dom.renderedOutput.cloneNode(true);
    const currentLang = localStorage.getItem("appLang") || "id";

    clone.querySelectorAll(".math-wrapper").forEach((wrapper) => {
      const rawEl = wrapper.querySelector(".math-raw-line");
      const rawText = rawEl ? rawEl.textContent.trim() : "";
      const isDisplay = wrapper.getAttribute("data-math-display") === "true";

      let formattedLaTeX = "";
      if (mode === "notion") {
        // Notion KaTeX Engine: Inline requires double dollars, display requires standalone lines
        formattedLaTeX = isDisplay
          ? `\n\n$$\n${rawText}\n$$\n\n`
          : `$$${rawText}$$`;
      } else if (
        mode === "whatsapp" ||
        mode === "telegram" ||
        mode === "discord" ||
        mode === "social"
      ) {
        // Convert raw TeX macros into clean readable Unicode math for plain text chats
        const cleanMath = sanitizeLatexSymbolsInText(rawText);
        formattedLaTeX = ` ${cleanMath} `;
      } else {
        // Standard Markdown & Obsidian Engine: Traditional LaTeX format
        formattedLaTeX = isDisplay
          ? `\n\n$$\n${rawText}\n$$\n\n`
          : `$${rawText}$`;
      }

      if (wrapper.parentNode) {
        wrapper.parentNode.replaceChild(
          document.createTextNode(formattedLaTeX),
          wrapper,
        );
      }
    });

    clone.querySelectorAll(".hr-raw-line").forEach((rawLine) => {
      const rawText =
        rawLine.getAttribute("data-chars") || rawLine.innerText.trim() || "---";
      if (rawLine.parentNode) {
        rawLine.parentNode.replaceChild(
          document.createTextNode("\n\n" + rawText + "\n\n"),
          rawLine,
        );
      }
    });

    clone.querySelectorAll("mjx-container").forEach((node) => {
      const rawTex = node.getAttribute("data-raw-tex");
      const isDisplay = node.getAttribute("data-math-display") === "true";

      if (rawTex && node.parentNode) {
        const cleanTex = decodeHtmlEntities(rawTex);
        let mathText = "";
        if (mode === "notion") {
          mathText = isDisplay
            ? `\n\n$$\n${cleanTex}\n$$\n\n`
            : `$$${cleanTex}$$`;
        } else if (
          mode === "whatsapp" ||
          mode === "telegram" ||
          mode === "discord" ||
          mode === "social"
        ) {
          mathText = ` ${sanitizeLatexSymbolsInText(cleanTex)} `;
        } else {
          mathText = isDisplay
            ? `\n\n$$\n${cleanTex}\n$$\n\n`
            : `$${cleanTex}$`;
        }
        node.parentNode.replaceChild(document.createTextNode(mathText), node);
      }
    });

    let md = "";
    if (mode === "notion" && notionExportTurndown) {
      md = notionExportTurndown.turndown(clone.innerHTML);
      md = collapseAllArrows(md);
      if (tUni)
        tUni.innerText =
          currentLang === "id"
            ? "Ekspor Notion Mode (KaTeX)"
            : "Export Notion Mode (KaTeX)";
    } else if (mode === "whatsapp" && whatsappExportTurndown) {
      md = whatsappExportTurndown.turndown(clone.innerHTML);
      md = sanitizeForWhatsApp(md);
      if (tUni)
        tUni.innerText =
          currentLang === "id"
            ? "Ekspor WhatsApp Mode"
            : "Export WhatsApp Mode";
    } else if (mode === "telegram" && telegramExportTurndown) {
      md = telegramExportTurndown.turndown(clone.innerHTML);
      md = sanitizeForTelegram(md);
      if (tUni)
        tUni.innerText =
          currentLang === "id"
            ? "Ekspor Telegram Mode"
            : "Export Telegram Mode";
    } else if (mode === "discord" && discordExportTurndown) {
      md = discordExportTurndown.turndown(clone.innerHTML);
      md = sanitizeForDiscord(md);
      if (tUni)
        tUni.innerText =
          currentLang === "id" ? "Ekspor Discord Mode" : "Export Discord Mode";
    } else if (mode === "social" && socialExportTurndown) {
      md = socialExportTurndown.turndown(clone.innerHTML);
      md = sanitizeForSocial(md);
      if (tUni)
        tUni.innerText =
          currentLang === "id"
            ? "Ekspor Instagram & LinkedIn (Post / Bio)"
            : "Export Instagram & LinkedIn (Post / Bio)";
    } else if (dedicatedExportTurndown) {
      md = dedicatedExportTurndown.turndown(clone.innerHTML);
      md = collapseAllArrows(md);
      if (tUni)
        tUni.innerText =
          currentLang === "id"
            ? "Ekspor Standard Markdown (LaTeX)"
            : "Export Standard Markdown (LaTeX)";
    }

    md = md.replace(/\n{3,}/g, "\n\n");
    dom.universalMarkdownInput.value = md;
  }

  if (menuExportStd) {
    menuExportStd.onclick = (e) => {
      e.preventDefault();
      if (dropdownMenu) dropdownMenu.classList.remove("active");
      openWin("win-uni");
      renderUniversalExport("standard");
      if (dom.universalMarkdownInput) dom.universalMarkdownInput.focus();
    };
  }

  if (menuExportNotion) {
    menuExportNotion.onclick = (e) => {
      e.preventDefault();
      if (dropdownMenu) dropdownMenu.classList.remove("active");
      openWin("win-uni");
      renderUniversalExport("notion");
      if (dom.universalMarkdownInput) dom.universalMarkdownInput.focus();
    };
  }

  if (menuExportWhatsApp) {
    menuExportWhatsApp.onclick = (e) => {
      e.preventDefault();
      if (dropdownMenu) dropdownMenu.classList.remove("active");
      openWin("win-uni");
      renderUniversalExport("whatsapp");
      if (dom.universalMarkdownInput) dom.universalMarkdownInput.focus();
    };
  }

  if (menuExportTelegram) {
    menuExportTelegram.onclick = (e) => {
      e.preventDefault();
      if (dropdownMenu) dropdownMenu.classList.remove("active");
      openWin("win-uni");
      renderUniversalExport("telegram");
      if (dom.universalMarkdownInput) dom.universalMarkdownInput.focus();
    };
  }

  if (menuExportDiscord) {
    menuExportDiscord.onclick = (e) => {
      e.preventDefault();
      if (dropdownMenu) dropdownMenu.classList.remove("active");
      openWin("win-uni");
      renderUniversalExport("discord");
      if (dom.universalMarkdownInput) dom.universalMarkdownInput.focus();
    };
  }

  if (menuExportSocial) {
    menuExportSocial.onclick = (e) => {
      e.preventDefault();
      if (dropdownMenu) dropdownMenu.classList.remove("active");
      openWin("win-uni");
      renderUniversalExport("social");
      if (dom.universalMarkdownInput) dom.universalMarkdownInput.focus();
    };
  }

  if (dom.universalMarkdownInput) {
    dom.universalMarkdownInput.addEventListener("input", function () {
      applyUniversalToEditor();
    });
  }

  if (btnCopyUniversal) {
    btnCopyUniversal.onclick = function () {
      if (dom.universalMarkdownInput) {
        const textToCopy = dom.universalMarkdownInput.value;
        const currentLang = localStorage.getItem("appLang") || "id";

        const feedbackText =
          currentLang === "id" ? "✅ Berhasil Disalin!" : "✅ Copied!";
        const originalText =
          currentLang === "id" ? "Salin Ekspor" : "Copy Export";

        safeCopyToClipboard(
          textToCopy,
          () => {
            btnCopyUniversal.innerText = feedbackText;
            setTimeout(() => {
              btnCopyUniversal.innerText = originalText;
            }, 2000);
          },
          (err) => {
            console.error("Secure copy action failed:", err);
          },
        );
      }
    };
  }

  if (dom.convertForm) {
    dom.convertForm.addEventListener("submit", function (e) {
      const clone = dom.renderedOutput.cloneNode(true);

      clone.querySelectorAll(".math-wrapper").forEach((wrapper) => {
        const rawEl = wrapper.querySelector(".math-raw-line");
        const rawText = rawEl ? rawEl.textContent.trim() : "";
        const isDisplay = wrapper.getAttribute("data-math-display") === "true";
        const formattedLaTeX = isDisplay
          ? `\n\n$$\n${rawText}\n$$\n\n`
          : `$${rawText}$`;

        if (wrapper.parentNode) {
          wrapper.parentNode.replaceChild(
            document.createTextNode(formattedLaTeX),
            wrapper,
          );
        }
      });

      clone.querySelectorAll(".hr-raw-line").forEach((rawLine) => {
        const rawText =
          rawLine.getAttribute("data-chars") ||
          rawLine.innerText.trim() ||
          "---";
        if (rawLine.parentNode) {
          rawLine.parentNode.replaceChild(
            document.createTextNode("\n\n" + rawText + "\n\n"),
            rawLine,
          );
        }
      });

      clone.querySelectorAll("mjx-container").forEach((node) => {
        const rawTex = node.getAttribute("data-raw-tex");
        const isDisplay = node.getAttribute("data-math-display") === "true";

        if (rawTex && node.parentNode) {
          const cleanTex = decodeHtmlEntities(rawTex);
          const mathText = isDisplay
            ? `\n\n$$${cleanTex}$$\n\n`
            : `$${cleanTex}$`;
          node.parentNode.replaceChild(document.createTextNode(mathText), node);
        }
      });

      if (dedicatedExportTurndown) {
        dom.hiddenFormInput.value = dedicatedExportTurndown.turndown(
          clone.innerHTML,
        );
      }
      if (dom.fabMenu) {
        dom.fabMenu.classList.remove("active");
      }
    });
  }
}

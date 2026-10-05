import { dom, state } from "./core/state.js";
import { initializeTurndown } from "./core/turndown.js";
import { syncRawToRendered, syncRenderedToRaw } from "./core/sync.js";
import {
  formatDoc,
  insertHorizontalRule,
  toggleToolbar,
  setDirection,
  toggleFullscreen,
  toggleInlineCode,
  applyListStyle,
} from "./editor/core-actions.js";
import { initializeDialogs, initializeFindReplace } from "./editor/dialogs.js";
import { initializePasteInterceptors } from "./editor/paste.js";
import { initializeClipboard } from "./editor/clipboard.js";
import { initializeTables } from "./features/tables.js";
import { initializeExport, safeCopyToClipboard } from "./features/export.js";
import { initializeStats } from "./features/stats.js";
import { initializeDrag } from "./features/drag.js";
import { initializeAutosave } from "./features/autosave.js";
import { typeWriter, resetTypewriter } from "./ui/typewriter.js";
import { openWin, closeWin } from "./ui/modals.js";
import {
  applyLanguage,
  translations,
  initializeThirdPartyEmojiPicker,
} from "./ui/language.js";
import { initializeFormatCycle, checkToolbarActive } from "./ui/toolbar.js";
import { initializeLivePreview } from "./editor/live-preview.js";
import "./ui/theme.js";

// =====================================================================
// IMMEDIATE TOP-LEVEL GLOBAL WINDOW BRIDGES
// (Registered at top-level script load to prevent inline onclick ReferenceErrors)
// =====================================================================
let globalStandardTurndown = null;
let globalUpdateCounter = () => {};

const safeBoundFormatDoc = (cmd, value) =>
  formatDoc(
    cmd,
    value,
    () =>
      globalStandardTurndown &&
      syncRenderedToRaw(globalStandardTurndown, globalUpdateCounter),
    checkToolbarActive,
  );

const safeBoundSyncRenderedToRaw = () =>
  globalStandardTurndown &&
  syncRenderedToRaw(globalStandardTurndown, globalUpdateCounter);

window.openWin = openWin;
window.closeWin = closeWin;
window.toggleFullscreen = toggleFullscreen;
window.toggleToolbar = toggleToolbar;
window.resetTypewriter = resetTypewriter;
window.formatDoc = safeBoundFormatDoc;
window.toggleInlineCode = () =>
  toggleInlineCode(safeBoundSyncRenderedToRaw, checkToolbarActive);
window.insertHorizontalRule = () => insertHorizontalRule(safeBoundFormatDoc);
window.setDirection = (dir) =>
  setDirection(dir, safeBoundFormatDoc, safeBoundSyncRenderedToRaw);
window.triggerSync = safeBoundSyncRenderedToRaw;

// =====================================================================
// FAULT-TOLERANT INITIALIZATION LOOP
// =====================================================================
document.addEventListener("DOMContentLoaded", () => {
  let standardTurndown = null;
  let dedicatedExportTurndown = null;
  let notionExportTurndown = null;
  let whatsappExportTurndown = null;
  let telegramExportTurndown = null;
  let discordExportTurndown = null;
  let socialExportTurndown = null;

  try {
    const engines = initializeTurndown();
    standardTurndown = engines.standardTurndown;
    dedicatedExportTurndown = engines.dedicatedExportTurndown;
    notionExportTurndown = engines.notionExportTurndown;
    whatsappExportTurndown = engines.whatsappExportTurndown;
    telegramExportTurndown = engines.telegramExportTurndown;
    discordExportTurndown = engines.discordExportTurndown;
    socialExportTurndown = engines.socialExportTurndown;

    globalStandardTurndown = standardTurndown;
  } catch (err) {
    console.error("[CRITICAL] Failed to initialize Turndown engines:", err);
  }

  try {
    globalUpdateCounter = initializeStats(translations);
  } catch (err) {
    console.error("[WARN] Failed to initialize stats module:", err);
  }

  // Register Real-Time Input Sync Listeners
  try {
    if (dom.rawMarkdownInput) {
      dom.rawMarkdownInput.addEventListener("input", () =>
        syncRawToRendered(globalUpdateCounter),
      );
    }
    if (dom.renderedOutput) {
      dom.renderedOutput.addEventListener("input", safeBoundSyncRenderedToRaw);
    }
  } catch (err) {
    console.error("[WARN] Failed to attach input sync listeners:", err);
  }

  // Isolated Feature Module Initializations
  const modules = [
    { name: "Dialogs", fn: () => initializeDialogs(safeBoundFormatDoc) },
    {
      name: "FindReplace",
      fn: () =>
        initializeFindReplace(safeBoundFormatDoc, safeBoundSyncRenderedToRaw),
    },
    {
      name: "PasteInterceptors",
      fn: () =>
        standardTurndown &&
        initializePasteInterceptors(standardTurndown, globalUpdateCounter),
    },
    { name: "Clipboard", fn: () => initializeClipboard() },
    { name: "Tables", fn: () => initializeTables(safeBoundSyncRenderedToRaw) },
    {
      name: "Export",
      fn: () =>
        initializeExport(
          dedicatedExportTurndown,
          notionExportTurndown,
          whatsappExportTurndown,
          telegramExportTurndown,
          discordExportTurndown,
          socialExportTurndown,
          safeBoundSyncRenderedToRaw,
          globalUpdateCounter,
        ),
    },
    { name: "Drag", fn: () => initializeDrag() },
    {
      name: "Autosave",
      fn: () =>
        initializeAutosave(safeBoundSyncRenderedToRaw, globalUpdateCounter),
    },
    { name: "FormatCycle", fn: () => initializeFormatCycle() },
    { name: "LivePreview", fn: () => initializeLivePreview() },
    { name: "EmojiPicker", fn: () => initializeThirdPartyEmojiPicker() },
  ];

  modules.forEach((mod) => {
    try {
      mod.fn();
    } catch (err) {
      console.error(`[WARN] Failed to initialize module [${mod.name}]:`, err);
    }
  });

  // Register Raw Copy Modal Handler
  try {
    const copyRawBtn = document.getElementById("btn-copy-raw");
    if (copyRawBtn) {
      copyRawBtn.onclick = function () {
        if (dom.rawMarkdownInput) {
          const textToCopy = dom.rawMarkdownInput.value;
          const currentLang = localStorage.getItem("appLang") || "id";

          const feedbackText =
            currentLang === "id" ? "✅ Berhasil Disalin!" : "✅ Copied!";
          const originalText =
            currentLang === "id" ? "Salin Markdown" : "Copy Markdown";

          safeCopyToClipboard(
            textToCopy,
            () => {
              copyRawBtn.innerText = feedbackText;
              setTimeout(() => {
                copyRawBtn.innerText = originalText;
              }, 2000);
            },
            (err) => {
              console.error(
                "Secure copy action failed inside raw-copy module:",
                err,
              );
            },
          );
        }
      };
    }
  } catch (err) {
    console.error("[WARN] Failed to bind raw copy button:", err);
  }

  try {
    typeWriter();
    applyLanguage(globalUpdateCounter);
  } catch (err) {
    console.error("[WARN] Failed to start Typewriter or apply Language:", err);
  }

  try {
    const savedDraft = localStorage.getItem("massivemark_draft_md");
    if (savedDraft && dom.rawMarkdownInput) {
      dom.rawMarkdownInput.value = savedDraft;
      syncRawToRendered(globalUpdateCounter);
    }
  } catch (err) {
    console.error("[WARN] Failed to restore local draft:", err);
  }

  // List Library Dropdown Toggles
  const btnUl = document.getElementById("btn-ul");
  const bulletDropdown = document.getElementById("bullet-dropdown-menu");
  const btnOl = document.getElementById("btn-ol");
  const numberingDropdown = document.getElementById("numbering-dropdown-menu");

  if (btnUl && bulletDropdown) {
    btnUl.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (numberingDropdown) numberingDropdown.classList.remove("active");
      bulletDropdown.classList.toggle("active");
    };
  }

  if (btnOl && numberingDropdown) {
    btnOl.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (bulletDropdown) bulletDropdown.classList.remove("active");
      numberingDropdown.classList.toggle("active");
    };
  }

  // Bind Bullet Choices
  document.querySelectorAll("[data-list-style]").forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      const style = btn.getAttribute("data-list-style");
      bulletDropdown.classList.remove("active");
      applyListStyle("bullet", style, safeBoundSyncRenderedToRaw);
    };
  });

  // Bind Numbering Choices
  document.querySelectorAll("[data-num-style]").forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      const style = btn.getAttribute("data-num-style");
      numberingDropdown.classList.remove("active");
      applyListStyle("number", style, safeBoundSyncRenderedToRaw);
    };
  });
});

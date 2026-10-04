import { dom, state } from "../core/state.js";

// =========================================================================
// MODULE-LEVEL CONSTANTS
// =========================================================================

const SVG_ICON_EXPAND = '<path d="M7 14l5-5 5 5H7z"/>';
const SVG_ICON_COLLAPSE = '<path d="M7 10l5 5 5-5H7z"/>';
const SVG_ICON_FULLSCREEN =
  '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>';
const SVG_ICON_EXIT_FULLSCREEN =
  '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>';

const FONT_NAME_TIMES_NEW_ROMAN = "Times New Roman";

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Executes an editor formatting command with precise selection-only wrapping for Code Blocks.
 *
 * @param {string} cmd - The document.execCommand identifier.
 * @param {string|boolean|null} [value=null] - Optional argument for the command.
 * @param {Function} [syncRenderedToRaw] - Callback to sync visual editor to markdown.
 * @param {Function} [checkToolbarActive] - Callback to update toolbar button active states.
 */
export function formatDoc(
  cmd,
  value = null,
  syncRenderedToRaw,
  checkToolbarActive,
) {
  try {
    const sel = window.getSelection();

    // Custom non-destructive Code Block handling: wraps ONLY selected text
    if (cmd === "formatBlock" && (value === "PRE" || value === "<PRE>")) {
      if (sel.rangeCount > 0 && dom.renderedOutput.contains(sel.anchorNode)) {
        const range = sel.getRangeAt(0);
        const selectedText = sel.toString();

        const preEl = document.createElement("pre");
        preEl.setAttribute("contenteditable", "false");
        preEl.setAttribute("data-language", "");
        const codeEl = document.createElement("code");

        codeEl.textContent = selectedText.trim()
          ? selectedText
          : "// code here";
        preEl.appendChild(codeEl);

        range.deleteContents();
        range.insertNode(preEl);

        range.setStartAfter(preEl);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
      }
    } else {
      let commandValue = value;
      if (cmd === "formatBlock" && value) {
        commandValue = value.startsWith("<") ? value : `<${value}>`;
      }
      document.execCommand(cmd, false, commandValue);
    }

    if (cmd === "createLink" || cmd === "unlink" || cmd === "insertHTML") {
      document.execCommand("fontName", false, FONT_NAME_TIMES_NEW_ROMAN);
    }
  } catch (e) {
    console.warn("execCommand execution failed:", cmd, e);
  }

  if (dom.renderedOutput && document.activeElement !== dom.renderedOutput) {
    dom.renderedOutput.focus();
  }
  if (typeof checkToolbarActive === "function") {
    checkToolbarActive();
  }
  if (typeof syncRenderedToRaw === "function") {
    syncRenderedToRaw();
  }
}

export function insertHorizontalRule(formatDoc) {
  formatDoc("insertHorizontalRule");
}

export function toggleToolbar() {
  const isExpanded = dom.mainToolbar.classList.toggle("expanded");
  dom.iconExpand.innerHTML = isExpanded ? SVG_ICON_EXPAND : SVG_ICON_COLLAPSE;
}

export function setDirection(dir, formatDoc, syncRenderedToRaw) {
  const sel = window.getSelection();

  if (sel.rangeCount > 0) {
    let node = sel.anchorNode;
    if (node && node.nodeType === Node.TEXT_NODE) {
      node = node.parentNode;
    }

    if (node && node.tagName !== "DIV" && node.tagName !== "P") {
      const htmlContent = `<div dir="${dir}">${sel.toString()}</div>`;
      formatDoc("insertHTML", htmlContent);
    } else if (node && typeof node.setAttribute === "function") {
      node.setAttribute("dir", dir);
    }

    if (typeof syncRenderedToRaw === "function") {
      syncRenderedToRaw();
    }
  }
}

export function toggleFullscreen() {
  const isFS = dom.editorContainer.classList.toggle("fullscreen");
  document.body.classList.toggle("is-fullscreen", isFS);
  dom.btnFullscreen.innerHTML = isFS
    ? SVG_ICON_FULLSCREEN
    : SVG_ICON_EXIT_FULLSCREEN;
  document.body.style.overflow = isFS ? "hidden" : "";
}

/**
 * Toggles inline code formatting (<code>...</code>) on the active selection.
 * Handles adding, editing, and unwrapping (removing) inline code cleanly.
 *
 * @param {Function} syncRenderedToRaw - Synchronization callback.
 * @param {Function} checkToolbarActive - Toolbar active state callback.
 */
export function toggleInlineCode(syncRenderedToRaw, checkToolbarActive) {
  const sel = window.getSelection();
  if (!sel.rangeCount || !dom.renderedOutput.contains(sel.anchorNode)) return;

  const range = sel.getRangeAt(0);
  let parentEl =
    sel.anchorNode.nodeType === 3
      ? sel.anchorNode.parentElement
      : sel.anchorNode;
  const existingCode = parentEl.closest("code");

  // UNWRAP (Remove inline code format if already inside a code element)
  if (existingCode && existingCode.parentElement.tagName !== "PRE") {
    const parent = existingCode.parentNode;
    while (existingCode.firstChild) {
      parent.insertBefore(existingCode.firstChild, existingCode);
    }
    parent.removeChild(existingCode);
  } else if (!range.collapsed) {
    // WRAP (Convert selected text into inline <code> tag)
    const codeEl = document.createElement("code");
    codeEl.textContent = sel.toString();
    range.deleteContents();
    range.insertNode(codeEl);

    range.setStartAfter(codeEl);
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
  } else {
    // INSERT placeholder code if nothing is selected
    const codeEl = document.createElement("code");
    codeEl.textContent = "code";
    range.insertNode(codeEl);
    range.selectNodeContents(codeEl);
    sel.removeAllRanges();
    sel.addRange(range);
  }

  if (dom.renderedOutput && document.activeElement !== dom.renderedOutput) {
    dom.renderedOutput.focus();
  }
  if (typeof checkToolbarActive === "function") checkToolbarActive();
  if (typeof syncRenderedToRaw === "function") syncRenderedToRaw();
}

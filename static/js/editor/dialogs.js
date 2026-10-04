import { dom, state } from "../core/state.js";
import { openWin, closeWin } from "../ui/modals.js";

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Initializes all dialog event listeners (Link, Image, Table, and Horizontal Rule dialogs).
 *
 * @param {Function} formatDoc - Core document formatting function.
 */
export function initializeDialogs(formatDoc) {
  const linkTextInput = document.getElementById("link-text-input");
  const linkUrlInput = document.getElementById("link-url-input");
  const imgUrlInput = document.getElementById("img-url-input");
  const tableColsInput = document.getElementById("table-cols");
  const tableRowsInput = document.getElementById("table-rows");

  const restoreSelection = () => {
    if (state.savedSelection) {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(state.savedSelection);
    }
  };

  // Dialog Modal: Insert Link
  const btnLink = document.getElementById("btn-link");
  if (btnLink) {
    btnLink.onclick = () => {
      const sel = window.getSelection();
      if (sel.rangeCount > 0) {
        state.savedSelection = sel.getRangeAt(0).cloneRange();
        if (linkTextInput) linkTextInput.value = sel.toString();
      }
      if (linkUrlInput) linkUrlInput.value = "https://";
      openWin("win-link");
    };
  }

  const btnConfirmLink = document.getElementById("btn-confirm-link");
  if (btnConfirmLink) {
    btnConfirmLink.onclick = () => {
      const text = linkTextInput ? linkTextInput.value : "";
      const url = linkUrlInput ? linkUrlInput.value : "";
      closeWin("win-link");
      if (dom.renderedOutput) dom.renderedOutput.focus();

      restoreSelection();

      if (text) {
        formatDoc("insertHTML", `<a href="${url}">${text}</a>`);
      } else {
        formatDoc("createLink", url);
      }
    };
  }

  // Dialog Modal: Insert Image
  const btnImage = document.getElementById("btn-image");
  if (btnImage) {
    btnImage.onclick = () => {
      const sel = window.getSelection();
      if (sel.rangeCount > 0) {
        state.savedSelection = sel.getRangeAt(0).cloneRange();
      }
      if (imgUrlInput) imgUrlInput.value = "https://";
      openWin("win-image");
    };
  }

  const btnConfirmImage = document.getElementById("btn-confirm-image");
  if (btnConfirmImage) {
    btnConfirmImage.onclick = () => {
      const url = imgUrlInput ? imgUrlInput.value : "";
      closeWin("win-image");
      if (dom.renderedOutput) dom.renderedOutput.focus();

      restoreSelection();
      formatDoc("insertImage", url);
    };
  }

  // Dialog Modal: Insert Table (GFM Compliant with <thead> & <th>)
  const btnConfirmTable = document.getElementById("btn-confirm-table");
  if (btnConfirmTable) {
    btnConfirmTable.onclick = () => {
      let cols = parseInt(tableColsInput ? tableColsInput.value : 3, 10) || 3;
      let rows = parseInt(tableRowsInput ? tableRowsInput.value : 3, 10) || 3;

      cols = Math.max(1, Math.min(20, cols));
      rows = Math.max(1, Math.min(50, rows));

      const headerRow =
        "<thead><tr>" +
        Array.from(
          { length: cols },
          (_, i) =>
            `<th style="padding: 10px; border: 1px solid #555; background-color: rgba(128,128,128,0.12);">Header ${i + 1}</th>`,
        ).join("") +
        "</tr></thead>";

      const bodyRowsCount = Math.max(1, rows - 1);
      const bodyRows =
        "<tbody>" +
        Array.from(
          { length: bodyRowsCount },
          () =>
            "<tr>" +
            Array.from(
              { length: cols },
              () =>
                '<td style="padding: 10px; border: 1px solid #555;"><br></td>',
            ).join("") +
            "</tr>",
        ).join("") +
        "</tbody>";

      const tableHTML = `<br><table border="1" style="border-collapse: collapse; width: 100%; border-color: #555; table-layout: fixed;">${headerRow}${bodyRows}</table><br>`;

      closeWin("win-table");
      formatDoc("insertHTML", tableHTML);
    };
  }

  // Dialog Modal: Insert Math Formula (LaTeX)
  document.querySelectorAll(".math-select-btn").forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      const mathType = btn.getAttribute("data-math-type") || "inline";
      closeWin("win-math");
      if (dom.renderedOutput) dom.renderedOutput.focus();

      restoreSelection();

      const isDisplay = mathType === "display";
      const defaultTex = isDisplay
        ? "f(x) = \\int_{0}^{1} x^2 \\, dx"
        : "E = mc^2";
      const delim = isDisplay ? "$$" : "$";

      // Generate unique temporary id to retrieve the inserted DOM node instantly
      const tempId = `new-math-${Date.now()}`;

      let mathHTML = "";
      if (isDisplay) {
        mathHTML = `<div id="${tempId}" class="math-wrapper display-math-wrapper" contenteditable="false" data-math-display="true">
                    <p class="math-raw-line display-math-raw" contenteditable="true" data-delimiter-left="${delim}" data-delimiter-right="${delim}">${defaultTex}</p>
                    <div class="math-preview-rendered" style="cursor: pointer;">$$ ${defaultTex} $$</div>
                </div><p><br></p>`;
      } else {
        mathHTML = `<span id="${tempId}" class="math-wrapper inline-math-wrapper" contenteditable="false" data-math-display="false">
                    <span class="math-raw-line inline-math-raw" contenteditable="true" data-delimiter-left="${delim}" data-delimiter-right="${delim}">${defaultTex}</span>
                    <span class="math-preview-rendered" style="cursor: pointer;">$${defaultTex}$</span>
                </span>&nbsp;`;
      }

      formatDoc("insertHTML", mathHTML);

      // Re-render the inserted math node and instantly open the floating LaTeX editor
      setTimeout(() => {
        const insertedNode = document.getElementById(tempId);
        if (insertedNode) {
          insertedNode.removeAttribute("id");
          if (
            window.MathJax &&
            typeof window.MathJax.typesetPromise === "function"
          ) {
            window.MathJax.typesetPromise([insertedNode]).then(() => {
              insertedNode.querySelectorAll("mjx-container").forEach((node) => {
                node.setAttribute("contenteditable", "false");
              });
              if (typeof window.openMathPopupForElement === "function") {
                window.openMathPopupForElement(insertedNode);
              }
            });
          } else if (typeof window.openMathPopupForElement === "function") {
            window.openMathPopupForElement(insertedNode);
          }
        }
      }, 50);
    };
  });

  // Register Horizontal Rule Style Selection Handlers inside #win-hr
  document.querySelectorAll(".hr-select-btn").forEach((btn) => {
    btn.onclick = (e) => {
      e.preventDefault();
      const ruleType = btn.getAttribute("data-type") || "---";
      closeWin("win-hr");
      if (dom.renderedOutput) dom.renderedOutput.focus();

      const hrHTML = `<p class="hr-raw-line" contenteditable="true" data-chars="${ruleType}">${ruleType}</p><p><br></p>`;
      formatDoc("insertHTML", hrHTML);
    };
  });
}

/**
 * Initializes the Find and Replace event listeners.
 *
 * @param {Function} formatDoc - Core document formatting function.
 * @param {Function} syncRenderedToRaw - Callback to sync the visual editor to raw markdown.
 */
export function initializeFindReplace(formatDoc, syncRenderedToRaw) {
  const findInput = document.getElementById("find-input");
  const replaceInput = document.getElementById("replace-input");

  const executeFind = () => {
    const text = findInput ? findInput.value : "";
    if (text) {
      if (!window.find(text, false, false, true, false, true, false)) {
        alert("Text not found / reached end.");
      }
    }
  };

  const executeReplace = () => {
    const findText = findInput ? findInput.value : "";
    const replaceText = replaceInput ? replaceInput.value : "";
    const sel = window.getSelection();

    if (sel.toString().toLowerCase() === findText.toLowerCase()) {
      formatDoc("insertText", replaceText);
    } else {
      executeFind();
    }
  };

  const executeReplaceAll = () => {
    const findText = findInput ? findInput.value : "";
    const replaceText = replaceInput ? replaceInput.value : "";
    if (!findText) return;

    const range = document.createRange();
    if (dom.renderedOutput) {
      range.selectNodeContents(dom.renderedOutput);
      range.collapse(true);

      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      let count = 0;
      while (
        window.find(findText, false, false, true, false, true, false) &&
        count < 1000
      ) {
        document.execCommand("insertText", false, replaceText);
        count++;
      }

      alert(`${count} occurrences replaced.`);
      syncRenderedToRaw();
    }
  };

  const btnFindNext = document.getElementById("btn-find-next");
  const btnReplaceBtn = document.getElementById("btn-replace-btn");
  const btnReplaceAll = document.getElementById("btn-replace-all");

  if (btnFindNext) btnFindNext.onclick = executeFind;
  if (btnReplaceBtn) btnReplaceBtn.onclick = executeReplace;
  if (btnReplaceAll) btnReplaceAll.onclick = executeReplaceAll;
}

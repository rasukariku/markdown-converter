import { dom } from "../core/state.js";

let activeMathContainer = null;
let mathPopup = null;
let transformX = 0;
let transformY = 0;

let activeCodeContainer = null;
let codePopup = null;
let codeTransformX = 0;
let codeTransformY = 0;

let justificationDebounceTimer = null;
const JUSTIFICATION_DEBOUNCE_MS = 60;

// =========================================================================
// HELPER FUNCTIONS
// =========================================================================

function copyToClipboardSecure(plainText, htmlContent, feedbackBtn) {
  const btn = feedbackBtn || document.getElementById("math-popup-copy");

  if (navigator.clipboard && window.ClipboardItem && htmlContent) {
    const htmlBlob = new Blob([htmlContent], { type: "text/html" });
    const textBlob = new Blob([plainText], { type: "text/plain" });
    const item = new ClipboardItem({
      "text/html": htmlBlob,
      "text/plain": textBlob,
    });

    navigator.clipboard
      .write([item])
      .then(() => triggerCopySuccess(btn))
      .catch((err) => {
        console.warn("Modern ClipboardItem rejected, using fallback...", err);
        executeFallbackCopy(plainText, btn);
      });
  } else {
    executeFallbackCopy(plainText, btn);
  }
}

function triggerCopySuccess(btn) {
  if (!btn) return;
  const originalText = btn.innerText;
  btn.innerText = "✅ Copied!";
  setTimeout(() => {
    btn.innerText = originalText;
  }, 1500);
}

function executeFallbackCopy(text, feedbackBtn) {
  const btn = feedbackBtn || document.getElementById("math-popup-copy");
  const tempTextarea = document.createElement("textarea");
  tempTextarea.value = text;
  tempTextarea.style.position = "fixed";
  tempTextarea.style.opacity = "0";
  tempTextarea.style.pointerEvents = "none";

  document.body.appendChild(tempTextarea);
  tempTextarea.select();

  try {
    document.execCommand("copy");
    triggerCopySuccess(btn);
  } catch (err) {
    console.error("Fallback copy failed:", err);
  } finally {
    document.body.removeChild(tempTextarea);
  }
}

function makeElementDraggable(popupEl, headerEl, onMoveCallback) {
  let isDragging = false;
  let startX, startY;
  let localX = 0;
  let localY = 0;

  headerEl.addEventListener("mousedown", (e) => {
    if (
      e.target.closest("button") ||
      e.target.closest("select") ||
      e.target.closest("input")
    )
      return;
    isDragging = true;
    startX = e.clientX - localX;
    startY = e.clientY - localY;

    popupEl.style.cursor = "grabbing";
    headerEl.style.cursor = "grabbing";
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    e.preventDefault();

    localX = e.clientX - startX;
    localY = e.clientY - startY;

    popupEl.style.transform = `translate3d(${localX}px, ${localY}px, 0)`;
    if (typeof onMoveCallback === "function") {
      onMoveCallback(localX, localY);
    }
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      popupEl.style.cursor = "";
      headerEl.style.cursor = "";
    }
  });

  return {
    reset: () => {
      localX = 0;
      localY = 0;
      popupEl.style.transform = "translate3d(0, 0, 0)";
    },
  };
}

function positionPopup(targetEl, popupEl) {
  const rect = targetEl.getBoundingClientRect();
  const popupWidth = popupEl.offsetWidth || 420;
  const popupHeight = popupEl.offsetHeight || 220;

  let top = rect.top + window.scrollY - popupHeight - 12;
  if (top < window.scrollY) {
    top = rect.bottom + window.scrollY + 12;
  }

  let left = rect.left + window.scrollX + rect.width / 2 - popupWidth / 2;
  left = Math.max(10, Math.min(left, window.innerWidth - popupWidth - 10));

  popupEl.style.top = `${top}px`;
  popupEl.style.left = `${left}px`;
  popupEl.style.bottom = "auto";
  popupEl.style.right = "auto";
}

// =========================================================================
// DYNAMIC MULTI-LINE PARAGRAPH ALIGNMENT EVALUATION
// =========================================================================

export function evaluateParagraphJustification() {
  if (!dom.renderedOutput) return;

  clearTimeout(justificationDebounceTimer);
  justificationDebounceTimer = setTimeout(() => {
    const paragraphs = dom.renderedOutput.querySelectorAll("p");

    paragraphs.forEach((p) => {
      if (
        p.classList.contains("hr-raw-line") ||
        p.classList.contains("math-raw-line")
      ) {
        p.classList.remove("auto-justified");
        return;
      }

      const text = p.textContent.trim();
      if (!text) {
        p.classList.remove("auto-justified");
        return;
      }

      const computedStyle = window.getComputedStyle(p);
      let lineHeight = parseFloat(computedStyle.lineHeight);
      if (isNaN(lineHeight) || lineHeight <= 0) {
        const fontSize = parseFloat(computedStyle.fontSize) || 15;
        lineHeight = fontSize * 1.7;
      }

      const isMultiLine = p.clientHeight > lineHeight * 1.35;

      if (isMultiLine) {
        p.classList.add("auto-justified");
      } else {
        p.classList.remove("auto-justified");
      }
    });
  }, JUSTIFICATION_DEBOUNCE_MS);
}

// =========================================================================
// MATH POPUP LIFECYCLE
// =========================================================================

let mathDragHandler = null;

function ensureMathPopupExists() {
  if (mathPopup) return;

  mathPopup = document.createElement("div");
  mathPopup.id = "math-floating-popup";
  mathPopup.className = "math-popup-container";
  mathPopup.innerHTML = `
        <div class="math-popup-toolbar" id="math-popup-header">
            <span class="math-popup-title">LaTeX Editor</span>
            <div style="display:flex; gap:6px; align-items:center;">
                <button type="button" class="math-popup-btn" id="math-popup-copy">📋 Copy</button>
                <button type="button" class="math-popup-btn" id="math-popup-delete" style="color: #ff4d4d;">🗑️ Delete</button>
                <button type="button" class="math-popup-btn" id="math-popup-close">✕</button>
            </div>
        </div>
        <textarea id="math-popup-textarea" placeholder="Type LaTeX here..."></textarea>
    `.trim();

  document.body.appendChild(mathPopup);

  const header = document.getElementById("math-popup-header");
  mathDragHandler = makeElementDraggable(mathPopup, header, (x, y) => {
    transformX = x;
    transformY = y;
  });

  const textarea = document.getElementById("math-popup-textarea");
  textarea.addEventListener("input", () => {
    if (!activeMathContainer) return;
    const newLatex = textarea.value.trim();
    const wrapper = activeMathContainer.closest
      ? activeMathContainer.closest(".math-wrapper")
      : null;
    if (wrapper) {
      updateMathElementInPlace(wrapper, newLatex);
    }
  });

  document.getElementById("math-popup-copy").onclick = () => {
    if (!activeMathContainer) return;
    const mmlContainer = activeMathContainer.querySelector("mjx-assistive-mml");
    const latex = textarea.value.trim();
    const isDisplay =
      activeMathContainer.getAttribute("data-math-display") === "true" ||
      (activeMathContainer.closest &&
        activeMathContainer
          .closest(".math-wrapper")
          ?.getAttribute("data-math-display") === "true");
    const formattedPlain = isDisplay ? `$$ ${latex} $$` : `$${latex}$`;

    if (mmlContainer && mmlContainer.firstElementChild) {
      const mmlClone = mmlContainer.firstElementChild.cloneNode(true);
      const attributesToRemove = [
        "class",
        "style",
        "id",
        "data-semantic-type",
        "data-semantic-role",
        "data-semantic-id",
        "data-semantic-parent",
      ];
      mmlClone
        .querySelectorAll("*")
        .forEach((el) =>
          attributesToRemove.forEach((attr) => el.removeAttribute(attr)),
        );
      copyToClipboardSecure(
        formattedPlain,
        mmlClone.outerHTML,
        document.getElementById("math-popup-copy"),
      );
    } else {
      executeFallbackCopy(
        formattedPlain,
        document.getElementById("math-popup-copy"),
      );
    }
  };

  // Dedicated independent delete button for LaTeX formula
  document.getElementById("math-popup-delete").onclick = () => {
    if (!activeMathContainer) return;
    const wrapper = activeMathContainer.closest
      ? activeMathContainer.closest(".math-wrapper")
      : activeMathContainer;
    if (wrapper && wrapper.parentNode) {
      wrapper.parentNode.removeChild(wrapper);
    }
    mathPopup.classList.remove("active");
    activeMathContainer = null;
    if (typeof window.triggerSync === "function") window.triggerSync();
    evaluateParagraphJustification();
  };

  document.getElementById("math-popup-close").onclick = () => {
    mathPopup.classList.remove("active");
    activeMathContainer = null;
  };
}

function updateMathElementInPlace(wrapper, newLatex) {
  const isDisplay = wrapper.getAttribute("data-math-display") === "true";
  const rawLine = wrapper.querySelector(".math-raw-line");
  const previewContainer = wrapper.querySelector(".math-preview-rendered");

  if (!rawLine || !previewContainer) return;
  rawLine.textContent = newLatex;

  const formatted = isDisplay ? `$$ ${newLatex} $$` : `$${newLatex}$`;
  previewContainer.innerHTML = formatted;

  if (window.MathJax && typeof window.MathJax.typesetPromise === "function") {
    window.MathJax.typesetPromise([previewContainer])
      .then(() => {
        previewContainer.querySelectorAll("mjx-container").forEach((node) => {
          node.setAttribute("contenteditable", "false");
        });
        if (typeof window.triggerSync === "function") window.triggerSync();
        evaluateParagraphJustification();
      })
      .catch((err) => {
        console.error("MathJax interactive update error:", err);
      });
  } else {
    if (typeof window.triggerSync === "function") window.triggerSync();
    evaluateParagraphJustification();
  }
}

// =========================================================================
// CODE BLOCK POPUP LIFECYCLE (UNIVERSAL LANGUAGE SUPPORT)
// =========================================================================

let codeDragHandler = null;

function ensureCodePopupExists() {
  if (codePopup) return;

  codePopup = document.createElement("div");
  codePopup.id = "code-floating-popup";
  codePopup.className = "code-popup-container";
  codePopup.innerHTML = `
        <div class="code-popup-toolbar" id="code-popup-header">
            <span class="code-popup-title">Code Editor</span>
            <div style="display:flex; gap:6px; align-items:center;">
                <button type="button" class="code-popup-btn" id="code-popup-copy">📋 Copy</button>
                <button type="button" class="code-popup-btn" id="code-popup-delete" style="color: #ff4d4d;">🗑️ Delete</button>
                <button type="button" class="code-popup-btn" id="code-popup-close">✕</button>
            </div>
        </div>
        <textarea id="code-popup-textarea" spellcheck="false" placeholder="Type code here..."></textarea>
    `.trim();

  document.body.appendChild(codePopup);

  const header = document.getElementById("code-popup-header");
  codeDragHandler = makeElementDraggable(codePopup, header, (x, y) => {
    codeTransformX = x;
    codeTransformY = y;
  });

  const textarea = document.getElementById("code-popup-textarea");

  // Tab key indentation support (inserts 4 spaces)
  textarea.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value =
        textarea.value.substring(0, start) +
        "    " +
        textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 4;
      textarea.dispatchEvent(new Event("input"));
    }
  });

  const updateCodeBlockInPlace = () => {
    if (!activeCodeContainer) return;
    const newCode = textarea.value;

    let codeEl = activeCodeContainer.querySelector("code");
    if (!codeEl) {
      codeEl = document.createElement("code");
      activeCodeContainer.appendChild(codeEl);
    }

    codeEl.textContent = newCode;

    if (typeof window.triggerSync === "function") window.triggerSync();
    evaluateParagraphJustification();
  };

  textarea.addEventListener("input", updateCodeBlockInPlace);

  document.getElementById("code-popup-copy").onclick = () => {
    if (!textarea) return;
    copyToClipboardSecure(
      textarea.value,
      null,
      document.getElementById("code-popup-copy"),
    );
  };

  document.getElementById("code-popup-delete").onclick = () => {
    if (!activeCodeContainer) return;
    if (activeCodeContainer.parentNode) {
      activeCodeContainer.parentNode.removeChild(activeCodeContainer);
    }
    codePopup.classList.remove("active");
    activeCodeContainer = null;
    if (typeof window.triggerSync === "function") window.triggerSync();
    evaluateParagraphJustification();
  };

  document.getElementById("code-popup-close").onclick = () => {
    codePopup.classList.remove("active");
    activeCodeContainer = null;
  };
}

// =========================================================================
// EXPORTED INITIALIZATION FUNCTION
// =========================================================================

export function initializeLivePreview() {
  if (!dom.renderedOutput) return;

  ensureMathPopupExists();
  ensureCodePopupExists();

  evaluateParagraphJustification();

  dom.renderedOutput.addEventListener("click", (e) => {
    // 1. Math block handler
    const mathWrapper = e.target.closest(".math-wrapper");
    if (mathWrapper) {
      e.preventDefault();
      e.stopPropagation();

      if (codePopup) codePopup.classList.remove("active");
      activeCodeContainer = null;

      const mathEl = mathWrapper.querySelector("mjx-container") || mathWrapper;
      activeMathContainer = mathEl;

      const rawLine = mathWrapper.querySelector(".math-raw-line");
      const rawTex = rawLine ? rawLine.textContent.trim() : "";

      const textarea = document.getElementById("math-popup-textarea");
      textarea.value = rawTex;

      if (mathDragHandler) mathDragHandler.reset();
      mathPopup.classList.add("active");
      positionPopup(mathWrapper, mathPopup);
      textarea.focus();
      return;
    }

    // 2. Code block click-to-edit handler
    const preBlock = e.target.closest("pre");
    if (preBlock && dom.renderedOutput.contains(preBlock)) {
      e.preventDefault();
      e.stopPropagation();

      if (mathPopup) mathPopup.classList.remove("active");
      activeMathContainer = null;

      activeCodeContainer = preBlock;
      const codeEl = preBlock.querySelector("code") || preBlock;
      const rawCode = codeEl.textContent;

      const textarea = document.getElementById("code-popup-textarea");
      textarea.value = rawCode;

      if (codeDragHandler) codeDragHandler.reset();
      codePopup.classList.add("active");
      positionPopup(preBlock, codePopup);
      textarea.focus();
      return;
    }

    // 3. Horizontal line focus handler
    const hrRaw = e.target.closest(".hr-raw-line");
    if (hrRaw) {
      e.preventDefault();
      e.stopPropagation();

      dom.renderedOutput
        .querySelectorAll(".hr-raw-line.hr-focused")
        .forEach((el) => {
          if (el !== hrRaw) el.classList.remove("hr-focused");
        });

      hrRaw.classList.add("hr-focused");
      hrRaw.focus();

      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(hrRaw);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
      return;
    }

    // 4. Dismiss active popups on outside click
    if (mathPopup && !e.target.closest("#math-floating-popup")) {
      mathPopup.classList.remove("active");
      activeMathContainer = null;
    }
    if (codePopup && !e.target.closest("#code-floating-popup")) {
      codePopup.classList.remove("active");
      activeCodeContainer = null;
    }
  });

  document.addEventListener("selectionchange", () => {
    const sel = window.getSelection();
    if (sel.rangeCount > 0) {
      let node = sel.anchorNode;
      if (node) {
        if (node.nodeType === 3) node = node.parentNode;
        const currentHr = node.closest ? node.closest(".hr-raw-line") : null;
        dom.renderedOutput
          .querySelectorAll(".hr-raw-line.hr-focused")
          .forEach((el) => {
            if (el !== currentHr) el.classList.remove("hr-focused");
          });
        if (currentHr && dom.renderedOutput.contains(currentHr)) {
          currentHr.classList.add("hr-focused");
        }
      }
    }
  });

  dom.renderedOutput.addEventListener("input", (e) => {
    evaluateParagraphJustification();

    let target = e.target;
    if (target.nodeType === 3) target = target.parentNode;
    while (
      target &&
      target !== dom.renderedOutput &&
      !["P", "DIV"].includes(target.tagName)
    ) {
      target = target.parentNode;
    }
    if (target && target !== dom.renderedOutput) {
      const text = target.textContent.trim();
      if (/^(-{3,}|\*{3,}|_{3,}|={3,})$/.test(text)) {
        target.className = "hr-raw-line";
        target.setAttribute("data-chars", text);
        if (typeof window.triggerSync === "function") window.triggerSync();
      }
    }

    const hrRaw = e.target.closest(".hr-raw-line");
    if (hrRaw) {
      const text = hrRaw.textContent.trim();
      hrRaw.setAttribute("data-chars", text);
      if (typeof window.triggerSync === "function") window.triggerSync();
    }
  });

  window.addEventListener("resize", evaluateParagraphJustification);

  // KEYBOARD CONTROLS: Unlocks Backspace/Delete keys & Restores Enter functionality
  dom.renderedOutput.addEventListener("keydown", (e) => {
    const key = e.key;

    // 1. Allow Backspace & Delete keys to cleanly remove math and code elements
    if (key === "Backspace" || key === "Delete") {
      const sel = window.getSelection();
      if (sel.rangeCount > 0 && sel.getRangeAt(0).collapsed) {
        const range = sel.getRangeAt(0);
        let targetNode = null;

        if (key === "Backspace") {
          targetNode =
            range.startContainer.childNodes[range.startOffset - 1] ||
            (range.startContainer.nodeType === 3 && range.startOffset === 0
              ? range.startContainer.previousSibling
              : null);
        } else {
          targetNode =
            range.startContainer.childNodes[range.startOffset] ||
            (range.startContainer.nodeType === 3 &&
            range.startOffset === range.startContainer.length
              ? range.startContainer.nextSibling
              : null);
        }

        if (
          targetNode &&
          (targetNode.classList?.contains("math-wrapper") ||
            targetNode.tagName === "PRE" ||
            targetNode.closest?.(".math-wrapper") ||
            targetNode.closest?.("pre"))
        ) {
          e.preventDefault();
          const elementToRemove =
            targetNode.closest?.(".math-wrapper") ||
            targetNode.closest?.("pre") ||
            targetNode;

          if (elementToRemove && elementToRemove.parentNode) {
            elementToRemove.parentNode.removeChild(elementToRemove);
            if (mathPopup) mathPopup.classList.remove("active");
            if (codePopup) codePopup.classList.remove("active");
            activeMathContainer = null;
            activeCodeContainer = null;
            if (typeof window.triggerSync === "function") window.triggerSync();
            evaluateParagraphJustification();
            return;
          }
        }
      }
    }

    // 2. Restores Enter key handlers for Horizontal Dividers
    let target = window.getSelection().anchorNode;
    if (!target) return;
    if (target.nodeType === 3) target = target.parentNode;
    while (
      target &&
      target !== dom.renderedOutput &&
      !["P", "DIV"].includes(target.tagName)
    ) {
      target = target.parentNode;
    }
    if (target && target !== dom.renderedOutput) {
      const text = target.textContent.trim();
      if (key === "Enter" && /^(-{3,}|\*{3,}|_{3,}|={3,})$/.test(text)) {
        e.preventDefault();
        target.className = "hr-raw-line";
        target.setAttribute("data-chars", text);
        const newPara = document.createElement("p");
        newPara.innerHTML = "<br>";
        target.parentNode.insertBefore(newPara, target.nextSibling);
        const sel = window.getSelection();
        const range = document.createRange();
        range.setStart(newPara, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        newPara.focus();
        if (typeof window.triggerSync === "function") window.triggerSync();
        evaluateParagraphJustification();
        return;
      }
      if (
        key === "Enter" &&
        (target.classList.contains("hr-raw-line") ||
          target.classList.contains("hr-focused"))
      ) {
        e.preventDefault();
        target.classList.remove("hr-focused");
        const newPara = document.createElement("p");
        newPara.innerHTML = "<br>";
        target.parentNode.insertBefore(newPara, target.nextSibling);
        const sel = window.getSelection();
        const range = document.createRange();
        range.setStart(newPara, 0);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        newPara.focus();
        if (typeof window.triggerSync === "function") window.triggerSync();
        evaluateParagraphJustification();
      }
    }
  });

  dom.renderedOutput.addEventListener("focusout", (e) => {
    const hrRaw = e.target.closest(".hr-raw-line");
    if (hrRaw) {
      setTimeout(() => {
        if (document.activeElement !== hrRaw) {
          if (hrRaw.textContent.trim() === "") hrRaw.remove();
          if (typeof window.triggerSync === "function") window.triggerSync();
          evaluateParagraphJustification();
        }
      }, 150);
    }
  });
}

export function openMathPopupForElement(wrapper) {
  if (!wrapper) return;
  ensureMathPopupExists();

  if (codePopup) codePopup.classList.remove("active");
  activeCodeContainer = null;

  const mathEl = wrapper.querySelector("mjx-container") || wrapper;
  activeMathContainer = mathEl;

  const rawLine = wrapper.querySelector(".math-raw-line");
  const rawTex = rawLine ? rawLine.textContent.trim() : "";

  const textarea = document.getElementById("math-popup-textarea");
  textarea.value = rawTex;

  if (mathDragHandler) mathDragHandler.reset();
  mathPopup.classList.add("active");
  positionPopup(wrapper, mathPopup);
  textarea.focus();
  textarea.select();
}

window.openMathPopupForElement = openMathPopupForElement;

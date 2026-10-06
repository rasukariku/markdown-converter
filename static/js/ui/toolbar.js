import { dom } from "../core/state.js";

const CYCLE_INTERVAL_MS = 2500;
const OPACITY_TRANSITION_DELAY_MS = 300;

const FORMATS_CYCLE = ["WORD", "PDF", "HTML"];

const TOOLBAR_COMMANDS = [
  { id: "btn-bold", cmd: "bold" },
  { id: "btn-italic", cmd: "italic" },
  { id: "btn-underline", cmd: "underline" },
  { id: "btn-strike", cmd: "strikeThrough" },
  { id: "btn-ul", cmd: "insertUnorderedList" },
  { id: "btn-ol", cmd: "insertOrderedList" },
  { id: "btn-align-left", cmd: "justifyLeft" },
  { id: "btn-align-center", cmd: "justifyCenter" },
  { id: "btn-align-right", cmd: "justifyRight" },
  { id: "btn-align-justify", cmd: "justifyFull" },
  { id: "btn-sup", cmd: "superscript" },
  { id: "btn-sub", cmd: "subscript" },
];

export function initializeFormatCycle() {
  let fIdx = 0;
  if (!dom.cycleText) return;

  setInterval(() => {
    fIdx = (fIdx + 1) % FORMATS_CYCLE.length;
    if (dom.cycleText) dom.cycleText.style.opacity = 0;

    setTimeout(() => {
      if (dom.cycleText) {
        dom.cycleText.innerText = FORMATS_CYCLE[fIdx];
        dom.cycleText.style.opacity = 1;
      }
    }, OPACITY_TRANSITION_DELAY_MS);
  }, CYCLE_INTERVAL_MS);
}

/**
 * Updates active visual states for toolbar toggle buttons and synchronization for block select.
 * Uses direct DOM ancestry inspection to accurately detect active Bullet and Numbered lists.
 */
export function checkToolbarActive() {
  TOOLBAR_COMMANDS.forEach(({ id, cmd }) => {
    // List buttons are handled via precise DOM inspection below
    if (id === "btn-ul" || id === "btn-ol") return;

    const element = document.getElementById(id);
    if (element) {
      try {
        const isActive = document.queryCommandState(cmd);
        if (isActive) {
          element.classList.add("active");
        } else {
          element.classList.remove("active");
        }
      } catch (e) {
        // Suppress errors for unsupported queryCommandState commands
      }
    }
  });

  // Real DOM Ancestry Detection for Bullet and Numbered Lists
  try {
    const sel = window.getSelection();
    const btnUl = document.getElementById("btn-ul");
    const btnOl = document.getElementById("btn-ol");

    if (
      sel &&
      sel.rangeCount > 0 &&
      dom.renderedOutput &&
      dom.renderedOutput.contains(sel.anchorNode)
    ) {
      let node = sel.anchorNode;
      if (node.nodeType === 3) node = node.parentNode;

      const hasUl = Boolean(node.closest("ul"));
      const hasOl = Boolean(node.closest("ol"));

      if (btnUl) btnUl.classList.toggle("active", hasUl);
      if (btnOl) btnOl.classList.toggle("active", hasOl);
    } else {
      if (btnUl) btnUl.classList.remove("active");
      if (btnOl) btnOl.classList.remove("active");
    }
  } catch (e) {
    // Suppress inspection errors
  }

  // Synchronize block format select element state
  try {
    const blockFormatValue = document.queryCommandValue("formatBlock");
    const select = document.getElementById("block-format-select");
    if (select && blockFormatValue) {
      const cleanVal = blockFormatValue.replace(/[<>]/g, "").toUpperCase();
      if (
        ["P", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE", "PRE"].includes(
          cleanVal,
        )
      ) {
        select.value = cleanVal;
      }
    }
  } catch (e) {
    // Suppress errors on unselected state
  }
}

/**
 * Intercepts mousedown on toolbar buttons to prevent focus stealing from contenteditable,
 * preserving active DOM text selections while allowing dropdown elements to open.
 */
document.addEventListener("DOMContentLoaded", () => {
  const toolbar = document.getElementById("main-toolbar");
  if (toolbar) {
    toolbar.addEventListener("mousedown", (e) => {
      const button = e.target.closest("button");
      if (button) {
        e.preventDefault();
      }
    });
  }
});

// Single unified registration for contenteditable interaction polling
if (dom.renderedOutput) {
  ["keyup", "mouseup", "click"].forEach((evt) =>
    dom.renderedOutput.addEventListener(evt, checkToolbarActive),
  );
}

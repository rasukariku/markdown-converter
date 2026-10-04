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
 */
export function checkToolbarActive() {
  TOOLBAR_COMMANDS.forEach(({ id, cmd }) => {
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
 * Intercept mousedown on the toolbar to prevent focus stealing from contenteditable,
 * preserving active DOM selections across all browser engines.
 */
document.addEventListener("DOMContentLoaded", () => {
  const toolbar = document.getElementById("main-toolbar");
  if (toolbar) {
    toolbar.addEventListener("mousedown", (e) => {
      const button = e.target.closest("button");
      // Prevent selection collapse on buttons, while allowing select dropdowns to open
      if (button) {
        e.preventDefault();
      }
    });
  }
});

if (dom.renderedOutput) {
  ["keyup", "mouseup", "click"].forEach((evt) =>
    dom.renderedOutput.addEventListener(evt, checkToolbarActive),
  );
}

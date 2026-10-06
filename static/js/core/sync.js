import { dom, state } from "./state.js";

// =========================================================================
// PRE-COMPILED REGULAR EXPRESSIONS & STATE QUEUES
// =========================================================================
const RE_SPECIAL_CHARS = /[\u00A0\u202F\u200B-\u200D\uFEFF]/g;
const RE_CRLF = /\r\n/g;
const RE_CR = /\r/g;
const RE_BULLET_BOLD =
  /^([ \t]*[\*\-\+\u2022]\s*)\*\*([^\*\n]+)\*\*([ \t]*:?)/gm;
const RE_NUMERIC_BOLD =
  /^([ \t]*[0-9]{1,3}[\.\)][ \t]+)\*\*([^\*\n]+)\*\*([ \t]*:?)/gm;
const RE_MATRIX_MATH =
  /(?:\\mathbf|\\boldsymbol)\{\s*\\begin\{([a-zA-Z]*matrix)\}([\s\S]*?)\\end\{\1\}\s*\}/g;

const RE_RIGHT_ARROWS_COMBINED =
  /(?:\\+rightarrow\b|-->|->|==>|=>|→|⇒|&rarr;|&#8594;)(?:[\s\u00A0\u2000-\u200B\u202F\uFEFF]|&nbsp;|<[^>]+>)*(?:\\+rightarrow\b|-->|->|==>|=>|→|⇒|&rarr;|&#8594;)+/gi;
const RE_LEFT_ARROWS_COMBINED =
  /(?:\\+leftarrow\b|<--|<-|<==|<=|←|⇐|&larr;|&#8592;)(?:[\s\u00A0\u2000-\u200B\u202F\uFEFF]|&nbsp;|<[^>]+>)*(?:\\+leftarrow\b|<--|<-|<==|<=|←|⇐|&larr;|&#8592;)+/gi;

const RE_SINGLE_RIGHT_ARROW = /\\+rightarrow\b|-->|->|&rarr;|&#8594;/gi;
const RE_SINGLE_RIGHT_DOUBLE_ARROW = /\\+Rightarrow\b|==>|=>/gi;
const RE_SINGLE_LEFT_ARROW = /\\+leftarrow\b|<--|<-|&larr;|&#8592;/gi;
const RE_SINGLE_LEFT_DOUBLE_ARROW = /\\+Leftarrow\b|<==|<=/gi;

const RE_CURRENCY_AMOUNT = /^\s*\$?\s*\d+(?:\.\d{1,2})?\s*$/;
const RE_UNWRAPPED_LATEX_ENV =
  /(?<!\$\$[\s\S]*?)(?:\\begin\{(cases|array|gather|align|alignat|equation|multline)\}([\s\S]*?)\\end\{\1\})(?![\s\S]*?\$\$)/g;

const RE_HTML_ENTITIES = /&amp;|&lt;|&gt;|&quot;|&#39;/g;
const HTML_ENTITY_MAP = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

const STORAGE_KEY = "massivemark_draft_md";

let mathjaxPromiseQueue = Promise.resolve();
let syncDebounceTimer = null;
const DEBOUNCE_DELAY_MS = 150;

function decodeHtmlEntities(text) {
  return text.replace(RE_HTML_ENTITIES, (match) => HTML_ENTITY_MAP[match]);
}

export function collapseAllArrows(htmlOrText) {
  if (!htmlOrText) return "";

  return htmlOrText
    .replace(RE_RIGHT_ARROWS_COMBINED, "→")
    .replace(RE_LEFT_ARROWS_COMBINED, "←")
    .replace(RE_SINGLE_RIGHT_ARROW, "→")
    .replace(RE_SINGLE_RIGHT_DOUBLE_ARROW, "⇒")
    .replace(RE_SINGLE_LEFT_ARROW, "←")
    .replace(RE_SINGLE_LEFT_DOUBLE_ARROW, "⇐");
}

export function sanitizeLatexSymbolsInText(text) {
  if (!text) return "";

  const codeBlocks = [];
  let protectedText = text.replace(/```[\s\S]*?```|`[^`\n]+`/g, (match) => {
    const placeholder = `@@@CODE_BLOCK_${codeBlocks.length}@@@`;
    codeBlocks.push({ placeholder, match });
    return placeholder;
  });

  const mathBlocks = [];
  protectedText = protectedText.replace(
    /\$\$[\s\S]*?\$\$|\$[^\$\n]+\$/g,
    (match) => {
      const placeholder = `@@@MATH_PRESERVE_${mathBlocks.length}@@@`;
      mathBlocks.push({ placeholder, match });
      return placeholder;
    },
  );

  protectedText = protectedText
    .replace(
      /\\+(?:text|mathrm|mbox|mathit|mathsf|mathtt)\s*\{([^}]+)\}/gi,
      "$1",
    )
    .replace(/\\+mathbf\s*\{([^}]+)\}/gi, "$1")
    .replace(/\\+frac\s*\{([^}]+)\}\s*\{([^}]+)\}/gi, "$1/$2")
    .replace(/\\+sqrt\s*\{([^}]+)\}/gi, "√$1");

  protectedText = collapseAllArrows(protectedText);

  protectedText = protectedText
    .replace(/\\+leftrightarrow\b/gi, "↔")
    .replace(/\\+Leftrightarrow\b/gi, "⇔")
    .replace(/\\+(?:le|leq)\b/gi, "≤")
    .replace(/\\+(?:ge|geq)\b/gi, "≥")
    .replace(/\\+(?:ne|neq)\b/gi, "≠")
    .replace(/\\+times\b/gi, "×")
    .replace(/\\+div\b/gi, "÷")
    .replace(/\\+approx\b/gi, "≈")
    .replace(/\\+pm\b/gi, "±")
    .replace(/\\+mp\b/gi, "∓")
    .replace(/\\+cdot\b/gi, "·")
    .replace(/\\+degree\b|\\+\^\s*\\circ\b/gi, "°")
    .replace(/\\+alpha\b/gi, "α")
    .replace(/\\+beta\b/gi, "β")
    .replace(/\\+gamma\b/gi, "γ")
    .replace(/\\+delta\b/gi, "δ")
    .replace(/\\+theta\b/gi, "θ")
    .replace(/\\+lambda\b/gi, "λ")
    .replace(/\\+mu\b/gi, "μ")
    .replace(/\\+pi\b/gi, "π")
    .replace(/\\+sigma\b/gi, "σ")
    .replace(/\\+omega\b/gi, "ω")
    .replace(/\\+Delta\b/gi, "Δ")
    .replace(/\\+Omega\b/gi, "Ω")
    .replace(/\\+in\b/gi, "∈")
    .replace(/\\+notin\b/gi, "∉")
    .replace(/\\+subset\b/gi, "⊂")
    .replace(/\\+subseteq\b/gi, "⊆")
    .replace(/\\+cap\b/gi, "∩")
    .replace(/\\+cup\b/gi, "∪")
    .replace(/\\+forall\b/gi, "∀")
    .replace(/\\+exists\b/gi, "∃")
    .replace(/\\+infty\b/gi, "∞")
    .replace(/\\+%/g, "%")
    .replace(/\\+\$([^\$])/g, "$$1")
    .replace(/\\+&/g, "&")
    .replace(/\\+_/g, "_")
    .replace(/\\+#/g, "#");

  mathBlocks.forEach(({ placeholder, match }) => {
    protectedText = protectedText.replace(placeholder, match);
  });

  codeBlocks.forEach(({ placeholder, match }) => {
    protectedText = protectedText.replace(placeholder, match);
  });

  return protectedText;
}

function createInteractiveMathWrapper(mathContent, isDisplay) {
  const cleanContent = mathContent.trim();
  const wrapperClass = isDisplay
    ? "math-wrapper display-math-wrapper"
    : "math-wrapper inline-math-wrapper";
  const displayClass = isDisplay ? "display-math-raw" : "inline-math-raw";
  const displayAttr = isDisplay ? "true" : "false";
  const delim = isDisplay ? "$$" : "$";

  const previewLaTeX = isDisplay
    ? `$$ ${cleanContent} $$`
    : `$${cleanContent}$`;

  const encodedContent = encodeURIComponent(cleanContent);

  if (isDisplay) {
    return `
            <div class="${wrapperClass}" contenteditable="false" data-math-display="${displayAttr}" data-raw-latex="${encodedContent}">
                <p class="math-raw-line ${displayClass} tex2jax_ignore" contenteditable="true" data-delimiter-left="${delim}" data-delimiter-right="${delim}">${cleanContent}</p>
                <div class="math-preview-rendered" style="cursor: pointer;">${previewLaTeX}</div>
            </div>
        `.trim();
  } else {
    return `
            <span class="${wrapperClass}" contenteditable="false" data-math-display="${displayAttr}" data-raw-latex="${encodedContent}">
                <span class="math-raw-line ${displayClass} tex2jax_ignore" contenteditable="true" data-delimiter-left="${delim}" data-delimiter-right="${delim}">${cleanContent}</span>
                <span class="math-preview-rendered" style="cursor: pointer;">$${cleanContent}$</span>
            </span>
        `.trim();
  }
}

export function parseMarkdownWithMath(text) {
  if (!text) return "";

  if (typeof marked === "undefined") {
    console.error("[CRITICAL] Marked parser is unavailable.");
    return text;
  }

  const mathBlocks = [];

  let processedText = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, math) => {
    const placeholder = `@@@MATH_DISPLAY_${mathBlocks.length}@@@`;
    const wrapper = createInteractiveMathWrapper(math, true);
    mathBlocks.push({ placeholder, wrapper });
    return placeholder;
  });

  processedText = processedText.replace(/\$([^\$\n]+?)\$/g, (match, math) => {
    if (RE_CURRENCY_AMOUNT.test(math)) {
      return match;
    }
    const placeholder = `@@@MATH_INLINE_${mathBlocks.length}@@@`;
    const wrapper = createInteractiveMathWrapper(math, false);
    mathBlocks.push({ placeholder, wrapper });
    return placeholder;
  });

  processedText = processedText.replace(
    /^(?:[ \t]*)(-{3,}|={3,}|\*{3,}|_{3,})(?:[ \t]*)$/gm,
    (match, chars) => {
      const cleanChars = chars.trim();
      return `<p class="hr-raw-line" contenteditable="true" data-chars="${cleanChars}">${cleanChars}</p>`;
    },
  );

  let parsedHTML = marked.parse(processedText);

  mathBlocks.forEach(({ placeholder, wrapper }) => {
    const pWrappedPlaceholder = `<p>${placeholder}</p>`;
    if (parsedHTML.includes(pWrappedPlaceholder)) {
      parsedHTML = parsedHTML.split(pWrappedPlaceholder).join(wrapper);
    } else {
      parsedHTML = parsedHTML.split(placeholder).join(wrapper);
    }
  });

  parsedHTML = parsedHTML.replace(
    /<hr\s*\/?>/gi,
    `<p class="hr-raw-line" contenteditable="true" data-chars="---">---</p>`,
  );

  return collapseAllArrows(parsedHTML);
}

export function sanitizeAIText(plainData) {
  if (!plainData) return "";

  plainData = plainData.replace(RE_CRLF, "\n").replace(RE_CR, "\n");
  plainData = plainData.replace(RE_SPECIAL_CHARS, " ");

  plainData = plainData.replace(RE_UNWRAPPED_LATEX_ENV, "\n\n$$\n$& \n$$\n\n");

  plainData = plainData.replace(RE_BULLET_BOLD, "$1**$2**$3");
  plainData = plainData.replace(RE_NUMERIC_BOLD, "$1**$2**$3");

  plainData = plainData.replace(
    /\\\(([\s\S]*?)\\\)/g,
    (m, math) => `$${math.trim()}$`,
  );
  plainData = plainData.replace(
    /\\\[([\s\S]*?)\\\]/g,
    (m, math) => `$$\n${math.trim()}\n$$`,
  );

  plainData = sanitizeLatexSymbolsInText(plainData);

  return plainData.replace(/\n{3,}/g, "\n\n");
}

export function syncRawToRendered(updateCounter) {
  if (state.isSyncing) return;

  clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    state.isSyncing = true;

    try {
      const rawText = dom.rawMarkdownInput ? dom.rawMarkdownInput.value : "";
      if (!rawText.trim()) {
        if (dom.renderedOutput) dom.renderedOutput.innerHTML = "";
        updateCounter();
        return;
      }

      const processedText = rawText.replace(
        RE_MATRIX_MATH,
        (match, matrixType, content) => {
          const formattedContent = content
            .split("\\\\")
            .map((row) =>
              row
                .split("&")
                .map((cell) =>
                  cell.trim() === "" ? cell : `\\mathbf{${cell.trim()}}`,
                )
                .join(" & "),
            )
            .join(" \\\\\n");

          return `\\begin{${matrixType}}\n${formattedContent}\n\\end{${matrixType}}`;
        },
      );

      const sanitizedText = sanitizeLatexSymbolsInText(processedText);
      const parsedHTML = parseMarkdownWithMath(sanitizedText);
      if (dom.renderedOutput) dom.renderedOutput.innerHTML = parsedHTML;

      // Configure code blocks as contenteditable="false" to prevent DOM corruption
      if (dom.renderedOutput) {
        dom.renderedOutput.querySelectorAll("pre").forEach((pre) => {
          pre.setAttribute("contenteditable", "false");
          const code = pre.querySelector("code");
          const langMatch =
            code && code.className
              ? code.className.match(/language-([a-zA-Z0-9_-]+)/)
              : null;
          const lang = langMatch ? langMatch[1] : "";
          pre.setAttribute("data-language", lang || "code");
        });
      }

      if (
        window.MathJax &&
        typeof window.MathJax.typesetPromise === "function"
      ) {
        mathjaxPromiseQueue = mathjaxPromiseQueue
          .then(() => window.MathJax.typesetPromise([dom.renderedOutput]))
          .then(() => {
            if (dom.renderedOutput) {
              dom.renderedOutput
                .querySelectorAll("mjx-container")
                .forEach((node) => {
                  node.setAttribute("contenteditable", "false");
                });
            }
            updateCounter();
            try {
              localStorage.setItem(STORAGE_KEY, rawText);
            } catch (quotaErr) {
              console.warn(
                "[WARN] LocalStorage quota exceeded. Draft storage skipped.",
                quotaErr,
              );
            }
          })
          .catch((err) => {
            console.error("MathJax queued typeset error:", err);
          });
      } else {
        updateCounter();
        try {
          localStorage.setItem(STORAGE_KEY, rawText);
        } catch (quotaErr) {
          console.warn(
            "[WARN] LocalStorage quota exceeded. Draft storage skipped.",
            quotaErr,
          );
        }
      }
    } catch (err) {
      console.error("[CRITICAL] Error inside syncRawToRendered:", err);
    } finally {
      state.isSyncing = false;
    }
  }, DEBOUNCE_DELAY_MS);
}

export function syncRenderedToRaw(standardTurndown, updateCounter) {
  if (state.isSyncing || !dom.renderedOutput) return;

  clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    state.isSyncing = true;

    try {
      const clone = dom.renderedOutput.cloneNode(true);

      clone.querySelectorAll(".math-wrapper").forEach((wrapper) => {
        let rawText = "";
        const rawAttr = wrapper.getAttribute("data-raw-latex");
        if (rawAttr) {
          try {
            rawText = decodeURIComponent(rawAttr).trim();
          } catch (e) {
            rawText = "";
          }
        }
        if (!rawText) {
          const rawEl = wrapper.querySelector(".math-raw-line");
          rawText = rawEl ? rawEl.textContent.trim() : "";
        }

        const isDisplay = wrapper.getAttribute("data-math-display") === "true";
        const formattedLaTeX = isDisplay
          ? `\n\n$$ ${rawText} $$\n\n`
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

      if (standardTurndown) {
        let md = standardTurndown.turndown(clone.innerHTML);
        md = md.replace(/\n{3,}/g, "\n\n");
        md = md.replace(/(?:\n\n---\n\n){2,}/g, "\n\n---\n\n");
        md = collapseAllArrows(md);

        if (dom.rawMarkdownInput) dom.rawMarkdownInput.value = md;
        updateCounter();

        try {
          localStorage.setItem(STORAGE_KEY, md);
        } catch (quotaErr) {
          console.warn(
            "[WARN] LocalStorage quota exceeded. Draft storage skipped.",
            quotaErr,
          );
        }
      }
    } catch (err) {
      console.error("[CRITICAL] Error inside syncRenderedToRaw:", err);
    } finally {
      state.isSyncing = false;
    }
  }, DEBOUNCE_DELAY_MS);
}

import { dom } from '../core/state.js';
import { openWin, closeWin } from '../ui/modals.js';
import { parseMarkdownWithMath, sanitizeAIText } from '../core/sync.js';

// =========================================================================
// MODULE-LEVEL CONSTANTS & HELPERS
// =========================================================================

// Dictionary to decode MathJax HTML entities back to raw LaTeX syntax
const RE_HTML_ENTITIES = /&amp;|&lt;|&gt;|&quot;|&#39;/g;
const HTML_ENTITY_MAP = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'"
};

/**
 * Decodes raw MathJax HTML entities back to their original character representations.
 * 
 * @param {string} text - The encrypted HTML text.
 * @returns {string} The clean, decoded text.
 */
function decodeHtmlEntities(text) {
    return text.replace(RE_HTML_ENTITIES, (match) => HTML_ENTITY_MAP[match]);
}

/**
 * Copies plain text to the clipboard with fallback for non-secure HTTP LAN environments.
 * 
 * @param {string} text - The raw text to write to the clipboard.
 * @param {Function} successCallback - Fired upon successful clipboard write.
 * @param {Function} failureCallback - Fired when the operation fails.
 */
export function safeCopyToClipboard(text, successCallback, failureCallback) {
    if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text)
            .then(successCallback)
            .catch(err => {
                console.warn("Secure API failed, executing legacy copy fallback...", err);
                fallbackCopyToClipboard(text, successCallback, failureCallback);
            });
    } else {
        fallbackCopyToClipboard(text, successCallback, failureCallback);
    }
}

function fallbackCopyToClipboard(text, successCallback, failureCallback) {
    const tempTextarea = document.createElement('textarea');
    tempTextarea.value = text;
    
    tempTextarea.style.position = 'fixed';
    tempTextarea.style.top = '0';
    tempTextarea.style.left = '0';
    tempTextarea.style.width = '2em';
    tempTextarea.style.height = '2em';
    tempTextarea.style.padding = '0';
    tempTextarea.style.border = 'none';
    tempTextarea.style.outline = 'none';
    tempTextarea.style.boxShadow = 'none';
    tempTextarea.style.background = 'transparent';
    
    document.body.appendChild(tempTextarea);
    tempTextarea.focus();
    tempTextarea.select();
    
    try {
        const successful = document.execCommand('copy');
        if (successful) {
            if (typeof successCallback === 'function') successCallback();
        } else {
            if (typeof failureCallback === 'function') failureCallback();
        }
    } catch (err) {
        console.error('Legacy fallback copy failed:', err);
        if (typeof failureCallback === 'function') failureCallback(err);
    } finally {
        document.body.removeChild(tempTextarea);
    }
}

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Initializes the universal export system, formatting modals, and dynamic dropdown options on the toolbar.
 * 
 * @param {object} dedicatedExportTurndown - Turndown instance configured for standard markdown export.
 * @param {object} notionExportTurndown - Turndown instance configured for Notion-compatible export.
 * @param {Function} boundSyncRenderedToRaw - Callback to sync the visual editor contents back to raw markdown.
 * @param {Function} updateCounter - Callback to recalculate document metrics and statistics.
 */
export function initializeExport(dedicatedExportTurndown, notionExportTurndown, boundSyncRenderedToRaw, updateCounter) {
    
    const btnOpenRaw = document.getElementById('btn-open-raw');
    const dropdownMenu = document.getElementById('markdown-dropdown-menu');
    const menuExportStd = document.getElementById('menu-export-std');
    const menuExportNotion = document.getElementById('menu-export-notion');
    const btnCopyUniversal = document.getElementById('btn-copy-universal');
    const btnApplyUniversal = document.getElementById('btn-apply-universal');
    const tUni = document.getElementById('t-uni');

    const btnClearAll = document.getElementById('btn-clear-all');
    const btnExecuteClear = document.getElementById('btn-execute-clear');
    const btnUploadDoc = document.getElementById('btn-upload-doc');
    const fileUploadInput = document.getElementById('file-upload-input');

    /**
     * Synchronizes raw Markdown content from the Universal Modal directly into the visual WYSIWYG editor.
     */
    function applyUniversalToEditor() {
        if (!dom.universalMarkdownInput || !dom.renderedOutput) return;
        const rawText = dom.universalMarkdownInput.value;
        const processedText = sanitizeAIText(rawText);
        const parsedHTML = parseMarkdownWithMath(processedText);
        
        dom.renderedOutput.innerHTML = parsedHTML;
        
        if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
            window.MathJax.typesetPromise([dom.renderedOutput]).then(() => {
                dom.renderedOutput.querySelectorAll('mjx-container').forEach(node => {
                    node.setAttribute('contenteditable', 'false');
                });
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
            closeWin('win-uni');
        };
    }

    if (btnClearAll) {
        btnClearAll.onclick = (e) => {
            e.preventDefault();
            openWin('win-confirm-clear');
        };
    }

    if (btnExecuteClear) {
        btnExecuteClear.onclick = (e) => {
            e.preventDefault();
            dom.renderedOutput.innerHTML = '';
            if (dom.rawMarkdownInput) dom.rawMarkdownInput.value = '';
            if (dom.universalMarkdownInput) dom.universalMarkdownInput.value = '';
            localStorage.removeItem('massivemark_draft_md');
            updateCounter();
            boundSyncRenderedToRaw();
            closeWin('win-confirm-clear');
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
            formData.append('file', file);

            btnUploadDoc.style.opacity = '0.5';

            try {
                const response = await fetch('/upload_parse', {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                btnUploadDoc.style.opacity = '1';
                fileUploadInput.value = '';

                if (result.status === 'success') {
                    const sanitizedMarkdown = sanitizeAIText(result.markdown);
                    
                    openWin('win-uni');
                    if (tUni) tUni.innerText = `Uploaded File: ${file.name}`;
                    dom.universalMarkdownInput.value = sanitizedMarkdown;
                    
                    applyUniversalToEditor();
                    dom.universalMarkdownInput.focus();
                } else {
                    alert(`Upload Error: ${result.message}`);
                }
            } catch (err) {
                btnUploadDoc.style.opacity = '1';
                fileUploadInput.value = '';
                console.error("Document upload request failed:", err);
                alert("Failed to upload and convert the document.");
            }
        };
    }

    if (btnOpenRaw) {
        btnOpenRaw.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dropdownMenu) dropdownMenu.classList.toggle('active');
        };
    }

    window.addEventListener('click', (e) => {
        if (dropdownMenu && !e.target.closest('.toolbar-dropdown')) {
            dropdownMenu.classList.remove('active');
        }
    });

    /**
     * Renders universal export output in standard or Notion format.
     * 
     * @param {string} mode - 'standard' or 'notion'
     */
    function renderUniversalExport(mode) {
        const clone = dom.renderedOutput.cloneNode(true);
        
        clone.querySelectorAll('.math-wrapper').forEach(wrapper => {
            const rawEl = wrapper.querySelector('.math-raw-line');
            const rawText = rawEl ? rawEl.textContent.trim() : '';
            const isDisplay = wrapper.getAttribute('data-math-display') === 'true';
            
            let formattedLaTeX = '';
            if (mode === 'notion') {
                formattedLaTeX = isDisplay ? `\n\n$$\n${rawText}\n$$\n\n` : `$$${rawText}$$`;
            } else {
                formattedLaTeX = isDisplay ? `\n\n$$\n${rawText}\n$$\n\n` : `$${rawText}$`;
            }
            
            if (wrapper.parentNode) {
                wrapper.parentNode.replaceChild(document.createTextNode(formattedLaTeX), wrapper);
            }
        });

        clone.querySelectorAll('.hr-raw-line').forEach(rawLine => {
            const rawText = rawLine.getAttribute('data-chars') || rawLine.innerText.trim() || '---';
            if (rawLine.parentNode) {
                rawLine.parentNode.replaceChild(document.createTextNode('\n\n' + rawText + '\n\n'), rawLine);
            }
        });

        let md = '';
        if (mode === 'notion') {
            md = notionExportTurndown.turndown(clone.innerHTML);
            if (tUni) tUni.innerText = "Export Notion-Compatible Markdown";
        } else {
            md = dedicatedExportTurndown.turndown(clone.innerHTML);
            if (tUni) tUni.innerText = "Export Standard Markdown (LaTeX)";
        }
        
        md = md.replace(/\n{3,}/g, '\n\n');
        
        // RESTORED: Deduplicates consecutive horizontal rule blocks during export
        md = md.replace(/(?:\n\n---\n\n){2,}/g, '\n\n---\n\n');
        
        dom.universalMarkdownInput.value = md;
    }

    if (menuExportStd) {
        menuExportStd.onclick = (e) => {
            e.preventDefault();
            if (dropdownMenu) dropdownMenu.classList.remove('active');
            openWin('win-uni');
            renderUniversalExport('standard');
            if (dom.universalMarkdownInput) dom.universalMarkdownInput.focus();
        };
    }

    if (menuExportNotion) {
        menuExportNotion.onclick = (e) => {
            e.preventDefault();
            if (dropdownMenu) dropdownMenu.classList.remove('active');
            openWin('win-uni');
            renderUniversalExport('notion');
            if (dom.universalMarkdownInput) dom.universalMarkdownInput.focus();
        };
    }

    if (dom.universalMarkdownInput) {
        dom.universalMarkdownInput.addEventListener('input', function() {
            applyUniversalToEditor();
        });
    }

    if (btnCopyUniversal) {
        btnCopyUniversal.onclick = function() {
            if (dom.universalMarkdownInput) {
                const textToCopy = dom.universalMarkdownInput.value;
                const currentLang = localStorage.getItem('appLang') || 'id';
                
                const feedbackText = currentLang === 'id' ? '✅ Berhasil Disalin!' : '✅ Copied!';
                const originalText = currentLang === 'id' ? 'Salin Ekspor' : 'Copy Export';
                
                safeCopyToClipboard(textToCopy, () => {
                    btnCopyUniversal.innerText = feedbackText;
                    setTimeout(() => {
                        btnCopyUniversal.innerText = originalText;
                    }, 2000);
                }, (err) => {
                    console.error("Secure copy action failed:", err);
                });
            }
        };
    }

    if (dom.convertForm) {
        dom.convertForm.addEventListener('submit', function(e) {
            const clone = dom.renderedOutput.cloneNode(true);
            
            // 1. Sanitize interactive math containers before standard Docx/PDF backend conversions
            clone.querySelectorAll('.math-wrapper').forEach(wrapper => {
                const rawEl = wrapper.querySelector('.math-raw-line');
                const rawText = rawEl ? rawEl.textContent.trim() : '';
                const isDisplay = wrapper.getAttribute('data-math-display') === 'true';
                const formattedLaTeX = isDisplay ? `\n\n$$\n${rawText}\n$$\n\n` : `$${rawText}$`;
                
                if (wrapper.parentNode) {
                    wrapper.parentNode.replaceChild(document.createTextNode(formattedLaTeX), wrapper);
                }
            });

            // 2. Sanitize interactive Horizontal Rules
            clone.querySelectorAll('.hr-raw-line').forEach(rawLine => {
                const rawText = rawLine.getAttribute('data-chars') || rawLine.innerText.trim() || '---';
                if (rawLine.parentNode) {
                    rawLine.parentNode.replaceChild(document.createTextNode('\n\n' + rawText + '\n\n'), rawLine);
                }
            });

            // 3. RESTORED: Standalone MathJax container fallback extraction loop for form submit payload
            clone.querySelectorAll('mjx-container').forEach(node => {
                const rawTex = node.getAttribute('data-raw-tex');
                const isDisplay = node.getAttribute('data-math-display') === 'true';
                
                if (rawTex && node.parentNode) {
                    const cleanTex = decodeHtmlEntities(rawTex);
                    const mathText = isDisplay ? `\n\n$$${cleanTex}$$\n\n` : `$${cleanTex}$`;
                    node.parentNode.replaceChild(document.createTextNode(mathText), node);
                }
            });
            
            dom.hiddenFormInput.value = dedicatedExportTurndown.turndown(clone.innerHTML);
            dom.fabMenu.classList.remove('active');
        });
    }
}
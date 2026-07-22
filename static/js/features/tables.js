import { dom } from '../core/state.js';

// =========================================================================
// MODULE-LEVEL CONSTANTS
// =========================================================================

// Extract magic numbers to improve maintainability and clarify UI constraints
const MENU_OFFSET_Y_PX = 45;
const COPY_FLASH_DURATION_MS = 300;
const COPY_FEEDBACK_DURATION_MS = 1500;

// Extract UI strings and styles to prevent inline clutter
const COPY_FEEDBACK_TEXT = '✅ Copied!';
const EMPTY_CELL_HTML = '<br>';
const TABLE_BORDER_STYLE = '1px solid #000';
const TABLE_CELL_PADDING = '8px';

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Initializes the dynamic table manipulation system, including 
 * the floating context menu and row/column operations.
 * 
 * @param {Function} syncRenderedToRaw - Callback to sync the visual editor to raw markdown.
 */
export function initializeTables(syncRenderedToRaw) {
    let activeTableCell = null;
    let activeTableElement = null;

    // Cache DOM references to eliminate redundant queries during event execution
    const btnDelTable = document.getElementById('btn-del-table');
    const btnCopyTable = document.getElementById('btn-copy-table');
    const btnAddRow = document.getElementById('btn-add-row');
    const btnDelRow = document.getElementById('btn-del-row');
    const btnAddCol = document.getElementById('btn-add-col');
    const btnDelCol = document.getElementById('btn-del-col');

    dom.renderedOutput.addEventListener('click', (e) => {
        const td = e.target.closest('td, th');
        
        if (td && dom.renderedOutput.contains(td)) {
            activeTableCell = td;
            activeTableElement = td.closest('table');
            const rect = activeTableElement.getBoundingClientRect();
            
            dom.tableFloatMenu.style.display = 'flex';
            dom.tableFloatMenu.style.top = `${rect.top - MENU_OFFSET_Y_PX}px`;
            dom.tableFloatMenu.style.left = `${rect.left}px`;
        } else if (!e.target.closest('#table-float-menu')) {
            dom.tableFloatMenu.style.display = 'none';
            activeTableCell = null;
            activeTableElement = null;
        }
    });

    window.addEventListener('scroll', () => {
        dom.tableFloatMenu.style.display = 'none';
    });

    btnDelTable.onclick = () => {
        if (activeTableElement) {
            activeTableElement.remove();
            dom.tableFloatMenu.style.display = 'none';
            syncRenderedToRaw();
        }
    };

    btnCopyTable.onclick = async () => {
        if (!activeTableElement) return;
        
        const tableClone = activeTableElement.cloneNode(true);
        tableClone.removeAttribute('style');
        tableClone.setAttribute('border', '1');
        tableClone.style.borderCollapse = 'collapse';
        
        tableClone.querySelectorAll('td, th').forEach((c) => {
            c.removeAttribute('style');
            c.style.border = TABLE_BORDER_STYLE;
            c.style.padding = TABLE_CELL_PADDING;
            c.style.textAlign = 'left';
        });

        // FIXED: Execute fallback copy operation if the document is running in an unsecure context (HTTP LAN)
        if (navigator.clipboard && window.isSecureContext && window.ClipboardItem) {
            try {
                const htmlBlob = new Blob([tableClone.outerHTML], { type: 'text/html' });
                const textBlob = new Blob([activeTableElement.innerText], { type: 'text/plain' });
                
                await navigator.clipboard.write([
                    new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })
                ]);

                triggerCopySuccess();
            } catch (err) {
                console.warn('Modern ClipboardItem failed, forcing legacy execution...', err);
                fallbackCopyTable();
            }
        } else {
            fallbackCopyTable();
        }

        function triggerCopySuccess() {
            activeTableElement.classList.add('copy-flash');
            setTimeout(() => activeTableElement.classList.remove('copy-flash'), COPY_FLASH_DURATION_MS);

            const originalText = btnCopyTable.innerHTML;
            btnCopyTable.innerHTML = COPY_FEEDBACK_TEXT;
            setTimeout(() => { btnCopyTable.innerHTML = originalText; }, COPY_FEEDBACK_DURATION_MS);
        }

        function fallbackCopyTable() {
            // Selects the structural nodes to perform document level selection copies
            const range = document.createRange();
            range.selectNode(activeTableElement);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            
            try {
                const successful = document.execCommand('copy');
                if (successful) {
                    triggerCopySuccess();
                } else {
                    alert('Failed to copy table!');
                }
            } catch (err) {
                console.error('Fallback table copy operation rejected:', err);
                alert('Failed to copy table!');
            } finally {
                sel.removeAllRanges();
            }
        }
    };

    btnAddRow.onclick = () => {
        if (!activeTableCell) return;
        const tr = activeTableCell.closest('tr');
        const newRow = tr.cloneNode(true);
        newRow.querySelectorAll('td, th').forEach((c) => c.innerHTML = EMPTY_CELL_HTML);
        tr.parentNode.insertBefore(newRow, tr.nextSibling);
        syncRenderedToRaw();
    };

    btnDelRow.onclick = () => {
        if (!activeTableCell) return;
        activeTableCell.closest('tr').remove();
        dom.tableFloatMenu.style.display = 'none';
        syncRenderedToRaw();
    };

    btnAddCol.onclick = () => {
        if (!activeTableElement || !activeTableCell) return;
        
        const index = Array.prototype.indexOf.call(activeTableCell.parentNode.children, activeTableCell);
        
        activeTableElement.querySelectorAll('tr').forEach((tr) => {
            const cell = tr.children[index];
            if (cell) {
                const newCell = cell.cloneNode(false);
                newCell.innerHTML = EMPTY_CELL_HTML;
                tr.insertBefore(newCell, cell.nextSibling);
            }
        });
        syncRenderedToRaw();
    };

    btnDelCol.onclick = () => {
        if (!activeTableElement || !activeTableCell) return;
        
        const index = Array.prototype.indexOf.call(activeTableCell.parentNode.children, activeTableCell);
        
        activeTableElement.querySelectorAll('tr').forEach((tr) => {
            if (tr.children[index]) {
                tr.children[index].remove();
            }
        });
        dom.tableFloatMenu.style.display = 'none';
        syncRenderedToRaw();
    };
}
import { dom, state } from '../core/state.js';
import { openWin, closeWin } from '../ui/modals.js';

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Menginisialisasi semua event listener dialog (Tautan, Gambar, Tabel).
 * 
 * @param {Function} formatDoc - Fungsi pemformatan dokumen core utama.
 */
export function initializeDialogs(formatDoc) {
    // Cache referensi DOM untuk mengeliminasi query berulang saat eksekusi event
    const linkTextInput = document.getElementById('link-text-input');
    const linkUrlInput = document.getElementById('link-url-input');
    const imgUrlInput = document.getElementById('img-url-input');
    const tableColsInput = document.getElementById('table-cols');
    const tableRowsInput = document.getElementById('table-rows');

    // Mengembalikan seleksi kursor pengguna yang disimpan sebelum interaksi dialog modal
    const restoreSelection = () => {
        if (state.savedSelection) {
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(state.savedSelection);
        }
    };

    // Dialog Modal: Insert Link
    document.getElementById('btn-link').onclick = () => {
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            state.savedSelection = sel.getRangeAt(0).cloneRange();
            linkTextInput.value = sel.toString();
        }
        linkUrlInput.value = 'https://';
        openWin('win-link');
    };

    document.getElementById('btn-confirm-link').onclick = () => {
        const text = linkTextInput.value;
        const url = linkUrlInput.value;
        closeWin('win-link');
        dom.renderedOutput.focus();
        
        restoreSelection();
        
        if (text) {
            formatDoc('insertHTML', `<a href="${url}">${text}</a>`);
        } else {
            formatDoc('createLink', url);
        }
    };

    // Dialog Modal: Insert Image
    document.getElementById('btn-image').onclick = () => {
        const sel = window.getSelection();
        if (sel.rangeCount > 0) {
            state.savedSelection = sel.getRangeAt(0).cloneRange();
        }
        imgUrlInput.value = 'https://';
        openWin('win-image');
    };

    document.getElementById('btn-confirm-image').onclick = () => {
        const url = imgUrlInput.value;
        closeWin('win-image');
        dom.renderedOutput.focus();
        
        restoreSelection();
        formatDoc('insertImage', url);
    };

    // Dialog Modal: Insert Table
    document.getElementById('btn-confirm-table').onclick = () => {
        let cols = parseInt(tableColsInput.value, 10) || 3;
        let rows = parseInt(tableRowsInput.value, 10) || 3;
        
        cols = Math.max(1, Math.min(20, cols));
        rows = Math.max(1, Math.min(50, rows));

        // Pembuatan markup HTML tabel teroptimasi dengan metode join array
        const tableHTML = [
            '<br><table border="1" style="border-collapse: collapse; width: 100%; border-color: #555; table-layout: fixed;"><tbody>',
            ...Array.from({ length: rows }, () => 
                '<tr>' + 
                Array.from({ length: cols }, () => '<td style="padding: 10px;"><br></td>').join('') + 
                '</tr>'
            ).join(''),
            '</tbody></table><br>'
        ].join('');

        closeWin('win-table');
        formatDoc('insertHTML', tableHTML);
    };
}

/**
 * Menginisialisasi event listener fitur Pencarian dan Penggantian kata (Find and Replace).
 * 
 * @param {Function} formatDoc - Fungsi pemformatan dokumen core utama.
 * @param {Function} syncRenderedToRaw - Callback untuk sinkronisasi editor visual ke raw markdown.
 */
export function initializeFindReplace(formatDoc, syncRenderedToRaw) {
    // Cache referensi DOM pencarian
    const findInput = document.getElementById('find-input');
    const replaceInput = document.getElementById('replace-input');

    const executeFind = () => {
        const text = findInput.value;
        if (text) {
            if (!window.find(text, false, false, true, false, true, false)) {
                alert('Text not found / reached end.');
            }
        }
    };

    const executeReplace = () => {
        const findText = findInput.value;
        const replaceText = replaceInput.value;
        const sel = window.getSelection();
        
        if (sel.toString().toLowerCase() === findText.toLowerCase()) {
            formatDoc('insertText', replaceText);
        } else {
            executeFind();
        }
    };

    const executeReplaceAll = () => {
        const findText = findInput.value;
        const replaceText = replaceInput.value;
        if (!findText) return;
        
        const range = document.createRange();
        range.selectNodeContents(dom.renderedOutput);
        range.collapse(true);
        
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        
        let count = 0;
        while (window.find(findText, false, false, true, false, true, false) && count < 1000) {
            document.execCommand('insertText', false, replaceText);
            count++;
        }
        
        alert(`${count} occurrences replaced.`);
        syncRenderedToRaw();
    };

    document.getElementById('btn-find-next').onclick = executeFind;
    document.getElementById('btn-replace-btn').onclick = executeReplace;
    document.getElementById('btn-replace-all').onclick = executeReplaceAll;
}
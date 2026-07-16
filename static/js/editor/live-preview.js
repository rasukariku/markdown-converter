import { dom } from '../core/state.js';

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Menginisialisasi sistem interaksi Live Preview bergaya Obsidian (Click-to-Edit) 
 * untuk elemen Persamaan Matematika dan Garis Pembatas (HR) dengan skema Sibling.
 */
export function initializeLivePreview() {
    if (!dom.renderedOutput) return;

    // 1. Delegasi Event Klik untuk memunculkan mode edit raw matematika dan HR
    dom.renderedOutput.addEventListener('click', (e) => {
        // Tombol Toggle Kode (</>) pada Kartu Preview
        const codeToggle = e.target.closest('.math-code-toggle');
        if (codeToggle) {
            const card = codeToggle.closest('.math-preview-card');
            const rawLine = card.previousElementSibling;
            
            if (rawLine && rawLine.classList.contains('math-raw-line')) {
                const isHidden = window.getComputedStyle(rawLine).display === 'none';
                rawLine.style.display = isHidden ? 'block' : 'none';
                
                if (isHidden) {
                    rawLine.focus();
                }
            }
            return;
        }

        // Jalankan editing saat visual preview rumus diklik langsung
        const previewEl = e.target.closest('.math-preview-rendered');
        if (previewEl) {
            const card = previewEl.closest('.math-preview-card');
            const rawLine = card.previousElementSibling;
            
            if (rawLine && rawLine.classList.contains('math-raw-line')) {
                rawLine.style.display = 'block';
                rawLine.focus();
                
                // Posisikan kursor otomatis di bagian paling belakang teks
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(rawLine);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
            return;
        }

        // Buka teks edit pemisah --- saat garis visual diklik
        const previewLine = e.target.closest('.hr-preview-line');
        if (previewLine) {
            const rawLine = previewLine.previousElementSibling;
            if (rawLine && rawLine.classList.contains('hr-raw-line')) {
                rawLine.style.display = 'block';
                previewLine.style.display = 'none';
                rawLine.focus();
                
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(rawLine);
                range.collapse(false);
                sel.removeAllRanges();
                sel.addRange(range);
            }
            return;
        }
    });

    // 2. KUNCI PERBAIKAN: Deteksi perubahan input real-time saat pengguna mengetik LaTeX matematika
    dom.renderedOutput.addEventListener('input', (e) => {
        const rawLine = e.target.closest('.math-raw-line');
        if (rawLine) {
            const previewCard = rawLine.nextElementSibling;
            if (previewCard && previewCard.classList.contains('math-preview-card')) {
                const previewRendered = previewCard.querySelector('.math-preview-rendered');
                const editedText = rawLine.innerText.trim();
                
                // Perbarui visual LaTeX sementara secara instan
                previewRendered.innerHTML = editedText;
                
                // Kompilasi ulang formula MathJax lokal tanpa membuang fokus kursor pengetikan aktif
                MathJax.typesetPromise([previewRendered]).then(() => {
                    if (typeof window.triggerSync === 'function') {
                        window.triggerSync();
                    }
                });
            }
        }
    });

    // 3. Delegasi Event Focusout untuk merapikan kembali ke tampilan preview statis
    dom.renderedOutput.addEventListener('focusout', (e) => {
        const rawLine = e.target.closest('.math-raw-line');
        if (rawLine) {
            const previewCard = rawLine.nextElementSibling;
            if (previewCard && previewCard.classList.contains('math-preview-card')) {
                setTimeout(() => {
                    // Sembunyikan panel edit jika fokus berpindah keluar dari penulisan teks dan kartu preview-nya
                    if (document.activeElement !== rawLine && !previewCard.contains(document.activeElement)) {
                        rawLine.style.display = 'none';
                        
                        const previewRendered = previewCard.querySelector('.math-preview-rendered');
                        const editedText = rawLine.innerText;
                        previewRendered.innerHTML = editedText;
                        
                        MathJax.typesetPromise([previewRendered]).then(() => {
                            if (typeof window.triggerSync === 'function') {
                                window.triggerSync();
                            }
                        });
                    }
                }, 150);
            }
            return;
        }

        const hrRaw = e.target.closest('.hr-raw-line');
        if (hrRaw) {
            const previewLine = hrRaw.nextElementSibling;
            if (previewLine && previewLine.classList.contains('hr-preview-line')) {
                setTimeout(() => {
                    if (document.activeElement !== hrRaw) {
                        hrRaw.style.display = 'none';
                        previewLine.style.display = 'block';
                        
                        // Jika teks pembatas kosong, hapus komponen secara otomatis
                        if (hrRaw.innerText.trim() === '') {
                            hrRaw.remove();
                            previewLine.remove();
                        }
                        if (typeof window.triggerSync === 'function') {
                            window.triggerSync();
                        }
                    }
                }, 150);
            }
            return;
        }
    });
}
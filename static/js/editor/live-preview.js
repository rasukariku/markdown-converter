import { dom } from '../core/state.js';

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Menginisialisasi sistem interaksi Live Preview bergaya Obsidian (Click-to-Edit) 
 * untuk elemen Persamaan Matematika dan Garis Pembatas (HR).
 */
export function initializeLivePreview() {
    if (!dom.renderedOutput) return;

    // 1. Delegasi Event Klik untuk memunculkan mode edit raw matematika dan HR
    dom.renderedOutput.addEventListener('click', (e) => {
        const mathPreview = e.target.closest('.math-preview');
        if (mathPreview) {
            const wrapper = mathPreview.closest('.math-wrapper');
            const rawEl = wrapper.querySelector('.math-raw');
            const toolbar = wrapper.querySelector('.math-toolbar');
            
            rawEl.classList.add('active');
            if (toolbar) toolbar.classList.add('active');
            
            rawEl.focus();
            
            // Posisikan kursor otomatis di bagian paling belakang teks
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(rawEl);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
            return;
        }

        const codeToggle = e.target.closest('.math-code-toggle');
        if (codeToggle) {
            const wrapper = codeToggle.closest('.math-wrapper');
            const rawEl = wrapper.querySelector('.math-raw');
            const toolbar = wrapper.querySelector('.math-toolbar');
            
            rawEl.classList.toggle('active');
            if (rawEl.classList.contains('active')) {
                rawEl.focus();
                if (toolbar) toolbar.classList.add('active');
            } else {
                if (toolbar) toolbar.classList.remove('active');
            }
            return;
        }

        const copyBtn = e.target.closest('.math-copy-btn');
        if (copyBtn) {
            const wrapper = copyBtn.closest('.math-wrapper');
            const rawEl = wrapper.querySelector('.math-raw');
            const rawText = rawEl ? rawEl.innerText.trim() : '';
            
            navigator.clipboard.writeText(rawText);
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '✅ Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 1500);
            return;
        }

        const hrLine = e.target.closest('.hr-line');
        if (hrLine) {
            const wrapper = hrLine.closest('.hr-wrapper');
            const rawEl = wrapper.querySelector('.hr-raw');
            
            rawEl.classList.add('active');
            rawEl.focus();
            return;
        }
    });

    // 2. Delegasi Event Focusout untuk menyembunyikan input raw dan mengompilasi ulang tampilan
    dom.renderedOutput.addEventListener('focusout', (e) => {
        const rawEl = e.target.closest('.math-raw');
        if (rawEl) {
            const wrapper = rawEl.closest('.math-wrapper');
            const toolbar = wrapper.querySelector('.math-toolbar');
            
            setTimeout(() => {
                // Sembunyikan panel edit jika fokus berpindah keluar dari komponen matematika ini sepenuhnya
                if (!wrapper.contains(document.activeElement)) {
                    rawEl.classList.remove('active');
                    if (toolbar) toolbar.classList.remove('active');
                    
                    const previewEl = wrapper.querySelector('.math-preview');
                    const editedText = rawEl.innerText;
                    previewEl.innerHTML = editedText;
                    
                    // Render ulang lokal MathJax khusus untuk elemen formula yang disunting
                    MathJax.typesetPromise([previewEl]).then(() => {
                        if (typeof window.triggerSync === 'function') {
                            window.triggerSync();
                        }
                    });
                }
            }, 150);
            return;
        }

        const hrRaw = e.target.closest('.hr-raw');
        if (hrRaw) {
            const wrapper = hrRaw.closest('.hr-wrapper');
            setTimeout(() => {
                if (!wrapper.contains(document.activeElement)) {
                    hrRaw.classList.remove('active');
                    // Jika teks HR dihapus kosong oleh user, buang komponen secara otomatis
                    if (hrRaw.innerText.trim() === '') {
                        wrapper.remove();
                    }
                    if (typeof window.triggerSync === 'function') {
                        window.triggerSync();
                    }
                }
            }, 150);
            return;
        }
    });
}
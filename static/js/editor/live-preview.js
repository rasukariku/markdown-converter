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
            const wrapper = card.closest('.math-wrapper');
            const rawLine = wrapper.querySelector('.math-raw-line');
            const toolbar = wrapper.querySelector('.math-toolbar');
            
            const isHidden = window.getComputedStyle(rawLine).display === 'none';
            rawLine.style.display = isHidden ? 'block' : 'none';
            
            if (isHidden) {
                wrapper.classList.add('active-preview');
                rawLine.focus();
                if (toolbar) toolbar.classList.add('active');
            } else {
                wrapper.classList.remove('active-preview');
                if (toolbar) toolbar.classList.remove('active');
            }
            return;
        }

        // Jalankan editing saat visual preview rumus diklik langsung
        const previewRendered = e.target.closest('.math-preview-rendered');
        if (previewRendered) {
            const wrapper = previewRendered.closest('.math-wrapper');
            const rawLine = wrapper.querySelector('.math-raw-line');
            const isDisplay = wrapper.getAttribute('data-math-display') === 'true';
            
            if (isDisplay) {
                const toolbar = wrapper.querySelector('.math-toolbar');
                wrapper.classList.add('active-preview');
                rawLine.style.display = 'block';
                rawLine.focus();
                if (toolbar) toolbar.classList.add('active');
            } else {
                // KUNCI PERBAIKAN: Rumus inline berganti ke input teks sebaris tanpa merusak aliran paragraf
                rawLine.style.display = 'inline-block';
                previewRendered.style.display = 'none';
                rawLine.focus();
            }
            
            // Posisikan kursor otomatis di bagian paling belakang teks
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(rawLine);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
            return;
        }

        // Salin Cepat via Toolbar Melayang (Copy LaTeX murni lengkap dengan dollar)
        const copyBtn = e.target.closest('.math-copy-btn');
        if (copyBtn) {
            const wrapper = copyBtn.closest('.math-wrapper');
            const rawLine = wrapper.querySelector('.math-raw-line');
            const rawText = rawLine ? rawLine.innerText.trim() : '';
            const isDisplay = rawLine.classList.contains('display-math-raw');
            const formattedLaTeX = isDisplay ? `$$ ${rawText} $$` : `$${rawText}$`;
            
            navigator.clipboard.writeText(formattedLaTeX);
            const originalText = copyBtn.innerHTML;
            copyBtn.innerHTML = '📋 Copied!';
            setTimeout(() => {
                copyBtn.innerHTML = originalText;
            }, 1500);
            return;
        }

        // Buka teks edit pemisah --- saat garis visual diklik
        const previewLine = e.target.closest('.hr-preview-line');
        if (previewLine) {
            const wrapper = previewLine.closest('.hr-wrapper');
            const rawLine = wrapper.querySelector('.hr-raw-line');
            
            rawLine.style.display = 'block';
            previewLine.style.display = 'none';
            rawLine.focus();
            
            const range = document.createRange();
            const sel = window.getSelection();
            range.selectNodeContents(rawLine);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
            return;
        }
    });

    // 2. Sinkronisasi real-time saat pengguna mengetik LaTeX matematika
    dom.renderedOutput.addEventListener('input', (e) => {
        const rawLine = e.target.closest('.math-raw-line');
        if (rawLine) {
            const wrapper = rawLine.closest('.math-wrapper');
            const isDisplay = wrapper.getAttribute('data-math-display') === 'true';
            
            const previewRendered = wrapper.querySelector('.math-preview-rendered');
            if (previewRendered) {
                const editedText = rawLine.innerText.trim();
                
                // Perbarui visual LaTeX sementara secara instan
                previewRendered.innerHTML = isDisplay ? `$$ ${editedText} $$` : `$${editedText}$`;
                
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
            const wrapper = rawLine.closest('.math-wrapper');
            const isDisplay = wrapper.getAttribute('data-math-display') === 'true';
            const previewRendered = wrapper.querySelector('.math-preview-rendered');
            
            setTimeout(() => {
                if (isDisplay) {
                    const previewCard = wrapper.querySelector('.math-preview-card');
                    const toolbar = wrapper.querySelector('.math-toolbar');
                    
                    if (document.activeElement !== rawLine && !previewCard.contains(document.activeElement)) {
                        wrapper.classList.remove('active-preview');
                        rawLine.style.display = 'none';
                        if (toolbar) toolbar.classList.remove('active');
                        
                        const editedText = rawLine.innerText;
                        previewRendered.innerHTML = `$$ ${editedText} $$`;
                        
                        MathJax.typesetPromise([previewRendered]).then(() => {
                            if (typeof window.triggerSync === 'function') {
                                window.triggerSync();
                            }
                        });
                    }
                } else {
                    // KUNCI PERBAIKAN: Kembalikan rumus inline ke format kalimat normal saat fokus kursor keluar
                    if (document.activeElement !== rawLine) {
                        rawLine.style.display = 'none';
                        previewRendered.style.display = 'inline-block';
                        
                        const editedText = rawLine.innerText;
                        previewRendered.innerHTML = `$${editedText}$`;
                        
                        MathJax.typesetPromise([previewRendered]).then(() => {
                            if (typeof window.triggerSync === 'function') {
                                window.triggerSync();
                            }
                        });
                    }
                }
            }, 150);
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
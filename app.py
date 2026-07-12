import os
import tempfile
import pypandoc
from flask import Flask, request, send_file, render_template
from docx import Document
from utils.preprocessor import preprocess_markdown
from utils.file_manager import get_buffer_and_cleanup
from services.docx_formatter import format_docx_document
from services.pdf_generator import generate_pdf_from_docx

# Inisialisasi Pandoc saat aplikasi dinyalakan
try:
    pypandoc.get_pandoc_version()
except OSError:
    pypandoc.download_pandoc()

app = Flask(__name__)

# Batasi jenis format keluaran yang diizinkan guna mencegah silent fallbacks
ALLOWED_FORMATS = {'docx', 'pdf', 'html'}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/convert', methods=['POST'])
def convert():
    # Sanitasi input dasar dari form pengiriman editor
    markdown_content = request.form.get('markdown_content', '').strip()
    file_format = request.form.get('file_format', 'docx').lower()

    if not markdown_content:
        return "Input text cannot be empty.", 400

    # Validasi format file secara ketat
    if file_format not in ALLOWED_FORMATS:
        return f"Unsupported file format. Allowed formats: {', '.join(sorted(ALLOWED_FORMATS))}.", 400

    # Lakukan pra-pemrosesan teks markdown melalui utilitas preprocessor
    source_text, source_text_html = preprocess_markdown(markdown_content)
    input_format = 'markdown+raw_html'

    # =========================================================================
    # 1. EKSPOR FORMAT HTML
    # =========================================================================
    if file_format == 'html':
        temp_html = tempfile.NamedTemporaryFile(delete=False, suffix='.html')
        temp_html.close()
        try:
            extra_args = [
                '--standalone',
                '--mathjax=https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js'
            ]
            pypandoc.convert_text(
                source_text_html, 'html', format=input_format, 
                outputfile=temp_html.name, extra_args=extra_args
            )
            buffer = get_buffer_and_cleanup(temp_html.name)
            return send_file(
                buffer, as_attachment=True, 
                download_name='Markdown_Export.html', mimetype='text/html'
            )
        except Exception as e:
            if os.path.exists(temp_html.name):
                try:
                    os.unlink(temp_html.name)
                except OSError:
                    pass
            return f"HTML conversion error: {str(e)}", 500

    # =========================================================================
    # 2. EKSPOR FORMAT DOCX & PDF (Melalui Base DOCX Pandoc)
    # =========================================================================
    temp_docx = tempfile.NamedTemporaryFile(delete=False, suffix='.docx')
    temp_docx.close()
    
    try:
        # Konversi markdown dasar ke DOCX menggunakan template tango pandoc
        pypandoc.convert_text(
            source_text, 'docx', format=input_format, 
            outputfile=temp_docx.name, extra_args=['--highlight-style=tango']
        )
        doc = Document(temp_docx.name)
        
        # Format dokumen DOCX dengan standar penulisan rapi (Times New Roman, Left Alignment Math)
        doc = format_docx_document(doc)
        doc.save(temp_docx.name)
        
        # Penanganan PDF: Mengonversi dokumen DOCX yang sudah rapi menjadi PDF
        if file_format == 'pdf':
            pdf_path, error = generate_pdf_from_docx(temp_docx.name, source_text_html, input_format)
            
            # Bersihkan file temporer DOCX setelah operasi generator PDF selesai
            if os.path.exists(temp_docx.name):
                try:
                    os.unlink(temp_docx.name)
                except OSError:
                    pass
                    
            if error:
                return error, 500
                
            return send_file(
                get_buffer_and_cleanup(pdf_path), as_attachment=True, 
                download_name='Markdown_Export.pdf', mimetype='application/pdf'
            )
            
        # Penanganan DOCX: Kirim file DOCX temporer langsung ke pengguna
        buffer = get_buffer_and_cleanup(temp_docx.name)
        return send_file(
            buffer, as_attachment=True, 
            download_name='Markdown_Export.docx', 
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
        
    except Exception as e:
        if os.path.exists(temp_docx.name):
            try:
                os.unlink(temp_docx.name)
            except OSError:
                pass
        return f"DOCX/PDF conversion error: {str(e)}", 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=int(os.environ.get('PORT', 7860)))
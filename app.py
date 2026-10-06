import os
import tempfile
import platform
import csv
import shutil
import pypandoc
from flask import Flask, request, send_file, render_template, jsonify
from werkzeug.exceptions import RequestEntityTooLarge
from docx import Document
from utils.preprocessor import preprocess_markdown
from utils.file_manager import get_buffer_and_cleanup
from services.docx_formatter import format_docx_document
from services.pdf_generator import generate_pdf_from_docx

# 1. Dynamically locate Pandoc executable path on Linux environments
if platform.system() == 'Linux':
    pandoc_path = shutil.which('pandoc') or '/usr/bin/pandoc'
    os.environ.setdefault('PYPANDOC_PANDOC', pandoc_path)

# 2. Dynamically detect and download Pandoc across platforms safely
try:
    version = pypandoc.get_pandoc_version()
    print(f"[INFO] Pandoc loaded successfully. Version: {version}", flush=True)
except OSError as e:
    if platform.system() == 'Windows':
        print("[INFO] Pandoc not found locally. Downloading Pandoc for Windows...", flush=True)
        try:
            pypandoc.download_pandoc()
            version = pypandoc.get_pandoc_version()
            print(f"[INFO] Pandoc successfully downloaded and installed locally. Version: {version}", flush=True)
        except Exception as download_err:
            print(f"[FATAL ERROR] Failed to download Pandoc automatically on Windows: {str(download_err)}", flush=True)
            raise download_err
    else:
        print(f"[FATAL ERROR] Pandoc binary not found in Linux/Docker environment. Details: {str(e)}", flush=True)
        raise e

app = Flask(__name__)

app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024

@app.errorhandler(413)
@app.errorhandler(RequestEntityTooLarge)
def handle_payload_too_large(error):
    """
    Returns structured JSON for file upload endpoints to prevent frontend script parsing crashes.
    """
    if request.path == '/upload_parse':
        return jsonify({
            'status': 'error',
            'message': 'File size exceeds the 16 MB limit.'
        }), 413
    return "Payload exceeds the 16 MB maximum limit.", 413

ALLOWED_FORMATS = {'docx', 'pdf', 'html'}
ALLOWED_UPLOAD_EXTENSIONS = {'.txt', '.md', '.docx', '.csv', '.xlsx'}
MAX_SPREADSHEET_ROWS = 500  # Cap maximum table rows to prevent browser DOM freezing

PANDOC_INPUT_FORMAT = 'markdown+raw_html+pipe_tables+tex_math_dollars+fenced_code_blocks+backtick_code_blocks+autolink_bare_uris+strikeout'

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload_parse', methods=['POST'])
def upload_parse():
    if 'file' not in request.files:
        return jsonify({'status': 'error', 'message': 'No file payload attached.'}), 400
        
    uploaded_file = request.files['file']
    filename = uploaded_file.filename
    if not filename:
        return jsonify({'status': 'error', 'message': 'Filename is empty.'}), 400

    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        return jsonify({'status': 'error', 'message': f'Unsupported file extension: {ext}'}), 400

    try:
        if ext in ['.txt', '.md']:
            raw_content = uploaded_file.read().decode('utf-8', errors='replace')
            return jsonify({'status': 'success', 'markdown': raw_content})

        elif ext == '.docx':
            temp_docx = tempfile.NamedTemporaryFile(delete=False, suffix='.docx')
            uploaded_file.save(temp_docx.name)
            temp_docx.close()

            markdown_output = pypandoc.convert_file(
                temp_docx.name, 
                'markdown', 
                extra_args=['--wrap=none', '--mathjax']
            )

            if os.path.exists(temp_docx.name):
                try:
                    os.unlink(temp_docx.name)
                except OSError:
                    pass

            return jsonify({'status': 'success', 'markdown': markdown_output})

        elif ext == '.csv':
            raw_text = uploaded_file.read().decode('utf-8', errors='replace')
            reader = csv.reader(raw_text.splitlines())
            rows = list(reader)[:MAX_SPREADSHEET_ROWS]
            if not rows:
                return jsonify({'status': 'success', 'markdown': ''})

            md_table = []
            md_table.append("| " + " | ".join(rows[0]) + " |")
            md_table.append("| " + " | ".join(["---"] * len(rows[0])) + " |")
            for row in rows[1:]:
                md_table.append("| " + " | ".join(row) + " |")

            return jsonify({'status': 'success', 'markdown': "\n".join(md_table)})

        elif ext == '.xlsx':
            try:
                import openpyxl
                workbook = openpyxl.load_workbook(uploaded_file, read_only=True)
                sheet = workbook.active
                rows = []
                for i, row in enumerate(sheet.iter_rows(values_only=True)):
                    if i >= MAX_SPREADSHEET_ROWS:
                        break
                    if any(row):
                        rows.append([str(val if val is not None else '') for val in row])
                
                if not rows:
                    return jsonify({'status': 'success', 'markdown': ''})

                md_table = []
                md_table.append("| " + " | ".join(rows[0]) + " |")
                md_table.append("| " + " | ".join(["---"] * len(rows[0])) + " |")
                for row in rows[1:]:
                    md_table.append("| " + " | ".join(row) + " |")

                return jsonify({'status': 'success', 'markdown': "\n".join(md_table)})
            except ImportError:
                return jsonify({'status': 'error', 'message': 'openpyxl module is required for .xlsx parsing.'}), 400

    except Exception as parse_error:
        return jsonify({'status': 'error', 'message': f'Conversion error: {str(parse_error)}'}), 500

@app.route('/convert', methods=['POST'])
def convert():
    markdown_content = request.form.get('markdown_content', '').strip()
    file_format = request.form.get('file_format', 'docx').lower()

    if not markdown_content:
        return "Input text cannot be empty.", 400

    if file_format not in ALLOWED_FORMATS:
        return f"Unsupported format. Allowed: {', '.join(sorted(ALLOWED_FORMATS))}.", 400

    source_text, source_text_html = preprocess_markdown(markdown_content)

    if file_format == 'html':
        temp_html = tempfile.NamedTemporaryFile(delete=False, suffix='.html')
        temp_html.close()
        try:
            extra_args = [
                '--standalone',
                '--mathjax=https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js'
            ]
            pypandoc.convert_text(
                source_text_html, 'html', format=PANDOC_INPUT_FORMAT, 
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

    temp_docx = tempfile.NamedTemporaryFile(delete=False, suffix='.docx')
    temp_docx.close()
    
    try:
        pypandoc.convert_text(
            source_text, 'docx', format=PANDOC_INPUT_FORMAT, 
            outputfile=temp_docx.name, extra_args=['--highlight-style=tango']
        )
        doc = Document(temp_docx.name)
        doc = format_docx_document(doc)
        doc.save(temp_docx.name)
        
        if file_format == 'pdf':
            pdf_path, error = generate_pdf_from_docx(temp_docx.name, source_text_html, PANDOC_INPUT_FORMAT)
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
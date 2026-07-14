import os
import tempfile
import platform
import pypandoc

# Extract magic strings and configurations to module-level constants
_MATHJAX_URL = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js'
_PANDOC_EXTRA_ARGS = ['--standalone', f'--mathjax={_MATHJAX_URL}']

_PDF_CSS_STYLES = """
<style>
body { 
    max-width: none !important;
    margin: 0 !important;
    padding: 0 !important;
    font-family: "Times New Roman", serif; 
    font-size: 16px; 
    line-height: 1.5; 
    text-align: justify; 
    color: black; 
}
h1, h2, h3, h4 { line-height: 1.2; margin-bottom: 8px; text-align: left; font-family: "Times New Roman", serif; }
p { margin-bottom: 10px; margin-top: 0; }
table { width: 100%; border-collapse: collapse; margin: 15px 0; page-break-inside: avoid; }
th, td { border: 1px solid black; padding: 8px; text-align: left; vertical-align: top; }
th { font-weight: bold; background-color: #f3f4f6; }
blockquote { margin: 10px 20px; padding-left: 10px; border-left: 3px solid #000; font-style: italic; }
hr { border: 0; border-top: 1px solid #000; margin: 16px 0; }
pre, code { font-family: "Courier New", monospace; font-size: 14px; page-break-inside: avoid; }
pre { background: #f4f4f4; padding: 10px; border: 1px solid #ccc; white-space: pre-wrap; }
mjx-container { page-break-inside: avoid !important; margin: 6px 0 !important; }
</style>
"""


def generate_pdf_from_docx(docx_path: str, source_text_html: str, input_format: str) -> tuple[str, str]:
    """
    Generate PDF from DOCX file based on the current operating system.
    
    Args:
        docx_path: Path to the intermediate DOCX file.
        source_text_html: HTML string for Linux PDF generation.
        input_format: Pandoc input format string.
        
    Returns:
        A tuple containing (pdf_path, error_message).
    """
    current_os = platform.system()
    if current_os == 'Windows':
        return _generate_pdf_windows(docx_path)
    else:
        return _generate_pdf_linux(source_text_html, input_format)


def _generate_pdf_windows(docx_path: str) -> tuple[str, str]:
    """
    Generate PDF using Windows COM automation.
    
    Args:
        docx_path: Path to the DOCX file to convert.
        
    Returns:
        A tuple containing (pdf_path, error_message).
    """
    import win32com.client
    import pythoncom
    
    pythoncom.CoInitialize()
    temp_pdf = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    temp_pdf.close()
    word_app = None
    
    try:
        word_app = win32com.client.DispatchEx("Word.Application")
        word_app.Visible = False
        word_app.DisplayAlerts = False
        
        doc_com = word_app.Documents.Open(
            os.path.abspath(docx_path), ReadOnly=True, Visible=False
        )
        doc_com.SaveAs(os.path.abspath(temp_pdf.name), FileFormat=17)
        doc_com.Close(SaveChanges=False)
        
        try:
            os.unlink(docx_path)
        except OSError:
            pass
            
        return temp_pdf.name, None
        
    except Exception as e:
        try:
            os.unlink(temp_pdf.name)
        except OSError:
            pass
        try:
            os.unlink(docx_path)
        except OSError:
            pass
        return None, f"Windows PDF Engine Error: {str(e)}"
    finally:
        if word_app:
            try:
                word_app.Quit()
            except Exception:
                pass
        pythoncom.CoUninitialize()


def _generate_pdf_linux(source_text_html: str, input_format: str) -> tuple[str, str]:
    """
    Generate PDF using Playwright and Pandoc.
    
    Args:
        source_text_html: HTML string to render.
        input_format: Pandoc input format string.
        
    Returns:
        A tuple containing (pdf_path, error_message).
    """
    from playwright.sync_api import sync_playwright
    
    temp_pdf = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
    temp_pdf.close()
    
    try:
        html_string = pypandoc.convert_text(
            source_text_html, 'html', format=input_format, extra_args=_PANDOC_EXTRA_ARGS
        )
        
        # Inject CSS before the closing head tag
        html_string = html_string.replace('</head>', f'{_PDF_CSS_STYLES}</head>')
        
        with sync_playwright() as playwright:
            # KUNCI PERBAIKAN: Menambahkan argumen stabilitas penuh untuk Linux Chromium tanpa GPU & batasan memori bersama (/dev/shm)
            browser = playwright.chromium.launch(
                headless=True,
                args=[
                    "--disable-dev-shm-usage",
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-gpu"
                ]
            )
            page = browser.new_page()
            page.set_content(html_string, wait_until='networkidle')
            page.pdf(
                path=temp_pdf.name,
                format='A4',
                margin={
                    'top': '2.54cm', 
                    'right': '2.54cm', 
                    'bottom': '2.54cm', 
                    'left': '2.54cm'
                },
                print_background=True
            )
            
        return temp_pdf.name, None
        
    except Exception as e:
        try:
            os.unlink(temp_pdf.name)
        except OSError:
            pass
        return None, f"Linux PDF Engine Error: {str(e)}"
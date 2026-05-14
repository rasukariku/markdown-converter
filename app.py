import os
import tempfile
import pypandoc
import weasyprint
from flask import Flask, request, send_file, render_template
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml import OxmlElement
from docx.oxml.ns import qn

# Initialize Pandoc
try:
    pypandoc.get_pandoc_version()
except OSError:
    pypandoc.download_pandoc()

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/convert', methods=['POST'])
def convert():
    markdown_content = request.form.get('markdown_content', '')
    file_format = request.form.get('file_format', 'docx')
    
    if not markdown_content:
        return "Input text cannot be empty.", 400

    # Convert to HTML
    if file_format == 'html':
        temp_html = tempfile.NamedTemporaryFile(delete=False, suffix='.html')
        temp_html.close()
        try:
            pypandoc.convert_text(
                markdown_content, 
                'html', 
                format='markdown', 
                outputfile=temp_html.name,
                extra_args=['--standalone', '--mathjax']
            )
            return send_file(temp_html.name, as_attachment=True, download_name='Markdown_Export.html')
        except Exception as e:
            return f"HTML conversion error: {str(e)}", 500

    # Convert to PDF
    if file_format == 'pdf':
        try:
            temp_pdf = tempfile.NamedTemporaryFile(delete=False, suffix='.pdf')
            temp_pdf.close()
            
            html_string = pypandoc.convert_text(markdown_content, 'html', format='markdown')
            
            document_css = weasyprint.CSS(string='''
                @page { size: A4; margin: 2.54cm; }
                body { font-family: "Times New Roman", serif; font-size: 12pt; line-height: 1.5; text-align: justify; }
                h1, h2, h3, h4 { text-align: left; line-height: 1.2; margin-bottom: 8px;}
                p { margin-bottom: 12px; }
                table { width: 100%; border-collapse: collapse; margin: 15px 0; }
                th, td { border: 1px solid black; padding: 8px; text-align: left; vertical-align: top; }
                th { font-weight: bold; background-color: #f3f4f6; }
                pre, code { font-family: "Courier New", monospace; font-size: 10pt; }
                pre { background: #f4f4f4; padding: 10px; border: 1px solid #ccc; white-space: pre-wrap; word-wrap: break-word;}
            ''')
            
            weasyprint.HTML(string=html_string).write_pdf(temp_pdf.name, stylesheets=[document_css])
            
            return send_file(temp_pdf.name, as_attachment=True, download_name='Markdown_Export.pdf')
        except Exception as e:
            return f"PDF conversion error: {str(e)}", 500

    # Convert to DOCX
    temp_docx = tempfile.NamedTemporaryFile(delete=False, suffix='.docx')
    temp_docx.close()

    try:
        pypandoc.convert_text(
            markdown_content, 
            'docx', 
            format='markdown', 
            outputfile=temp_docx.name,
            extra_args=['--syntax-highlighting=tango']
        )

        # Apply Document Formatting
        doc = Document(temp_docx.name)
        from docx.text.paragraph import Paragraph

        for section in doc.sections:
            section.page_width = Cm(21.0)
            section.page_height = Cm(29.7)
            section.top_margin = Cm(2.54)
            section.bottom_margin = Cm(2.54)
            section.left_margin = Cm(2.54)
            section.right_margin = Cm(2.54)

        settings = doc.settings.element
        math_pr = settings.find(qn('m:mathPr'))
        if math_pr is None:
            math_pr = OxmlElement('m:mathPr')
            settings.append(math_pr)
            
        def_jc = math_pr.find(qn('m:defJc'))
        if def_jc is None:
            def_jc = OxmlElement('m:defJc')
            math_pr.append(def_jc)
        def_jc.set(qn('m:val'), 'left')

        style = doc.styles['Normal']
        style.font.name = 'Times New Roman'
        style.font.size = Pt(12)
        style.font.color.rgb = RGBColor(0, 0, 0)

        paragraphs = list(doc.paragraphs)
        for i, para in enumerate(paragraphs):
            text_clean = para.text.strip()
            has_math = bool(para._element.xpath('.//m:oMath') or para._element.xpath('.//m:oMathPara'))
            has_drawing = bool(para._element.xpath('.//w:drawing'))
            is_heading = para.style.name.startswith('Heading')
            is_list = 'List' in para.style.name or 'Bullet' in para.style.name or 'Compact' in para.style.name or bool(para._element.xpath('.//w:numPr'))
            is_code = 'Source Code' in para.style.name or 'Code' in para.style.name
            has_soft_return = '\n' in text_clean
            
            if not text_clean and not has_math and not has_drawing and not is_code:
                p = para._element
                if p.getparent() is not None:
                    p.getparent().remove(p)
                continue

            if is_code:
                para.paragraph_format.line_spacing = 1.0
                para.paragraph_format.space_before = Pt(0)
                para.paragraph_format.space_after = Pt(12)
                para.paragraph_format.left_indent = Pt(18)
                para.paragraph_format.first_line_indent = Pt(0)
            else:
                para.style = doc.styles['Normal']
                para.paragraph_format.line_spacing = 1.5
                if para.paragraph_format.space_before != Pt(8):
                    para.paragraph_format.space_before = Pt(0)
                
                if is_list:
                    next_is_list = False
                    if i + 1 < len(paragraphs):
                        next_para = paragraphs[i+1]
                        next_is_list = 'List' in next_para.style.name or 'Bullet' in next_para.style.name or 'Compact' in next_para.style.name or bool(next_para._element.xpath('.//w:numPr'))
                    para.paragraph_format.space_after = Pt(5) if next_is_list else Pt(8)
                    ilvl_nodes = para._element.xpath('.//w:ilvl')
                    level = int(ilvl_nodes[0].get(qn('w:val'))) if ilvl_nodes else 0
                    para.paragraph_format.left_indent = Pt(36 + (level * 36))
                    para.paragraph_format.first_line_indent = Pt(-18)
                else:
                    para.paragraph_format.space_after = Pt(8)
                    para.paragraph_format.left_indent = Pt(0)
                    para.paragraph_format.first_line_indent = Pt(0)

            for run in para.runs:
                if not run._element.xpath('.//m:oMath'):
                    if is_code:
                        run.font.name = 'Consolas'
                        run.font.size = Pt(10.5)
                    else:
                        run.font.name = 'Times New Roman'
                        run.font.size = Pt(12)
                        run.font.color.rgb = RGBColor(0, 0, 0)
                        
                    rPr = run._element.get_or_add_rPr()
                    lang = rPr.find(qn('w:lang'))
                    if lang is None:
                        lang = OxmlElement('w:lang')
                        rPr.append(lang)
                    lang.set(qn('w:val'), 'id-ID')

            if is_heading:
                para.alignment = WD_ALIGN_PARAGRAPH.LEFT
                para.paragraph_format.space_after = Pt(12)
            elif is_list or has_soft_return or is_code:
                para.alignment = WD_ALIGN_PARAGRAPH.LEFT
            else:
                para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY if len(text_clean) > 100 else WD_ALIGN_PARAGRAPH.LEFT

        for table in doc.tables:
            try: table.style = 'Table Grid' 
            except KeyError: pass 
            
            for row in table.rows:
                for cell in row.cells:
                    for para in cell.paragraphs:
                        para.paragraph_format.space_before = Pt(0)
                        para.paragraph_format.space_after = Pt(0)
                        para.paragraph_format.line_spacing = 1.5
                        para.alignment = WD_ALIGN_PARAGRAPH.LEFT
                        
                        for run in para.runs:
                            if not run._element.xpath('.//m:oMath'):
                                run.font.name = 'Times New Roman'
                                run.font.size = Pt(12)
                                run.font.color.rgb = RGBColor(0, 0, 0)
                                
            tbl_element = table._element
            next_element = tbl_element.getnext()
            if next_element is not None and next_element.tag == qn('w:p'):
                next_para = Paragraph(next_element, doc._body)
                next_para.paragraph_format.space_before = Pt(8)

        doc.save(temp_docx.name)
        return send_file(temp_docx.name, as_attachment=True, download_name='Markdown_Export.docx')
    
    except Exception as e:
        return f"DOCX conversion error: {str(e)}", 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
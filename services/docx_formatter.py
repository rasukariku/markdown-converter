import re
from docx import Document
from docx.shared import Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.text.paragraph import Paragraph

# Pre-compile regex for pseudo-list detection to eliminate runtime overhead
_RE_PSEUDO_LIST = re.compile(r'^([a-zA-Z0-9]{1,4}[\.\)]|\([a-zA-Z0-9]{1,4}\)|[\-\*\+•●○■□▪▫►>])\s+')

# Extract magic string for Horizontal Rule placeholder
_HR_PLACEHOLDER = '[[HR_PLACEHOLDER]]'


def format_docx_document(doc: Document) -> Document:
    """
    Apply formatting to a DOCX document, including styles, 
    paragraph formatting, and table processing.
    
    Args:
        doc: The python-docx Document object to format.
        
    Returns:
        The formatted Document object.
    """
    # Fix numbering
    if doc.part.numbering_part is not None:
        for lvl in doc.part.numbering_part.element.xpath('.//w:lvl'):
            suff = lvl.find(qn('w:suff'))
            if suff is None:
                suff = OxmlElement('w:suff')
                lvl.append(suff)
            suff.set(qn('w:val'), 'space')
    
    # Configure Normal style
    normal_style = doc.styles['Normal']
    normal_style.font.name = 'Times New Roman'
    normal_style.font.size = Pt(12)
    normal_style.font.color.rgb = RGBColor(0, 0, 0)
    
    # Configure Hyperlink style
    try:
        hlink_style = doc.styles['Hyperlink']
        hlink_style.font.name = 'Times New Roman'
        hlink_style.font.color.rgb = RGBColor(0, 0, 0)
        if hlink_style.element.rPr is not None:
            color_el = hlink_style.element.rPr.find(qn('w:color'))
            if color_el is not None and qn('w:themeColor') in color_el.attrib:
                del color_el.attrib[qn('w:themeColor')]
            rFonts = hlink_style.element.rPr.find(qn('w:rFonts'))
            if rFonts is not None:
                for attr in ['w:asciiTheme', 'w:hAnsiTheme', 'w:cstheme']:
                    if qn(attr) in rFonts.attrib:
                        del rFonts.attrib[qn(attr)]
    except KeyError:
        pass
    
    # Page setup
    for section in doc.sections:
        section.page_width, section.page_height = Cm(21.0), Cm(29.7)
        section.top_margin, section.bottom_margin, section.left_margin, section.right_margin = Cm(2.54), Cm(2.54), Cm(2.54), Cm(2.54)
    
    # Math properties
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
    
    # Compatibility settings
    compat = settings.find(qn('w:compat'))
    if compat is None:
        compat = OxmlElement('w:compat')
        settings.append(compat)
        
    compat_setting = OxmlElement('w:compatSetting')
    compat_setting.set(qn('w:name'), 'compatibilityMode')
    compat_setting.set(qn('w:uri'), 'http://schemas.microsoft.com/office/word')
    compat_setting.set(qn('w:val'), '15')
    compat.append(compat_setting)
    
    # Process paragraphs
    _process_paragraphs(doc)
    
    # Process tables
    _process_tables(doc)
    
    return doc


def _process_paragraphs(doc: Document) -> None:
    """
    Process all paragraphs in the document to apply formatting, 
    alignment, and cleanup.
    
    Args:
        doc: The python-docx Document object.
    """
    paragraphs = list(doc.paragraphs)
    removal_queue = []
    
    for i, para in enumerate(paragraphs):
        text_clean = para.text.strip()
        style_name = para.style.name
        has_math = bool(para._element.findall('.//' + qn('m:oMath'))) or bool(para._element.findall('.//' + qn('m:oMathPara')))
        has_drawing = bool(para._element.findall('.//' + qn('w:drawing')))
        is_heading = style_name.startswith('Heading')
        is_list = ('List' in style_name or 'Bullet' in style_name or 'Compact' in style_name or bool(para._element.findall('.//' + qn('w:numPr'))))
        is_code = 'Source Code' in style_name or 'Code' in style_name
        
        # Use pre-compiled regex for pseudo-list detection
        is_pseudo_list = bool(_RE_PSEUDO_LIST.match(text_clean))
        
        is_quote = 'Quote' in style_name or 'Block Text' in style_name
        has_soft_return = '\n' in para.text
        
        # Horizontal Rule Processing
        is_hr = _HR_PLACEHOLDER in text_clean
        if is_hr:
            p_el = para._element
            for run in list(para.runs):
                p_el.remove(run._element)
            pPr = p_el.get_or_add_pPr()
            old_bdr = pPr.find(qn('w:pBdr'))
            if old_bdr is not None:
                pPr.remove(old_bdr)
            pBdr = OxmlElement('w:pBdr')
            top_border = OxmlElement('w:top')
            top_border.set(qn('w:val'), 'single')
            top_border.set(qn('w:sz'), '12')
            top_border.set(qn('w:space'), '0')
            top_border.set(qn('w:color'), '000000')
            pBdr.append(top_border)
            pPr.append(pBdr)
            try:
                para.style = doc.styles['Normal']
            except KeyError:
                pass
            para.paragraph_format.line_spacing_rule = WD_LINE_SPACING.EXACTLY
            para.paragraph_format.line_spacing = Pt(1)
            para.paragraph_format.space_before = Pt(0)
            para.paragraph_format.space_after = Pt(0)
            para.paragraph_format.left_indent = Pt(0)
            para.paragraph_format.first_line_indent = Pt(0)
            has_border = True
            text_clean = ""
        else:
            has_border = False
            
        if not text_clean and not has_math and not has_drawing and not is_code and not has_border:
            removal_queue.append(para)
            continue
            
        if is_code:
            para.paragraph_format.line_spacing = 1.0
            para.paragraph_format.space_before = Pt(0)
            para.paragraph_format.space_after = Pt(12)
            para.paragraph_format.left_indent = Pt(18)
            para.paragraph_format.first_line_indent = Pt(0)
        else:
            if not is_heading and not is_list and not is_quote and not has_border:
                para.style = doc.styles['Normal']
            para.paragraph_format.line_spacing = 1.5
            para.paragraph_format.space_before = Pt(0)
            if is_list:
                next_is_list = False
                if i + 1 < len(paragraphs):
                    next_para = paragraphs[i + 1]
                    next_is_list = ('List' in next_para.style.name or 'Bullet' in next_para.style.name or 'Compact' in next_para.style.name or bool(next_para._element.findall('.//' + qn('w:numPr'))))
                para.paragraph_format.space_after = Pt(5) if next_is_list else Pt(8)
                ilvl_nodes = para._element.findall('.//' + qn('w:ilvl'))
                level = int(ilvl_nodes[0].get(qn('w:val'))) if ilvl_nodes else 0
                para.paragraph_format.left_indent = Pt(36 + (level * 36))
                para.paragraph_format.first_line_indent = Pt(-18)
            elif is_quote:
                para.paragraph_format.left_indent = Cm(1.5)
                para.paragraph_format.right_indent = Cm(1.5)
                para.paragraph_format.space_after = Pt(8)
            else:
                if not has_border:
                    para.paragraph_format.space_after = Pt(8)
                    para.paragraph_format.left_indent = Pt(0)
                    para.paragraph_format.first_line_indent = Pt(0)
                    
        # Format runs
        for run in para.runs:
            if run._element.findall('.//' + qn('m:oMath')):
                continue
            if is_code:
                run.font.name = 'Consolas'
                run.font.size = Pt(10.5)
            else:
                run.font.name = 'Times New Roman'
                if not is_heading and run.font.size is None:
                    run.font.size = Pt(12)
                run.font.color.rgb = RGBColor(0, 0, 0)
                rPr = run._element.get_or_add_rPr()
                color_el = rPr.find(qn('w:color'))
                if color_el is not None and qn('w:themeColor') in color_el.attrib:
                    del color_el.attrib[qn('w:themeColor')]
                if 'Hyperlink' in run.style.name or 'Hyperlink' in style_name:
                    run.font.underline = True
                rFonts = rPr.find(qn('w:rFonts'))
                if rFonts is None:
                    rFonts = OxmlElement('w:rFonts')
                    rPr.append(rFonts)
                rFonts.set(qn('w:ascii'), 'Times New Roman')
                rFonts.set(qn('w:hAnsi'), 'Times New Roman')
                rFonts.set(qn('w:cs'), 'Times New Roman')
                for attr in ['w:asciiTheme', 'w:hAnsiTheme', 'w:cstheme']:
                    if qn(attr) in rFonts.attrib:
                        del rFonts.attrib[qn(attr)]
            rPr = run._element.get_or_add_rPr()
            lang_el = rPr.find(qn('w:lang'))
            if lang_el is None:
                lang_el = OxmlElement('w:lang')
                rPr.append(lang_el)
            lang_el.set(qn('w:val'), 'id-ID')
            
        # Alignment logic
        if is_heading:
            if para.alignment is None:
                para.alignment = WD_ALIGN_PARAGRAPH.LEFT
            para.paragraph_format.space_after = Pt(12)
        else:
            if is_pseudo_list and not is_list:
                para.paragraph_format.left_indent = Pt(36)
                para.paragraph_format.first_line_indent = Pt(-18)
            if is_code or has_border:
                if para.alignment is None:
                    para.alignment = WD_ALIGN_PARAGRAPH.LEFT
            else:
                if para.alignment is None:
                    para.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
                    
    # Remove empty paragraphs
    for para in reversed(removal_queue):
        p = para._element
        if p.getparent() is not None:
            p.getparent().remove(p)


def _process_tables(doc: Document) -> None:
    """
    Process all tables in the document to apply grid styling, 
    cell formatting, and post-table spacing.
    
    Args:
        doc: The python-docx Document object.
    """
    for table in doc.tables:
        try:
            table.style = 'Table Grid'
        except KeyError:
            try:
                table.style = 'TableGrid'
            except KeyError:
                pass
                
        for row in table.rows:
            for cell in row.cells:
                for para in cell.paragraphs:
                    orig_align = para.alignment
                    para.paragraph_format.space_before = Pt(0)
                    para.paragraph_format.space_after = Pt(0)
                    para.paragraph_format.line_spacing = 1.5
                    para.alignment = orig_align if orig_align is not None else WD_ALIGN_PARAGRAPH.LEFT
                    for run in para.runs:
                        if run._element.findall('.//' + qn('m:oMath')):
                            continue
                        run.font.name = 'Times New Roman'
                        if run.font.size is None:
                            run.font.size = Pt(12)
                        if run.font.color.rgb is None and 'Hyperlink' not in run.style.name:
                            run.font.color.rgb = RGBColor(0, 0, 0)
                            
        tbl_element = table._element
        next_element = tbl_element.getnext()
        if next_element is not None and next_element.tag == qn('w:p'):
            next_para = Paragraph(next_element, doc._body)
            next_para.paragraph_format.space_before = Pt(8)
import re

# Pre-compile regular expressions to eliminate runtime compilation overhead
_RE_AI_BOLD_LIST = re.compile(r'(?m)^([ \t]*)\*\*([a-zA-Z0-9]{1,3}[\.\)])[ \t]+(.*?)\*\*')
_RE_AI_BOLD_LIST_END = re.compile(r'(?m)^([ \t]*)\*\*([a-zA-Z0-9]{1,3}[\.\)])\*\*[ \t]+')
_RE_IDENTITY_BLOCK = re.compile(r'(?m)^(\*\*(?:Nama|NIM|Jurusan|Mata Kuliah)\*\*.*?)\s*$')
_RE_HTML_HR = re.compile(r'<hr\s*/?>', flags=re.IGNORECASE)
_RE_MARKDOWN_HR = re.compile(r'(?m)^\s*(\*{3,}|-{3,}|_{3,})\s*$')
_RE_EXCESS_NEWLINES = re.compile(r'\n{3,}')

# Extract magic strings to module-level constants
_HR_PLACEHOLDER = '[[HR_PLACEHOLDER]]'
_HR_REPLACEMENT = '\n\n---\n\n'


def preprocess_markdown(markdown_content: str) -> tuple[str, str]:
    """
    Preprocess markdown content for Pandoc conversion.
    
    Args:
        markdown_content: Raw markdown string from the user.
        
    Returns:
        A tuple containing (source_text, source_text_html).
    """
    # Fix 1: Correct AI-generated bold list styles ("**1. Text**" -> "1. **Text**")
    markdown_content = _RE_AI_BOLD_LIST.sub(r'\1\2 **\3**', markdown_content)
    markdown_content = _RE_AI_BOLD_LIST_END.sub(r'\1\2 ', markdown_content)
    
    # Fix 2: Protect identity blocks (Name, Student ID) from merging, avoiding soft returns
    markdown_content = _RE_IDENTITY_BLOCK.sub(r'\1\n\n', markdown_content)
    
    # Normalize Horizontal Rules (HR)
    markdown_content = _RE_HTML_HR.sub(f'\n\n{_HR_PLACEHOLDER}\n\n', markdown_content)
    markdown_content = _RE_MARKDOWN_HR.sub(f'\n\n{_HR_PLACEHOLDER}\n\n', markdown_content)
    markdown_content = _RE_EXCESS_NEWLINES.sub('\n\n', markdown_content)
    
    source_text = markdown_content
    source_text_html = source_text.replace(_HR_PLACEHOLDER, _HR_REPLACEMENT)
    
    return source_text, source_text_html
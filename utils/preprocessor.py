import re

_RE_AI_BOLD_LIST = re.compile(r'(?m)^([ \t]*)\*\*([a-zA-Z0-9]{1,3}[\.\)])[ \t]+(.*?)\*\*')
_RE_AI_BOLD_LIST_END = re.compile(r'(?m)^([ \t]*)\*\*([a-zA-Z0-9]{1,3}[\.\)])\*\*[ \t]+')
_RE_BULLET_BOLD = re.compile(r'(?m)^([ \t]*[\*\-\+\u2022]\s*)\*\*([^\*\n]+)\*\*([ \t]*:?)')
_RE_IDENTITY_BLOCK = re.compile(r'(?m)^(\*\*(?:Nama|NIM|Jurusan|Mata Kuliah)\*\*.*?)\s*$')
_RE_HTML_HR = re.compile(r'<hr\s*/?>', flags=re.IGNORECASE)
_RE_MARKDOWN_HR = re.compile(r'(?m)^\s*(\*{3,}|-{3,}|_{3,})\s*$')
_RE_EXCESS_NEWLINES = re.compile(r'\n{3,}')

# Cross-Tag Master Arrow Deduplication Regexes
_RE_RIGHT_ARROWS_COMBINED = re.compile(
    r'(?:\\+rightarrow\b|-->|->|==>|=>|→|⇒|&rarr;|&#8594;)(?:[\s\xa0\u2000-\u200b\u202f\ufeff]|&nbsp;|<[^>]+>)*(?:\\+rightarrow\b|-->|->|==>|=>|→|⇒|&rarr;|&#8594;)+',
    re.IGNORECASE
)
_RE_LEFT_ARROWS_COMBINED = re.compile(
    r'(?:\\+leftarrow\b|<--|<-|<==|<=|←|⇐|&larr;|&#8592;)(?:[\s\xa0\u2000-\u200b\u202f\ufeff]|&nbsp;|<[^>]+>)*(?:\\+leftarrow\b|<--|<-|<==|<=|←|⇐|&larr;|&#8592;)+',
    re.IGNORECASE
)

_RE_SINGLE_RIGHT_ARROW = re.compile(r'\\+rightarrow\b|-->|->|&rarr;|&#8594;', re.IGNORECASE)
_RE_SINGLE_RIGHT_DOUBLE_ARROW = re.compile(r'\\+Rightarrow\b|==>|=>', re.IGNORECASE)
_RE_SINGLE_LEFT_ARROW = re.compile(r'\\+leftarrow\b|<--|<-|&larr;|&#8592;', re.IGNORECASE)
_RE_SINGLE_LEFT_DOUBLE_ARROW = re.compile(r'\\+Leftarrow\b|<==|<=', re.IGNORECASE)

_RE_LATEX_ENV = re.compile(
    r'(?:\\begin\{(cases|array|gather|align|alignat|equation|multline)\}([\s\S]*?)\\end\{\1\})'
)

_HR_PLACEHOLDER = '[[HR_PLACEHOLDER]]'
_HR_REPLACEMENT = '\n\n---\n\n'


def wrap_unwrapped_latex_environments(text: str) -> str:
    """
    Safely wraps un-delimited LaTeX environments (\begin{cases}) in $$ delimiters 
    without using Python re variable-length lookbehinds.
    
    Args:
        text: Input Markdown text.
        
    Returns:
        Processed string with wrapped LaTeX environments.
    """
    if not text:
        return ""

    # 1. Protect existing display math blocks ($$ ... $$)
    math_blocks = []
    def protect_math(match):
        placeholder = f"@@@DISPLAY_MATH_BLOCK_{len(math_blocks)}@@@"
        math_blocks.append((placeholder, match.group(0)))
        return placeholder

    protected_text = re.sub(r'\$\$[\s\S]*?\$\$', protect_math, text)

    # 2. Find and wrap remaining un-delimited LaTeX environments
    protected_text = _RE_LATEX_ENV.sub(r'\n\n$$\n\g<0>\n$$\n\n', protected_text)

    # 3. Restore protected display math blocks
    for placeholder, original in math_blocks:
        protected_text = protected_text.replace(placeholder, original)

    return protected_text


def collapse_all_arrows(html_or_text: str) -> str:
    """
    Collapses all duplicate, compound, or escaped arrow tokens across text and HTML tag boundaries.
    
    Args:
        html_or_text: Input string.
        
    Returns:
        Clean string with single normalized Unicode arrows.
    """
    if not html_or_text:
        return ""

    text = _RE_RIGHT_ARROWS_COMBINED.sub('→', html_or_text)
    text = _RE_LEFT_ARROWS_COMBINED.sub('←', text)
    
    text = _RE_SINGLE_RIGHT_ARROW.sub('→', text)
    text = _RE_SINGLE_RIGHT_DOUBLE_ARROW.sub('⇒', text)
    text = _RE_SINGLE_LEFT_ARROW.sub('←', text)
    text = _RE_SINGLE_LEFT_DOUBLE_ARROW.sub('⇐', text)

    return re.sub(r'→[\s\xa0]*→+', '→', text)


def sanitize_latex_symbols_in_text(text: str) -> str:
    """
    Sanitize plain text TeX symbols outside of code blocks and math equations.
    Unwraps TeX text macros (\text{...}, \mathrm{...}).
    Converts raw TeX escape sequences (\rightarrow, \%, \ge) into native Unicode characters.
    
    Args:
        text: Raw Markdown input text.
        
    Returns:
        Sanitized text string.
    """
    if not text:
        return ""

    # 1. Protect fenced code blocks and inline code
    code_blocks = []
    def save_code(match):
        placeholder = f"@@@CODE_BLOCK_{len(code_blocks)}@@@"
        code_blocks.append((placeholder, match.group(0)))
        return placeholder

    protected_text = re.sub(r'```[\s\S]*?```|`[^`\n]+`', save_code, text)

    # 2. Protect LaTeX math equations ($...$ and $$...$$)
    math_blocks = []
    def save_math(match):
        placeholder = f"@@@MATH_PRESERVE_{len(math_blocks)}@@@"
        math_blocks.append((placeholder, match.group(0)))
        return placeholder

    protected_text = re.sub(r'\$\$[\s\S]*?\$\$|\$[^\$\n]+\$', save_math, protected_text)

    # 3. Unwrap TeX font and text macros outside math mode (\text{tahun} -> tahun)
    protected_text = re.sub(r'\\+(?:text|mathrm|mbox|mathit|mathsf|mathtt)\s*\{([^}]+)\}', r'\1', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+mathbf\s*\{([^}]+)\}', r'\1', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+frac\s*\{([^}]+)\}\s*\{([^}]+)\}', r'\1/\2', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+sqrt\s*\{([^}]+)\}', r'√\1', protected_text, flags=re.IGNORECASE)

    # 4. Collapse arrows
    protected_text = collapse_all_arrows(protected_text)

    # 5. Convert standalone TeX commands with single/multiple backslashes
    protected_text = re.sub(r'\\+leftrightarrow\b', '↔', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+Leftrightarrow\b', '⇔', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+(?:le|leq)\b', '≤', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+(?:ge|geq)\b', '≥', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+(?:ne|neq)\b', '≠', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+times\b', '×', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+div\b', '÷', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+approx\b', '≈', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+pm\b', '±', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+mp\b', '∓', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+cdot\b', '·', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+alpha\b', 'α', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+beta\b', 'β', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+gamma\b', 'γ', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+delta\b', 'δ', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+theta\b', 'θ', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+lambda\b', 'λ', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+mu\b', 'μ', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+pi\b', 'π', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+sigma\b', 'σ', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+omega\b', 'ω', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+Delta\b', 'Δ', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+Omega\b', 'Ω', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+in\b', '∈', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+notin\b', '∉', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+subset\b', '⊂', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+subseteq\b', '⊆', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+cap\b', '∩', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+cup\b', '∪', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+forall\b', '∀', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+exists\b', '∃', protected_text, flags=re.IGNORECASE)
    protected_text = re.sub(r'\\+infty\b', '∞', protected_text, flags=re.IGNORECASE)
    protected_text = protected_text.replace(r'\%', '%')
    protected_text = protected_text.replace(r'\&', '&')
    protected_text = protected_text.replace(r'\_', '_')
    protected_text = protected_text.replace(r'\#', '#')

    # 6. Restore math blocks
    for placeholder, original in math_blocks:
        protected_text = protected_text.replace(placeholder, original)

    # 7. Restore code blocks
    for placeholder, original in code_blocks:
        protected_text = protected_text.replace(placeholder, original)

    return protected_text


def preprocess_markdown(markdown_content: str) -> tuple[str, str]:
    """
    Preprocess markdown content for Pandoc conversion.
    
    Args:
        markdown_content: Raw markdown string from the user.
        
    Returns:
        A tuple containing (source_text, source_text_html).
    """
    if not markdown_content:
        return "", ""

    # Safely wrap un-delimited LaTeX environments (\begin{cases})
    markdown_content = wrap_unwrapped_latex_environments(markdown_content)

    markdown_content = _RE_AI_BOLD_LIST.sub(r'\1\2 **\3**', markdown_content)
    markdown_content = _RE_AI_BOLD_LIST_END.sub(r'\1\2 ', markdown_content)
    markdown_content = _RE_BULLET_BOLD.sub(r'\1**\2**\3', markdown_content)
    
    markdown_content = sanitize_latex_symbols_in_text(markdown_content)

    markdown_content = _RE_IDENTITY_BLOCK.sub(r'\1\n\n', markdown_content)
    
    markdown_content = _RE_HTML_HR.sub(f'\n\n{_HR_PLACEHOLDER}\n\n', markdown_content)
    markdown_content = _RE_MARKDOWN_HR.sub(f'\n\n{_HR_PLACEHOLDER}\n\n', markdown_content)
    markdown_content = _RE_EXCESS_NEWLINES.sub('\n\n', markdown_content)
    
    source_text = markdown_content
    source_text_html = source_text.replace(_HR_PLACEHOLDER, _HR_REPLACEMENT)
    
    return source_text, source_text_html
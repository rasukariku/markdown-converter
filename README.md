```markdown
---
title: Markdown Converter
emoji: 📝
colorFrom: blue
colorTo: indigo
sdk: docker
pinned: false
license: mit
---

# 📝 Markdown Converter

**Markdown Converter** is a powerful, browser-based tool designed to seamlessly convert AI-generated text and Markdown into professional, publication-ready documents (Word, PDF, HTML). It features an advanced rich-text editor with real-time preview, mathematical equation rendering, and smart clipboard integrations.

## ✨ Key Features

- **AI Text Sanitization:** Automatically cleans and formats messy AI outputs (e.g., fixing bolded list numbers, normalizing horizontal rules, and sanitizing zero-width spaces).
- **Real-Time WYSIWYG Editor:** Live Markdown-to-HTML rendering with a fully-featured toolbar (Bold, Italic, Lists, Tables, Code Blocks).
- **Advanced Math Support:** Full MathJax integration for rendering complex LaTeX equations inline and in display blocks.
- **Smart Clipboard:** 
  - Copy Math equations directly as MathML or raw LaTeX.
  - Copy tables with preserved formatting.
  - Paste rich text from Word/Web and automatically convert it to clean Markdown.
- **Multi-Format Export:** One-click export to **DOCX**, **PDF**, and **HTML** via a floating action button (FAB).
- **Dynamic Table Management:** Floating context menu to add/delete rows and columns on the fly.
- **Customizable UI:** Dark/Light mode toggle, draggable word counter, and fully responsive layout.
- **Auto-Save & Draft Recovery:** LocalStorage integration to prevent data loss on accidental refreshes.

## 🛠️ Tech Stack

- **Backend:** Python, Flask, Gunicorn
- **Document Processing:** Pandoc, python-docx, Playwright (for headless PDF generation)
- **Frontend:** Vanilla JavaScript (ES6 Modules), HTML5, CSS3
- **Rendering:** Marked.js (Markdown), MathJax (LaTeX), Turndown (HTML to Markdown)

## 🚀 Local Development

### Prerequisites
- Python 3.10+
- Pandoc (installed on your system)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/rasukariku/markdown-converter.git
   cd markdown-converter
   ```

2. Create a virtual environment and activate it:
   ```bash
   python -m venv venv
   .venv/bin/activate
   ```

3. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Install Playwright browsers (required for PDF generation on Linux):
   ```bash
   playwright install chromium
   ```

5. Run the application:
   ```bash
   python app.py
   ```
   The app will be available at `http://localhost:7860`.

## 🐳 Docker Deployment

The application is fully containerized. To build and run locally via Docker:

```bash
docker build -t markdown-converter .
docker run -p 7860:7860 markdown-converter
```

## 📄 License

This project is licensed under the MIT License. 

---
*Developed by [rasukariku](https://github.com/rasukariku)*
```
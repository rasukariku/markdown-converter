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

An advanced, web-based WYSIWYG Markdown editor and document processing platform engineered to sanitize, format, and convert AI-generated content, mathematical LaTeX equations, complex tables, and external documents into publication-ready files (**Word**, **PDF**, **HTML**) or platform-optimized Markdown.

## 🚀 Core Platform Capabilities

### 1. Dual-Engine Syntax Exporter
*   **Academic LaTeX Mode**: Formats mathematical notation using traditional document standards—inline equations enclosed in single dollar signs (`$formula$`) and block equations in double dollar signs (`$$formula$$`).
*   **Unified KaTeX Mode**: Compiles all mathematical expressions using double-dollar syntax (`$$formula$$`). This ensures instant KaTeX rendering compatibility across web platforms and note-taking suites that parse inline math via double-delimiter conventions.

### 2. Multi-Format Document Ingestion Engine (`/upload_parse`)
*   **Rich Text Documents (`.docx`)**: Converts document Abstract Syntax Trees (AST) into clean Markdown without hard column line-wrapping, eliminating mid-sentence breaks.
*   **Tabular Spreadsheets (`.xlsx`, `.csv`)**: Automatically processes data workbooks and CSV files into GFM-compliant Markdown table structures.
*   **Plain Text & Source Markdown (`.txt`, `.md`)**: Directly ingests raw markup streams with automated syntax normalization.

### 3. High-Fidelity Cross-Platform Clipboard Pipeline
*   **Dual Clipboard Payloads**: Concurrently generates `text/html` (populated with inline styling for desktop word processors) and `text/plain` payloads (sanitized Markdown for messaging tools and web editors).
*   **Word Concatenation Safeguard**: Converts soft returns, mid-sentence line breaks, and non-breaking spaces into standard whitespace (`' '`), preventing adjacent words from merging when pasting into external text buffers.
*   **Network-Resilient Fallback Copying**: Automatically activates an off-screen buffer fallback (`document.execCommand`) when deployed over unencrypted HTTP or local area networks where browser `navigator.clipboard` access is restricted.

### 4. Interactive WYSIWYG Editor & Formatting Tools
*   **Contextual LaTeX Floating Editor**: Draggable, click-to-edit equation windows attached directly to rendered MathJax formulas for real-time LaTeX modifications.
*   **Adaptive Structural Dividers**: Dynamic horizontal rules (`---`, `===`, `***`, `___`) that collapse into clean rendered borders when unfocused and expand into editable source blocks when clicked.
*   **State-Preserving Reset Controls**: Dedicated workspace reset button backed by an in-app confirmation modal to safely purge active drafts and local storage state.

### 5. Automated Publication Compilation
*   **Word Document Export (`.docx`)**: Custom-styled via `python-docx` to enforce formal typography standards (12pt serif typeface, 1.5 line spacing, left-aligned equations, and grid table borders).
*   **PDF Document Compilation**: Headlessly renders vector PDF documents via Playwright Chromium engines in containerized environments or native COM automation on desktop systems.

## 🛠️ Project Architecture

```text
markdown-converter/
├── app.py                      # Flask routing backend & document upload handlers
├── Dockerfile                  # Container definition for Hugging Face / Docker deployment
├── README.md                   # Documentation
├── requirements.txt            # Python runtime dependencies
├── services/
│   ├── docx_formatter.py       # Layout and typography formatting for DOCX files
│   └── pdf_generator.py        # Playwright / Windows COM PDF generation engines
├── static/
│   ├── css/                    # Modular CSS stylesheets (Theme, Layout, Toolbar, Modals)
│   └── js/                     # ES6 Modular JavaScript Application
│       ├── core/               # Central DOM state, synchronization, and Turndown rules
│       ├── editor/             # Live preview, paste interceptors, and clipboard handlers
│       ├── features/           # Export actions, upload routines, tables, and metrics
│       └── ui/                 # Language localizations, modals, and theme toggles
├── templates/
│   └── index.html              # Main HTML application structure
└── utils/
    ├── file_manager.py         # Memory buffer and temporary file cleanup utilities
    └── preprocessor.py         # Markdown sanitization and normalization rules
```

## 🏃 Local Development Setup

### Prerequisites
*   **Python 3.10+**
*   **Pandoc** installed on your system path.

### Installation Steps

1.  **Clone the Repository**:
    ```bash
    git clone https://github.com/rasukariku/markdown-converter.git
    cd markdown-converter
    ```

2.  **Create and Activate Virtual Environment**:
    ```bash
    python -m venv venv
    # Windows:
    venv\Scripts\activate
    # Linux / macOS:
    source venv/bin/activate
    ```

3.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```

4.  **Install Playwright Headless Chromium** *(Required for Linux PDF rendering)*:
    ```bash
    playwright install chromium
    playwright install-deps
    ```

5.  **Run Application**:
    ```bash
    python app.py
    ```
    Access the application at `http://localhost:7860`.

## 🐳 Docker & Cloud Deployment

### Local Docker Build

```bash
docker build -t markdown-converter .
docker run -p 7860:7860 markdown-converter
```

### Deploying to Hugging Face Spaces

This application is fully pre-configured for **Hugging Face Spaces** using the Docker SDK:

1.  Create a new Space on Hugging Face and select **Docker** as the SDK.
2.  Push this repository directly to your Hugging Face Space.
3.  The `Dockerfile` automatically configures non-root user permissions (`user:1000`), downloads Microsoft Core Fonts (`ttf-mscorefonts-installer`), and launches Gunicorn on port `7860` with `--preload` flags.

## 📄 License

This project is licensed under the **MIT License**.
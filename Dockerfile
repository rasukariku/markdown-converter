# =====================================================================
# Base Image & Environment
# =====================================================================
FROM python:3.10-slim

# Prevent Python from writing pyc files and buffering stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# =====================================================================
# System Dependencies & Fonts
# =====================================================================
# Enable non-free components for Microsoft fonts installation
RUN sed -i -e 's/Components: main/Components: main contrib non-free/g' /etc/apt/sources.list.d/debian.sources

# Automatically accept Microsoft EULA for fonts
RUN echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections

# Install system dependencies and Microsoft fonts in a single layer
# Added --no-install-recommends to minimize image size
RUN apt-get update && apt-get install -y --no-install-recommends \
    pandoc \
    fontconfig \
    ttf-mscorefonts-installer \
    && fc-cache -f -v \
    && rm -rf /var/lib/apt/lists/*

# =====================================================================
# Python Dependencies & Playwright System Deps
# =====================================================================
# Use a temporary build directory to avoid polluting the final WORKDIR
WORKDIR /build

# Copy only requirements first to leverage Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Install OS dependencies required by Playwright (MUST be executed as root)
RUN playwright install-deps

# =====================================================================
# Non-Root User & Application Setup
# =====================================================================
# Configure non-root user for security and Hugging Face compatibility
RUN useradd -m -u 1000 user

# Switch to non-root user
USER user

# Set environment variables for the user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH \
    PLAYWRIGHT_BROWSERS_PATH=/home/user/.cache/ms-playwright

# Set the final application work directory
WORKDIR $HOME/app

# Install Chromium browser via Playwright (executed as non-root user)
RUN playwright install chromium

# Copy application source code with correct ownership
COPY --chown=user:user . .

# =====================================================================
# Execution
# =====================================================================
EXPOSE 7860

# PRODUCTION-GRADE RUNTIME PROFILE CONFIGURATION:
# 1. --preload: Forces the application to import the codebase on startup for fail-fast crash detection
# 2. --timeout 120: Prevents workers from being killed prematurely during large PDF generation workloads
# 3. --capture-output & --enable-stdio-inheritance: Routes stack trace logs cleanly to the container stdout/stderr
CMD ["gunicorn", "--bind", "0.0.0.0:7860", "--workers", "1", "--threads", "8", "--timeout", "120", "--preload", "--access-logfile", "-", "--error-logfile", "-", "--capture-output", "--enable-stdio-inheritance", "app:app"]
# Base image utilizing Debian 12 (Bookworm)
FROM python:3.10-slim

# Enable non-free components for Microsoft fonts installation
RUN sed -i -e 's/Components: main/Components: main contrib non-free/g' /etc/apt/sources.list.d/debian.sources

# Automatically accept Microsoft EULA for fonts
RUN echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections

# Install system dependencies and Microsoft fonts
RUN apt-get update && apt-get install -y \
    pandoc \
    fontconfig \
    ttf-mscorefonts-installer \
    && fc-cache -f -v \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Install OS dependencies required by Playwright
RUN playwright install-deps

# Configure non-root user for security and Hugging Face compatibility
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app

# Install Chromium browser via Playwright (executed as non-root user)
RUN playwright install chromium

# Copy application source code
COPY --chown=user . $HOME/app

# Expose port and define entrypoint
EXPOSE 7860
CMD ["gunicorn", "-b", "0.0.0.0:7860", "app:app"]
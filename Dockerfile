# Base image
FROM python:3.10-slim

# Unlock non-free repositories for accessing Microsoft fonts
RUN sed -i -e 's/Components: main/Components: main contrib non-free/g' /etc/apt/sources.list.d/debian.sources

# Agree to the EULA for Microsoft fonts to enable installation without interactive prompts
RUN echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections

# Install dependencies
RUN apt-get update && apt-get install -y \
    pandoc \
    fontconfig \
    ttf-mscorefonts-installer \
    && fc-cache -f -v \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python packages
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Install Headless Chromium
RUN playwright install chromium --with-deps

# HF Spaces User Permission
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app
COPY --chown=user . $HOME/app

EXPOSE 7860
CMD ["gunicorn", "-b", "0.0.0.0:7860", "app:app"]
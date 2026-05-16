# Base image
FROM python:3.10-slim

# Unlock Debian Repositories for contrib & non-free
RUN sed -i -e 's/Components: main/Components: main contrib non-free/g' /etc/apt/sources.list.d/debian.sources || \
    sed -i -e 's/main/main contrib non-free/g' /etc/apt/sources.list

# Agree to Microsoft Core Fonts EULA
RUN echo "ttf-mscorefonts-installer msttcorefonts/accepted-mscorefonts-eula select true" | debconf-set-selections

# Install system dependencies
RUN apt-get update && apt-get install -y \
    pandoc \
    wkhtmltopdf \
    fontconfig \
    ttf-mscorefonts-installer \
    && fc-cache -f -v \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create a non-root user (Hugging Face Spaces requirement)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

WORKDIR $HOME/app
COPY --chown=user . $HOME/app

# Run the application
EXPOSE 7860
CMD ["gunicorn", "-b", "0.0.0.0:7860", "app:app"]
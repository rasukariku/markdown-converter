# Base image
FROM python:3.10-slim

# Install system dependencies for Pandoc and LibreOffice (PDF Engine)
RUN apt-get update && apt-get install -y \
    pandoc \
    libreoffice \
    && rm -rf /var/lib/apt/lists/*

# Set temporary working directory
WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Create a non-root user (Hugging Face Spaces requirement)
RUN useradd -m -u 1000 user
USER user
ENV HOME=/home/user \
    PATH=/home/user/.local/bin:$PATH

# Set final working directory to user home
WORKDIR $HOME/app

# Copy application files with proper permissions
COPY --chown=user . $HOME/app

# Run the application on port 7860 using Gunicorn
EXPOSE 7860
CMD ["gunicorn", "-b", "0.0.0.0:7860", "app:app"]
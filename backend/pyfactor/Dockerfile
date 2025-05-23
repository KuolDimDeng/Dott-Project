FROM python:3.12-slim

LABEL maintainer="Pyfactor DevOps Team <devops@pyfactor.com>"

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb

# Set working directory
WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Copy project
COPY . .

# Create log directory
RUN mkdir -p /var/log/app
RUN chmod -R 755 /var/log/app

# Create a non-root user to run the application
RUN useradd --create-home appuser
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Run the application
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "pyfactor.wsgi"]

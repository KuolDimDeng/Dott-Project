#!/bin/bash

# Emergency Docker fix for Elastic Beanstalk
# This creates the simplest possible working configuration

set -e

echo "Creating emergency Docker fix..."

# Create simple Dockerfile that should definitely work
cat > Dockerfile << 'EOF'
FROM python:3.12-slim

WORKDIR /app

# Install only the absolute essentials
RUN pip install Django==5.1.7 gunicorn==20.1.0 psycopg2-binary==2.9.9 whitenoise==6.5.0

# Create a minimal Django project inline
RUN django-admin startproject emergency . && \
    echo "ALLOWED_HOSTS = ['*']" >> emergency/settings.py && \
    echo "INSTALLED_APPS += ['whitenoise.runserver_nostatic']" >> emergency/settings.py && \
    echo "MIDDLEWARE.insert(1, 'whitenoise.middleware.WhiteNoiseMiddleware')" >> emergency/settings.py

# Create a simple health check view
RUN echo "from django.http import HttpResponse" > emergency/views.py && \
    echo "def health_check(request): return HttpResponse('OK')" >> emergency/views.py

# Update URLs to include health check
RUN echo "from django.urls import path" > emergency/urls.py && \
    echo "from django.contrib import admin" >> emergency/urls.py && \
    echo "from . import views" >> emergency/urls.py && \
    echo "urlpatterns = [path('admin/', admin.site.urls), path('health/', views.health_check)]" >> emergency/urls.py

EXPOSE 8000

CMD ["gunicorn", "emergency.wsgi:application", "--bind", "0.0.0.0:8000"]
EOF

# Create minimal .ebextensions
mkdir -p .ebextensions
cat > .ebextensions/01_docker.config << 'EOF'
option_settings:
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /health/
    Port: 8000
    Protocol: HTTP
EOF

# Remove Dockerrun.aws.json if it exists (let EB use defaults)
rm -f Dockerrun.aws.json

echo "Emergency fix created. Deploy with: eb deploy" 
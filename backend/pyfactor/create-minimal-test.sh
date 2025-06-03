#!/bin/bash

# Create a minimal test deployment to isolate the issue

echo "Creating minimal test deployment..."

# Create a minimal Dockerfile that should definitely work
cat > Dockerfile << 'EOF'
FROM python:3.12-slim

WORKDIR /app

# Install only the absolute minimum
RUN pip install Django==5.1.7 gunicorn==20.1.0

# Create a minimal Django project inline
RUN django-admin startproject minimal . && \
    echo "ALLOWED_HOSTS = ['*']" >> minimal/settings.py

# Create a simple health view
RUN mkdir -p minimal && \
    echo "from django.http import HttpResponse" > minimal/views.py && \
    echo "def health(request): return HttpResponse('OK')" >> minimal/views.py

# Update URLs
RUN echo "from django.contrib import admin" > minimal/urls.py && \
    echo "from django.urls import path" >> minimal/urls.py && \
    echo "from . import views" >> minimal/urls.py && \
    echo "urlpatterns = [path('admin/', admin.site.urls), path('health/', views.health)]" >> minimal/urls.py

EXPOSE 8000

CMD ["gunicorn", "minimal.wsgi:application", "--bind", "0.0.0.0:8000"]
EOF

# Create minimal .ebextensions
mkdir -p .ebextensions
cat > .ebextensions/01_minimal.config << 'EOF'
option_settings:
  aws:elasticbeanstalk:environment:process:default:
    HealthCheckPath: /health/
    Port: 8000
    Protocol: HTTP
EOF

# Remove other configs temporarily
rm -f .ebextensions/01_environment.config
rm -f .ebextensions/01_docker.config
rm -f Dockerrun.aws.json

echo "Minimal test created."
echo ""
echo "This creates the simplest possible Django app."
echo "If this works, we can gradually add back components."
echo ""
echo "Deploy with: eb deploy" 
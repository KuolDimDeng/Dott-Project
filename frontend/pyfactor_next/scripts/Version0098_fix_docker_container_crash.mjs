#!/usr/bin/env node

/**
 * Version 0098: Fix Docker Container Crash Issues for AWS Elastic Beanstalk
 * 
 * This script addresses common Docker container crash issues:
 * 1. Fixes Dockerfile configuration for better reliability
 * 2. Ensures proper Django startup configuration
 * 3. Adds comprehensive health check endpoints
 * 4. Verifies environment variables are properly set
 * 5. Adds debugging output for startup diagnostics
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const BACKEND_PATH = join(__dirname, '..', '..', '..', 'backend', 'pyfactor');
const DOCKERFILE_PATH = join(BACKEND_PATH, 'Dockerfile');
const DOCKERRUN_PATH = join(BACKEND_PATH, 'Dockerrun.aws.json');
const SETTINGS_EB_PATH = join(BACKEND_PATH, 'pyfactor', 'settings_eb.py');
const HEALTH_VIEWS_PATH = join(BACKEND_PATH, 'health', 'views.py');
const HEALTH_URLS_PATH = join(BACKEND_PATH, 'health', 'urls.py');
const MANAGE_PY_PATH = join(BACKEND_PATH, 'manage.py');
const WSGI_PATH = join(BACKEND_PATH, 'pyfactor', 'wsgi.py');
const START_SCRIPT_PATH = join(BACKEND_PATH, 'start.sh');
const PROCFILE_PATH = join(BACKEND_PATH, 'Procfile');

console.log('🔧 Version 0098: Fixing Docker Container Crash Issues...\n');

// Enhanced Dockerfile with better error handling and diagnostics
const ENHANCED_DOCKERFILE = `FROM python:3.12-slim

# Install system dependencies including those needed for compilation
RUN apt-get update && apt-get install -y \\
    gcc \\
    g++ \\
    python3-dev \\
    libpq-dev \\
    libssl-dev \\
    libffi-dev \\
    curl \\
    netcat-openbsd \\
    procps \\
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy and install requirements first (for better caching)
COPY requirements-eb.txt ./
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \\
    pip install --no-cache-dir -r requirements-eb.txt

# Copy all application files
COPY . .

# Create necessary directories with proper permissions
RUN mkdir -p staticfiles logs media && \\
    chmod -R 755 staticfiles logs media

# Create a non-root user to run the application
RUN useradd -m -u 1000 django && \\
    chown -R django:django /app

# Create startup script with comprehensive checks
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV DJANGO_SETTINGS_MODULE=pyfactor.settings_eb
ENV PORT=8000
ENV PYTHONDONTWRITEBYTECODE=1

# Switch to non-root user
USER django

EXPOSE 8000

# Health check to ensure container is running properly
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \\
    CMD curl -f http://localhost:8000/health/ || exit 1

# Run the startup script
CMD ["/app/start.sh"]
`;

// Enhanced startup script with better error handling
const ENHANCED_START_SCRIPT = `#!/bin/bash
set -e

echo "=== Django Application Startup ==="
echo "Time: $(date)"
echo "Python: $(python --version)"
echo "Working directory: $(pwd)"
echo "User: $(whoami)"

# Set environment variables
export DJANGO_SETTINGS_MODULE=\${DJANGO_SETTINGS_MODULE:-pyfactor.settings_eb}
export PYTHONUNBUFFERED=1
export PORT=\${PORT:-8000}

# Log environment
echo "DJANGO_SETTINGS_MODULE: $DJANGO_SETTINGS_MODULE"
echo "PORT: $PORT"
echo "DATABASE_URL: \${DATABASE_URL:0:30}..." # Show only first 30 chars for security

# Check for critical files
if [ ! -f "manage.py" ]; then
    echo "ERROR: manage.py not found!"
    ls -la
    exit 1
fi

if [ ! -d "pyfactor" ]; then
    echo "ERROR: pyfactor directory not found!"
    ls -la
    exit 1
fi

# Wait for database to be ready (if DATABASE_URL is set)
if [ -n "$DATABASE_URL" ]; then
    echo "Waiting for database to be ready..."
    python -c "
import os
import time
import psycopg2
from urllib.parse import urlparse

db_url = os.environ.get('DATABASE_URL', '')
if db_url:
    result = urlparse(db_url)
    max_retries = 30
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            conn = psycopg2.connect(
                database=result.path[1:],
                user=result.username,
                password=result.password,
                host=result.hostname,
                port=result.port
            )
            conn.close()
            print('Database is ready!')
            break
        except Exception as e:
            retry_count += 1
            print(f'Database not ready yet (attempt {retry_count}/{max_retries})...')
            time.sleep(2)
    else:
        print('ERROR: Could not connect to database after 60 seconds')
        exit(1)
"
fi

# Test Django configuration
echo "Testing Django configuration..."
python -c "
import django
import sys
try:
    django.setup()
    print('Django setup successful!')
except Exception as e:
    print(f'ERROR: Django setup failed: {e}')
    sys.exit(1)
" || exit 1

# Run migrations (if enabled)
if [ "$RUN_MIGRATIONS" = "true" ]; then
    echo "Running database migrations..."
    python manage.py migrate --noinput || echo "Warning: migrations failed, continuing..."
fi

# Collect static files
echo "Collecting static files..."
python manage.py collectstatic --noinput || echo "Warning: collectstatic failed, continuing..."

# Create superuser if credentials are provided
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ] && [ -n "$DJANGO_SUPERUSER_EMAIL" ]; then
    echo "Creating superuser..."
    python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='$DJANGO_SUPERUSER_USERNAME').exists():
    User.objects.create_superuser('$DJANGO_SUPERUSER_USERNAME', '$DJANGO_SUPERUSER_EMAIL', '$DJANGO_SUPERUSER_PASSWORD')
    print('Superuser created successfully')
else:
    print('Superuser already exists')
" || echo "Warning: Could not create superuser"
fi

# Start Gunicorn with optimized settings
echo "Starting Gunicorn server on port $PORT..."
exec gunicorn pyfactor.wsgi:application \\
    --bind 0.0.0.0:$PORT \\
    --workers \${GUNICORN_WORKERS:-2} \\
    --threads \${GUNICORN_THREADS:-2} \\
    --worker-class \${GUNICORN_WORKER_CLASS:-sync} \\
    --timeout \${GUNICORN_TIMEOUT:-120} \\
    --graceful-timeout \${GUNICORN_GRACEFUL_TIMEOUT:-30} \\
    --keep-alive \${GUNICORN_KEEPALIVE:-2} \\
    --max-requests \${GUNICORN_MAX_REQUESTS:-1000} \\
    --max-requests-jitter \${GUNICORN_MAX_REQUESTS_JITTER:-50} \\
    --access-logfile - \\
    --error-logfile - \\
    --log-level \${GUNICORN_LOG_LEVEL:-info} \\
    --capture-output \\
    --enable-stdio-inheritance
`;

// Enhanced health check view with more diagnostics
const ENHANCED_HEALTH_VIEW = `from django.http import JsonResponse
from django.db import connection
from django.core.cache import cache
import os
import sys
import platform
import psutil
import django

def health_check(request):
    """
    Comprehensive health check endpoint for AWS ELB and container monitoring
    """
    health_status = {
        "status": "healthy",
        "service": "pyfactor-backend",
        "timestamp": django.utils.timezone.now().isoformat(),
        "version": {
            "python": platform.python_version(),
            "django": django.get_version(),
        },
        "system": {
            "platform": platform.platform(),
            "processor": platform.processor(),
        },
        "checks": {}
    }
    
    # Check database connectivity
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            health_status["checks"]["database"] = "ok"
    except Exception as e:
        health_status["checks"]["database"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"
    
    # Check cache connectivity (if configured)
    try:
        cache.set('health_check', 'ok', 10)
        if cache.get('health_check') == 'ok':
            health_status["checks"]["cache"] = "ok"
        else:
            health_status["checks"]["cache"] = "error: cache not working"
    except Exception as e:
        health_status["checks"]["cache"] = f"not configured: {str(e)}"
    
    # Check memory usage
    try:
        process = psutil.Process()
        memory_info = process.memory_info()
        health_status["memory"] = {
            "rss_mb": round(memory_info.rss / 1024 / 1024, 2),
            "vms_mb": round(memory_info.vms / 1024 / 1024, 2),
            "percent": round(process.memory_percent(), 2)
        }
    except Exception as e:
        health_status["memory"] = f"error: {str(e)}"
    
    # Check CPU usage
    try:
        health_status["cpu_percent"] = psutil.cpu_percent(interval=0.1)
    except Exception as e:
        health_status["cpu_percent"] = f"error: {str(e)}"
    
    # Check disk usage
    try:
        disk_usage = psutil.disk_usage('/')
        health_status["disk"] = {
            "total_gb": round(disk_usage.total / 1024 / 1024 / 1024, 2),
            "used_gb": round(disk_usage.used / 1024 / 1024 / 1024, 2),
            "free_gb": round(disk_usage.free / 1024 / 1024 / 1024, 2),
            "percent": disk_usage.percent
        }
    except Exception as e:
        health_status["disk"] = f"error: {str(e)}"
    
    # Environment info (sanitized)
    health_status["environment"] = {
        "django_settings_module": os.environ.get('DJANGO_SETTINGS_MODULE', 'not set'),
        "debug": os.environ.get('DEBUG', 'not set'),
        "allowed_hosts": os.environ.get('DJANGO_ALLOWED_HOSTS', 'not set')[:50] + "..."
    }
    
    # Return appropriate status code
    status_code = 200 if health_status["status"] == "healthy" else 503
    
    return JsonResponse(health_status, status=status_code)

def simple_health_check(request):
    """
    Simple health check endpoint for basic monitoring
    """
    return JsonResponse({"status": "ok"})
`;

// Dockerrun.aws.json for Elastic Beanstalk
const DOCKERRUN_CONFIG = `{
  "AWSEBDockerrunVersion": "1",
  "Image": {
    "Name": "python:3.12-slim",
    "Update": "true"
  },
  "Ports": [
    {
      "ContainerPort": 8000,
      "HostPort": 8000
    }
  ],
  "Volumes": [],
  "Logging": "/var/log/eb-docker"
}
`;

// Procfile for backup (in case Docker fails)
const PROCFILE_CONTENT = `web: gunicorn pyfactor.wsgi:application --bind 0.0.0.0:$PORT --workers 2 --threads 2 --timeout 120 --log-file -
`;

// Function to create backup
function createBackup(filePath) {
    if (existsSync(filePath)) {
        const backupPath = `${filePath}.backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
        writeFileSync(backupPath, readFileSync(filePath, 'utf8'));
        console.log(`✅ Created backup: ${backupPath}`);
    }
}

// Function to update requirements if missing psutil
function updateRequirements() {
    const reqPath = join(BACKEND_PATH, 'requirements-eb.txt');
    if (existsSync(reqPath)) {
        let requirements = readFileSync(reqPath, 'utf8');
        
        // Add psutil if not present
        if (!requirements.includes('psutil')) {
            requirements += '\n# System monitoring\npsutil==5.9.8\n';
            writeFileSync(reqPath, requirements);
            console.log('✅ Added psutil to requirements-eb.txt');
        }
    }
}

// Function to fix settings_eb.py
function fixSettingsEB() {
    if (existsSync(SETTINGS_EB_PATH)) {
        let settings = readFileSync(SETTINGS_EB_PATH, 'utf8');
        
        // Ensure LOGGING configuration doesn't break the app
        if (!settings.includes('LOGGING_CONFIG = None')) {
            settings = settings.replace(
                /LOGGING = {[\s\S]*?^}/m,
                `# Disable Django's logging setup to prevent conflicts
LOGGING_CONFIG = None

# Configure logging manually
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)`
            );
        }
        
        // Ensure STATIC_ROOT is set
        if (!settings.includes('STATIC_ROOT')) {
            settings += `\n# Static files configuration
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATIC_URL = '/static/'
`;
        }
        
        writeFileSync(SETTINGS_EB_PATH, settings);
        console.log('✅ Fixed settings_eb.py configuration');
    }
}

// Main execution
try {
    console.log('📋 Step 1: Creating backups...');
    createBackup(DOCKERFILE_PATH);
    createBackup(START_SCRIPT_PATH);
    createBackup(HEALTH_VIEWS_PATH);
    
    console.log('\n📋 Step 2: Updating Dockerfile...');
    writeFileSync(DOCKERFILE_PATH, ENHANCED_DOCKERFILE);
    console.log('✅ Updated Dockerfile with enhanced configuration');
    
    console.log('\n📋 Step 3: Creating startup script...');
    writeFileSync(START_SCRIPT_PATH, ENHANCED_START_SCRIPT);
    console.log('✅ Created enhanced startup script');
    
    console.log('\n📋 Step 4: Updating health check view...');
    writeFileSync(HEALTH_VIEWS_PATH, ENHANCED_HEALTH_VIEW);
    console.log('✅ Updated health check with comprehensive diagnostics');
    
    console.log('\n📋 Step 5: Creating Dockerrun.aws.json...');
    writeFileSync(DOCKERRUN_PATH, DOCKERRUN_CONFIG);
    console.log('✅ Created Dockerrun.aws.json configuration');
    
    console.log('\n📋 Step 6: Creating Procfile as backup...');
    writeFileSync(PROCFILE_PATH, PROCFILE_CONTENT);
    console.log('✅ Created Procfile for non-Docker deployment');
    
    console.log('\n📋 Step 7: Updating requirements...');
    updateRequirements();
    
    console.log('\n📋 Step 8: Fixing Django settings...');
    fixSettingsEB();
    
    console.log('\n🎉 Docker container crash fixes applied successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Rebuild Docker image: docker build -t pyfactor-backend backend/pyfactor/');
    console.log('2. Test locally: docker run -p 8000:8000 --env-file backend/pyfactor/.env pyfactor-backend');
    console.log('3. Check health endpoint: curl http://localhost:8000/health/');
    console.log('4. Deploy to Elastic Beanstalk: eb deploy');
    console.log('\n⚠️  Important: Ensure all environment variables are set in Elastic Beanstalk configuration');
    
} catch (error) {
    console.error('❌ Error applying fixes:', error);
    process.exit(1);
}
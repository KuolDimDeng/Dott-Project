#!/bin/bash
# Comprehensive Django CORS Setup for Elastic Beanstalk
# This configures Django with proper CORS settings for production

echo "🔧 Setting up Django CORS configuration..."

# Create a requirements file with django-cors-headers
cat > /tmp/cors-requirements.txt << 'EOF'
django-cors-headers>=4.0.0
EOF

# Find the Django project directory
DJANGO_DIR="/var/app/staging"
SETTINGS_FILE="$DJANGO_DIR/pyfactor/settings.py"

echo "📂 Django directory: $DJANGO_DIR"
echo "⚙️ Settings file: $SETTINGS_FILE"

# Check if settings file exists
if [ ! -f "$SETTINGS_FILE" ]; then
    echo "❌ Django settings file not found at $SETTINGS_FILE"
    echo "🔍 Looking for alternative locations..."
    find /var/app/staging -name "settings.py" -type f 2>/dev/null || echo "No settings.py found"
    exit 1
fi

# Create backup of settings file
BACKUP_FILE="${SETTINGS_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
cp "$SETTINGS_FILE" "$BACKUP_FILE"
echo "💾 Backup created: $BACKUP_FILE"

# Check if corsheaders is already in INSTALLED_APPS
if grep -q "corsheaders" "$SETTINGS_FILE"; then
    echo "✅ corsheaders already in INSTALLED_APPS"
else
    echo "📝 Adding corsheaders to INSTALLED_APPS..."
    
    # Add corsheaders to INSTALLED_APPS
    sed -i "/INSTALLED_APPS = \[/a\\    'corsheaders'," "$SETTINGS_FILE"
fi

# Check if CorsMiddleware is already in MIDDLEWARE
if grep -q "corsheaders.middleware.CorsMiddleware" "$SETTINGS_FILE"; then
    echo "✅ CorsMiddleware already in MIDDLEWARE"
else
    echo "📝 Adding CorsMiddleware to MIDDLEWARE..."
    
    # Add CorsMiddleware at the top of MIDDLEWARE
    sed -i "/MIDDLEWARE = \[/a\\    'corsheaders.middleware.CorsMiddleware'," "$SETTINGS_FILE"
fi

# Add comprehensive CORS settings
echo "📝 Adding CORS configuration..."

# Remove any existing CORS configuration
sed -i '/# CORS Configuration/,/^$/d' "$SETTINGS_FILE"

# Add new CORS configuration at the end of the file
cat >> "$SETTINGS_FILE" << 'EOF'

# CORS Configuration for Production
import os

# Enable CORS for all origins in production (can be restricted as needed)
CORS_ALLOW_ALL_ORIGINS = True

# Specific allowed origins (optional, can be used instead of ALLOW_ALL_ORIGINS)
CORS_ALLOWED_ORIGINS = [
    "https://dottapps.com",
    "https://www.dottapps.com",
    "http://localhost:3000",
    "https://localhost:3000",
]

# Allow credentials for authenticated requests
CORS_ALLOW_CREDENTIALS = True

# Custom headers that your frontend needs to send
CORS_ALLOW_HEADERS = [
    'accept',
    'authorization',
    'content-type',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
    'x-tenant-id',
    'x-business-id', 
    'x-schema-name',
    'x-data-source',
    'x-database-only',
    'x-cognito-sub',
    'x-onboarding-status',
    'x-setup-done',
    'x-request-id',
    'origin',
    'x-forwarded-for',
    'x-forwarded-proto',
    'cache-control',
    'pragma',
]

# HTTP methods to allow
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS', 
    'PATCH',
    'POST',
    'PUT',
]

# How long browsers can cache CORS preflight responses
CORS_PREFLIGHT_MAX_AGE = 86400

# Additional CORS settings for better compatibility
CORS_REPLACE_HTTPS_REFERER = True

print("🔧 CORS Configuration Loaded:")
print(f"   CORS_ALLOW_ALL_ORIGINS: {CORS_ALLOW_ALL_ORIGINS}")
print(f"   CORS_ALLOWED_ORIGINS: {len(CORS_ALLOWED_ORIGINS)} domains")
print(f"   CORS_ALLOW_HEADERS: {len(CORS_ALLOW_HEADERS)} headers")
print(f"   CORS_ALLOW_METHODS: {CORS_ALLOW_METHODS}")
print(f"   CORS_ALLOW_CREDENTIALS: {CORS_ALLOW_CREDENTIALS}")

EOF

echo "✅ Django CORS configuration completed!"
echo "📋 Configuration summary:"
echo "   - corsheaders added to INSTALLED_APPS"
echo "   - CorsMiddleware added to MIDDLEWARE"
echo "   - Comprehensive CORS settings configured"
echo "   - Custom headers for your app included"
echo "   - Production-ready settings applied"

# Validate the Python syntax
echo "🔍 Validating Python syntax..."
cd "$DJANGO_DIR" && python -m py_compile pyfactor/settings.py
if [ $? -eq 0 ]; then
    echo "✅ Settings file syntax is valid"
else
    echo "❌ Settings file has syntax errors, restoring backup..."
    cp "$BACKUP_FILE" "$SETTINGS_FILE"
    exit 1
fi 
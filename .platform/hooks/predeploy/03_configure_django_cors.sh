#!/bin/bash
# Configure Django CORS settings for production
# This script modifies Django settings.py to properly handle CORS

set -e

echo "🔧 Configuring Django CORS settings..."

# Find Django settings file
DJANGO_DIR="/var/app/staging"
SETTINGS_FILE="$DJANGO_DIR/pyfactor/settings.py"

echo "📂 Django directory: $DJANGO_DIR"
echo "⚙️ Settings file: $SETTINGS_FILE"

# Check if settings file exists
if [ ! -f "$SETTINGS_FILE" ]; then
    echo "❌ Django settings file not found at $SETTINGS_FILE"
    echo "🔍 Searching for settings.py..."
    find /var/app/staging -name "settings.py" -type f 2>/dev/null | head -5
    exit 1
fi

# Create backup
BACKUP_FILE="${SETTINGS_FILE}.backup.cors.$(date +%Y%m%d_%H%M%S)"
cp "$SETTINGS_FILE" "$BACKUP_FILE"
echo "💾 Backup created: $BACKUP_FILE"

# Function to add corsheaders to INSTALLED_APPS if not present
add_corsheaders_to_installed_apps() {
    if grep -q "'corsheaders'" "$SETTINGS_FILE" || grep -q '"corsheaders"' "$SETTINGS_FILE"; then
        echo "✅ corsheaders already in INSTALLED_APPS"
    else
        echo "📝 Adding corsheaders to INSTALLED_APPS..."
        # Find INSTALLED_APPS and add corsheaders
        sed -i "/INSTALLED_APPS = \[/a\\    'corsheaders'," "$SETTINGS_FILE"
    fi
}

# Function to add CorsMiddleware to MIDDLEWARE if not present  
add_cors_middleware() {
    if grep -q "corsheaders.middleware.CorsMiddleware" "$SETTINGS_FILE"; then
        echo "✅ CorsMiddleware already in MIDDLEWARE"
    else
        echo "📝 Adding CorsMiddleware to MIDDLEWARE..."
        # Add at the beginning of MIDDLEWARE for proper processing order
        sed -i "/MIDDLEWARE = \[/a\\    'corsheaders.middleware.CorsMiddleware'," "$SETTINGS_FILE"
    fi
}

# Function to add comprehensive CORS configuration
add_cors_configuration() {
    echo "📝 Adding comprehensive CORS configuration..."
    
    # Remove any existing CORS configuration to avoid duplicates
    sed -i '/# CORS Configuration/,/^# End CORS Configuration$/d' "$SETTINGS_FILE"
    
    # Add new CORS configuration at the end of the file
    cat >> "$SETTINGS_FILE" << 'EOF'

# CORS Configuration
import os

# Read CORS settings from environment variables
CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL_ORIGINS', 'True').lower() in ('true', '1', 'yes', 'on')

# Allowed origins (fallback if CORS_ALLOW_ALL_ORIGINS is False)
CORS_ALLOWED_ORIGINS = []
if os.environ.get('CORS_ALLOWED_ORIGINS'):
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in os.environ.get('CORS_ALLOWED_ORIGINS').split(',')]
else:
    CORS_ALLOWED_ORIGINS = [
        "https://dottapps.com",
        "https://www.dottapps.com",
        "http://localhost:3000",
        "https://localhost:3000",
    ]

# Allow credentials for authenticated requests
CORS_ALLOW_CREDENTIALS = os.environ.get('CORS_ALLOW_CREDENTIALS', 'True').lower() in ('true', '1', 'yes', 'on')

# Custom headers that the frontend needs to send
CORS_ALLOW_HEADERS = []
if os.environ.get('CORS_ALLOW_HEADERS'):
    CORS_ALLOW_HEADERS = [header.strip() for header in os.environ.get('CORS_ALLOW_HEADERS').split(',')]
else:
    # Default headers if environment variable not set
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
CORS_ALLOW_METHODS = []
if os.environ.get('CORS_ALLOW_METHODS'):
    CORS_ALLOW_METHODS = [method.strip() for method in os.environ.get('CORS_ALLOW_METHODS').split(',')]
else:
    CORS_ALLOW_METHODS = [
        'DELETE',
        'GET',
        'OPTIONS',
        'PATCH',
        'POST',
        'PUT',
    ]

# How long browsers can cache CORS preflight responses
CORS_PREFLIGHT_MAX_AGE = int(os.environ.get('CORS_MAX_AGE', 86400))

# Additional CORS settings for better compatibility
CORS_REPLACE_HTTPS_REFERER = True

# Debug logging for CORS configuration
if DEBUG:
    print("🔧 CORS Configuration Loaded:")
    print(f"   CORS_ALLOW_ALL_ORIGINS: {CORS_ALLOW_ALL_ORIGINS}")
    print(f"   CORS_ALLOWED_ORIGINS: {len(CORS_ALLOWED_ORIGINS)} domains")
    print(f"   CORS_ALLOW_HEADERS: {len(CORS_ALLOW_HEADERS)} headers")
    print(f"   CORS_ALLOW_METHODS: {CORS_ALLOW_METHODS}")
    print(f"   CORS_ALLOW_CREDENTIALS: {CORS_ALLOW_CREDENTIALS}")
    print(f"   CORS_PREFLIGHT_MAX_AGE: {CORS_PREFLIGHT_MAX_AGE}")

# End CORS Configuration
EOF
}

# Apply all configurations
echo "🔄 Applying CORS configuration..."

add_corsheaders_to_installed_apps
add_cors_middleware  
add_cors_configuration

# Validate Python syntax
echo "🔍 Validating Django settings syntax..."
cd "$DJANGO_DIR"
if python -m py_compile pyfactor/settings.py; then
    echo "✅ Django settings syntax is valid"
else
    echo "❌ Settings file has syntax errors, restoring backup..."
    cp "$BACKUP_FILE" "$SETTINGS_FILE"
    exit 1
fi

echo "✅ Django CORS configuration completed successfully!"
echo "📋 Configuration summary:"
echo "   - corsheaders added to INSTALLED_APPS"
echo "   - CorsMiddleware added to MIDDLEWARE (at the beginning)"
echo "   - Environment variable-based CORS settings configured"
echo "   - Support for all required custom headers"
echo "   - Production-ready settings applied"
echo ""
echo "🎯 Expected CORS headers after deployment:"
echo "   ✅ X-Tenant-ID"
echo "   ✅ X-Business-ID"
echo "   ✅ X-Schema-Name"
echo "   ✅ X-Data-Source"
echo "   ✅ All standard headers" 
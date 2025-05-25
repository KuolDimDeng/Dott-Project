#!/bin/bash
# Configure Django CORS settings using environment variables
# This runs before deployment to ensure CORS is properly configured

echo "🔧 Configuring Django CORS settings..."

# Find the Django settings file
SETTINGS_FILE="/var/app/staging/pyfactor/settings.py"

if [ ! -f "$SETTINGS_FILE" ]; then
    echo "❌ Django settings file not found at $SETTINGS_FILE"
    exit 1
fi

# Create backup
cp "$SETTINGS_FILE" "${SETTINGS_FILE}.backup.$(date +%Y%m%d_%H%M%S)"

# Add CORS configuration to Django settings
cat >> "$SETTINGS_FILE" << 'EOF'

# CORS Configuration from Environment Variables
import os

# CORS settings for production
CORS_ALLOW_ALL_ORIGINS = os.environ.get('CORS_ALLOW_ALL_ORIGINS', 'False').lower() in ('true', '1', 'yes', 'on')
CORS_ALLOW_CREDENTIALS = os.environ.get('CORS_ALLOW_CREDENTIALS', 'False').lower() in ('true', '1', 'yes', 'on')

# Allowed origins
CORS_ALLOWED_ORIGINS = []
if os.environ.get('CORS_ALLOWED_ORIGINS'):
    CORS_ALLOWED_ORIGINS = [origin.strip() for origin in os.environ.get('CORS_ALLOWED_ORIGINS').split(',')]

# Allowed headers - critical for frontend-backend communication
CORS_ALLOW_HEADERS = []
if os.environ.get('CORS_ALLOW_HEADERS'):
    CORS_ALLOW_HEADERS = [header.strip() for header in os.environ.get('CORS_ALLOW_HEADERS').split(',')]
else:
    # Default headers if not set
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
        'x-forwarded-proto'
    ]

# Allowed methods
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
        'PUT'
    ]

# Cache time for CORS preflight requests
CORS_MAX_AGE = int(os.environ.get('CORS_MAX_AGE', 86400))

# Additional CORS settings for better compatibility
CORS_PREFLIGHT_MAX_AGE = CORS_MAX_AGE
CORS_REPLACE_HTTPS_REFERER = True

print(f"CORS Configuration Applied:")
print(f"  CORS_ALLOW_ALL_ORIGINS: {CORS_ALLOW_ALL_ORIGINS}")
print(f"  CORS_ALLOWED_ORIGINS: {CORS_ALLOWED_ORIGINS}")
print(f"  CORS_ALLOW_HEADERS: {len(CORS_ALLOW_HEADERS)} headers configured")
print(f"  CORS_ALLOW_METHODS: {CORS_ALLOW_METHODS}")
print(f"  CORS_ALLOW_CREDENTIALS: {CORS_ALLOW_CREDENTIALS}")

EOF

echo "✅ Django CORS configuration updated successfully!"
echo "📋 Settings file: $SETTINGS_FILE"
echo "💾 Backup created: ${SETTINGS_FILE}.backup.$(date +%Y%m%d_%H%M%S)" 
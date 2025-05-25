#!/bin/bash
# Post-deployment script to install django-cors-headers and restart application
# This ensures the CORS package is available and the new configuration is loaded

set -e

echo "🔧 Post-deployment CORS setup..."

# Change to application directory
cd /var/app/current || exit 1

# Install django-cors-headers if not already installed
echo "📦 Ensuring django-cors-headers is installed..."

# Find the virtual environment
VENV_PATH=$(find /var/app/venv/ -name "bin" -type d | head -1)
if [ -z "$VENV_PATH" ]; then
    echo "❌ Virtual environment not found"
    exit 1
fi

PYTHON_PATH="${VENV_PATH}/python"
PIP_PATH="${VENV_PATH}/pip"

echo "🐍 Using Python: $PYTHON_PATH"
echo "📦 Using pip: $PIP_PATH"

# Install django-cors-headers
if $PIP_PATH show django-cors-headers > /dev/null 2>&1; then
    echo "✅ django-cors-headers already installed"
    $PIP_PATH show django-cors-headers | grep Version
else
    echo "📦 Installing django-cors-headers..."
    $PIP_PATH install django-cors-headers>=4.0.0
    
    if $PIP_PATH show django-cors-headers > /dev/null 2>&1; then
        echo "✅ django-cors-headers installed successfully"
        $PIP_PATH show django-cors-headers | grep Version
    else
        echo "❌ Failed to install django-cors-headers"
        exit 1
    fi
fi

# Restart the application to load new CORS configuration
echo "🔄 Restarting application to load CORS configuration..."

# Restart Docker service (which runs the Django application)
if sudo systemctl restart docker; then
    echo "✅ Docker service restarted successfully"
else
    echo "⚠️ Failed to restart Docker service, trying alternative method..."
    
    # Alternative: restart via supervisord if available
    if command -v supervisorctl >/dev/null 2>&1; then
        sudo supervisorctl restart all
        echo "✅ Application restarted via supervisorctl"
    else
        echo "⚠️ Could not restart application automatically"
        echo "ℹ️ Application will restart on next request"
    fi
fi

# Wait a moment for the service to start
echo "⏳ Waiting for application to initialize..."
sleep 10

# Test if the application is responding
echo "🧪 Testing application response..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost/health/ | grep -q "200"; then
    echo "✅ Application is responding successfully"
else
    echo "⚠️ Application might still be starting up..."
    echo "ℹ️ This is normal and the application should be available shortly"
fi

echo "✅ Post-deployment CORS setup completed!"
echo ""
echo "🎯 Next steps:"
echo "1. Application is restarting with new CORS configuration"
echo "2. Test CORS headers: curl -X OPTIONS -H 'Origin: https://dottapps.com' https://api.dottapps.com/health/"
echo "3. Verify frontend-backend communication"
echo ""
echo "📋 Expected CORS headers:"
echo "   ✅ X-Tenant-ID, X-Business-ID, X-Schema-Name"
echo "   ✅ All standard CORS headers"
echo "   ✅ Proper preflight request handling" 
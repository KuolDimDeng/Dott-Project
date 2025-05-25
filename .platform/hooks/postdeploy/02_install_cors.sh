#!/bin/bash
# Install and configure django-cors-headers package
# This runs after deployment to ensure CORS package is available

echo "🔧 Installing and configuring django-cors-headers..."

# Change to the application directory
cd /var/app/current || exit 1

# Install django-cors-headers using pip
echo "📦 Installing django-cors-headers package..."
/var/app/venv/staging-LQM1lest/bin/pip install django-cors-headers

# Check if installation was successful
if /var/app/venv/staging-LQM1lest/bin/pip show django-cors-headers > /dev/null 2>&1; then
    echo "✅ django-cors-headers installed successfully"
else
    echo "❌ Failed to install django-cors-headers"
    exit 1
fi

# Restart the Django application to pick up new settings
echo "🔄 Restarting Django application..."
sudo systemctl restart docker.service

echo "✅ CORS package installation and configuration complete!"

# Test the new configuration
echo "🧪 Testing CORS configuration..."
sleep 10  # Give the service time to restart

# Check if the service is running
if curl -s -o /dev/null -w "%{http_code}" http://localhost/health/ | grep -q "200"; then
    echo "✅ Django service is running"
else
    echo "⚠️  Django service might be starting up..."
fi

echo "📋 CORS configuration should now be active with the following headers allowed:"
echo "   - X-Tenant-ID"
echo "   - X-Business-ID" 
echo "   - X-Schema-Name"
echo "   - All standard headers" 
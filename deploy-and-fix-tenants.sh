#!/bin/bash

# Deploy script with tenant ID fix
set -e

echo "🚀 Starting deployment with tenant ID fixes..."

# Change to backend directory
cd backend/pyfactor

# Pull latest changes
echo "📥 Pulling latest changes..."
git pull

# Install dependencies if needed
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Run migrations
echo "🗃️ Running migrations..."
python manage.py migrate

# Fix invalid tenant IDs
echo "🔧 Fixing invalid tenant IDs in OnboardingProgress..."
python manage.py fix_invalid_tenant_ids

# Collect static files
echo "📁 Collecting static files..."
python manage.py collectstatic --noinput

# Restart the application (adjust based on your deployment method)
echo "🔄 Restarting application..."
# For systemd service:
# sudo systemctl restart your-app-name
# For Docker:
# docker-compose restart backend
# For PM2:
# pm2 restart backend

echo "✅ Deployment complete with tenant ID fixes applied!"
echo "📊 Check the output above for details on fixed tenant IDs"
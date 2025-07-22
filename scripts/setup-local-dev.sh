#!/bin/bash

# Local Development Setup Script for Dott Platform

set -e  # Exit on any error

echo "🚀 Setting up Dott local development environment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo "📝 Creating .env.local from template..."
    cp .env.local.example .env.local
    echo "⚠️  Please edit .env.local with your actual API keys and secrets"
    echo "   You can find these values in your Render dashboard environment variables"
    read -p "Press Enter when you've updated .env.local with your keys..."
fi

# Load environment variables
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v ^# | xargs)
fi

echo "🏗️  Building and starting services..."

# Build and start all services
docker-compose -f docker-compose.local.yml up --build -d

echo "⏳ Waiting for services to be ready..."

# Wait for database to be ready
echo "🗄️  Waiting for PostgreSQL..."
until docker-compose -f docker-compose.local.yml exec -T db pg_isready -U dott_user -d dott_local; do
    sleep 2
done

# Wait for Redis to be ready
echo "🔄 Waiting for Redis..."
until docker-compose -f docker-compose.local.yml exec -T redis redis-cli ping | grep PONG; do
    sleep 2
done

echo "🎯 Running database migrations..."
docker-compose -f docker-compose.local.yml exec backend python manage.py migrate

echo "👤 Creating superuser (admin account)..."
docker-compose -f docker-compose.local.yml exec backend python manage.py shell -c "
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(email='admin@dottapps.com').exists():
    User.objects.create_superuser('admin@dottapps.com', 'admin123')
    print('Superuser created: admin@dottapps.com / admin123')
else:
    print('Superuser already exists')
"

echo "📊 Loading initial data..."
# Add any initial data loading scripts here if needed

echo "✅ Local development environment is ready!"
echo ""
echo "🌐 Access your application:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:8000"
echo "   Django Admin: http://localhost:8000/admin"
echo "   Admin login: admin@dottapps.com / admin123"
echo ""
echo "📝 Useful commands:"
echo "   View logs: docker-compose -f docker-compose.local.yml logs -f"
echo "   Stop services: docker-compose -f docker-compose.local.yml down"
echo "   Restart services: docker-compose -f docker-compose.local.yml restart"
echo "   Run Django commands: docker-compose -f docker-compose.local.yml exec backend python manage.py <command>"
echo "   Access database: docker-compose -f docker-compose.local.yml exec db psql -U dott_user -d dott_local"
echo ""
echo "🚀 Happy coding!"
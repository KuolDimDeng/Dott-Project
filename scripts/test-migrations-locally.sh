#!/bin/bash
# Script to test Django migrations locally in Docker before deploying

echo "🧪 Testing Django Migrations Locally"
echo "===================================="

# Stop any existing containers
echo "🛑 Stopping existing containers..."
docker-compose -f docker-compose.local.yml down

# Clean up to ensure fresh database
echo "🧹 Cleaning up old data..."
docker volume rm projectx_postgres_data 2>/dev/null || true

# Start only database and redis
echo "🚀 Starting database and Redis..."
docker-compose -f docker-compose.local.yml up -d db redis

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Run migrations in a temporary backend container
echo "🔄 Running migrations..."
docker-compose -f docker-compose.local.yml run --rm backend sh -c "
    echo '📋 Checking for migration issues...'
    python manage.py showmigrations
    echo ''
    echo '🔧 Making migrations if needed...'
    python manage.py makemigrations --dry-run
    echo ''
    echo '✅ Running all migrations...'
    python manage.py migrate --verbosity 2
"

# Check migration status
echo ""
echo "📊 Final migration status:"
docker-compose -f docker-compose.local.yml run --rm backend python manage.py showmigrations

# Clean up
echo ""
echo "🧹 Cleaning up..."
docker-compose -f docker-compose.local.yml down

echo ""
echo "✅ Migration test complete!"
echo "If no errors were shown above, migrations are ready for production deployment."
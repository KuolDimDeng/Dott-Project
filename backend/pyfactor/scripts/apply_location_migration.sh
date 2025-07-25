#!/bin/bash

# Script to apply the location migration on production
# This should be run on the production server with proper DATABASE_URL

echo "🔧 APPLYING LOCATION MIGRATION"
echo "================================"

# Check if we're in the right directory
if [ ! -f "manage.py" ]; then
    echo "❌ Error: manage.py not found. Please run this script from the Django project root."
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL environment variable is not set."
    echo "   Please set it to your production database URL."
    exit 1
fi

echo "📊 Current migration status:"
python manage.py showmigrations inventory

echo ""
echo "🎯 Applying location migration..."
python manage.py migrate inventory 0010_add_structured_address_to_location

if [ $? -eq 0 ]; then
    echo "✅ Migration applied successfully!"
    echo ""
    echo "📋 Updated migration status:"
    python manage.py showmigrations inventory
    echo ""
    echo "🔍 Verifying migration with check script..."
    python scripts/check_location_migration.py
else
    echo "❌ Migration failed! Please check the error messages above."
    exit 1
fi

echo ""
echo "🎉 Location migration complete!"
echo "   You can now update locations with structured address fields."
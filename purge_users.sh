#!/bin/bash

echo "🗑️  Purging all user data from the database..."
echo ""
echo "⚠️  This will delete ALL users, tenants, and onboarding progress!"
echo ""

# Navigate to backend directory
cd backend/pyfactor

# Run the purge command
python manage.py purge_all_users_complete

echo ""
echo "✅ Purge complete! You can now test with fresh users."
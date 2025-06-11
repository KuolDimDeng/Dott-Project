#!/bin/bash

# Database Purge Script for Render
# This script helps you purge all user data from the database

echo "🗑️  Database Purge Script"
echo "========================"
echo ""
echo "This script will delete ALL user data from your database:"
echo "- All User records"
echo "- All Tenant records" 
echo "- All OnboardingProgress records"
echo "- All Auth0User records"
echo "- All UserTenantRole records"
echo ""
echo "⚠️  THIS ACTION CANNOT BE UNDONE!"
echo ""

# Check if --force flag is provided
if [ "$1" == "--force" ]; then
    echo "Force flag detected. Proceeding without confirmation..."
    FORCE_FLAG="--force"
else
    echo "Press Ctrl+C to cancel, or Enter to continue..."
    read -r
    FORCE_FLAG=""
fi

# Navigate to backend directory
cd backend/pyfactor || exit 1

# Run the purge command
echo ""
echo "Running purge command..."
echo "------------------------"
python manage.py purge_all_users_complete $FORCE_FLAG

# Check exit status
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Database purge completed successfully!"
    echo ""
    echo "Next steps:"
    echo "1. Delete users from Auth0 dashboard"
    echo "2. Create fresh test users"
    echo "3. Test the complete onboarding flow"
else
    echo ""
    echo "❌ Database purge failed!"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check database connection"
    echo "2. Verify you're in the correct directory"
    echo "3. Check for import errors in the management command"
fi
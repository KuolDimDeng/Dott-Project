#!/bin/bash

# Script to apply account deletion fields to the database

echo "🔄 Applying account deletion fields to database..."

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Apply the SQL changes
echo "📝 Running SQL migration..."
python manage.py dbshell < add_account_deletion_fields.sql

if [ $? -eq 0 ]; then
    echo "✅ Account deletion fields added successfully!"
    echo ""
    echo "📋 Summary of changes:"
    echo "  - Added soft delete fields to custom_auth_user table:"
    echo "    • is_deleted (boolean)"
    echo "    • deleted_at (timestamp)"
    echo "    • deletion_reason (varchar)"
    echo "    • deletion_feedback (text)"
    echo "    • deletion_initiated_by (varchar)"
    echo ""
    echo "  - Created custom_auth_account_deletion_log table for audit trail"
    echo ""
    echo "🔐 Account closure now:"
    echo "  1. Marks accounts as deleted (soft delete)"
    echo "  2. Prevents deleted users from signing in"
    echo "  3. Keeps data for compliance/audit purposes"
    echo "  4. Creates permanent audit log of deletions"
    echo "  5. Optionally deletes from Auth0 if configured"
else
    echo "❌ Failed to apply account deletion fields"
    exit 1
fi
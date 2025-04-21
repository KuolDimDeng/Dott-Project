#!/bin/bash
# Script to fix RLS issues in the database

# Configuration - change these to match your environment
DB_HOST=${DB_HOST:-"dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com"}
DB_NAME=${DB_NAME:-"dott_main"}
DB_USER=${DB_USER:-"dott_admin"}
DB_PORT=${DB_PORT:-"5432"}

# Check if DB_PASSWORD is set
if [ -z "$DB_PASSWORD" ]; then
  echo "DB_PASSWORD environment variable is not set."
  echo "You can set it by running: export DB_PASSWORD=yourpassword"
  echo "Or enter the password now:"
  read -s DB_PASSWORD
  echo ""
fi

# Message
echo "🛡️  Running RLS Fix Script..."
echo "This script will fix Row Level Security issues in your database."
echo "Database: $DB_NAME on $DB_HOST"
echo "User: $DB_USER"

# Ask for confirmation
echo ""
echo "Do you want to continue? (y/n)"
read confirm

if [ "$confirm" != "y" ]; then
  echo "Operation cancelled."
  exit 1
fi

# Run the SQL script
echo "Running SQL script..."
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -d "$DB_NAME" -U "$DB_USER" -p "$DB_PORT" -f fix_rls.sql

# Check if the script executed successfully
if [ $? -eq 0 ]; then
  echo "✅ RLS Fix Script executed successfully!"
  echo "The Row Level Security issues should now be fixed."
  echo "Restart your application to verify the changes."
else
  echo "❌ Error running the SQL script."
  echo "Check the error messages above for details."
fi

# Tips
echo ""
echo "📝 Additional Tips:"
echo "1. If you still see RLS errors, try restarting your application server."
echo "2. You can run 'python run_https_server_fixed.py' to restart with the fixed configuration."
echo "3. Check the logs for any remaining RLS warnings."
echo ""
echo "For more information, see the RLS_MIGRATION_GUIDE.md file." 
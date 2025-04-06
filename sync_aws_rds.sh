#!/bin/bash

# Script to synchronize Django models with AWS RDS database
# This script can be run whenever you make changes to your models and want to update the database schema

# Change to project directory
cd "$(dirname "$0")"

# Activate virtual environment
if [ -d ".venv" ]; then
    echo "Activating virtual environment..."
    source .venv/bin/activate
else
    echo "Virtual environment not found at .venv. Attempting to continue anyway..."
fi

# Parse arguments
KEEP_MIGRATIONS=false
CREATE_ADMIN=false
SKIP_RLS=false
TENANT_ID=""
ADMIN_EMAIL=""
ADMIN_PASSWORD=""

# Process options
while [[ $# -gt 0 ]]; do
    case $1 in
        --keep-migrations)
            KEEP_MIGRATIONS=true
            shift
            ;;
        --create-admin)
            CREATE_ADMIN=true
            shift
            ;;
        --skip-rls)
            SKIP_RLS=true
            shift
            ;;
        --tenant-id)
            TENANT_ID="$2"
            shift 2
            ;;
        --admin-email)
            ADMIN_EMAIL="$2"
            shift 2
            ;;
        --admin-password)
            ADMIN_PASSWORD="$2"
            shift 2
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Build command with appropriate flags
COMMAND="cd backend/pyfactor && python manage.py reset_db_rls"

if [ "$KEEP_MIGRATIONS" = true ]; then
    COMMAND="${COMMAND} --keep-migrations"
fi

if [ "$CREATE_ADMIN" = true ]; then
    COMMAND="${COMMAND} --create-admin"
    
    # Add admin email and password if provided
    if [ ! -z "$ADMIN_EMAIL" ]; then
        COMMAND="${COMMAND} --admin-email=${ADMIN_EMAIL}"
    fi
    
    if [ ! -z "$ADMIN_PASSWORD" ]; then
        COMMAND="${COMMAND} --admin-password=${ADMIN_PASSWORD}"
    fi
fi

if [ "$SKIP_RLS" = true ]; then
    COMMAND="${COMMAND} --skip-rls"
fi

if [ ! -z "$TENANT_ID" ]; then
    COMMAND="${COMMAND} --tenant-id=${TENANT_ID}"
fi

# Explain what's about to happen
echo "This script will completely reset your AWS RDS database and recreate it based on your Django models."
echo "All existing data will be deleted."
echo ""
echo "Command to run: ${COMMAND}"
echo ""
read -p "Are you sure you want to proceed? (y/n) " CONFIRM

if [[ "$CONFIRM" =~ ^[Yy]$ ]]; then
    echo "Starting database reset and sync..."
    # Execute the command
    eval "$COMMAND"
    
    # Check if it was successful
    if [ $? -eq 0 ]; then
        echo "Database sync completed successfully!"
        if [ "$CREATE_ADMIN" = true ]; then
            if [ ! -z "$ADMIN_EMAIL" ]; then
                echo ""
                echo "Admin user created with:"
                echo "- Email: ${ADMIN_EMAIL}"
                echo "- Password: ${ADMIN_PASSWORD:-'Admin123!'}"
            else
                echo ""
                echo "Default admin user created with:"
                echo "- Email: admin@example.com"
                echo "- Password: Admin123!"
                echo "NOTE: This default admin may not work with your authentication system."
                echo "You might need to create a user through your normal registration flow."
            fi
        fi
    else
        echo "Database sync failed. Check the error messages above."
    fi
else
    echo "Operation cancelled."
fi 
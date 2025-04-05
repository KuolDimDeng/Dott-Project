#!/bin/bash
# Tenant Database Synchronization Script
# Synchronizes tenant data between Django and Next.js databases

echo "==== Tenant Database Synchronization ===="
echo "This script will synchronize tenant data between your Django and Next.js databases."

# Set environment variables
export PYTHONPATH=./backend/pyfactor:$PYTHONPATH

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not installed."
    exit 1
fi

# Function to show usage
show_usage() {
    echo "Usage: ./sync-tenant-databases.sh [OPTION]"
    echo "Options:"
    echo "  --both       Sync in both directions (default)"
    echo "  --to-django  Sync from local database to Django AWS RDS"
    echo "  --to-local   Sync from Django AWS RDS to local database"
    echo "  --help       Show this help message"
}

# Parse command line arguments
DIRECTION="both"
if [ "$#" -gt 0 ]; then
    case "$1" in
        --both)
            DIRECTION="both"
            ;;
        --to-django)
            DIRECTION="to-django"
            ;;
        --to-local)
            DIRECTION="to-local"
            ;;
        --help)
            show_usage
            exit 0
            ;;
        *)
            echo "Error: Unknown option $1"
            show_usage
            exit 1
            ;;
    esac
fi

echo "Sync direction: $DIRECTION"
echo ""

# Run the synchronization script
echo "Running tenant synchronization..."
python3 backend/pyfactor/scripts/sync_tenant_data.py --direction "$DIRECTION"

# Display completion message
echo ""
echo "Synchronization completed!"
echo "You can now verify the tenant data in both databases."
echo ""
echo "To check Django database:"
echo "  python3 -c 'import psycopg2; conn = psycopg2.connect(dbname=\"dott_main\", user=\"postgres\", password=\"postgres\", host=\"dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com\"); cur = conn.cursor(); cur.execute(\"SELECT id, name, owner_id, schema_name FROM custom_auth_tenant\"); [print(row) for row in cur.fetchall()]'"
echo ""
echo "To check local database:"
echo "  python3 -c 'import psycopg2; conn = psycopg2.connect(dbname=\"dott_main\", user=\"postgres\", password=\"postgres\", host=\"localhost\"); cur = conn.cursor(); cur.execute(\"SELECT id, name, owner_id, schema_name FROM custom_auth_tenant\"); [print(row) for row in cur.fetchall()]'"
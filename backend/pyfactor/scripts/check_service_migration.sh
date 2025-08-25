#!/bin/bash
# Quick script to check and apply Service migration on staging/production

echo "=== Service Customer Field Migration Check ==="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if column exists
check_column() {
    echo "Checking if customer_id column exists in inventory_service table..."
    
    # Use Django shell to check
    python manage.py shell << 'EOF'
from django.db import connection
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'inventory_service' 
        AND column_name = 'customer_id';
    """)
    result = cursor.fetchone()
    if result:
        print("✅ Column customer_id EXISTS")
        exit(0)
    else:
        print("❌ Column customer_id MISSING")
        exit(1)
EOF
    return $?
}

# Function to check migration status
check_migration() {
    echo "Checking migration status..."
    
    python manage.py showmigrations inventory | grep "0016_add_customer_to_service"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Migration file found${NC}"
        
        # Check if applied (has [X])
        python manage.py showmigrations inventory | grep "\[X\] 0016_add_customer_to_service" > /dev/null
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Migration has been applied${NC}"
            return 0
        else
            echo -e "${RED}❌ Migration has NOT been applied${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Migration file not found!${NC}"
        return 2
    fi
}

# Main execution
echo "1. Checking column existence..."
check_column
column_result=$?

echo ""
echo "2. Checking migration status..."
check_migration
migration_result=$?

echo ""
echo "=== SUMMARY ==="

if [ $column_result -eq 0 ] && [ $migration_result -eq 0 ]; then
    echo -e "${GREEN}✅ Everything is properly configured!${NC}"
    echo "Service Management should work correctly."
elif [ $column_result -ne 0 ] && [ $migration_result -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Migration needs to be applied${NC}"
    echo ""
    echo "To fix this issue, run:"
    echo -e "${GREEN}python manage.py migrate inventory 0016${NC}"
    echo ""
    echo "Or to apply all pending migrations:"
    echo -e "${GREEN}python manage.py migrate${NC}"
elif [ $column_result -eq 0 ] && [ $migration_result -ne 0 ]; then
    echo -e "${YELLOW}⚠️  Column exists but migration not marked as applied${NC}"
    echo "Database is correct but migration tracking may be off."
    echo "Service Management should still work."
elif [ $column_result -ne 0 ] && [ $migration_result -eq 0 ]; then
    echo -e "${RED}❌ CRITICAL: Migration marked as applied but column is missing!${NC}"
    echo "This indicates a serious database inconsistency."
    echo "Manual intervention required."
fi

echo ""
echo "=== END ==="
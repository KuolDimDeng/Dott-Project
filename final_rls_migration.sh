#!/bin/bash

# Text colors
RED='\033[0;31m'
YELLOW='\033[0;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo -e "${RED}"
echo "========================================================"
echo "       FINAL RLS MIGRATION - REMOVE SCHEMA_NAME"
echo "========================================================"
echo -e "${YELLOW}"
echo "This script will:"
echo "1. Verify all tenants are using RLS"
echo "2. Create a backup of the tenant table"
echo "3. Add middlewares to provide schema_name compatibility"
echo "4. Update Django settings to use RLS middlewares"
echo "5. Remove the schema_name column from the database"
echo "6. Create a rollback plan in case of issues"
echo ""
echo "WARNING: This is an irreversible change. Only proceed when ALL your"
echo "code has been updated to use tenant_id instead of schema_name."
echo -e "${NC}"

# Ask for confirmation
read -p "$(echo -e ${RED}Type \"COMPLETE RLS MIGRATION\" to confirm this operation: ${NC})" answer

if [ "$answer" != "COMPLETE RLS MIGRATION" ]; then
    echo -e "${YELLOW}Operation cancelled.${NC}"
    exit 0
fi

# Database connection parameters
DB_HOST=${DB_HOST:-"dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com"}
DB_NAME=${DB_NAME:-"dott_main"} 
DB_USER=${DB_USER:-"dott_admin"}
DB_PASSWORD=${DB_PASSWORD:-"RRfXU6uPPUbBEg1JqGTJ"}
DB_PORT=${DB_PORT:-"5432"}

# Step 1: Verify all tenants are using RLS
echo -e "\n${YELLOW}Step 1: Verifying RLS status for all tenants...${NC}"

RLS_CHECK=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "
SELECT COUNT(*) FROM custom_auth_tenant WHERE rls_enabled = FALSE OR rls_enabled IS NULL;
")

if [ -z "$RLS_CHECK" ]; then
    echo -e "${RED}Error: Failed to check RLS status. Database connection failed.${NC}"
    exit 1
fi

RLS_CHECK=$(echo "$RLS_CHECK" | tr -d '[:space:]')

if [ "$RLS_CHECK" -ne "0" ]; then
    echo -e "${RED}Error: $RLS_CHECK tenants do not have RLS enabled. Please run the RLS migration first.${NC}"
    exit 1
fi

echo -e "${GREEN}All tenants are using RLS. Proceeding...${NC}"

# Step 2: Create a backup of the tenant table
echo -e "\n${YELLOW}Step 2: Creating backup of tenant table...${NC}"

BACKUP_RESULT=$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "
DROP TABLE IF EXISTS custom_auth_tenant_backup;
CREATE TABLE custom_auth_tenant_backup AS SELECT * FROM custom_auth_tenant;
SELECT COUNT(*) FROM custom_auth_tenant_backup;
")

BACKUP_COUNT=$(echo "$BACKUP_RESULT" | tr -d '[:space:]')

echo -e "${GREEN}Backup created with $BACKUP_COUNT tenant records.${NC}"

# Step 3: Verify required middleware exists
echo -e "\n${YELLOW}Step 3: Verifying required middleware exists...${NC}"

# Navigate to the Django project directory
cd backend/pyfactor || {
    echo -e "\n${RED}Error: Could not find backend/pyfactor directory. Aborting.${NC}"
    exit 1
}

# Check if SchemaNameMiddleware exists
if ! grep -q "class SchemaNameMiddleware" custom_auth/middleware.py; then
    echo -e "${YELLOW}Creating SchemaNameMiddleware for backward compatibility...${NC}"
    
    cat << 'EOF' >> custom_auth/middleware.py

class SchemaNameMiddleware:
    """
    Middleware to handle the removal of schema_name column by providing
    a consistent way to get the schema name from a tenant ID.
    
    This adds a method to the Tenant model instance dynamically to provide
    backward compatibility with code that expects tenant.schema_name.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        # Add schema_name property to Tenant model
        from custom_auth.models import Tenant
        
        # Only add if it doesn't already exist
        if not hasattr(Tenant, 'schema_name'):
            # Use setattr to add the property
            setattr(Tenant, 'schema_name', property(
                lambda self: get_schema_name_from_tenant_id(self.id))
            )
            logger.info("Added schema_name property to Tenant model")
            
        # Call the next middleware
        response = self.get_response(request)
        return response

def get_schema_name_from_tenant_id(tenant_id):
    """
    Generate a schema name from a tenant ID consistently.
    This replaces the schema_name field that was removed from the Tenant model.
    
    Args:
        tenant_id (str or UUID): The tenant ID
        
    Returns:
        str: The schema name in the format 'tenant_XYZ' with dashes replaced by underscores
    """
    if not tenant_id:
        return None
        
    # Convert UUID to string if needed and replace dashes with underscores
    return f"tenant_{str(tenant_id).replace('-', '_')}"
EOF

    echo -e "${GREEN}SchemaNameMiddleware created.${NC}"
fi

# Step 4: Update Django settings to use RLS middlewares
echo -e "\n${YELLOW}Step 4: Updating Django settings...${NC}"

# Check if middleware is already in settings
if ! grep -q "SchemaNameMiddleware" config/settings.py; then
    echo -e "${YELLOW}Adding SchemaNameMiddleware to settings...${NC}"
    
    # Use sed to add the middleware to the MIDDLEWARE list
    sed -i '' 's/MIDDLEWARE = \[/MIDDLEWARE = \[\n    "custom_auth.middleware.SchemaNameMiddleware",/' config/settings.py
    
    echo -e "${GREEN}Settings updated.${NC}"
else
    echo -e "${GREEN}SchemaNameMiddleware already in settings.${NC}"
fi

# Return to the original directory
cd ../../

# Step 5: Run the SQL migration to remove schema_name column
echo -e "\n${YELLOW}Step 5: Removing schema_name column...${NC}"

# Execute the SQL script
PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f remove_schema_name_migration.sql

if [ $? -ne 0 ]; then
    echo -e "${RED}Error: Failed to remove schema_name column. Check the SQL output above.${NC}"
    echo -e "${YELLOW}No changes to the database structure have been made.${NC}"
    exit 1
fi

echo -e "${GREEN}Successfully removed schema_name column!${NC}"

# Step 6: Create a rollback plan
echo -e "\n${YELLOW}Step 6: Creating rollback plan...${NC}"

cat > rollback_schema_name_removal.sql << EOF
-- ROLLBACK SCRIPT: Restore schema_name column from backup
-- Only run this in case of emergency

BEGIN;

-- Add schema_name column back
ALTER TABLE custom_auth_tenant ADD COLUMN schema_name VARCHAR(255);

-- Restore data from backup
UPDATE custom_auth_tenant t
SET schema_name = b.schema_name
FROM custom_auth_tenant_backup b
WHERE t.id = b.id;

-- Log completion
DO \$\$
BEGIN
    RAISE NOTICE 'Successfully restored schema_name column';
END \$\$;

COMMIT;
EOF

echo -e "${GREEN}Rollback plan created: rollback_schema_name_removal.sql${NC}"

# Final success message
echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}   COMPLETE RLS MIGRATION SUCCESSFUL!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "\n${YELLOW}Your application is now fully using Row-Level Security for tenant isolation.${NC}"
echo -e "${YELLOW}The schema_name column has been removed from the database.${NC}"
echo -e "${YELLOW}A middleware has been added to maintain compatibility with existing code.${NC}"
echo -e "${YELLOW}A backup of tenant data has been created in custom_auth_tenant_backup.${NC}"
echo -e "${YELLOW}A rollback plan has been created in case of issues.${NC}"
echo ""
echo -e "${RED}IMPORTANT: Update all remaining code to use tenant_id instead of schema_name.${NC}"
echo -e "${RED}The compatibility middleware is only temporary and should be removed in the future.${NC}"

exit 0 
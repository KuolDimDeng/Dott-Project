#!/bin/bash

# Script to find all code that uses schema names or schema switching
# These should be updated to use Row-Level Security (RLS)

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}Finding code that needs to be updated for RLS migration...${NC}"
echo

# Search patterns
SCHEMAS_PATTERNS=(
    "search_path TO" 
    "SET schema" 
    "CREATE SCHEMA" 
    "pg_namespace" 
    "schema_name"
    "information_schema.schemata"
    "tenant_schema_context"
    "tenant_schema"
    "SET search_path"
    "GetSchemaByTenant"
    "schema-per-tenant"
)

DIRS_TO_SEARCH=(
    "./backend"
    "./frontend"
    "./scripts"
)

FILES_TO_EXCLUDE=(
    "migrate_to_rls.py"
    "find_schema_references.sh"
    "*.md"
    "*.log"
    "*/node_modules/*"
    "*/venv/*"
    "*/.venv/*"
    "*/__pycache__/*"
)

# Build exclude arguments
EXCLUDE_ARGS=""
for excl in "${FILES_TO_EXCLUDE[@]}"; do
    EXCLUDE_ARGS="$EXCLUDE_ARGS --exclude=$excl"
done

echo -e "${BLUE}Searching for schema references in code...${NC}"
echo

# Find files with schema references
for pattern in "${SCHEMAS_PATTERNS[@]}"; do
    echo -e "${YELLOW}Searching for: ${pattern}${NC}"
    for dir in "${DIRS_TO_SEARCH[@]}"; do
        if [ -d "$dir" ]; then
            # Use grep recursively with line numbers, show only filenames first
            grep -l "$pattern" $EXCLUDE_ARGS -r "$dir" | while read -r file; do
                echo -e "${GREEN}$file:${NC}"
                # Then show matching lines with line numbers for each file
                grep -n "$pattern" "$file" | sed 's/^/    /'
                echo
            done
        fi
    done
    echo
done

echo -e "${BLUE}Files that might need database modifications:${NC}"
echo
grep -l "\.execute(" $EXCLUDE_ARGS -r "./backend" | grep -v "test" | sort

echo
echo -e "${YELLOW}To update these files for RLS migration:${NC}"
echo "1. Replace schema switching with tenant_id setting via current_setting('app.current_tenant_id')"
echo "2. Update queries to filter by tenant_id instead of using schemas"
echo "3. Ensure all tenant-aware tables have tenant_id column and RLS policies"
echo
echo -e "${GREEN}Done!${NC}" 
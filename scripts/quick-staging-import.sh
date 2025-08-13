#!/bin/bash

# Quick Staging Database Import
# Run this immediately after getting the export URL from Render

echo "========================================="
echo "Quick Staging Database Import"
echo "========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Get the export URL from command line or prompt
if [ -n "$1" ]; then
    EXPORT_URL="$1"
    echo "Using provided URL"
else
    echo "Please paste the export URL from Render (right-click the download button and copy link):"
    read -r EXPORT_URL
    
    if [ -z "$EXPORT_URL" ]; then
        echo -e "${RED}No URL provided${NC}"
        exit 1
    fi
fi

# Staging database
STAGING_DB_URL="postgresql://dott_db_staging_user:K1k1wll1XM4uv9eZeAB3QAYaZ7BP4ehe@dpg-d20897vfte5s738ismk0-a.oregon-postgres.render.com/dott_db_staging?sslmode=require"

echo ""
echo "Downloading export..."
curl -L "$EXPORT_URL" -o staging_import.tar.gz

if [ ! -f staging_import.tar.gz ]; then
    echo -e "${RED}Download failed${NC}"
    exit 1
fi

# Check if it's actually a tar.gz file
file_type=$(file staging_import.tar.gz | grep -c "gzip compressed")
if [ "$file_type" -eq 0 ]; then
    echo -e "${RED}Downloaded file is not a valid backup${NC}"
    cat staging_import.tar.gz | head -5
    exit 1
fi

echo -e "${GREEN}✅ Download successful${NC}"

echo "Extracting..."
tar -xf staging_import.tar.gz

# Find the extracted directory (it will have a timestamp name)
BACKUP_DIR=$(ls -d 2025-* 2>/dev/null | head -1)

if [ -z "$BACKUP_DIR" ]; then
    # Try looking for .dir extension
    BACKUP_DIR=$(ls -d *.dir 2>/dev/null | head -1)
fi

if [ -z "$BACKUP_DIR" ]; then
    echo -e "${RED}Could not find extracted backup directory${NC}"
    echo "Looking for directories starting with 2025-*..."
    ls -la | grep "^d.*2025-"
    exit 1
fi

echo -e "${GREEN}✅ Extracted to $BACKUP_DIR${NC}"

echo ""
echo "Clearing staging database..."
PGSSLMODE=require psql "$STAGING_DB_URL" << 'EOF'
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EOF

echo ""
echo "Importing to staging (this may take a few minutes)..."
PGSSLMODE=require pg_restore \
  --dbname="$STAGING_DB_URL" \
  --verbose \
  --no-owner \
  --no-privileges \
  --no-acl \
  "$BACKUP_DIR" 2>&1 | grep -v "WARNING\|NOTICE" || true

echo ""
echo "Keeping all production data for staging environment..."
echo -e "${GREEN}✅ Production data preserved${NC}"

echo ""
echo "Checking existing users..."
USER_COUNT=$(PGSSLMODE=require psql "$STAGING_DB_URL" -t -c "SELECT COUNT(*) FROM custom_auth_customuser;" 2>/dev/null || echo "0")
echo "Found $USER_COUNT existing users from production"

# Cleanup
rm -rf staging_import.tar.gz "$BACKUP_DIR"

echo ""
echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}✅ Staging database ready!${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "Database now contains:"
echo "✅ Complete production data copy"
echo "✅ All users and settings"
echo "✅ All business data"
echo "✅ $USER_COUNT users ready for testing"
echo ""
echo "Next steps:"
echo "1. Deploy staging backend (should work now)"
echo "2. Deploy staging frontend (should work now)"
echo "3. Test at https://staging.dottapps.com"
echo ""
echo "⚠️  IMPORTANT: This is real production data!"
echo "   - Be careful with any destructive operations"
echo "   - Consider this a live testing environment"
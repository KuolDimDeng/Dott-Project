#!/bin/bash

# Deployment script to fix POS schema issues in both staging and production
# This ensures both databases have the same structure

set -e

echo "================================================"
echo "POS SCHEMA FIX DEPLOYMENT"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${BLUE}Current branch: $CURRENT_BRANCH${NC}"

# Ensure we're on staging branch
if [ "$CURRENT_BRANCH" != "staging" ]; then
    echo -e "${YELLOW}Switching to staging branch...${NC}"
    git checkout staging
    git pull origin staging
fi

# Step 1: Add the fix to the Django startup process
echo -e "\n${YELLOW}Step 1: Adding database fix to Django startup...${NC}"

cat > backend/pyfactor/fix_pos_schema.py << 'EOF'
"""
Fix POS schema on startup - ensures tenant_id and business_id columns exist.
This runs during container startup to fix any missing columns.
"""

import os
import logging
from django.db import connection

logger = logging.getLogger(__name__)

def fix_pos_schema():
    """Add missing tenant_id and business_id columns to critical tables."""
    
    tables_to_fix = [
        'finance_journalentryline',
        'finance_journalentry',
        'finance_chartofaccount',
        'finance_generalledgerentry',
        'sales_salesorder',
        'sales_salesorderitem',
        'inventory_product',
        'crm_customer',
    ]
    
    try:
        with connection.cursor() as cursor:
            for table in tables_to_fix:
                try:
                    # Add tenant_id if missing
                    cursor.execute(f"""
                        DO $$ 
                        BEGIN
                            ALTER TABLE {table} ADD COLUMN tenant_id uuid;
                        EXCEPTION
                            WHEN duplicate_column THEN NULL;
                        END $$;
                    """)
                    
                    # Add business_id if missing
                    cursor.execute(f"""
                        DO $$ 
                        BEGIN
                            ALTER TABLE {table} ADD COLUMN business_id uuid;
                        EXCEPTION
                            WHEN duplicate_column THEN NULL;
                        END $$;
                    """)
                    
                    # Create indexes
                    cursor.execute(f"""
                        CREATE INDEX IF NOT EXISTS idx_{table}_tenant_id 
                        ON {table}(tenant_id);
                    """)
                    
                    cursor.execute(f"""
                        CREATE INDEX IF NOT EXISTS idx_{table}_business_id 
                        ON {table}(business_id);
                    """)
                    
                    # Update business_id from tenant_id if needed
                    cursor.execute(f"""
                        UPDATE {table}
                        SET business_id = tenant_id
                        WHERE business_id IS NULL AND tenant_id IS NOT NULL;
                    """)
                    
                    logger.info(f"✅ Fixed schema for {table}")
                    
                except Exception as e:
                    logger.warning(f"Error fixing {table}: {e}")
                    continue
        
        logger.info("✅ POS schema fix completed")
        return True
        
    except Exception as e:
        logger.error(f"Failed to fix POS schema: {e}")
        return False

if __name__ == "__main__":
    fix_pos_schema()
EOF

echo -e "${GREEN}✓ Created fix_pos_schema.py${NC}"

# Step 2: Update Dockerfile to run the fix on startup
echo -e "\n${YELLOW}Step 2: Updating Dockerfile to run fix on startup...${NC}"

# Check if the fix is already in the Dockerfile
if ! grep -q "fix_pos_schema.py" backend/pyfactor/Dockerfile; then
    # Add the fix to the startup script in Dockerfile
    sed -i.bak '/echo.*Running database migrations/a\
    echo "    echo \"Fixing POS schema...\" " >> /app/start.sh && \\\
    echo "    python fix_pos_schema.py || echo \"POS schema fix failed but continuing...\"" >> /app/start.sh && \\' backend/pyfactor/Dockerfile
    
    echo -e "${GREEN}✓ Updated Dockerfile${NC}"
else
    echo -e "${BLUE}ℹ Dockerfile already includes POS schema fix${NC}"
fi

# Step 3: Commit and push to staging
echo -e "\n${YELLOW}Step 3: Committing changes...${NC}"

git add backend/pyfactor/fix_pos_schema.py
git add backend/pyfactor/Dockerfile

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo -e "${BLUE}ℹ No changes to commit${NC}"
else
    git commit -m "Fix POS database schema - add missing tenant_id and business_id columns

- Add fix_pos_schema.py to automatically fix missing columns on startup
- Update Dockerfile to run the fix during container initialization
- This ensures both staging and production have consistent schema
- Fixes POS transaction failures due to missing columns"

    echo -e "${GREEN}✓ Changes committed${NC}"
fi

# Step 4: Push to staging
echo -e "\n${YELLOW}Step 4: Pushing to staging...${NC}"
git push origin staging

echo -e "${GREEN}✓ Pushed to staging branch${NC}"

# Step 5: Monitor staging deployment
echo -e "\n${YELLOW}Step 5: Staging deployment will start automatically...${NC}"
echo "Monitor at: https://dashboard.render.com/web/srv-d206moumcj7s73appe2g/deploys"
echo ""
echo -e "${BLUE}Waiting for staging deployment to complete...${NC}"
echo "(This usually takes 5-10 minutes)"
echo ""

# Step 6: After staging is verified, deploy to production
echo -e "${YELLOW}================================================${NC}"
echo -e "${YELLOW}NEXT STEPS:${NC}"
echo -e "${YELLOW}================================================${NC}"
echo ""
echo "1. Wait for staging deployment to complete"
echo "2. Test POS in staging: https://staging.dottapps.com"
echo "3. If POS works in staging, deploy to production:"
echo ""
echo -e "${BLUE}   git checkout main${NC}"
echo -e "${BLUE}   git merge staging${NC}"
echo -e "${BLUE}   git push origin main${NC}"
echo ""
echo "4. Monitor production deployment at:"
echo "   https://dashboard.render.com/web/srv-cscbp6qj1k6c738ihorg/deploys"
echo ""
echo -e "${GREEN}✅ Schema fix deployment script complete!${NC}"
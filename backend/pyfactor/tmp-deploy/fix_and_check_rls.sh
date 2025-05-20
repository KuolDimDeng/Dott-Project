#!/bin/bash

# DEPRECATED SCRIPT
# This script has been replaced by Python-based tools for better maintenance and compatibility

echo "⚠️  WARNING: This script is deprecated and will be removed in a future version."
echo "Please use the new RLS management scripts instead:"
echo
echo "For fixing and checking RLS:"
echo "  python backend/pyfactor/scripts/rls_manager.py"
echo
echo "For checking only:"
echo "  python backend/pyfactor/scripts/rls_manager.py --check-only"
echo
echo "For more information, see the documentation:"
echo "  backend/pyfactor/scripts/RLS_DOCUMENTATION.md"
echo "  backend/pyfactor/scripts/RLS_INSTALL_GUIDE.md"
echo

# Ask if user wants to continue with deprecated script
read -p "Do you want to continue using this deprecated script? (y/N): " CONTINUE

if [[ "$CONTINUE" != "y" && "$CONTINUE" != "Y" ]]; then
    echo "Exiting. Please use the recommended scripts instead."
    exit 0
fi

echo "Running deprecated script..."
echo

# Get script directory to ensure consistent relative paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FIX_SCRIPT="${SCRIPT_DIR}/fix_rls_direct.py"
CHECK_SCRIPT="${SCRIPT_DIR}/check_rls.py"

# Color codes for better readability
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Display banner
echo
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${PURPLE}                 PostgreSQL Row-Level Security (RLS) Fix & Verification                 ${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo

# Display information about what RLS is and why it's important
echo -e "${BLUE}What is Row-Level Security (RLS)?${NC}"
echo -e "RLS is a PostgreSQL security feature that restricts which rows users can access in database tables."
echo -e "In a multi-tenant application, RLS ensures that each tenant can only access their own data,"
echo -e "providing strong isolation boundaries at the database level.\n"

echo -e "${BLUE}Why RLS is Critical for Multi-Tenant Applications:${NC}"
echo -e "1. Data Isolation: Prevents data leakage between tenants"
echo -e "2. Defense in Depth: Adds security at database level, beyond application code"
echo -e "3. Regulatory Compliance: Helps meet requirements for data segregation"
echo -e "4. Performance: More efficient than filtering in application code\n"

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Error: Python 3 is not installed or not in PATH.${NC}"
    exit 1
fi

# Check if the scripts exist
if [[ ! -f "$FIX_SCRIPT" ]]; then
    echo -e "${RED}Error: Fix script not found at $FIX_SCRIPT${NC}"
    exit 1
fi

if [[ ! -f "$CHECK_SCRIPT" ]]; then
    echo -e "${RED}Error: Check script not found at $CHECK_SCRIPT${NC}"
    exit 1
fi

# Make scripts executable
chmod +x "$FIX_SCRIPT"
chmod +x "$CHECK_SCRIPT"

# Fix the "has_tenant_id" column issue in the RLS status view
echo -e "${BLUE}┌──────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│ PREPARING: Fixing RLS Status View                │${NC}"
echo -e "${BLUE}└──────────────────────────────────────────────────┘${NC}"
echo -e "Checking and fixing the RLS status view to include has_tenant_id column..."

# Create a temporary Python script to fix the RLS status view
cat > /tmp/fix_rls_status_view.py << 'EOF'
#!/usr/bin/env python3
import os
import sys
import django
from pathlib import Path

# Set up Django environment
sys.path.append(str(Path(__file__).parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection

def fix_rls_status_view():
    """Fix the RLS status view to ensure it has the has_tenant_id column"""
    try:
        with connection.cursor() as cursor:
            # Check if the view exists
            cursor.execute("""
            SELECT EXISTS (
                SELECT FROM pg_views WHERE viewname = 'rls_status'
            );
            """)
            view_exists = cursor.fetchone()[0]
            
            if view_exists:
                print("✅ RLS status view exists")
                
                # Create a fixed version of the view that includes has_tenant_id column
                cursor.execute("""
                DROP VIEW IF EXISTS rls_status;
                
                CREATE OR REPLACE VIEW rls_status AS
                SELECT 
                    t.table_name,
                    t.table_schema,
                    EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = t.table_name AND table_schema = t.table_schema
                        AND column_name = 'tenant_id'
                    ) AS has_tenant_id,
                    EXISTS (
                        SELECT FROM pg_tables 
                        WHERE tablename = t.table_name AND schemaname = t.table_schema
                        AND rowsecurity = true
                    ) AS has_rls_enabled,
                    (
                        SELECT string_agg(polname, ', ') 
                        FROM pg_policy 
                        WHERE pg_policy.polrelid = (t.table_schema || '.' || t.table_name)::regclass
                    ) AS policies
                FROM information_schema.tables t
                WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
                AND t.table_type = 'BASE TABLE'
                ORDER BY t.table_schema, t.table_name;
                """)
                print("✅ Fixed RLS status view to include has_tenant_id column")
            else:
                print("❌ RLS status view does not exist, creating it...")
                cursor.execute("""
                CREATE OR REPLACE VIEW rls_status AS
                SELECT 
                    t.table_name,
                    t.table_schema,
                    EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = t.table_name AND table_schema = t.table_schema
                        AND column_name = 'tenant_id'
                    ) AS has_tenant_id,
                    EXISTS (
                        SELECT FROM pg_tables 
                        WHERE tablename = t.table_name AND schemaname = t.table_schema
                        AND rowsecurity = true
                    ) AS has_rls_enabled,
                    (
                        SELECT string_agg(polname, ', ') 
                        FROM pg_policy 
                        WHERE pg_policy.polrelid = (t.table_schema || '.' || t.table_name)::regclass
                    ) AS policies
                FROM information_schema.tables t
                WHERE t.table_schema NOT IN ('pg_catalog', 'information_schema')
                AND t.table_type = 'BASE TABLE'
                ORDER BY t.table_schema, t.table_name;
                """)
                print("✅ Created RLS status view with has_tenant_id column")
                
            # Verify the view has the required column
            cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.columns 
                WHERE table_name = 'rls_status' AND column_name = 'has_tenant_id'
            );
            """)
            has_column = cursor.fetchone()[0]
            
            if has_column:
                print("✅ Verified has_tenant_id column exists in RLS status view")
                return True
            else:
                print("❌ Failed to create has_tenant_id column in RLS status view")
                return False
                
    except Exception as e:
        print(f"❌ Error fixing RLS status view: {e}")
        return False

if __name__ == "__main__":
    fix_rls_status_view()
EOF

# Make the script executable and run it
chmod +x /tmp/fix_rls_status_view.py
python3 /tmp/fix_rls_status_view.py

# Phase 1: Fix RLS configuration
echo -e "${BLUE}┌──────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│ PHASE 1: Applying RLS Configuration              │${NC}"
echo -e "${BLUE}└──────────────────────────────────────────────────┘${NC}"
echo -e "The fix script will perform the following operations:"
echo -e "• Create standardized PostgreSQL functions for tenant context"
echo -e "• Apply RLS policies to all tenant tables in the database"
echo -e "• Configure RLS for strict tenant isolation"
echo -e "• Test isolation by verifying data access boundaries"
echo

echo -e "${YELLOW}Running: $FIX_SCRIPT${NC}"
python3 "$FIX_SCRIPT"
FIX_EXIT_STATUS=$?

echo

# Phase 2: Verify RLS configuration
echo -e "${BLUE}┌──────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│ PHASE 2: Verifying RLS Configuration             │${NC}"
echo -e "${BLUE}└──────────────────────────────────────────────────┘${NC}"
echo -e "The check script will verify:"
echo -e "• All required RLS functions exist and are correctly configured"
echo -e "• Tenant isolation is working properly"
echo -e "• Django middleware is configured correctly"
echo -e "• Database compatibility with RLS"
echo -e "• RLS is enabled on all tenant tables"
echo

echo -e "${YELLOW}Running: $CHECK_SCRIPT${NC}"
python3 "$CHECK_SCRIPT"
CHECK_EXIT_STATUS=$?

echo

# Summary 
echo -e "${BLUE}┌──────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│ SUMMARY                                          │${NC}"
echo -e "${BLUE}└──────────────────────────────────────────────────┘${NC}"

# Display an overall summary
if [[ $FIX_EXIT_STATUS -eq 0 && $CHECK_EXIT_STATUS -eq 0 ]]; then
    echo -e "${GREEN}✅ SUCCESS: RLS has been correctly configured and verified!${NC}"
    echo -e "The database is now properly secured with row-level security to ensure"
    echo -e "that each tenant can only access their own data."
    echo
    echo -e "Next steps:"
    echo -e "1. Ensure your Django application is using the RLSMiddleware"
    echo -e "2. Test tenant isolation in your application"
    echo -e "3. Consider adding RLS status monitoring to your operations dashboard"
elif [[ $FIX_EXIT_STATUS -eq 0 && $CHECK_EXIT_STATUS -ne 0 ]]; then
    echo -e "${YELLOW}⚠️  PARTIAL SUCCESS: RLS was configured but verification failed.${NC}"
    echo -e "The RLS functions and policies have been created, but some verification checks failed."
    echo
    echo -e "Troubleshooting steps:"
    echo -e "1. Check if RLSMiddleware is added to your MIDDLEWARE setting in Django settings"
    echo -e "2. Verify PostgreSQL version supports RLS (9.5+)"
    echo -e "3. Check database connection settings"
    echo -e "4. Review logs for more specific errors"
    echo -e "5. Run ./check_rls.py individually to see detailed output"
elif [[ $FIX_EXIT_STATUS -ne 0 ]]; then
    echo -e "${RED}❌ FAILURE: RLS configuration encountered errors.${NC}"
    echo -e "The script was unable to properly configure RLS in your database."
    echo
    echo -e "Troubleshooting steps:"
    echo -e "1. Check database connection settings"
    echo -e "2. Verify user has sufficient privileges (superuser recommended for installation)"
    echo -e "3. Check for conflicting RLS configurations"
    echo -e "4. Review logs for more specific errors"
    echo -e "5. Try running ./fix_rls_direct.py manually and review output"
fi

# Display warning about superuser access if needed
if [[ $FIX_EXIT_STATUS -ne 0 || $CHECK_EXIT_STATUS -ne 0 ]]; then
    echo
    echo -e "${YELLOW}Note:${NC} Configuring RLS may require superuser privileges in PostgreSQL."
    echo -e "If you're encountering permission errors, try running the scripts with a database"
    echo -e "user that has superuser access."
fi

# Clean up temporary script
rm -f /tmp/fix_rls_status_view.py

echo
exit $(( FIX_EXIT_STATUS || CHECK_EXIT_STATUS )) 
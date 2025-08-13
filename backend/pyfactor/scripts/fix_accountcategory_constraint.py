#!/usr/bin/env python3
"""
Emergency script to fix AccountCategory constraint issue on production.
This removes the old global unique constraint that's causing POS sales to fail.
"""

import os
import sys
import django

# Add the parent directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from pyfactor.logging_config import get_logger

logger = get_logger()

def fix_accountcategory_constraint():
    """
    Remove the old global unique constraint on AccountCategory.code field.
    This allows multiple tenants to have categories with the same code.
    """
    with connection.cursor() as cursor:
        try:
            # Check if the old constraint exists
            cursor.execute("""
                SELECT COUNT(*) 
                FROM pg_constraint 
                WHERE conname = 'finance_accountcategory_code_key'
                AND conrelid = 'finance_accountcategory'::regclass;
            """)
            
            count = cursor.fetchone()[0]
            
            if count > 0:
                logger.info("Found old constraint 'finance_accountcategory_code_key', removing it...")
                
                # Remove the old constraint
                cursor.execute("""
                    ALTER TABLE finance_accountcategory 
                    DROP CONSTRAINT IF EXISTS finance_accountcategory_code_key CASCADE;
                """)
                
                logger.info("✅ Old constraint removed successfully!")
            else:
                logger.info("✅ Old constraint 'finance_accountcategory_code_key' does not exist (already fixed)")
            
            # Check for any old unique indexes on code column alone
            cursor.execute("""
                SELECT i.relname as index_name
                FROM pg_class t
                JOIN pg_index ix ON t.oid = ix.indrelid
                JOIN pg_class i ON i.oid = ix.indexrelid
                WHERE t.relname = 'finance_accountcategory'
                AND ix.indisunique = true
                AND pg_get_indexdef(i.oid) LIKE '%code%'
                AND pg_get_indexdef(i.oid) NOT LIKE '%tenant_id%';
            """)
            
            indexes = cursor.fetchall()
            
            if indexes:
                for (idx_name,) in indexes:
                    logger.info(f"Removing old unique index: {idx_name}")
                    cursor.execute(f"DROP INDEX IF EXISTS {idx_name} CASCADE;")
                logger.info(f"✅ Removed {len(indexes)} old unique indexes")
            else:
                logger.info("✅ No problematic unique indexes found")
            
            # Verify the correct constraint exists
            cursor.execute("""
                SELECT COUNT(*) 
                FROM pg_constraint 
                WHERE conname = 'unique_category_code_per_tenant'
                AND conrelid = 'finance_accountcategory'::regclass;
            """)
            
            if cursor.fetchone()[0] > 0:
                logger.info("✅ Correct per-tenant constraint 'unique_category_code_per_tenant' exists")
            else:
                logger.warning("⚠️ The per-tenant constraint 'unique_category_code_per_tenant' is missing")
                logger.info("Creating the correct constraint...")
                
                # Create the correct constraint
                cursor.execute("""
                    ALTER TABLE finance_accountcategory 
                    ADD CONSTRAINT unique_category_code_per_tenant 
                    UNIQUE (tenant_id, code);
                """)
                
                logger.info("✅ Created correct per-tenant constraint")
            
            # Final verification
            cursor.execute("""
                SELECT conname 
                FROM pg_constraint 
                WHERE conrelid = 'finance_accountcategory'::regclass
                AND contype = 'u'
                ORDER BY conname;
            """)
            
            constraints = cursor.fetchall()
            logger.info("\nFinal unique constraints on finance_accountcategory:")
            for (name,) in constraints:
                logger.info(f"  - {name}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error fixing constraint: {e}")
            return False

if __name__ == "__main__":
    print("=" * 60)
    print("AccountCategory Constraint Fix Script")
    print("=" * 60)
    
    success = fix_accountcategory_constraint()
    
    if success:
        print("\n✅ SUCCESS: The constraint issue has been fixed!")
        print("POS sales should now work correctly for all tenants.")
    else:
        print("\n❌ ERROR: Failed to fix the constraint issue.")
        print("Please check the logs for details.")
        sys.exit(1)
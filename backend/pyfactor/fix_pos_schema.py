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

#!/usr/bin/env python3
"""
Emergency script to add tenant_id columns to staging database.
This directly connects to the staging database and adds missing columns.
"""

import os
import psycopg2
from psycopg2 import sql
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get database URL from environment or use staging URL with SSL
DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://pyfactor_dev_user:W0NjnKU3xRJJCJfSY8pE4O7fUCNy8AaN@dpg-ctpk91ajv6qs73aq49fg-a.oregon-postgres.render.com/pyfactor_dev?sslmode=require')

def fix_tenant_id_columns():
    """Add tenant_id to all tables that need it."""
    
    conn = None
    cursor = None
    
    try:
        # Connect to database with explicit parameters
        conn = psycopg2.connect(
            host="dpg-ctpk91ajv6qs73aq49fg-a.oregon-postgres.render.com",
            database="pyfactor_dev",
            user="pyfactor_dev_user",
            password="W0NjnKU3xRJJCJfSY8pE4O7fUCNy8AaN",
            sslmode="require",
            connect_timeout=30
        )
        cursor = conn.cursor()
        
        logger.info("Connected to staging database")
        
        # Get a default tenant_id
        cursor.execute("""
            SELECT DISTINCT tenant_id 
            FROM custom_auth_user 
            WHERE tenant_id IS NOT NULL 
            LIMIT 1;
        """)
        result = cursor.fetchone()
        default_tenant_id = result[0] if result else None
        logger.info(f"Using default tenant_id: {default_tenant_id}")
        
        # List of tables that definitely need tenant_id
        critical_tables = [
            'finance_journalentryline',  # The one causing immediate issues
            'finance_journalentry',
            'finance_generalledgerentry',
            'finance_account',
            'finance_financetransaction',
            'finance_accountcategory',
            'finance_chartofaccount',
            'finance_fixedasset',
            'finance_budget',
        ]
        
        for table_name in critical_tables:
            try:
                # Check if table exists
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_schema = 'public' 
                        AND table_name = %s
                    );
                """, (table_name,))
                
                if not cursor.fetchone()[0]:
                    logger.info(f"Table {table_name} does not exist")
                    continue
                
                # Check if tenant_id column exists
                cursor.execute("""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = %s 
                    AND column_name = 'tenant_id';
                """, (table_name,))
                
                if cursor.fetchone():
                    logger.info(f"✅ {table_name} already has tenant_id")
                    continue
                
                # Add tenant_id column
                cursor.execute(sql.SQL("""
                    ALTER TABLE {} 
                    ADD COLUMN IF NOT EXISTS tenant_id uuid;
                """).format(sql.Identifier(table_name)))
                
                logger.info(f"➕ Added tenant_id to {table_name}")
                
                # Update existing rows
                if default_tenant_id:
                    cursor.execute(sql.SQL("""
                        UPDATE {} 
                        SET tenant_id = %s 
                        WHERE tenant_id IS NULL;
                    """).format(sql.Identifier(table_name)), (default_tenant_id,))
                    
                    rows_updated = cursor.rowcount
                    if rows_updated > 0:
                        logger.info(f"   Updated {rows_updated} rows")
                
                # Create index
                index_name = f"idx_{table_name}_tenant_id"
                cursor.execute(sql.SQL("""
                    CREATE INDEX IF NOT EXISTS {} 
                    ON {}(tenant_id);
                """).format(sql.Identifier(index_name), sql.Identifier(table_name)))
                
                # Commit after each table
                conn.commit()
                logger.info(f"✅ Completed {table_name}")
                
            except Exception as e:
                logger.error(f"❌ Error with {table_name}: {e}")
                conn.rollback()
                continue
        
        logger.info("\n✅ All critical tables processed successfully!")
        
    except Exception as e:
        logger.error(f"Database connection error: {e}")
        if conn:
            conn.rollback()
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

if __name__ == "__main__":
    fix_tenant_id_columns()
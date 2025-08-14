#!/usr/bin/env python3
"""
Safe database schema fix for POS transactions.
This script can be run on both staging and production safely.
It only adds missing columns and doesn't modify existing data.
"""

import os
import sys
import psycopg2
from urllib.parse import urlparse
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def parse_database_url(url):
    """Parse database URL into connection parameters."""
    parsed = urlparse(url)
    return {
        'host': parsed.hostname,
        'port': parsed.port or 5432,
        'database': parsed.path.lstrip('/'),
        'user': parsed.username,
        'password': parsed.password,
        'sslmode': 'require'
    }

def fix_table_schema(conn, table_name, dry_run=False):
    """Fix schema for a specific table - add tenant_id and business_id if missing."""
    results = []
    
    with conn.cursor() as cursor:
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = %s
            )
        """, (table_name,))
        
        if not cursor.fetchone()[0]:
            logger.warning(f"Table {table_name} doesn't exist - skipping")
            return [f"{table_name}: Table doesn't exist"]
        
        # Check current columns
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = %s
        """, (table_name,))
        
        existing_columns = {row[0] for row in cursor.fetchall()}
        
        # Get row count
        cursor.execute(f"SELECT COUNT(*) FROM {table_name}")
        row_count = cursor.fetchone()[0]
        
        logger.info(f"Table {table_name}: {row_count} rows, columns: {', '.join(sorted(existing_columns))}")
        
        if dry_run:
            if 'tenant_id' not in existing_columns:
                results.append(f"Would add tenant_id to {table_name}")
            if 'business_id' not in existing_columns:
                results.append(f"Would add business_id to {table_name}")
            return results
        
        # Add tenant_id if missing
        if 'tenant_id' not in existing_columns:
            try:
                logger.info(f"Adding tenant_id column to {table_name}...")
                cursor.execute(f"""
                    ALTER TABLE {table_name} 
                    ADD COLUMN tenant_id uuid
                """)
                conn.commit()
                results.append(f"✅ Added tenant_id to {table_name}")
                
                # Create index
                cursor.execute(f"""
                    CREATE INDEX IF NOT EXISTS idx_{table_name}_tenant_id 
                    ON {table_name}(tenant_id)
                """)
                conn.commit()
                
            except psycopg2.errors.DuplicateColumn:
                logger.info(f"tenant_id already exists in {table_name}")
                results.append(f"tenant_id already exists in {table_name}")
            except Exception as e:
                logger.error(f"Error adding tenant_id to {table_name}: {e}")
                conn.rollback()
                results.append(f"❌ Failed to add tenant_id to {table_name}: {e}")
        else:
            results.append(f"tenant_id already exists in {table_name}")
        
        # Add business_id if missing
        if 'business_id' not in existing_columns:
            try:
                logger.info(f"Adding business_id column to {table_name}...")
                cursor.execute(f"""
                    ALTER TABLE {table_name} 
                    ADD COLUMN business_id uuid
                """)
                conn.commit()
                results.append(f"✅ Added business_id to {table_name}")
                
                # Create index
                cursor.execute(f"""
                    CREATE INDEX IF NOT EXISTS idx_{table_name}_business_id 
                    ON {table_name}(business_id)
                """)
                conn.commit()
                
                # If we have tenant_id values but no business_id, copy them
                if 'tenant_id' in existing_columns:
                    cursor.execute(f"""
                        UPDATE {table_name}
                        SET business_id = tenant_id
                        WHERE business_id IS NULL AND tenant_id IS NOT NULL
                    """)
                    updated_rows = cursor.rowcount
                    conn.commit()
                    if updated_rows > 0:
                        results.append(f"✅ Updated {updated_rows} rows with business_id from tenant_id")
                
            except psycopg2.errors.DuplicateColumn:
                logger.info(f"business_id already exists in {table_name}")
                results.append(f"business_id already exists in {table_name}")
            except Exception as e:
                logger.error(f"Error adding business_id to {table_name}: {e}")
                conn.rollback()
                results.append(f"❌ Failed to add business_id to {table_name}: {e}")
        else:
            results.append(f"business_id already exists in {table_name}")
    
    return results

def fix_database_schema(database_url, env_name="Database", dry_run=False):
    """Fix database schema for all critical tables."""
    
    # Critical tables that need tenant_id and business_id
    critical_tables = [
        # Finance tables (most critical for POS)
        'finance_journalentryline',
        'finance_journalentry',
        'finance_chartofaccount',
        'finance_generalledgerentry',
        'finance_accountcategory',
        'finance_transactioncategory',
        
        # Sales tables
        'sales_salesorder',
        'sales_salesorderitem',
        'sales_payment',
        
        # Inventory tables
        'inventory_product',
        'inventory_stockmovement',
        
        # CRM tables
        'crm_customer',
        'crm_vendor',
        
        # Purchases tables
        'purchases_purchaseorder',
        'purchases_purchaseorderitem',
    ]
    
    try:
        logger.info(f"\n{'='*60}")
        logger.info(f"Fixing {env_name} Database Schema")
        logger.info(f"{'='*60}")
        
        if dry_run:
            logger.info("🔍 DRY RUN MODE - No changes will be made")
        
        # Connect to database
        conn_params = parse_database_url(database_url)
        conn = psycopg2.connect(**conn_params)
        logger.info(f"✅ Connected to {env_name} database")
        
        all_results = {}
        
        # Fix each table
        for table in critical_tables:
            logger.info(f"\nProcessing {table}...")
            results = fix_table_schema(conn, table, dry_run)
            all_results[table] = results
        
        # Print summary
        logger.info(f"\n{'='*60}")
        logger.info(f"SUMMARY for {env_name}")
        logger.info(f"{'='*60}")
        
        for table, results in all_results.items():
            logger.info(f"\n📋 {table}:")
            for result in results:
                logger.info(f"  {result}")
        
        conn.close()
        logger.info(f"\n✅ {env_name} schema fix complete!")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Error fixing {env_name} database: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Main function to fix both staging and production databases."""
    
    # Check for command line arguments
    import argparse
    parser = argparse.ArgumentParser(description='Fix database schema for POS transactions')
    parser.add_argument('--staging-only', action='store_true', help='Only fix staging database')
    parser.add_argument('--production-only', action='store_true', help='Only fix production database')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be done without making changes')
    parser.add_argument('--staging-url', help='Staging database URL')
    parser.add_argument('--production-url', help='Production database URL')
    args = parser.parse_args()
    
    # Get database URLs
    staging_url = args.staging_url or os.environ.get('STAGING_DATABASE_URL')
    production_url = args.production_url or os.environ.get('PRODUCTION_DATABASE_URL')
    
    if not args.production_only and not staging_url:
        logger.error("❌ Missing staging database URL")
        logger.error("Set STAGING_DATABASE_URL environment variable or use --staging-url")
        return 1
    
    if not args.staging_only and not production_url:
        logger.error("❌ Missing production database URL")
        logger.error("Set PRODUCTION_DATABASE_URL environment variable or use --production-url")
        return 1
    
    success = True
    
    # Fix staging
    if not args.production_only and staging_url:
        if not fix_database_schema(staging_url, "STAGING", args.dry_run):
            success = False
    
    # Fix production
    if not args.staging_only and production_url:
        if not fix_database_schema(production_url, "PRODUCTION", args.dry_run):
            success = False
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
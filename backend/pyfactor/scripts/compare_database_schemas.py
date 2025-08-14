#!/usr/bin/env python3
"""
Compare database schemas between staging and production environments.
This script safely checks table structures without modifying any data.
"""

import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor
from urllib.parse import urlparse
import json

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

def get_table_columns(conn, table_name):
    """Get column information for a specific table."""
    with conn.cursor(cursor_factory=RealDictCursor) as cursor:
        cursor.execute("""
            SELECT 
                column_name,
                data_type,
                is_nullable,
                column_default
            FROM information_schema.columns
            WHERE table_name = %s
            ORDER BY ordinal_position
        """, (table_name,))
        return cursor.fetchall()

def get_all_tables(conn):
    """Get all tables in the public schema."""
    with conn.cursor() as cursor:
        cursor.execute("""
            SELECT tablename 
            FROM pg_tables 
            WHERE schemaname = 'public'
            ORDER BY tablename
        """)
        return [row[0] for row in cursor.fetchall()]

def check_critical_columns(conn, env_name):
    """Check if critical columns exist in key tables."""
    critical_checks = {
        'finance_journalentryline': ['tenant_id', 'business_id'],
        'finance_journalentry': ['tenant_id', 'business_id'],
        'finance_chartofaccount': ['tenant_id', 'business_id'],
        'finance_generalledgerentry': ['tenant_id', 'business_id'],
        'sales_salesorder': ['tenant_id', 'business_id'],
        'sales_salesorderitem': ['tenant_id'],
        'inventory_product': ['tenant_id', 'business_id'],
        'crm_customer': ['tenant_id', 'business_id'],
    }
    
    results = {}
    with conn.cursor() as cursor:
        for table, required_columns in critical_checks.items():
            # Check if table exists
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = %s
                )
            """, (table,))
            
            if not cursor.fetchone()[0]:
                results[table] = {'exists': False, 'columns': {}}
                continue
            
            # Check for required columns
            table_info = {'exists': True, 'columns': {}}
            for col in required_columns:
                cursor.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.columns 
                        WHERE table_name = %s AND column_name = %s
                    )
                """, (table, col))
                table_info['columns'][col] = cursor.fetchone()[0]
            
            # Get row count
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            table_info['row_count'] = cursor.fetchone()[0]
            
            results[table] = table_info
    
    return results

def compare_environments():
    """Compare staging and production database schemas."""
    # Get database URLs from environment or use defaults
    staging_url = os.environ.get('STAGING_DATABASE_URL')
    production_url = os.environ.get('PRODUCTION_DATABASE_URL')
    
    if not staging_url or not production_url:
        print("❌ Missing database URLs. Please set:")
        print("   export STAGING_DATABASE_URL='postgresql://...'")
        print("   export PRODUCTION_DATABASE_URL='postgresql://...'")
        return
    
    try:
        # Connect to both databases
        print("🔌 Connecting to databases...")
        staging_conn = psycopg2.connect(**parse_database_url(staging_url))
        production_conn = psycopg2.connect(**parse_database_url(production_url))
        
        print("\n" + "="*60)
        print("DATABASE SCHEMA COMPARISON")
        print("="*60)
        
        # Check critical columns in both environments
        print("\n📊 CRITICAL COLUMN CHECK:")
        print("-"*60)
        
        staging_critical = check_critical_columns(staging_conn, "Staging")
        production_critical = check_critical_columns(production_conn, "Production")
        
        # Compare critical tables
        all_tables = set(staging_critical.keys()) | set(production_critical.keys())
        
        for table in sorted(all_tables):
            staging_info = staging_critical.get(table, {})
            prod_info = production_critical.get(table, {})
            
            print(f"\n📋 Table: {table}")
            
            # Check existence
            if not staging_info.get('exists', False):
                print(f"  ⚠️  Missing in STAGING")
            elif not prod_info.get('exists', False):
                print(f"  ⚠️  Missing in PRODUCTION")
            else:
                # Compare columns
                staging_cols = staging_info.get('columns', {})
                prod_cols = prod_info.get('columns', {})
                
                print(f"  📊 Staging rows: {staging_info.get('row_count', 0)}")
                print(f"  📊 Production rows: {prod_info.get('row_count', 0)}")
                
                all_cols = set(staging_cols.keys()) | set(prod_cols.keys())
                for col in sorted(all_cols):
                    staging_has = staging_cols.get(col, False)
                    prod_has = prod_cols.get(col, False)
                    
                    if staging_has and prod_has:
                        print(f"  ✅ {col}: Present in both")
                    elif staging_has and not prod_has:
                        print(f"  ⚠️  {col}: MISSING IN PRODUCTION")
                    elif not staging_has and prod_has:
                        print(f"  ⚠️  {col}: MISSING IN STAGING")
                    else:
                        print(f"  ❌ {col}: Missing in both")
        
        # Get table counts
        print("\n" + "="*60)
        print("TABLE COUNT COMPARISON")
        print("="*60)
        
        staging_tables = set(get_all_tables(staging_conn))
        production_tables = set(get_all_tables(production_conn))
        
        print(f"\n📊 Total tables in staging: {len(staging_tables)}")
        print(f"📊 Total tables in production: {len(production_tables)}")
        
        only_staging = staging_tables - production_tables
        only_production = production_tables - staging_tables
        
        if only_staging:
            print(f"\n⚠️  Tables only in STAGING ({len(only_staging)}):")
            for table in sorted(only_staging)[:10]:
                print(f"  - {table}")
            if len(only_staging) > 10:
                print(f"  ... and {len(only_staging) - 10} more")
        
        if only_production:
            print(f"\n⚠️  Tables only in PRODUCTION ({len(only_production)}):")
            for table in sorted(only_production)[:10]:
                print(f"  - {table}")
            if len(only_production) > 10:
                print(f"  ... and {len(only_production) - 10} more")
        
        # Check specific finance tables in detail
        print("\n" + "="*60)
        print("FINANCE TABLES DETAILED CHECK")
        print("="*60)
        
        finance_tables = [
            'finance_journalentryline',
            'finance_journalentry',
            'finance_chartofaccount',
            'finance_accountcategory'
        ]
        
        for table in finance_tables:
            print(f"\n📋 {table}:")
            
            staging_cols = get_table_columns(staging_conn, table)
            prod_cols = get_table_columns(production_conn, table)
            
            if not staging_cols:
                print("  ⚠️  Table missing in STAGING")
            elif not prod_cols:
                print("  ⚠️  Table missing in PRODUCTION")
            else:
                staging_col_names = {col['column_name'] for col in staging_cols}
                prod_col_names = {col['column_name'] for col in prod_cols}
                
                missing_in_prod = staging_col_names - prod_col_names
                missing_in_staging = prod_col_names - staging_col_names
                
                if missing_in_prod:
                    print(f"  ⚠️  Columns in staging but NOT in production: {', '.join(missing_in_prod)}")
                if missing_in_staging:
                    print(f"  ⚠️  Columns in production but NOT in staging: {', '.join(missing_in_staging)}")
                if not missing_in_prod and not missing_in_staging:
                    print(f"  ✅ Column structure matches (both have {len(staging_col_names)} columns)")
        
        # Close connections
        staging_conn.close()
        production_conn.close()
        
        print("\n" + "="*60)
        print("✅ Schema comparison complete!")
        print("="*60)
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    compare_environments()
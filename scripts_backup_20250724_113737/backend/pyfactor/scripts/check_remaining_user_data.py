#!/usr/bin/env python3
"""
Check what data remains for a specific user email across all tables
"""
import os
import sys
import django
from pathlib import Path

# Add the parent directory to the path
sys.path.append(str(Path(__file__).resolve().parent.parent))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def find_all_tables_with_email_or_user_references():
    """Find all tables that might contain user data"""
    with connection.cursor() as cursor:
        # Find tables with email columns
        cursor.execute("""
            SELECT DISTINCT 
                table_name,
                column_name
            FROM information_schema.columns
            WHERE table_schema = 'public'
            AND (
                column_name LIKE '%email%' 
                OR column_name LIKE '%user%'
                OR column_name = 'owner_id'
                OR column_name = 'created_by'
                OR column_name = 'updated_by'
            )
            AND table_name NOT LIKE 'django_migrations%'
            ORDER BY table_name, column_name;
        """)
        
        return cursor.fetchall()

def check_remaining_data_for_user(email):
    """Check all tables for remaining data related to a user"""
    logger.info(f"\n🔍 Checking for remaining data for user: {email}")
    
    with connection.cursor() as cursor:
        # First, try to find the user
        cursor.execute("SELECT id, email, auth0_sub FROM custom_auth_user WHERE email = %s", [email])
        user_data = cursor.fetchone()
        
        if user_data:
            user_id, user_email, auth0_sub = user_data
            logger.info(f"✓ User still exists in custom_auth_user:")
            logger.info(f"  - ID: {user_id}")
            logger.info(f"  - Email: {user_email}")
            logger.info(f"  - Auth0 Sub: {auth0_sub}")
        else:
            logger.info("✗ User not found in custom_auth_user table")
            user_id = None
        
        # Find all potential references
        logger.info("\n🔍 Checking all tables for references...")
        
        tables_with_data = []
        all_tables = find_all_tables_with_email_or_user_references()
        
        for table_name, column_name in all_tables:
            try:
                # Build appropriate query based on column type
                if 'email' in column_name.lower():
                    query = f"SELECT COUNT(*) FROM {table_name} WHERE {column_name} = %s"
                    params = [email]
                elif user_id and ('user' in column_name.lower() or column_name in ['owner_id', 'created_by', 'updated_by']):
                    query = f"SELECT COUNT(*) FROM {table_name} WHERE {column_name} = %s"
                    params = [user_id]
                else:
                    continue
                
                cursor.execute(query, params)
                count = cursor.fetchone()[0]
                
                if count > 0:
                    tables_with_data.append((table_name, column_name, count))
                    logger.info(f"  ✓ Found {count} records in {table_name}.{column_name}")
                    
            except Exception as e:
                # Skip tables that don't exist or have issues
                pass
        
        if not tables_with_data and not user_data:
            logger.info("\n✨ No data found for this user in any table!")
        elif tables_with_data:
            logger.info(f"\n⚠️  Found data in {len(tables_with_data)} tables:")
            for table, column, count in tables_with_data:
                logger.info(f"  - {table}.{column}: {count} records")
                
                # Show sample data for debugging
                try:
                    if 'email' in column.lower():
                        cursor.execute(f"SELECT * FROM {table} WHERE {column} = %s LIMIT 3", [email])
                    else:
                        cursor.execute(f"SELECT * FROM {table} WHERE {column} = %s LIMIT 3", [user_id])
                    
                    sample_data = cursor.fetchall()
                    if sample_data and len(cursor.description) <= 10:  # Only show if not too many columns
                        logger.info(f"    Sample columns: {[desc[0] for desc in cursor.description[:5]]}")
                except:
                    pass

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python check_remaining_user_data.py <email>")
        sys.exit(1)
    
    email = sys.argv[1]
    check_remaining_data_for_user(email)
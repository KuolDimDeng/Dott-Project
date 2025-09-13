#!/usr/bin/env python3
"""
Check Database Table Structure
===============================
Checks the actual structure of database tables to understand what columns exist
"""

import os
import sys
import django

# Add the project directory to the Python path
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

def check_table_structure():
    """Check database table structure"""
    
    logger.info("🔍 Checking database table structure...")
    
    with connection.cursor() as cursor:
        # Check custom_auth_user table
        logger.info("\n📋 custom_auth_user table columns:")
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'custom_auth_user'
            ORDER BY ordinal_position
        """)
        for col_name, data_type in cursor.fetchall():
            logger.info(f"   - {col_name}: {data_type}")
        
        # Check users_userprofile table
        logger.info("\n📋 users_userprofile table columns:")
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users_userprofile'
            ORDER BY ordinal_position
        """)
        for col_name, data_type in cursor.fetchall():
            logger.info(f"   - {col_name}: {data_type}")
        
        # Check users_business table
        logger.info("\n📋 users_business table columns:")
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users_business'
            ORDER BY ordinal_position
        """)
        for col_name, data_type in cursor.fetchall():
            logger.info(f"   - {col_name}: {data_type}")
        
        # Check users_business_details table
        logger.info("\n📋 users_business_details table columns:")
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users_business_details'
            ORDER BY ordinal_position
        """)
        for col_name, data_type in cursor.fetchall():
            logger.info(f"   - {col_name}: {data_type}")
        
        # Check marketplace_businesslisting table
        logger.info("\n📋 marketplace_businesslisting table columns:")
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'marketplace_businesslisting'
            ORDER BY ordinal_position
        """)
        for col_name, data_type in cursor.fetchall():
            logger.info(f"   - {col_name}: {data_type}")
        
        # Check for business name in different places
        logger.info("\n📋 Looking for business name data...")
        
        # Check custom_auth_user for business info
        cursor.execute("""
            SELECT u.id, u.email, u.name, t.name as tenant_name
            FROM custom_auth_user u
            LEFT JOIN custom_auth_tenant t ON u.tenant_id = t.id
            WHERE u.email = 'support@dottapps.com'
        """)
        result = cursor.fetchone()
        if result:
            user_id, email, name, tenant_name = result
            logger.info(f"   User: {email}")
            logger.info(f"   Name: {name}")
            logger.info(f"   Tenant: {tenant_name}")
            logger.info(f"   User ID: {user_id}")
        
        # Check if business exists
        cursor.execute("""
            SELECT id, name 
            FROM users_business 
            WHERE id = (SELECT business_id FROM users_userprofile WHERE user_id = %s)
        """, [user_id if result else None])
        business = cursor.fetchone()
        if business:
            logger.info(f"   Business ID: {business[0]}")
            logger.info(f"   Business Name: {business[1]}")

if __name__ == "__main__":
    try:
        check_table_structure()
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
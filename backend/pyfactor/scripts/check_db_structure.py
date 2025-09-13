#!/usr/bin/env python3
"""
Check Database Structure for Marketplace Fix
=============================================
Checks the actual columns in the database tables
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

def check_db_structure():
    """Check database table structure"""
    
    logger.info("🔍 Checking database table structure...")
    
    with connection.cursor() as cursor:
        # Check users_userprofile columns
        logger.info("\n📋 users_userprofile table columns:")
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users_userprofile'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        if columns:
            for col_name, data_type in columns:
                logger.info(f"   - {col_name}: {data_type}")
        else:
            logger.info("   ⚠️ Table users_userprofile not found or has no columns")
        
        # Check users_business table
        logger.info("\n📋 users_business table columns:")
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users_business'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        if columns:
            for col_name, data_type in columns:
                logger.info(f"   - {col_name}: {data_type}")
        else:
            logger.info("   ⚠️ Table users_business not found or has no columns")
        
        # Check users_business_details table
        logger.info("\n📋 users_business_details table columns:")
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'users_business_details'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        if columns:
            for col_name, data_type in columns:
                logger.info(f"   - {col_name}: {data_type}")
        else:
            logger.info("   ⚠️ Table users_business_details not found or has no columns")
        
        # Check marketplace_businesslisting table
        logger.info("\n📋 marketplace_businesslisting table columns:")
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'marketplace_businesslisting'
            ORDER BY ordinal_position
        """)
        columns = cursor.fetchall()
        if columns:
            for col_name, data_type in columns:
                logger.info(f"   - {col_name}: {data_type}")
        else:
            logger.info("   ⚠️ Table marketplace_businesslisting not found or has no columns")
        
        # Check data for support@dottapps.com
        logger.info("\n📋 Checking data for support@dottapps.com:")
        cursor.execute("""
            SELECT u.id, u.email, u.name, t.name as tenant_name
            FROM custom_auth_user u
            LEFT JOIN custom_auth_tenant t ON u.tenant_id = t.id
            WHERE u.email = 'support@dottapps.com'
        """)
        result = cursor.fetchone()
        if result:
            user_id, email, user_name, tenant_name = result
            logger.info(f"   User ID: {user_id}")
            logger.info(f"   Email: {email}")
            logger.info(f"   User Name: {user_name}")
            logger.info(f"   Tenant Name: {tenant_name}")
            
            # Check UserProfile
            cursor.execute("""
                SELECT id, name 
                FROM users_userprofile
                WHERE user_id = %s
            """, [user_id])
            profile = cursor.fetchone()
            if profile:
                logger.info(f"   UserProfile ID: {profile[0]}")
                logger.info(f"   UserProfile Name: {profile[1]}")
            else:
                logger.info("   ⚠️ No UserProfile found")

if __name__ == "__main__":
    try:
        check_db_structure()
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
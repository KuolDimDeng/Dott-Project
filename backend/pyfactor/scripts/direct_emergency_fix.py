#!/usr/bin/env python3
"""
Direct Emergency Fix - Run this directly
========================================
python3 scripts/direct_emergency_fix.py
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

def fix_all_database_issues():
    """Fix all database issues"""
    
    logger.info("🚨 EMERGENCY DATABASE FIX STARTING...")
    
    with connection.cursor() as cursor:
        # Fix 1: Add missing columns to custom_auth_user
        logger.info("\n1️⃣ Fixing custom_auth_user table...")
        try:
            cursor.execute("""
                ALTER TABLE custom_auth_user 
                ADD COLUMN IF NOT EXISTS signup_method VARCHAR(10) DEFAULT 'email';
            """)
            logger.info("✅ Added signup_method column")
        except Exception as e:
            logger.warning(f"⚠️ signup_method: {e}")
        
        try:
            cursor.execute("""
                ALTER TABLE custom_auth_user 
                ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
            """)
            logger.info("✅ Added phone_number column")
        except Exception as e:
            logger.warning(f"⚠️ phone_number: {e}")
            
        # Fix 2: Add missing columns to courier tables
        logger.info("\n2️⃣ Fixing courier tables...")
        
        # Check which courier table exists
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_name IN ('courier_profiles', 'couriers_courierprofile')
        """)
        courier_tables = [row[0] for row in cursor.fetchall()]
        
        if courier_tables:
            table_name = courier_tables[0]
            logger.info(f"Found courier table: {table_name}")
            
            try:
                cursor.execute(f"""
                    ALTER TABLE {table_name}
                    ADD COLUMN IF NOT EXISTS verified_by_id INTEGER 
                    REFERENCES custom_auth_user(id) ON DELETE SET NULL;
                """)
                logger.info("✅ Added verified_by_id column")
            except Exception as e:
                logger.warning(f"⚠️ verified_by_id: {e}")
            
            try:
                cursor.execute(f"""
                    ALTER TABLE {table_name}
                    ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP;
                """)
                logger.info("✅ Added verification_date column")
            except Exception as e:
                logger.warning(f"⚠️ verification_date: {e}")
                
        else:
            logger.warning("⚠️ No courier tables found")
        
        # Fix 3: Fix marketplace tables
        logger.info("\n3️⃣ Fixing marketplace tables...")
        
        # Check marketplace_businesslisting table
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'marketplace_businesslisting'
            );
        """)
        
        if cursor.fetchone()[0]:
            try:
                cursor.execute("""
                    ALTER TABLE marketplace_businesslisting
                    ADD COLUMN IF NOT EXISTS city VARCHAR(100);
                """)
                logger.info("✅ Added city column to marketplace_businesslisting")
            except Exception as e:
                logger.warning(f"⚠️ city: {e}")
            
            try:
                cursor.execute("""
                    ALTER TABLE marketplace_businesslisting
                    ADD COLUMN IF NOT EXISTS country VARCHAR(2);
                """)
                logger.info("✅ Added country column to marketplace_businesslisting")
            except Exception as e:
                logger.warning(f"⚠️ country: {e}")
        
        # Fix 4: Create personal info update endpoint
        logger.info("\n4️⃣ Checking UserProfile table...")
        
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'user_profiles'
            );
        """)
        
        if cursor.fetchone()[0]:
            try:
                cursor.execute("""
                    ALTER TABLE user_profiles
                    ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20);
                """)
                logger.info("✅ Added phone_number to user_profiles")
            except Exception as e:
                logger.warning(f"⚠️ user_profiles.phone_number: {e}")
            
            try:
                cursor.execute("""
                    ALTER TABLE user_profiles
                    ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
                """)
                logger.info("✅ Added latitude to user_profiles")
            except Exception as e:
                logger.warning(f"⚠️ user_profiles.latitude: {e}")
                
            try:
                cursor.execute("""
                    ALTER TABLE user_profiles
                    ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
                """)
                logger.info("✅ Added longitude to user_profiles")
            except Exception as e:
                logger.warning(f"⚠️ user_profiles.longitude: {e}")
        
        logger.info("\n✅ DATABASE FIX COMPLETED!")
        logger.info("Now run: python manage.py migrate --fake-initial")

if __name__ == "__main__":
    try:
        fix_all_database_issues()
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
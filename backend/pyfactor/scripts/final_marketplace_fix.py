#!/usr/bin/env python3
"""
Final Marketplace Fix
=====================
Fixes the remaining marketplace database issues
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

def fix_marketplace_columns():
    """Fix missing marketplace columns"""
    
    logger.info("🚨 FIXING REMAINING MARKETPLACE ISSUES...")
    
    with connection.cursor() as cursor:
        # Fix 1: Add featured_until column to marketplace_business_listing
        logger.info("\n1️⃣ Fixing marketplace_business_listing table...")
        try:
            cursor.execute("""
                ALTER TABLE marketplace_business_listing 
                ADD COLUMN IF NOT EXISTS featured_until DATE;
            """)
            logger.info("✅ Added featured_until column")
        except Exception as e:
            logger.warning(f"⚠️ featured_until: {e}")
        
        # Fix 2: Check if the table name is correct
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_name LIKE 'marketplace%listing%'
        """)
        tables = [row[0] for row in cursor.fetchall()]
        logger.info(f"Found marketplace listing tables: {tables}")
        
        # Try different table names
        for table_name in ['marketplace_businesslisting', 'marketplace_business_listing']:
            cursor.execute(f"""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = '{table_name}'
                );
            """)
            
            if cursor.fetchone()[0]:
                logger.info(f"✅ Found table: {table_name}")
                
                # Add all missing columns
                columns_to_add = [
                    ('featured_until', 'DATE'),
                    ('is_featured', 'BOOLEAN DEFAULT FALSE'),
                    ('is_visible_in_marketplace', 'BOOLEAN DEFAULT TRUE'),
                    ('is_published', 'BOOLEAN DEFAULT FALSE'),
                    ('is_active', 'BOOLEAN DEFAULT TRUE'),
                    ('is_open_now', 'BOOLEAN DEFAULT FALSE'),
                    ('city', 'VARCHAR(100)'),
                    ('country', 'VARCHAR(2)'),
                    ('business_type', "VARCHAR(20) DEFAULT 'OTHER'"),
                    ('description', 'TEXT'),
                    ('logo_url', 'TEXT'),
                    ('banner_url', 'TEXT'),
                    ('phone', 'VARCHAR(20)'),
                    ('email', 'VARCHAR(254)'),
                    ('website', 'TEXT'),
                    ('address', 'TEXT'),
                    ('operating_hours', 'JSONB'),
                    ('categories', "JSONB DEFAULT '[]'::jsonb"),
                    ('subcategories', "JSONB DEFAULT '[]'::jsonb"),
                ]
                
                for col_name, col_type in columns_to_add:
                    try:
                        cursor.execute(f"""
                            ALTER TABLE {table_name}
                            ADD COLUMN IF NOT EXISTS {col_name} {col_type};
                        """)
                        logger.info(f"✅ Added {col_name} to {table_name}")
                    except Exception as e:
                        logger.warning(f"⚠️ {col_name}: {e}")
        
        # Fix 3: Fix the userprofile reference issue
        logger.info("\n2️⃣ Checking UserProfile model...")
        cursor.execute("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_name IN ('user_profiles', 'userprofile', 'custom_auth_userprofile')
        """)
        profile_tables = [row[0] for row in cursor.fetchall()]
        logger.info(f"Found profile tables: {profile_tables}")
        
        # If user_profiles table exists, ensure it has needed fields
        if 'user_profiles' in profile_tables:
            profile_columns = [
                ('business_name', 'VARCHAR(255)'),
                ('business_type', "VARCHAR(50) DEFAULT 'OTHER'"),
                ('city', 'VARCHAR(100)'),
                ('country', 'VARCHAR(2)'),
                ('phone_number', 'VARCHAR(20)'),
                ('address', 'TEXT'),
                ('latitude', 'DECIMAL(10, 8)'),
                ('longitude', 'DECIMAL(11, 8)'),
            ]
            
            for col_name, col_type in profile_columns:
                try:
                    cursor.execute(f"""
                        ALTER TABLE user_profiles
                        ADD COLUMN IF NOT EXISTS {col_name} {col_type};
                    """)
                    logger.info(f"✅ Added {col_name} to user_profiles")
                except Exception as e:
                    logger.warning(f"⚠️ user_profiles.{col_name}: {e}")
        
        logger.info("\n✅ MARKETPLACE FIX COMPLETED!")
        logger.info("The app should work now after restart")

if __name__ == "__main__":
    try:
        fix_marketplace_columns()
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
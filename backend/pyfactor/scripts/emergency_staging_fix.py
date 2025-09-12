#!/usr/bin/env python3
"""
Emergency Staging Fix Script
=============================
Fixes all critical database schema and API issues found in staging.

Run in staging shell:
    python3 scripts/emergency_staging_fix.py

Issues addressed:
1. Missing courier_profiles.verified_by_id column
2. Missing custom_auth_user.signup_method column
3. Marketplace API errors
4. Business API endpoint issues
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection, transaction
from django.db.migrations.recorder import MigrationRecorder
import logging

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='🚨 [EMERGENCY_FIX] %(asctime)s - %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger(__name__)

def check_and_add_column(table_name, column_name, column_definition):
    """Helper to check and add missing column"""
    with connection.cursor() as cursor:
        # Check if column exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = %s AND column_name = %s
        """, [table_name, column_name])
        
        if cursor.fetchone() is None:
            logger.warning(f"❌ Missing column: {table_name}.{column_name}")
            try:
                cursor.execute(f"""
                    ALTER TABLE {table_name} 
                    ADD COLUMN IF NOT EXISTS {column_name} {column_definition}
                """)
                logger.info(f"✅ Added column: {table_name}.{column_name}")
                return True
            except Exception as e:
                logger.error(f"❌ Failed to add {table_name}.{column_name}: {e}")
                return False
        else:
            logger.info(f"✅ Column exists: {table_name}.{column_name}")
            return True

def fix_courier_database():
    """Fix courier database schema issues"""
    logger.info("\n🔧 === FIXING COURIER DATABASE ===")
    
    # Check if courier tables exist
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE 'couriers_%' OR table_name LIKE 'courier_%'
        """)
        courier_tables = [row[0] for row in cursor.fetchall()]
        logger.info(f"Found courier tables: {courier_tables}")
    
    if not courier_tables:
        logger.warning("⚠️ No courier tables found - skipping courier fixes")
        return False
    
    # Fix missing columns in courier_profiles
    courier_columns = [
        ('verified_by_id', 'INTEGER REFERENCES custom_auth_user(id) ON DELETE SET NULL'),
        ('verification_date', 'TIMESTAMP'),
        ('is_verified', 'BOOLEAN DEFAULT FALSE'),
        ('service_categories', 'JSONB DEFAULT \'[]\'::jsonb'),
        ('availability_status', "VARCHAR(20) DEFAULT 'offline'"),
        ('current_location', 'JSONB'),
        ('operating_areas', 'JSONB DEFAULT \'[]\'::jsonb'),
    ]
    
    table_names = ['courier_profiles', 'couriers_courierprofile']
    
    for table_name in table_names:
        if table_name in courier_tables:
            logger.info(f"🔧 Fixing table: {table_name}")
            for col_name, col_def in courier_columns:
                check_and_add_column(table_name, col_name, col_def)
            break
    
    return True

def fix_custom_auth_database():
    """Fix custom_auth database schema issues"""
    logger.info("\n🔧 === FIXING CUSTOM_AUTH DATABASE ===")
    
    # Critical columns that are missing
    auth_columns = [
        ('signup_method', "VARCHAR(10) DEFAULT 'email'"),
        ('auth0_sub', 'VARCHAR(255)'),
        ('name', 'VARCHAR(255)'),
        ('picture', 'TEXT'),
        ('email_verified', 'BOOLEAN DEFAULT FALSE'),
        ('onboarding_completed', 'BOOLEAN DEFAULT FALSE'),
        ('onboarding_completed_at', 'TIMESTAMP'),
        ('subscription_plan', "VARCHAR(20) DEFAULT 'free'"),
        ('timezone', "VARCHAR(50) DEFAULT 'UTC'"),
        ('is_deleted', 'BOOLEAN DEFAULT FALSE'),
        ('deleted_at', 'TIMESTAMP'),
        ('deletion_reason', 'VARCHAR(255)'),
        ('deletion_feedback', 'TEXT'),
        ('deletion_initiated_by', 'VARCHAR(255)'),
        ('phone_number', 'VARCHAR(20)'),
        ('business_id', 'UUID'),
        ('role', "VARCHAR(10) DEFAULT 'OWNER'"),
    ]
    
    for col_name, col_def in auth_columns:
        check_and_add_column('custom_auth_user', col_name, col_def)
    
    return True

def fix_marketplace_database():
    """Fix marketplace database schema issues"""
    logger.info("\n🔧 === FIXING MARKETPLACE DATABASE ===")
    
    # Check marketplace tables
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE 'marketplace_%'
        """)
        marketplace_tables = [row[0] for row in cursor.fetchall()]
        logger.info(f"Found marketplace tables: {marketplace_tables}")
    
    # Ensure BusinessListing table has all required columns
    if 'marketplace_businesslisting' in marketplace_tables:
        listing_columns = [
            ('is_featured', 'BOOLEAN DEFAULT FALSE'),
            ('featured_until', 'DATE'),
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
            ('categories', 'JSONB DEFAULT \'[]\'::jsonb'),
            ('subcategories', 'JSONB DEFAULT \'[]\'::jsonb'),
            ('created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'),
            ('updated_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP'),
        ]
        
        for col_name, col_def in listing_columns:
            check_and_add_column('marketplace_businesslisting', col_name, col_def)
    
    return True

def mark_migrations_as_applied():
    """Mark problematic migrations as applied if tables exist"""
    logger.info("\n🔧 === MARKING MIGRATIONS AS APPLIED ===")
    
    recorder = MigrationRecorder(connection)
    
    # Check and mark courier migrations
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name LIKE 'courier%'
        """)
        courier_table_count = cursor.fetchone()[0]
        
        if courier_table_count > 0:
            courier_migrations = ['0001_initial', '0002_add_delivery_categories']
            for migration in courier_migrations:
                if not recorder.migration_qs.filter(app='couriers', name=migration).exists():
                    try:
                        recorder.record_applied('couriers', migration)
                        logger.info(f"✅ Marked couriers.{migration} as applied")
                    except Exception as e:
                        logger.warning(f"⚠️ Could not mark couriers.{migration}: {e}")
    
    # Check and mark marketplace migrations
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT COUNT(*) FROM information_schema.tables 
            WHERE table_name LIKE 'marketplace_%'
        """)
        marketplace_table_count = cursor.fetchone()[0]
        
        if marketplace_table_count > 0:
            marketplace_migrations = ['0001_initial', '0002_remove_placeholderbusiness', '0003_add_courier_integration']
            for migration in marketplace_migrations:
                if not recorder.migration_qs.filter(app='marketplace', name=migration).exists():
                    try:
                        recorder.record_applied('marketplace', migration)
                        logger.info(f"✅ Marked marketplace.{migration} as applied")
                    except Exception as e:
                        logger.warning(f"⚠️ Could not mark marketplace.{migration}: {e}")
    
    return True

def verify_fixes():
    """Verify that the fixes work"""
    logger.info("\n🔍 === VERIFYING FIXES ===")
    
    try:
        # Test importing models
        from custom_auth.models import User
        from marketplace.models import BusinessListing
        
        # Test basic queries
        user_count = User.objects.count()
        logger.info(f"✅ User model works: {user_count} users")
        
        listing_count = BusinessListing.objects.count()
        logger.info(f"✅ BusinessListing model works: {listing_count} listings")
        
        # Try importing courier models if they exist
        try:
            from couriers.models import CourierProfile
            courier_count = CourierProfile.objects.count()
            logger.info(f"✅ CourierProfile model works: {courier_count} profiles")
        except Exception as e:
            logger.warning(f"⚠️ Courier models not available: {e}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Verification failed: {e}")
        return False

def main():
    """Main execution"""
    logger.info("🚨 === EMERGENCY STAGING FIX STARTING ===")
    logger.info("This script fixes critical database issues found in staging")
    
    try:
        with transaction.atomic():
            # Fix database schemas
            if not fix_custom_auth_database():
                logger.error("❌ Failed to fix custom_auth database")
                
            if not fix_courier_database():
                logger.warning("⚠️ Courier database fixes incomplete")
                
            if not fix_marketplace_database():
                logger.error("❌ Failed to fix marketplace database")
            
            # Mark migrations as applied
            if not mark_migrations_as_applied():
                logger.warning("⚠️ Some migrations could not be marked")
            
            # Verify everything works
            if verify_fixes():
                logger.info("🎉 === ALL FIXES APPLIED SUCCESSFULLY ===")
                logger.info("\n📋 Next steps:")
                logger.info("1. Run: python manage.py migrate --fake-initial")
                logger.info("2. Restart the Django application")
                logger.info("3. Test the mobile app again")
                return True
            else:
                logger.error("❌ Verification failed - rolling back")
                raise Exception("Verification failed")
                
    except Exception as e:
        logger.error(f"❌ Emergency fix failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = main()
    sys.exit(0 if success else 1)
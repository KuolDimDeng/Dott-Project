#!/usr/bin/env python3
"""
Verify Marketplace Tables
=========================
Check all marketplace-related tables exist
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

def verify_marketplace_tables():
    """Verify all marketplace tables exist"""
    
    logger.info("🔍 VERIFYING MARKETPLACE TABLES...")
    
    required_tables = [
        'marketplace_businesslisting',
        'marketplace_consumerprofile',
        'marketplace_consumer_profile',
        'marketplace_consumer_profiles',
        'marketplace_businesssearch',
        'marketplace_consumerorder',
        'marketplace_orderreview',
    ]
    
    with connection.cursor() as cursor:
        # Get all marketplace tables
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE 'marketplace%'
            ORDER BY table_name
        """)
        
        existing_tables = [row[0] for row in cursor.fetchall()]
        
        logger.info(f"\n📋 Found {len(existing_tables)} marketplace tables:")
        for table in existing_tables:
            logger.info(f"   ✅ {table}")
        
        # Check for missing tables
        missing = []
        for table in required_tables:
            if table not in existing_tables:
                # Check alternate names
                found = False
                for existing in existing_tables:
                    if table.replace('_', '') in existing.replace('_', ''):
                        found = True
                        break
                if not found:
                    missing.append(table)
        
        if missing:
            logger.info(f"\n⚠️ Potentially missing tables:")
            for table in missing:
                logger.info(f"   ❌ {table}")
        else:
            logger.info("\n✅ All required marketplace tables exist!")
        
        # Check specific columns
        logger.info("\n🔍 Checking BusinessListing columns...")
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'marketplace_businesslisting'
            ORDER BY ordinal_position
        """)
        
        columns = cursor.fetchall()
        important_cols = ['business_type', 'city', 'country', 'featured_until', 'is_featured']
        
        existing_cols = [col[0] for col in columns]
        for col in important_cols:
            if col in existing_cols:
                logger.info(f"   ✅ {col}")
            else:
                logger.info(f"   ❌ {col} - MISSING!")

if __name__ == "__main__":
    try:
        verify_marketplace_tables()
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
#!/usr/bin/env python3
"""
Fix Marketplace Cloudinary Fields
==================================
Adds missing Cloudinary fields to marketplace_business_listing table
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

def fix_marketplace_cloudinary():
    """Add Cloudinary fields to marketplace_business_listing table"""
    
    logger.info("🔍 Adding Cloudinary fields to marketplace database...")
    
    with connection.cursor() as cursor:
        # Check if table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'marketplace_business_listing'
            )
        """)
        
        if not cursor.fetchone()[0]:
            logger.info("⚠️ Table marketplace_business_listing doesn't exist")
            logger.info("   Creating marketplace tables...")
            
            # Run migrations for marketplace app
            from django.core.management import call_command
            call_command('migrate', 'marketplace')
            logger.info("✅ Marketplace tables created")
        
        # Add Cloudinary fields to marketplace_business_listing
        logger.info("\n📋 Adding fields to marketplace_business_listing...")
        
        marketplace_fields = [
            ('logo_url', 'VARCHAR(500)'),
            ('logo_public_id', 'VARCHAR(255)'),
            ('cover_image_url', 'VARCHAR(500)'),
            ('cover_image_public_id', 'VARCHAR(255)'),
            ('gallery_images', 'JSONB DEFAULT \'[]\'::jsonb')
        ]
        
        for field_name, field_type in marketplace_fields:
            try:
                # Check if column exists
                cursor.execute(f"""
                    SELECT column_name 
                    FROM information_schema.columns 
                    WHERE table_name = 'marketplace_business_listing' 
                    AND column_name = '{field_name}'
                """)
                
                if cursor.fetchone():
                    logger.info(f"   ℹ️ {field_name} already exists")
                else:
                    cursor.execute(f"""
                        ALTER TABLE marketplace_business_listing 
                        ADD COLUMN {field_name} {field_type}
                    """)
                    logger.info(f"   ✅ Added {field_name}")
            except Exception as e:
                logger.info(f"   ⚠️ Error with {field_name}: {e}")
        
        logger.info("\n✅ Marketplace Cloudinary fields have been fixed!")
        logger.info("\n📌 The Advertise feature should now work properly.")

if __name__ == "__main__":
    try:
        fix_marketplace_cloudinary()
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
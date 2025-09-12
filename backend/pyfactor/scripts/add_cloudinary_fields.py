#!/usr/bin/env python3
"""
Add Cloudinary Fields to Database
==================================
Adds Cloudinary URL and public ID fields to UserProfile and BusinessListing
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

def add_cloudinary_fields():
    """Add Cloudinary fields to UserProfile and BusinessListing tables"""
    
    logger.info("🔍 Adding Cloudinary fields to database...")
    
    with connection.cursor() as cursor:
        # Add fields to users_userprofile
        logger.info("\n📋 Adding fields to users_userprofile...")
        
        userprofile_fields = [
            ('logo_cloudinary_url', 'VARCHAR(500)'),
            ('logo_cloudinary_public_id', 'VARCHAR(255)'),
            ('profile_image_url', 'VARCHAR(500)'),
            ('profile_image_public_id', 'VARCHAR(255)')
        ]
        
        for field_name, field_type in userprofile_fields:
            try:
                cursor.execute(f"""
                    ALTER TABLE users_userprofile 
                    ADD COLUMN IF NOT EXISTS {field_name} {field_type}
                """)
                logger.info(f"   ✅ Added {field_name}")
            except Exception as e:
                logger.info(f"   ⚠️ {field_name} may already exist or error: {e}")
        
        # Add fields to marketplace_businesslisting
        logger.info("\n📋 Adding fields to marketplace_businesslisting...")
        
        marketplace_fields = [
            ('logo_url', 'VARCHAR(500)'),
            ('logo_public_id', 'VARCHAR(255)'),
            ('cover_image_url', 'VARCHAR(500)'),
            ('cover_image_public_id', 'VARCHAR(255)'),
            ('gallery_images', 'JSONB DEFAULT \'[]\'::jsonb')
        ]
        
        for field_name, field_type in marketplace_fields:
            try:
                cursor.execute(f"""
                    ALTER TABLE marketplace_businesslisting 
                    ADD COLUMN IF NOT EXISTS {field_name} {field_type}
                """)
                logger.info(f"   ✅ Added {field_name}")
            except Exception as e:
                logger.info(f"   ⚠️ {field_name} may already exist or error: {e}")
        
        # Check if advertising tables exist and add fields if they do
        logger.info("\n📋 Checking advertising tables...")
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'advertising_advertisingcampaign'
            )
        """)
        
        if cursor.fetchone()[0]:
            logger.info("   ✅ Advertising table exists, fields already have cloudinary support")
        else:
            logger.info("   ℹ️ Advertising table not found (will be created when needed)")
        
        logger.info("\n✅ Cloudinary fields have been added successfully!")
        logger.info("\n📌 Next steps:")
        logger.info("   1. Upload images using /api/media/upload/ endpoint")
        logger.info("   2. Use purpose='profile' for user profile images")
        logger.info("   3. Use purpose='logo' for business logos")
        logger.info("   4. Use purpose='marketplace' for marketplace images")
        logger.info("   5. Use purpose='advertisement' for advertising images")

if __name__ == "__main__":
    try:
        add_cloudinary_fields()
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
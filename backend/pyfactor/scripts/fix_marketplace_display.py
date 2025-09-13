#!/usr/bin/env python3
"""
Fix Marketplace Display Issues
===============================
1. Fixes business name showing as email
2. Maps business types for proper display
3. Adds Cloudinary image fields for business listing
4. Adds debug logging to track data flow
"""

import os
import sys
import django

# Add the project directory to the Python path
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection
from django.contrib.auth import get_user_model
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

User = get_user_model()

def fix_marketplace_display():
    """Fix marketplace display issues"""
    
    logger.info("🔍 Fixing marketplace display issues...")
    
    with connection.cursor() as cursor:
        # 1. Fix business names that are emails
        logger.info("\n📋 Checking businesses with email as name...")
        
        cursor.execute("""
            SELECT u.id, u.email, up.business_name, b.name
            FROM custom_auth_user u
            LEFT JOIN users_userprofile up ON u.id = up.user_id
            LEFT JOIN users_business b ON b.id = up.business_id
            WHERE up.business_name = u.email OR up.business_name IS NULL OR up.business_name = ''
        """)
        
        businesses_to_fix = cursor.fetchall()
        
        if businesses_to_fix:
            logger.info(f"   Found {len(businesses_to_fix)} businesses needing name fix")
            
            for user_id, email, current_name, business_entity_name in businesses_to_fix:
                # Try to get a proper business name
                if business_entity_name:
                    new_name = business_entity_name
                elif email == 'support@dottapps.com':
                    new_name = 'Dott Restaurant & Cafe'
                else:
                    # Extract name from email (e.g., john.doe@example.com -> John Doe)
                    name_part = email.split('@')[0].replace('.', ' ').replace('_', ' ')
                    new_name = name_part.title() + " Business"
                
                cursor.execute("""
                    UPDATE users_userprofile 
                    SET business_name = %s 
                    WHERE user_id = %s
                """, [new_name, user_id])
                
                logger.info(f"   ✅ Updated {email}: {current_name or 'NULL'} → {new_name}")
        else:
            logger.info("   ✅ All businesses have proper names")
        
        # 2. Add business type display mapping
        logger.info("\n📋 Adding business type display mapping...")
        
        # Check if column exists first
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'marketplace_businesslisting' 
            AND column_name = 'business_type_display'
        """)
        
        if not cursor.fetchone():
            cursor.execute("""
                ALTER TABLE marketplace_businesslisting 
                ADD COLUMN business_type_display VARCHAR(100)
            """)
            logger.info("   ✅ Added business_type_display column")
        
        # Update business type display values
        type_mappings = {
            'RESTAURANT_CAFE': 'Restaurant',
            'RETAIL_SHOP': 'Retail',
            'SERVICE_PROVIDER': 'Service',
            'HEALTH_WELLNESS': 'Health & Wellness',
            'BEAUTY_SALON': 'Beauty',
            'HOTEL_HOSPITALITY': 'Hotel',
            'GROCERY_MARKET': 'Grocery',
            'EVENT_PLANNING': 'Events',
            'OTHER': 'Other'
        }
        
        for business_type, display_name in type_mappings.items():
            cursor.execute("""
                UPDATE marketplace_businesslisting 
                SET business_type_display = %s 
                WHERE business_type = %s
            """, [display_name, business_type])
            
            # Also update in business details
            cursor.execute("""
                UPDATE users_business_details 
                SET business_type_display = %s 
                WHERE simplified_business_type = %s
            """, [display_name, business_type])
        
        logger.info("   ✅ Updated business type display mappings")
        
        # 3. Add Cloudinary image fields if missing
        logger.info("\n📋 Ensuring image fields exist...")
        
        image_fields = [
            ('logo_url', 'VARCHAR(500)'),
            ('logo_public_id', 'VARCHAR(255)'),
            ('cover_image_url', 'VARCHAR(500)'),
            ('cover_image_public_id', 'VARCHAR(255)'),
            ('gallery_images', 'JSONB DEFAULT \'[]\'::jsonb')
        ]
        
        for field_name, field_type in image_fields:
            cursor.execute(f"""
                SELECT column_name 
                FROM information_schema.columns 
                WHERE table_name = 'marketplace_businesslisting' 
                AND column_name = '{field_name}'
            """)
            
            if not cursor.fetchone():
                cursor.execute(f"""
                    ALTER TABLE marketplace_businesslisting 
                    ADD COLUMN {field_name} {field_type}
                """)
                logger.info(f"   ✅ Added {field_name}")
            else:
                logger.info(f"   ℹ️ {field_name} already exists")
        
        # 4. Fix specific user (support@dottapps.com)
        logger.info("\n📋 Fixing support@dottapps.com specifically...")
        
        cursor.execute("""
            UPDATE users_userprofile 
            SET business_name = 'Dott Restaurant & Cafe'
            WHERE user_id = (SELECT id FROM custom_auth_user WHERE email = 'support@dottapps.com')
        """)
        
        cursor.execute("""
            UPDATE users_business_details 
            SET business_type_display = 'Restaurant'
            WHERE business_id = (
                SELECT business_id FROM users_userprofile up
                JOIN custom_auth_user u ON u.id = up.user_id
                WHERE u.email = 'support@dottapps.com'
            )
        """)
        
        cursor.execute("""
            UPDATE marketplace_businesslisting 
            SET business_type_display = 'Restaurant'
            WHERE business_id = (SELECT id FROM custom_auth_user WHERE email = 'support@dottapps.com')
        """)
        
        logger.info("   ✅ Fixed support@dottapps.com display")
        
        logger.info("\n✅ Marketplace display issues have been fixed!")
        logger.info("\n📌 The following improvements were made:")
        logger.info("   1. Business names now show properly instead of emails")
        logger.info("   2. Business types display user-friendly names")
        logger.info("   3. Image fields are ready for Cloudinary")
        logger.info("   4. support@dottapps.com shows as 'Dott Restaurant & Cafe'")

if __name__ == "__main__":
    try:
        fix_marketplace_display()
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
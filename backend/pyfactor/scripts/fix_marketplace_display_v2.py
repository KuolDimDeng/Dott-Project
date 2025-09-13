#!/usr/bin/env python3
"""
Fix Marketplace Display Issues V2
==================================
Fixed version that works with actual database structure
"""

import os
import sys
import django

# Add the project directory to the Python path
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection, transaction
from django.contrib.auth import get_user_model
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

User = get_user_model()

def fix_marketplace_display():
    """Fix marketplace display issues with correct table structure"""
    
    logger.info("🔍 Starting marketplace display fix (V2)...")
    
    with transaction.atomic():
        with connection.cursor() as cursor:
            # 1. First check current state
            logger.info("\n📋 Checking current database state...")
            
            cursor.execute("""
                SELECT u.id, u.email, u.name, t.name as tenant_name, t.id as tenant_id
                FROM custom_auth_user u
                LEFT JOIN custom_auth_tenant t ON u.tenant_id = t.id
                WHERE u.email = 'support@dottapps.com'
            """)
            
            result = cursor.fetchone()
            if result:
                user_id, email, user_name, tenant_name, tenant_id = result
                logger.info(f"   User ID: {user_id}")
                logger.info(f"   Email: {email}")
                logger.info(f"   Current User Name: {user_name}")
                logger.info(f"   Current Tenant Name: {tenant_name}")
                logger.info(f"   Tenant ID: {tenant_id}")
                
                # 2. Update tenant name if needed
                if tenant_name != 'Dott Restaurant & Cafe':
                    logger.info("\n📋 Updating tenant name...")
                    cursor.execute("""
                        UPDATE custom_auth_tenant
                        SET name = 'Dott Restaurant & Cafe'
                        WHERE id = %s
                    """, [tenant_id])
                    logger.info("   ✅ Updated tenant name to 'Dott Restaurant & Cafe'")
                else:
                    logger.info("   ✅ Tenant name already correct")
                
                # 3. Update user name if needed
                if user_name != 'Dott Restaurant & Cafe':
                    logger.info("\n📋 Updating user name...")
                    cursor.execute("""
                        UPDATE custom_auth_user
                        SET name = 'Dott Restaurant & Cafe'
                        WHERE id = %s
                    """, [user_id])
                    logger.info("   ✅ Updated user name to 'Dott Restaurant & Cafe'")
                else:
                    logger.info("   ✅ User name already correct")
                
                # 4. Check/Update UserProfile
                logger.info("\n📋 Checking UserProfile...")
                cursor.execute("""
                    SELECT id, name, simplified_business_type
                    FROM users_userprofile
                    WHERE user_id = %s
                """, [user_id])
                
                profile = cursor.fetchone()
                if profile:
                    profile_id, profile_name, business_type = profile
                    logger.info(f"   Current Profile Name: {profile_name}")
                    logger.info(f"   Current Business Type: {business_type}")
                    
                    # Update profile name
                    cursor.execute("""
                        UPDATE users_userprofile
                        SET name = 'Dott Restaurant & Cafe',
                            simplified_business_type = 'RESTAURANT_CAFE'
                        WHERE user_id = %s
                    """, [user_id])
                    logger.info("   ✅ Updated UserProfile")
                else:
                    # Create UserProfile if it doesn't exist
                    cursor.execute("""
                        INSERT INTO users_userprofile (
                            user_id, name, simplified_business_type, tenant_id
                        ) VALUES (%s, %s, %s, %s)
                    """, [user_id, 'Dott Restaurant & Cafe', 'RESTAURANT_CAFE', tenant_id])
                    logger.info("   ✅ Created UserProfile")
                
                # 5. Fix marketplace_businesslisting
                logger.info("\n📋 Fixing marketplace_businesslisting...")
                
                # Check if listing exists
                cursor.execute("""
                    SELECT id, business_type
                    FROM marketplace_businesslisting
                    WHERE business_id = %s
                """, [user_id])
                
                listing = cursor.fetchone()
                if listing:
                    listing_id, business_type = listing
                    logger.info(f"   Current business_type: {business_type}")
                    
                    # Update business type and ensure visibility
                    cursor.execute("""
                        UPDATE marketplace_businesslisting
                        SET business_type = 'RESTAURANT_CAFE',
                            is_visible_in_marketplace = true,
                            is_verified = true,
                            description = 'Premium restaurant and cafe offering delicious food and beverages',
                            city = 'Juba',
                            country = 'SS'
                        WHERE business_id = %s
                    """, [user_id])
                    logger.info("   ✅ Updated marketplace listing")
                else:
                    # Create listing if it doesn't exist
                    cursor.execute("""
                        INSERT INTO marketplace_businesslisting (
                            id, business_id, business_type, country, city,
                            is_visible_in_marketplace, is_verified, description
                        ) VALUES (
                            gen_random_uuid(), %s, 'RESTAURANT_CAFE', 'SS', 'Juba',
                            true, true, 'Premium restaurant and cafe offering delicious food and beverages'
                        )
                    """, [user_id])
                    logger.info("   ✅ Created marketplace listing")
                
                # 6. Ensure Cloudinary fields exist
                logger.info("\n📋 Checking Cloudinary fields...")
                
                cloudinary_fields = [
                    ('logo_url', 'VARCHAR(500)'),
                    ('logo_public_id', 'VARCHAR(255)'),
                    ('cover_image_url', 'VARCHAR(500)'),
                    ('cover_image_public_id', 'VARCHAR(255)'),
                    ('gallery_images', 'JSONB DEFAULT \'[]\'::jsonb')
                ]
                
                for field_name, field_type in cloudinary_fields:
                    cursor.execute(f"""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = 'marketplace_businesslisting' 
                        AND column_name = '{field_name}'
                    """)
                    
                    if not cursor.fetchone():
                        try:
                            cursor.execute(f"""
                                ALTER TABLE marketplace_businesslisting 
                                ADD COLUMN {field_name} {field_type}
                            """)
                            logger.info(f"   ✅ Added {field_name}")
                        except Exception as e:
                            logger.info(f"   ⚠️ Could not add {field_name}: {e}")
                    else:
                        logger.info(f"   ℹ️ {field_name} already exists")
                
                # 7. Check for existing images from users_business_details
                logger.info("\n📋 Checking for existing images in business_details...")
                
                # First get business_id from UserProfile
                cursor.execute("""
                    SELECT business_id FROM users_userprofile WHERE user_id = %s
                """, [user_id])
                
                business_id_result = cursor.fetchone()
                if business_id_result and business_id_result[0]:
                    business_id = business_id_result[0]
                    
                    cursor.execute("""
                        SELECT logo_url, cover_image_url
                        FROM users_business_details
                        WHERE business_id = %s
                    """, [business_id])
                    
                    images = cursor.fetchone()
                    if images and (images[0] or images[1]):
                        logo_url, cover_url = images
                        logger.info(f"   Found logo: {logo_url}")
                        logger.info(f"   Found cover: {cover_url}")
                        
                        # Copy images to marketplace listing
                        if logo_url or cover_url:
                            cursor.execute("""
                                UPDATE marketplace_businesslisting
                                SET logo_url = COALESCE(%s, logo_url),
                                    cover_image_url = COALESCE(%s, cover_image_url)
                                WHERE business_id = %s
                            """, [logo_url, cover_url, user_id])
                            logger.info("   ✅ Copied images to marketplace listing")
                    else:
                        logger.info("   ℹ️ No images found in business_details")
                else:
                    logger.info("   ℹ️ No business_id found in UserProfile")
                
                # 8. Verify the fix
                logger.info("\n📋 Verifying fixes...")
                
                cursor.execute("""
                    SELECT 
                        u.email,
                        u.name as user_name,
                        t.name as tenant_name,
                        up.name as profile_name,
                        ml.business_type,
                        ml.is_visible_in_marketplace,
                        ml.logo_url,
                        ml.cover_image_url
                    FROM custom_auth_user u
                    LEFT JOIN custom_auth_tenant t ON u.tenant_id = t.id
                    LEFT JOIN users_userprofile up ON u.id = up.user_id
                    LEFT JOIN marketplace_businesslisting ml ON u.id = ml.business_id
                    WHERE u.email = 'support@dottapps.com'
                """)
                
                final_state = cursor.fetchone()
                if final_state:
                    logger.info("\n✅ Final State:")
                    logger.info(f"   Email: {final_state[0]}")
                    logger.info(f"   User Name: {final_state[1]}")
                    logger.info(f"   Tenant Name: {final_state[2]}")
                    logger.info(f"   Profile Name: {final_state[3]}")
                    logger.info(f"   Business Type: {final_state[4]}")
                    logger.info(f"   Visible in Marketplace: {final_state[5]}")
                    logger.info(f"   Logo URL: {final_state[6]}")
                    logger.info(f"   Cover URL: {final_state[7]}")
                
                logger.info("\n✅ Marketplace display issues have been fixed!")
                logger.info("\n📌 The business should now show as:")
                logger.info("   - Name: 'Dott Restaurant & Cafe'")
                logger.info("   - Type: 'Restaurant' (after serializer mapping)")
                logger.info("   - Location: Juba, South Sudan")
                logger.info("   - Status: Verified and visible")
                
            else:
                logger.error("❌ User support@dottapps.com not found")

if __name__ == "__main__":
    try:
        fix_marketplace_display()
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
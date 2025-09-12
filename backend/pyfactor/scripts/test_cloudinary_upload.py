#!/usr/bin/env python3
"""
Test Cloudinary Image Upload
=============================
Tests uploading an image to Cloudinary and updating business listing
"""

import os
import sys
import django
import cloudinary
import cloudinary.uploader

# Add the project directory to the Python path
sys.path.insert(0, '/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from marketplace.models import BusinessListing
from users.models import UserProfile
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger(__name__)

User = get_user_model()

def test_cloudinary_upload(email='support@dottapps.com'):
    """Test uploading an image to Cloudinary for a business"""
    
    logger.info(f"🔍 Testing Cloudinary upload for user: {email}")
    
    # Configure Cloudinary (make sure env vars are set)
    cloudinary.config(
        cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME', ''),
        api_key=os.environ.get('CLOUDINARY_API_KEY', ''),
        api_secret=os.environ.get('CLOUDINARY_API_SECRET', ''),
        secure=True
    )
    
    if not os.environ.get('CLOUDINARY_CLOUD_NAME'):
        logger.error("❌ CLOUDINARY_CLOUD_NAME not set in environment variables!")
        logger.info("Please set: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET")
        return
    
    try:
        # Get user
        user = User.objects.get(email=email)
        logger.info(f"✅ Found user: {user.email}")
        
        # Test with a sample image URL (Dott logo placeholder)
        sample_image_url = "https://via.placeholder.com/400x400/2563eb/ffffff?text=Dott+Restaurant"
        
        logger.info("📤 Uploading logo to Cloudinary...")
        
        # Upload to Cloudinary
        upload_result = cloudinary.uploader.upload(
            sample_image_url,
            folder="dott/logos",
            public_id=f"business_logo_{user.id}",
            overwrite=True,
            transformation=[
                {'width': 400, 'height': 400, 'crop': 'fill'},
                {'quality': 'auto:good'},
                {'fetch_format': 'auto'}
            ],
            eager=[
                {'width': 150, 'height': 150, 'crop': 'fill', 'quality': 'auto:eco'},
                {'width': 50, 'height': 50, 'crop': 'fill', 'quality': 'auto:low'}
            ],
            tags=['logo', 'business', 'test']
        )
        
        logger.info(f"✅ Upload successful!")
        logger.info(f"   📍 URL: {upload_result['secure_url']}")
        logger.info(f"   🆔 Public ID: {upload_result['public_id']}")
        
        # Update UserProfile
        profile, created = UserProfile.objects.get_or_create(user=user)
        profile.logo_cloudinary_url = upload_result['secure_url']
        profile.logo_cloudinary_public_id = upload_result['public_id']
        profile.save()
        logger.info("✅ Updated UserProfile with Cloudinary URLs")
        
        # Update BusinessListing if exists
        try:
            listing = BusinessListing.objects.get(business=user)
            listing.logo_url = upload_result['secure_url']
            listing.logo_public_id = upload_result['public_id']
            
            # Also upload a cover image
            logger.info("📤 Uploading cover image...")
            cover_url = "https://via.placeholder.com/1200x628/3b82f6/ffffff?text=Dott+Restaurant+Cover"
            cover_result = cloudinary.uploader.upload(
                cover_url,
                folder="dott/covers",
                public_id=f"business_cover_{user.id}",
                overwrite=True,
                transformation=[
                    {'width': 1200, 'height': 628, 'crop': 'fill'},
                    {'quality': 'auto:good'}
                ]
            )
            
            listing.cover_image_url = cover_result['secure_url']
            listing.cover_image_public_id = cover_result['public_id']
            listing.save()
            
            logger.info(f"✅ Updated BusinessListing with images")
            logger.info(f"   🖼️ Logo: {listing.logo_url}")
            logger.info(f"   🎨 Cover: {listing.cover_image_url}")
            
        except BusinessListing.DoesNotExist:
            logger.info("ℹ️ No BusinessListing found (create one when advertising)")
        
        logger.info("\n✅ Cloudinary upload test completed successfully!")
        logger.info("\n📌 To upload real images:")
        logger.info("   1. Use the /api/media/upload/ endpoint")
        logger.info("   2. Send a multipart form with 'image' file and 'purpose' field")
        logger.info("   3. Purpose can be: profile, logo, marketplace, advertisement")
        
    except User.DoesNotExist:
        logger.error(f"❌ User not found: {email}")
    except Exception as e:
        logger.error(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    email = sys.argv[1] if len(sys.argv) > 1 else 'support@dottapps.com'
    test_cloudinary_upload(email)
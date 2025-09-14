#!/usr/bin/env python
"""
Script to migrate existing menu item images from local storage to Cloudinary
"""

import os
import sys
import django
import logging
from pathlib import Path

# Setup Django
sys.path.append(str(Path(__file__).resolve().parent.parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from menu.models import MenuItem
from services.cloudinary_service import cloudinary_service
from django.core.files.storage import default_storage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def migrate_menu_images():
    """Migrate all existing menu item images to Cloudinary"""

    # Get all menu items with images but no Cloudinary public ID
    menu_items = MenuItem.objects.filter(
        image__isnull=False
    ).exclude(
        image__exact=''
    ).filter(
        image_public_id__exact=''
    )

    total = menu_items.count()
    logger.info(f"Found {total} menu items with images to migrate")

    success_count = 0
    error_count = 0

    for idx, item in enumerate(menu_items, 1):
        try:
            logger.info(f"[{idx}/{total}] Processing menu item: {item.name} (ID: {item.id})")

            # Check if the image file exists
            if not item.image or not default_storage.exists(item.image.name):
                logger.warning(f"Image file does not exist for item {item.id}")
                # If we already have a URL from the old system, keep it
                if item.image_url:
                    logger.info(f"Keeping existing URL: {item.image_url}")
                continue

            # Read the image file
            image_file = item.image.open('rb')

            # Upload to Cloudinary
            result = cloudinary_service.upload_image(
                image_file,
                purpose='menu_item',
                user_id=str(item.tenant_id)
            )

            # Update the menu item with Cloudinary URLs
            item.image_url = result['url']
            item.image_public_id = result['public_id']
            item.thumbnail_url = result.get('thumbnail_url', '')
            item.save(update_fields=['image_url', 'image_public_id', 'thumbnail_url'])

            logger.info(f"✅ Successfully migrated image for {item.name}")
            logger.info(f"   Cloudinary URL: {item.image_url}")
            success_count += 1

            # Close the file
            image_file.close()

        except Exception as e:
            logger.error(f"❌ Failed to migrate image for {item.name}: {e}")
            error_count += 1
            continue

    logger.info(f"\n{'='*50}")
    logger.info(f"Migration complete!")
    logger.info(f"✅ Success: {success_count}")
    logger.info(f"❌ Errors: {error_count}")
    logger.info(f"{'='*50}\n")


def fix_existing_cloudinary_urls():
    """Fix any menu items that have Cloudinary public IDs but missing URLs"""

    items_to_fix = MenuItem.objects.filter(
        image_public_id__isnull=False
    ).exclude(
        image_public_id__exact=''
    ).filter(
        image_url__exact=''
    )

    fixed_count = 0
    for item in items_to_fix:
        try:
            # Generate URL from public ID
            url = cloudinary_service.get_optimized_url(item.image_public_id)
            thumbnail = cloudinary_service.get_optimized_url(
                item.image_public_id,
                transformations=[
                    {'width': 150, 'height': 150, 'crop': 'fill', 'quality': 'auto:low'}
                ]
            )

            item.image_url = url
            item.thumbnail_url = thumbnail
            item.save(update_fields=['image_url', 'thumbnail_url'])

            logger.info(f"Fixed URLs for {item.name}")
            fixed_count += 1

        except Exception as e:
            logger.error(f"Failed to fix URLs for {item.name}: {e}")

    if fixed_count > 0:
        logger.info(f"Fixed {fixed_count} items with missing URLs")


if __name__ == '__main__':
    print("\n" + "="*60)
    print("MENU ITEM IMAGE MIGRATION TO CLOUDINARY")
    print("="*60 + "\n")

    # First migrate images to Cloudinary
    migrate_menu_images()

    # Then fix any items with missing URLs
    fix_existing_cloudinary_urls()

    print("\nMigration script completed!")
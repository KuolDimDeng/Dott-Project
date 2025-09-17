#!/usr/bin/env python
"""
Script to add missing images to catalogue items
This script identifies items without images and can:
1. Generate reports of missing images
2. Add placeholder images
3. Fetch images from external sources
"""

import os
import sys
import django
from django.db import connection
from django.db.models import Q
import requests
from typing import Dict, List, Optional
import json

# Setup Django environment
sys.path.append('/Users/kuoldeng/projectx/backend/pyfactor')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from inventory.models import StoreItem, Product
from marketplace.models import BusinessListing
from menu.models import MenuItem


class CatalogueImageManager:
    """Manage missing images in catalogue items"""
    
    # Placeholder images by category
    PLACEHOLDER_IMAGES = {
        'food': 'https://res.cloudinary.com/dottapps/image/upload/v1/placeholders/food-placeholder.jpg',
        'beverage': 'https://res.cloudinary.com/dottapps/image/upload/v1/placeholders/beverage-placeholder.jpg',
        'electronics': 'https://res.cloudinary.com/dottapps/image/upload/v1/placeholders/electronics-placeholder.jpg',
        'clothing': 'https://res.cloudinary.com/dottapps/image/upload/v1/placeholders/clothing-placeholder.jpg',
        'default': 'https://res.cloudinary.com/dottapps/image/upload/v1/placeholders/product-placeholder.jpg',
        'business': 'https://res.cloudinary.com/dottapps/image/upload/v1/placeholders/business-placeholder.jpg',
        'restaurant': 'https://res.cloudinary.com/dottapps/image/upload/v1/placeholders/restaurant-placeholder.jpg',
    }
    
    def get_missing_store_items(self) -> List[Dict]:
        """Get all store items without images"""
        items = StoreItem.objects.filter(
            Q(image_url__isnull=True) | Q(image_url='')
        ).values('id', 'barcode', 'name', 'brand', 'category', 'subcategory', 'region_code')
        
        return list(items)
    
    def get_missing_by_category(self) -> Dict[str, int]:
        """Get count of missing images by category"""
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT category, COUNT(*) as count
                FROM store_items
                WHERE image_url IS NULL OR image_url = ''
                GROUP BY category
                ORDER BY count DESC
            """)
            return dict(cursor.fetchall())
    
    def get_missing_business_logos(self) -> List[Dict]:
        """Get businesses without logos"""
        businesses = BusinessListing.objects.filter(
            Q(logo_url__isnull=True) | Q(logo_url='')
        ).values('id', 'business_name', 'business_type', 'city', 'country')
        
        return list(businesses)
    
    def get_missing_menu_images(self) -> List[Dict]:
        """Get menu items without images"""
        items = MenuItem.objects.filter(
            Q(image_url__isnull=True) | Q(image_url=''),
            Q(image__isnull=True) | Q(image='')
        ).select_related('category').values(
            'id', 'name', 'description', 'category__name', 'price'
        )
        
        return list(items)
    
    def add_placeholder_to_store_item(self, item_id: str, category: str = None):
        """Add placeholder image to a store item"""
        try:
            item = StoreItem.objects.get(id=item_id)
            
            # Determine placeholder based on category
            if category and category.lower() in self.PLACEHOLDER_IMAGES:
                placeholder_url = self.PLACEHOLDER_IMAGES[category.lower()]
            else:
                placeholder_url = self.PLACEHOLDER_IMAGES['default']
            
            # Update the item
            item.image_url = placeholder_url
            item.thumbnail_url = placeholder_url
            item.save(update_fields=['image_url', 'thumbnail_url'])
            
            return True
        except StoreItem.DoesNotExist:
            print(f"Store item {item_id} not found")
            return False
    
    def bulk_add_placeholders_by_category(self, category: str, limit: Optional[int] = None):
        """Add placeholders to all items in a category"""
        items = StoreItem.objects.filter(
            Q(image_url__isnull=True) | Q(image_url=''),
            category__iexact=category
        )
        
        if limit:
            items = items[:limit]
        
        placeholder_url = self.PLACEHOLDER_IMAGES.get(
            category.lower(), 
            self.PLACEHOLDER_IMAGES['default']
        )
        
        count = items.update(
            image_url=placeholder_url,
            thumbnail_url=placeholder_url
        )
        
        return count
    
    def generate_report(self, output_file: str = 'missing_images_report.json'):
        """Generate a comprehensive report of missing images"""
        report = {
            'store_items': {
                'total_missing': len(self.get_missing_store_items()),
                'by_category': self.get_missing_by_category(),
                'sample_items': self.get_missing_store_items()[:10]
            },
            'business_listings': {
                'missing_logos': len(self.get_missing_business_logos()),
                'sample_businesses': self.get_missing_business_logos()[:10]
            },
            'menu_items': {
                'total_missing': len(self.get_missing_menu_images()),
                'sample_items': self.get_missing_menu_images()[:10]
            }
        }
        
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        return report
    
    def fetch_image_from_api(self, barcode: str) -> Optional[str]:
        """
        Fetch product image from external API using barcode
        This is a placeholder for integration with services like:
        - Open Food Facts API
        - UPCitemdb API
        - Barcode Lookup API
        """
        # Example with Open Food Facts API
        try:
            url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
            response = requests.get(url, timeout=5)
            
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 1 and data.get('product', {}).get('image_url'):
                    return data['product']['image_url']
        except Exception as e:
            print(f"Error fetching image for barcode {barcode}: {e}")
        
        return None


def main():
    """Main execution function"""
    manager = CatalogueImageManager()
    
    print("=== Catalogue Image Analysis ===\n")
    
    # 1. Generate report
    print("Generating missing images report...")
    report = manager.generate_report()
    
    # 2. Display summary
    print(f"\nStore Items Missing Images: {report['store_items']['total_missing']}")
    print("\nBy Category:")
    for category, count in report['store_items']['by_category'].items():
        print(f"  {category}: {count} items")
    
    print(f"\nBusinesses Missing Logos: {report['business_listings']['missing_logos']}")
    print(f"Menu Items Missing Images: {report['menu_items']['total_missing']}")
    
    # 3. Optional: Add placeholders (uncomment to use)
    # print("\nWould you like to add placeholder images? (y/n)")
    # if input().lower() == 'y':
    #     category = input("Enter category (or 'all' for all categories): ")
    #     if category.lower() == 'all':
    #         for cat in manager.get_missing_by_category().keys():
    #             count = manager.bulk_add_placeholders_by_category(cat)
    #             print(f"Added placeholders to {count} items in {cat}")
    #     else:
    #         count = manager.bulk_add_placeholders_by_category(category)
    #         print(f"Added placeholders to {count} items in {category}")
    
    print("\nReport saved to: missing_images_report.json")
    print("\nTo add placeholder images, uncomment the interactive section in main()")
    print("Or use the class methods directly in Django shell:")
    print("  from scripts.add_missing_catalogue_images import CatalogueImageManager")
    print("  manager = CatalogueImageManager()")
    print("  manager.bulk_add_placeholders_by_category('food')")


if __name__ == '__main__':
    main()
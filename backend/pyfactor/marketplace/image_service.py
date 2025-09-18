"""
Image service for handling multiple image sources with fallback chain
"""
import logging
from typing import Optional, Dict, List, Any
from django.conf import settings

logger = logging.getLogger(__name__)


class ImageService:
    """
    Centralized image handling with fallback chain:
    1. Cloudinary URLs
    2. Base64 data URLs
    3. Default placeholders
    """

    # Default placeholder images by business type
    PLACEHOLDERS = {
        'RESTAURANT_CAFE': 'https://via.placeholder.com/400x300/FF6B6B/FFFFFF?text=Restaurant',
        'RETAIL_SHOP': 'https://via.placeholder.com/400x300/4ECDC4/FFFFFF?text=Retail',
        'SERVICE_PROVIDER': 'https://via.placeholder.com/400x300/45B7D1/FFFFFF?text=Service',
        'HEALTH_WELLNESS': 'https://via.placeholder.com/400x300/96E6B3/FFFFFF?text=Health',
        'BEAUTY_SALON': 'https://via.placeholder.com/400x300/F7B801/FFFFFF?text=Beauty',
        'HOTEL_HOSPITALITY': 'https://via.placeholder.com/400x300/A8DADC/FFFFFF?text=Hotel',
        'GROCERY_MARKET': 'https://via.placeholder.com/400x300/95E1D3/FFFFFF?text=Grocery',
        'EVENT_PLANNING': 'https://via.placeholder.com/400x300/F38181/FFFFFF?text=Events',
        'DEFAULT': 'https://via.placeholder.com/400x300/CBD5E1/FFFFFF?text=Business'
    }

    LOGO_PLACEHOLDERS = {
        'RESTAURANT_CAFE': 'https://via.placeholder.com/150x150/FF6B6B/FFFFFF?text=R',
        'RETAIL_SHOP': 'https://via.placeholder.com/150x150/4ECDC4/FFFFFF?text=S',
        'SERVICE_PROVIDER': 'https://via.placeholder.com/150x150/45B7D1/FFFFFF?text=S',
        'HEALTH_WELLNESS': 'https://via.placeholder.com/150x150/96E6B3/FFFFFF?text=H',
        'BEAUTY_SALON': 'https://via.placeholder.com/150x150/F7B801/FFFFFF?text=B',
        'HOTEL_HOSPITALITY': 'https://via.placeholder.com/150x150/A8DADC/FFFFFF?text=H',
        'GROCERY_MARKET': 'https://via.placeholder.com/150x150/95E1D3/FFFFFF?text=G',
        'EVENT_PLANNING': 'https://via.placeholder.com/150x150/F38181/FFFFFF?text=E',
        'DEFAULT': 'https://via.placeholder.com/150x150/CBD5E1/FFFFFF?text=B'
    }

    @classmethod
    def get_logo_url(cls, listing, profile=None) -> Optional[str]:
        """
        Get logo URL with fallback chain
        """
        # 1. Try Cloudinary URLs
        if listing and hasattr(listing, 'logo_url') and listing.logo_url:
            return listing.logo_url

        if listing and hasattr(listing, 'logo_cloudinary_url') and listing.logo_cloudinary_url:
            return listing.logo_cloudinary_url

        # 2. Try profile base64 data
        if profile and hasattr(profile, 'logo_data') and profile.logo_data:
            # Base64 data URLs are already complete
            if profile.logo_data.startswith('data:'):
                return profile.logo_data
            return f"data:image/png;base64,{profile.logo_data}"

        # 3. Return placeholder based on business type
        business_type = listing.business_type if listing and hasattr(listing, 'business_type') else 'DEFAULT'
        return cls.LOGO_PLACEHOLDERS.get(business_type, cls.LOGO_PLACEHOLDERS['DEFAULT'])

    @classmethod
    def get_cover_image_url(cls, listing, profile=None) -> Optional[str]:
        """
        Get cover image URL with fallback chain
        """
        # 1. Try Cloudinary cover image
        if listing and hasattr(listing, 'cover_image_url') and listing.cover_image_url:
            return listing.cover_image_url

        # 2. Try gallery images as fallback
        if listing and hasattr(listing, 'gallery_images') and listing.gallery_images:
            if isinstance(listing.gallery_images, list) and len(listing.gallery_images) > 0:
                first_image = listing.gallery_images[0]
                if isinstance(first_image, dict) and 'url' in first_image:
                    return first_image['url']
                elif isinstance(first_image, str):
                    return first_image

        # 3. Try profile cover image
        if profile and hasattr(profile, 'cover_image_data') and profile.cover_image_data:
            if profile.cover_image_data.startswith('data:'):
                return profile.cover_image_data
            return f"data:image/png;base64,{profile.cover_image_data}"

        # 4. Return placeholder based on business type
        business_type = listing.business_type if listing and hasattr(listing, 'business_type') else 'DEFAULT'
        return cls.PLACEHOLDERS.get(business_type, cls.PLACEHOLDERS['DEFAULT'])

    @classmethod
    def get_gallery_images(cls, listing, profile=None, max_images=10) -> List[str]:
        """
        Get gallery images with proper URLs
        """
        images = []

        # 1. Try Cloudinary gallery
        if listing and hasattr(listing, 'gallery_images') and listing.gallery_images:
            if isinstance(listing.gallery_images, list):
                for img in listing.gallery_images[:max_images]:
                    if isinstance(img, dict) and 'url' in img:
                        images.append(img['url'])
                    elif isinstance(img, str):
                        images.append(img)

        # 2. Add cover image if no gallery
        if not images:
            cover = cls.get_cover_image_url(listing, profile)
            if cover and not cover.startswith('https://via.placeholder'):
                images.append(cover)

        return images

    @classmethod
    def get_product_image_url(cls, product, business_listing=None) -> Optional[str]:
        """
        Get product image URL with fallback
        """
        # 1. Try product's own image fields
        if hasattr(product, 'image_url') and product.image_url:
            return product.image_url

        if hasattr(product, 'thumbnail_url') and product.thumbnail_url:
            return product.thumbnail_url

        if hasattr(product, 'cloudinary_url') and product.cloudinary_url:
            return product.cloudinary_url

        # 2. Try product image data
        if hasattr(product, 'image_data') and product.image_data:
            if product.image_data.startswith('data:'):
                return product.image_data
            return f"data:image/png;base64,{product.image_data}"

        # 3. Use business logo as fallback
        if business_listing:
            return cls.get_logo_url(business_listing)

        # 4. Generic product placeholder
        return 'https://via.placeholder.com/200x200/94A3B8/FFFFFF?text=Product'

    @classmethod
    def get_menu_item_image_url(cls, menu_item, business_listing=None) -> Optional[str]:
        """
        Get menu item image URL with fallback
        """
        # 1. Try menu item's image fields
        if hasattr(menu_item, 'image_url') and menu_item.image_url:
            return menu_item.image_url

        if hasattr(menu_item, 'thumbnail_url') and menu_item.thumbnail_url:
            return menu_item.thumbnail_url

        if hasattr(menu_item, 'cloudinary_url') and menu_item.cloudinary_url:
            return menu_item.cloudinary_url

        # 2. Try menu item image data
        if hasattr(menu_item, 'image_data') and menu_item.image_data:
            if menu_item.image_data.startswith('data:'):
                return menu_item.image_data
            return f"data:image/png;base64,{menu_item.image_data}"

        # 3. Use business logo as fallback
        if business_listing:
            return cls.get_logo_url(business_listing)

        # 4. Food placeholder based on category
        category_placeholders = {
            'appetizer': 'https://via.placeholder.com/200x200/FF6B6B/FFFFFF?text=Appetizer',
            'main': 'https://via.placeholder.com/200x200/4ECDC4/FFFFFF?text=Main',
            'dessert': 'https://via.placeholder.com/200x200/F7B801/FFFFFF?text=Dessert',
            'beverage': 'https://via.placeholder.com/200x200/45B7D1/FFFFFF?text=Drink',
            'default': 'https://via.placeholder.com/200x200/94A3B8/FFFFFF?text=Menu+Item'
        }

        category = 'default'
        if hasattr(menu_item, 'category') and menu_item.category:
            category_name = getattr(menu_item.category, 'name', '').lower()
            if category_name in category_placeholders:
                category = category_name

        return category_placeholders[category]

    @classmethod
    def process_business_images(cls, business_data: Dict[str, Any], listing, profile=None) -> Dict[str, Any]:
        """
        Process all image fields for a business listing
        """
        # Get URLs using the service
        logo_url = cls.get_logo_url(listing, profile)
        cover_image_url = cls.get_cover_image_url(listing, profile)
        gallery_images = cls.get_gallery_images(listing, profile)

        # Update business data
        business_data['logo'] = logo_url
        business_data['logo_url'] = logo_url
        business_data['cover_image_url'] = cover_image_url
        business_data['image_url'] = cover_image_url or logo_url  # Primary display image
        business_data['gallery_images'] = gallery_images

        # Add image metadata
        business_data['has_custom_logo'] = logo_url and not logo_url.startswith('https://via.placeholder')
        business_data['has_cover_image'] = cover_image_url and not cover_image_url.startswith('https://via.placeholder')
        business_data['gallery_count'] = len(gallery_images)

        return business_data
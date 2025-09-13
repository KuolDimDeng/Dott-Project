"""
Marketplace Services - Business Listing Management
"""
import logging
from typing import Optional, Dict, Any, List
from django.utils import timezone
from django.db import transaction
from marketplace.models import BusinessListing
from users.models import Business, UserProfile
from custom_auth.models import User

logger = logging.getLogger(__name__)


class BusinessListingService:
    """Service for managing business listings in the marketplace"""

    @staticmethod
    @transaction.atomic
    def create_or_update_listing(user: User, listing_data: Dict[str, Any]) -> BusinessListing:
        """
        Create or update a business listing for the marketplace.
        Called when a business publishes an advertisement.
        """
        try:
            # Get or create the business listing
            listing, created = BusinessListing.objects.get_or_create(
                business=user,
                defaults=BusinessListingService._prepare_listing_defaults(user, listing_data)
            )

            if not created:
                # Update existing listing
                for field, value in BusinessListingService._prepare_listing_updates(user, listing_data).items():
                    setattr(listing, field, value)
                listing.save()
                logger.info(f"Updated BusinessListing for user {user.email}")
            else:
                logger.info(f"Created new BusinessListing for user {user.email}")

            return listing

        except Exception as e:
            logger.error(f"Error creating/updating BusinessListing for {user.email}: {e}")
            raise

    @staticmethod
    def _prepare_listing_defaults(user: User, listing_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare default values for a new listing"""
        # Get user profile and business info
        profile = getattr(user, 'profile', None) or getattr(user, 'userprofile', None)
        business = profile.business if profile else None

        # Extract location info
        country = listing_data.get('country', '')
        city = listing_data.get('city', '')

        # Try to get from profile/business if not provided
        if not country and profile:
            country = str(profile.country) if profile.country else ''
        if not city and profile:
            city = profile.city or ''

        # Get business type
        business_type = listing_data.get('business_type', '')
        if not business_type and business:
            business_type = business.business_type or 'OTHER'

        defaults = {
            'business_type': business_type,
            'country': country[:2] if country else 'US',  # Ensure 2-letter ISO code
            'city': city,
            'description': listing_data.get('description', ''),
            'is_visible_in_marketplace': listing_data.get('is_visible', True),
            'is_featured': listing_data.get('is_featured', False),
            'business_hours': listing_data.get('business_hours', {}),
            'search_tags': listing_data.get('search_tags', []),
            'delivery_scope': listing_data.get('delivery_scope', 'local'),
            'delivery_radius_km': listing_data.get('delivery_radius_km', 10),
            'latitude': listing_data.get('latitude'),
            'longitude': listing_data.get('longitude'),
            'last_active': timezone.now(),
        }

        # Add image URLs if provided
        if listing_data.get('logo_url'):
            defaults['logo_url'] = listing_data['logo_url']
            defaults['logo_public_id'] = listing_data.get('logo_public_id', '')

        if listing_data.get('cover_image_url'):
            defaults['cover_image_url'] = listing_data['cover_image_url']
            defaults['cover_image_public_id'] = listing_data.get('cover_image_public_id', '')

        if listing_data.get('gallery_images'):
            defaults['gallery_images'] = listing_data['gallery_images']

        return defaults

    @staticmethod
    def _prepare_listing_updates(user: User, listing_data: Dict[str, Any]) -> Dict[str, Any]:
        """Prepare values for updating an existing listing"""
        updates = BusinessListingService._prepare_listing_defaults(user, listing_data)

        # Don't override certain fields unless explicitly provided
        preserve_fields = ['average_rating', 'total_reviews', 'total_orders']
        for field in preserve_fields:
            if field in updates and field not in listing_data:
                del updates[field]

        # Always update last_active
        updates['last_active'] = timezone.now()

        return updates

    @staticmethod
    def sync_from_user_profile(user: User) -> Optional[BusinessListing]:
        """
        Sync BusinessListing from UserProfile and Business data.
        Used when user updates their profile or business info.
        """
        try:
            profile = getattr(user, 'profile', None) or getattr(user, 'userprofile', None)
            if not profile:
                logger.warning(f"No profile found for user {user.email}")
                return None

            business = profile.business
            if not business:
                logger.info(f"No business found for user {user.email}")
                return None

            # Prepare listing data from profile and business
            listing_data = {
                'business_type': business.business_type or 'OTHER',
                'country': str(business.country) if business.country else 'US',
                'city': profile.city or '',
                'description': '',  # Will be filled from advertising campaign
                'latitude': float(profile.latitude) if profile.latitude else None,
                'longitude': float(profile.longitude) if profile.longitude else None,
                'is_visible': False,  # Start invisible until they publish an ad
            }

            # Get business name
            business_name = business.name or profile.business_name or user.email.split('@')[0]

            return BusinessListingService.create_or_update_listing(user, listing_data)

        except Exception as e:
            logger.error(f"Error syncing BusinessListing from profile for {user.email}: {e}")
            return None

    @staticmethod
    def publish_to_marketplace(user: User, campaign_data: Dict[str, Any]) -> BusinessListing:
        """
        Publish a business to the marketplace from an advertising campaign.
        This is the main entry point when user clicks 'Publish to Marketplace'.
        """
        try:
            # Get existing listing or sync from profile first
            listing = BusinessListingService.sync_from_user_profile(user)

            # Prepare data from campaign
            listing_data = {
                'description': campaign_data.get('description', ''),
                'search_tags': campaign_data.get('keywords', []),
                'is_visible': True,  # Make visible when publishing
                'is_featured': campaign_data.get('campaign_type') == 'featured',
                'business_hours': campaign_data.get('business_hours', {}),
            }

            # Add images from campaign
            if campaign_data.get('images'):
                images = campaign_data['images']
                if images.get('logo'):
                    listing_data['logo_url'] = images['logo'].get('url')
                    listing_data['logo_public_id'] = images['logo'].get('public_id')

                if images.get('cover'):
                    listing_data['cover_image_url'] = images['cover'].get('url')
                    listing_data['cover_image_public_id'] = images['cover'].get('public_id')

                if images.get('gallery'):
                    listing_data['gallery_images'] = images['gallery']

            # Location data from campaign
            if campaign_data.get('target_location'):
                location = campaign_data['target_location']
                listing_data['city'] = location.get('city', '')
                listing_data['country'] = location.get('country', '')
                listing_data['delivery_scope'] = location.get('delivery_scope', 'local')
                listing_data['delivery_radius_km'] = location.get('radius_km', 10)

            # Create or update the listing
            listing = BusinessListingService.create_or_update_listing(user, listing_data)

            logger.info(f"Successfully published business {user.email} to marketplace")
            return listing

        except Exception as e:
            logger.error(f"Error publishing to marketplace for {user.email}: {e}")
            raise

    @staticmethod
    def unpublish_from_marketplace(user: User) -> bool:
        """
        Remove a business from marketplace visibility.
        Called when campaign ends or user manually unpublishes.
        """
        try:
            listing = BusinessListing.objects.filter(business=user).first()
            if listing:
                listing.is_visible_in_marketplace = False
                listing.is_featured = False
                listing.save()
                logger.info(f"Unpublished business {user.email} from marketplace")
                return True
            return False
        except Exception as e:
            logger.error(f"Error unpublishing from marketplace for {user.email}: {e}")
            return False

    @staticmethod
    def update_featured_status(user: User, is_featured: bool, featured_until=None) -> bool:
        """Update the featured status of a business listing"""
        try:
            listing = BusinessListing.objects.filter(business=user).first()
            if listing:
                listing.is_featured = is_featured
                if featured_until:
                    listing.featured_until = featured_until
                listing.save()
                logger.info(f"Updated featured status for {user.email}: {is_featured}")
                return True
            return False
        except Exception as e:
            logger.error(f"Error updating featured status for {user.email}: {e}")
            return False

    @staticmethod
    def get_listing_analytics(user: User) -> Dict[str, Any]:
        """Get analytics data for a business listing"""
        try:
            listing = BusinessListing.objects.filter(business=user).first()
            if not listing:
                return {}

            return {
                'is_visible': listing.is_visible_in_marketplace,
                'is_featured': listing.is_featured,
                'average_rating': float(listing.average_rating) if listing.average_rating else 0,
                'total_reviews': listing.total_reviews,
                'total_orders': listing.total_orders,
                'response_rate': listing.response_rate,
                'average_response_time': listing.average_response_time,
                'last_active': listing.last_active.isoformat() if listing.last_active else None,
            }
        except Exception as e:
            logger.error(f"Error getting listing analytics for {user.email}: {e}")
            return {}
"""
Multi-tier featuring service with intelligent fallback
"""
import logging
import random
from typing import List, Dict, Any, Optional, Tuple
from django.db.models import Q, F, Count, Avg, Sum
from django.utils import timezone
from datetime import timedelta, datetime
from decimal import Decimal
from django.core.cache import cache

logger = logging.getLogger(__name__)


class FeaturingService:
    """
    Multi-tier featuring system with automatic fallback
    """

    # Cache keys
    CACHE_KEY_FEATURED_BUSINESSES = 'featured_businesses_{city}_{category}'
    CACHE_KEY_FEATURED_ITEMS = 'featured_items_{city}_{type}'
    CACHE_TTL = 300  # 5 minutes

    # Tier configuration
    TIER_CONFIG = {
        1: {'name': 'Paid Featured', 'weight': 1.0, 'slots': 5},
        2: {'name': 'High Performance', 'weight': 0.8, 'slots': 5},
        3: {'name': 'Fresh Content', 'weight': 0.6, 'slots': 5},
        4: {'name': 'Popular', 'weight': 0.4, 'slots': 5},
        5: {'name': 'Random Rotation', 'weight': 0.2, 'slots': 5},
    }

    @classmethod
    def get_featured_businesses(
        cls,
        city: str,
        country: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 20,
        use_cache: bool = True
    ) -> Tuple[List[Dict], Dict[str, Any]]:
        """
        Get featured businesses using multi-tier system
        """
        # Try cache first
        cache_key = cls.CACHE_KEY_FEATURED_BUSINESSES.format(
            city=city.lower(),
            category=category or 'all'
        )

        if use_cache:
            cached_result = cache.get(cache_key)
            if cached_result:
                logger.info(f"Returning cached featured businesses for {city}")
                return cached_result['businesses'], cached_result['metadata']

        featured_businesses = []
        metadata = {
            'tiers_used': [],
            'total_candidates': 0,
            'featuring_method': 'multi_tier',
            'cache_hit': False
        }

        # Get businesses by tier
        tier_results = {}

        # Tier 1: Paid Featured Campaigns
        tier_results[1] = cls._get_paid_featured(city, country, category)
        if tier_results[1]:
            metadata['tiers_used'].append('paid_featured')

        # Tier 2: High Performance
        tier_results[2] = cls._get_high_performers(city, country, category)
        if tier_results[2]:
            metadata['tiers_used'].append('high_performance')

        # Tier 3: Fresh Content
        tier_results[3] = cls._get_fresh_businesses(city, country, category)
        if tier_results[3]:
            metadata['tiers_used'].append('fresh_content')

        # Tier 4: Popular
        tier_results[4] = cls._get_popular_businesses(city, country, category)
        if tier_results[4]:
            metadata['tiers_used'].append('popular')

        # Tier 5: Random Rotation
        tier_results[5] = cls._get_random_rotation(city, country, category)
        if tier_results[5]:
            metadata['tiers_used'].append('random_rotation')

        # Combine results based on tier configuration
        for tier_num in sorted(tier_results.keys()):
            tier_config = cls.TIER_CONFIG[tier_num]
            tier_businesses = tier_results[tier_num][:tier_config['slots']]

            for business in tier_businesses:
                if len(featured_businesses) >= limit:
                    break

                # Add tier information
                business['featuring_tier'] = tier_num
                business['featuring_tier_name'] = tier_config['name']
                featured_businesses.append(business)

        metadata['total_candidates'] = sum(len(businesses) for businesses in tier_results.values())
        metadata['featured_count'] = len(featured_businesses)

        # Cache the result
        if use_cache:
            cache.set(cache_key, {
                'businesses': featured_businesses,
                'metadata': metadata
            }, cls.CACHE_TTL)

        return featured_businesses, metadata

    @classmethod
    def _get_paid_featured(cls, city: str, country: Optional[str], category: Optional[str]) -> List[Dict]:
        """
        Get businesses with active paid featuring campaigns
        """
        from advertising.models import AdvertisingCampaign
        from marketplace.models import BusinessListing

        try:
            today = timezone.now().date()

            # Get active campaigns
            campaigns = AdvertisingCampaign.objects.filter(
                type='featured',
                status='active',
                start_date__lte=today,
                end_date__gte=today
            ).select_related('business')

            featured_businesses = []

            for campaign in campaigns:
                if not campaign.business:
                    continue

                # Get business listing
                try:
                    listing = BusinessListing.objects.get(business=campaign.business)

                    # Check location match
                    if city and listing.city.lower() != city.lower():
                        continue

                    if category and listing.business_type != category:
                        continue

                    business_data = cls._format_business_data(listing)
                    business_data['campaign_name'] = campaign.name
                    business_data['campaign_budget'] = float(campaign.total_budget)
                    business_data['is_paid_featured'] = True

                    featured_businesses.append(business_data)

                except BusinessListing.DoesNotExist:
                    continue

            # Sort by campaign budget (higher budget = higher priority)
            featured_businesses.sort(key=lambda x: x['campaign_budget'], reverse=True)

            return featured_businesses

        except Exception as e:
            logger.error(f"Error getting paid featured: {e}")
            return []

    @classmethod
    def _get_high_performers(cls, city: str, country: Optional[str], category: Optional[str]) -> List[Dict]:
        """
        Get high-performing businesses based on metrics
        """
        from marketplace.models import BusinessListing

        try:
            # Base query
            query = BusinessListing.objects.filter(
                is_visible_in_marketplace=True,
                city__iexact=city
            )

            if country:
                query = query.filter(country__iexact=country[:2])

            if category:
                query = query.filter(business_type=category)

            # Get businesses with high performance metrics
            # For now, use average_rating as the main performance indicator
            # since weekly_order_count and trust_score fields don't exist yet
            high_performers = query.filter(
                Q(average_rating__gte=4.0) |
                Q(is_verified=True)
            ).order_by('-average_rating', '-total_ratings')[:10]

            return [cls._format_business_data(b) for b in high_performers]

        except Exception as e:
            logger.error(f"Error getting high performers: {e}")
            return []

    @classmethod
    def _get_fresh_businesses(cls, city: str, country: Optional[str], category: Optional[str]) -> List[Dict]:
        """
        Get recently added businesses (encouraging new businesses)
        """
        from marketplace.models import BusinessListing

        try:
            cutoff_date = timezone.now() - timedelta(days=30)

            query = BusinessListing.objects.filter(
                is_visible_in_marketplace=True,
                city__iexact=city,
                created_at__gte=cutoff_date
            )

            if country:
                query = query.filter(country__iexact=country[:2])

            if category:
                query = query.filter(business_type=category)

            fresh_businesses = query.order_by('-created_at')[:10]

            businesses = []
            for b in fresh_businesses:
                data = cls._format_business_data(b)
                data['is_new'] = True
                data['days_old'] = (timezone.now() - b.created_at).days
                businesses.append(data)

            return businesses

        except Exception as e:
            logger.error(f"Error getting fresh businesses: {e}")
            return []

    @classmethod
    def _get_popular_businesses(cls, city: str, country: Optional[str], category: Optional[str]) -> List[Dict]:
        """
        Get popular businesses based on orders and reviews
        """
        from marketplace.models import BusinessListing

        try:
            query = BusinessListing.objects.filter(
                is_visible_in_marketplace=True,
                city__iexact=city
            )

            if country:
                query = query.filter(country__iexact=country[:2])

            if category:
                query = query.filter(business_type=category)

            popular = query.filter(
                total_orders__gte=5
            ).order_by('-total_orders', '-total_reviews')[:10]

            return [cls._format_business_data(b) for b in popular]

        except Exception as e:
            logger.error(f"Error getting popular businesses: {e}")
            return []

    @classmethod
    def _get_random_rotation(cls, city: str, country: Optional[str], category: Optional[str]) -> List[Dict]:
        """
        Get random businesses for fair exposure
        """
        from marketplace.models import BusinessListing

        try:
            query = BusinessListing.objects.filter(
                is_visible_in_marketplace=True,
                city__iexact=city
            )

            if country:
                query = query.filter(country__iexact=country[:2])

            if category:
                query = query.filter(business_type=category)

            # Get businesses not featured recently
            all_businesses = list(query)
            random.shuffle(all_businesses)

            return [cls._format_business_data(b) for b in all_businesses[:10]]

        except Exception as e:
            logger.error(f"Error getting random rotation: {e}")
            return []

    @classmethod
    def _format_business_data(cls, listing) -> Dict:
        """
        Format business listing data for response
        """
        from marketplace.image_service import ImageService
        from marketplace.rating_service import RatingService

        # Get rating data
        rating_data = RatingService.get_rating_summary(listing)

        # Process images
        business_data = {
            'id': str(listing.id),
            'business_name': listing.business.business_name if listing.business else 'Unknown',
            'business_type': listing.business_type,
            'city': listing.city,
            'country': listing.country,
            'is_featured': True,
            'is_verified': listing.is_verified,
            'average_rating': rating_data['average_rating'],
            'rating_display': rating_data['rating_display'],
            'rating_badge': rating_data['rating_badge'],
            'trust_score': rating_data['trust_score'],
            'trust_badge': rating_data['trust_badge'],
            'total_reviews': rating_data['total_reviews'],
            'response_time': rating_data['response_time'],
        }

        # Add images
        profile = getattr(listing.business, 'profile', None) if listing.business else None
        ImageService.process_business_images(business_data, listing, profile)

        return business_data

    @classmethod
    def get_featured_items(
        cls,
        city: str,
        country: Optional[str] = None,
        item_type: str = 'all',
        limit: int = 20,
        use_cache: bool = True
    ) -> Tuple[List[Dict], Dict[str, Any]]:
        """
        Get featured products and menu items
        """
        cache_key = cls.CACHE_KEY_FEATURED_ITEMS.format(
            city=city.lower(),
            type=item_type
        )

        if use_cache:
            cached_result = cache.get(cache_key)
            if cached_result:
                return cached_result['items'], cached_result['metadata']

        from marketplace.models import BusinessListing
        from inventory.models import Product
        from menu.models import MenuItem
        from marketplace.image_service import ImageService

        featured_items = []
        metadata = {
            'item_type': item_type,
            'city': city,
            'country': country,
            'total_items': 0
        }

        # Get businesses in the city
        businesses = BusinessListing.objects.filter(
            is_visible_in_marketplace=True,
            city__iexact=city
        )

        if country:
            businesses = businesses.filter(country__iexact=country[:2])

        # Get tenant UUIDs
        tenant_uuids = []
        listing_map = {}
        for listing in businesses:
            # Use business.tenant_id since tenant_uuid field doesn't exist yet
            if listing.business and listing.business.tenant_id:
                tenant_uuids.append(listing.business.tenant_id)
                listing_map[listing.business.tenant_id] = listing

        # Get featured products
        if item_type in ['all', 'products']:
            products = Product.objects.filter(
                tenant_id__in=tenant_uuids,
                is_featured=True,
                is_active=True,
                quantity__gt=0
            ).order_by('-featured_priority', '-featured_score', '-order_count')[:limit]

            for product in products:
                listing = listing_map.get(product.tenant_id)
                if listing:
                    item_data = {
                        'id': str(product.id),
                        'type': 'product',
                        'name': product.name,
                        'description': product.description,
                        'price': float(product.price) if product.price else 0,
                        'business_id': str(product.tenant_id),
                        'business_name': listing.business.business_name if listing.business else 'Unknown',
                        'featured_priority': product.featured_priority,
                        'in_stock': product.quantity > 0,
                        'quantity': product.quantity
                    }

                    # Add image
                    item_data['image_url'] = ImageService.get_product_image_url(product, listing)

                    featured_items.append(item_data)

        # Get featured menu items
        if item_type in ['all', 'menu_items']:
            menu_items = MenuItem.objects.filter(
                tenant_id__in=tenant_uuids,
                is_featured=True,
                is_available=True
            ).order_by('-featured_priority', '-featured_score', '-order_count')[:limit]

            for item in menu_items:
                listing = listing_map.get(item.tenant_id)
                if listing:
                    item_data = {
                        'id': str(item.id),
                        'type': 'menu_item',
                        'name': item.name,
                        'description': item.description,
                        'price': float(item.effective_price) if item.effective_price else 0,
                        'business_id': str(item.tenant_id),
                        'business_name': listing.business.business_name if listing.business else 'Unknown',
                        'featured_priority': item.featured_priority,
                        'is_available': item.is_available,
                        'preparation_time': item.preparation_time
                    }

                    # Add image
                    item_data['image_url'] = ImageService.get_menu_item_image_url(item, listing)

                    featured_items.append(item_data)

        # Sort combined items
        if item_type == 'all':
            featured_items.sort(
                key=lambda x: (x.get('featured_priority', 0), x.get('price', 0)),
                reverse=True
            )
            featured_items = featured_items[:limit]

        metadata['total_items'] = len(featured_items)

        # Cache result
        if use_cache:
            cache.set(cache_key, {
                'items': featured_items,
                'metadata': metadata
            }, cls.CACHE_TTL)

        return featured_items, metadata

    @classmethod
    def clear_cache(cls, city: Optional[str] = None):
        """
        Clear featuring cache
        """
        if city:
            cache.delete_pattern(f'featured_*_{city.lower()}_*')
        else:
            cache.delete_pattern('featured_*')

        logger.info(f"Cleared featuring cache for city: {city or 'all'}")
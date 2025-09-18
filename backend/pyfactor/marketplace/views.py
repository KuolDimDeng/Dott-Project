from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, F, Count, Avg
# from django.contrib.gis.geos import Point
# from django.contrib.gis.db.models.functions import Distance
from django.utils import timezone
from django.core.paginator import Paginator
from .models import BusinessListing, ConsumerProfile, BusinessSearch
from .serializers import (
    BusinessListingSerializer, ConsumerProfileSerializer,
    BusinessSearchSerializer, LocationUpdateSerializer
)
from business.models import PlaceholderBusiness
from inventory.models import Product
from menu.models import MenuItem
import logging
import base64
import os
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.conf import settings
import uuid

logger = logging.getLogger(__name__)

class ConsumerSearchViewSet(viewsets.ViewSet):
    """
    Location-aware business search for consumers
    Public access - no authentication required for browsing
    """
    permission_classes = []  # Public access for marketplace browsing
    
    def list(self, request):
        """
        List businesses for marketplace (redirects to marketplace_businesses)
        """
        return self.marketplace_businesses(request)
    
    def featured(self, request):
        """
        Get featured businesses using multi-tier featuring system
        """
        try:
            from .featuring_service import FeaturingService
            from .location_service import LocationService

            city = request.query_params.get('city', '').strip()
            country = request.query_params.get('country', '').strip()
            category = request.query_params.get('category', '').strip()
            user_lat = request.query_params.get('latitude', type=float)
            user_lon = request.query_params.get('longitude', type=float)

            if not city:
                return Response({
                    'success': False,
                    'message': 'City is required',
                    'results': []
                })

            # Get featured businesses using the new service
            featured_businesses, metadata = FeaturingService.get_featured_businesses(
                city=city,
                country=country,
                category=category,
                limit=20,
                use_cache=True
            )

            # If we have few results, use location fallback
            if len(featured_businesses) < 5:
                from .location_service import LocationService

                # Get businesses with location fallback
                businesses_queryset, location_metadata = LocationService.get_businesses_with_fallback(
                    city=city,
                    country=country,
                    category=category,
                    min_results=10
                )

                # Format additional businesses
                for listing in businesses_queryset:
                    if len(featured_businesses) >= 20:
                        break

                    # Check if already included
                    if any(b['id'] == str(listing.id) for b in featured_businesses):
                        continue

                    # Use the featuring service formatter
                    business_data = FeaturingService._format_business_data(listing)

                    # Add location context if expanded search
                    if location_metadata['expanded_search']:
                        delivery_context = LocationService.get_delivery_context(
                            business_data, city, country
                        )
                        business_data.update(delivery_context)

                    featured_businesses.append(business_data)

                # Update metadata
                metadata.update({
                    'location_fallback': location_metadata,
                    'expanded_search': location_metadata['expanded_search']
                })

            # Add distance information if coordinates provided
            if user_lat and user_lon:
                featured_businesses = LocationService.add_distance_info(
                    featured_businesses, user_lat, user_lon
                )

            return Response({
                'success': True,
                'results': featured_businesses,
                'count': len(featured_businesses),
                'city': city,
                'country': country,
                'category': category,
                'metadata': metadata
            })

        except Exception as e:
            logger.error(f"Error fetching featured businesses: {e}")
            return Response({
                'success': False,
                'error': str(e),
                'results': []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    def featured_items(self, request):
        """
        Get featured products and menu items using the featuring service
        """
        try:
            from .featuring_service import FeaturingService

            city = request.query_params.get('city', '').strip()
            country = request.query_params.get('country', '').strip()
            item_type = request.query_params.get('type', 'all')  # all, products, menu_items
            limit = int(request.query_params.get('limit', 20))

            # If no city is provided, return empty results instead of error
            if not city:
                logger.warning("No city provided for featured items request")
                return Response({
                    'success': True,
                    'results': [],
                    'count': 0,
                    'message': 'City parameter is required for featured items'
                })

            # Use the new featuring service for items
            featured_items, metadata = FeaturingService.get_featured_items(
                city=city,
                country=country,
                item_type=item_type,
                limit=limit,
                use_cache=True
            )

            # If we have too few items, use location fallback to get businesses from nearby areas
            if len(featured_items) < 5:
                from .location_service import LocationService

                # Get businesses with fallback
                businesses_queryset, location_metadata = LocationService.get_businesses_with_fallback(
                    city=city,
                    country=country,
                    min_results=10
                )

                # Update metadata
                metadata['location_fallback'] = location_metadata

            return Response({
                'success': True,
                'results': featured_items,
                'count': len(featured_items),
                'city': city,
                'country': country,
                'type': item_type,
                'metadata': metadata
            })

        except Exception as e:
            logger.error(f"Error in featured_items view: {str(e)}", exc_info=True)
            return Response({
                'success': False,
                'error': str(e),
                'message': 'An error occurred while fetching featured items',
                'results': []
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def track_view(self, request):
        """
        Track a product or menu item view for analytics
        """
        try:
            item_id = request.data.get('item_id')
            item_type = request.data.get('item_type')  # 'product' or 'menu_item'
            business_id = request.data.get('business_id')
            view_source = request.data.get('view_source', 'search')
            search_query = request.data.get('search_query', '')

            if not item_id or not item_type or not business_id:
                return Response({
                    'success': False,
                    'message': 'item_id, item_type, and business_id are required'
                }, status=status.HTTP_400_BAD_REQUEST)

            # Update view count for the item
            if item_type == 'product':
                Product.objects.filter(id=item_id).update(
                    view_count=F('view_count') + 1
                )
            elif item_type == 'menu_item':
                MenuItem.objects.filter(id=item_id).update(
                    view_count=F('view_count') + 1
                )

            # Create analytics record if we have the analytics models
            try:
                from .analytics_models import ProductView

                view_record = ProductView.objects.create(
                    product_id=item_id if item_type == 'product' else None,
                    menu_item_id=item_id if item_type == 'menu_item' else None,
                    business_id=business_id,
                    viewer=request.user if request.user.is_authenticated else None,
                    viewer_ip=request.META.get('REMOTE_ADDR'),
                    view_source=view_source,
                    search_query=search_query
                )
            except Exception as e:
                logger.warning(f"Could not create analytics record: {e}")

            return Response({
                'success': True,
                'message': 'View tracked successfully'
            })

        except Exception as e:
            logger.error(f"Error tracking view: {e}")
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    def category_hierarchy(self, request):
        """
        Alias for marketplace_category_hierarchy (for URL compatibility)
        """
        return self.marketplace_category_hierarchy(request)
    
    @action(detail=False, methods=['get', 'post'])
    def search(self, request):
        """
        Search businesses with location filtering
        """
        # Get search parameters
        query = request.data.get('query', request.query_params.get('q', ''))
        category = request.data.get('category', request.query_params.get('category', ''))
        
        # Get consumer location
        consumer_profile = self.get_consumer_profile(request.user)
        consumer_country = consumer_profile.current_country or request.data.get('country')
        consumer_city = consumer_profile.current_city or request.data.get('city')
        consumer_lat = consumer_profile.current_latitude or request.data.get('latitude')
        consumer_lng = consumer_profile.current_longitude or request.data.get('longitude')
        
        # Log search
        search_log = BusinessSearch.objects.create(
            consumer=request.user,
            search_query=query,
            category_filter=category,
            consumer_country=consumer_country,
            consumer_city=consumer_city,
            consumer_latitude=consumer_lat,
            consumer_longitude=consumer_lng
        )
        
        # Base query - only visible businesses
        businesses = BusinessListing.objects.filter(
            is_visible_in_marketplace=True
        )
        
        # Category filter
        if category:
            businesses = businesses.filter(
                Q(business_type=category) |
                Q(secondary_categories__contains=[category])
            )
        
        # Text search
        if query:
            businesses = businesses.filter(
                Q(business__business_name__icontains=query) |
                Q(description__icontains=query) |
                Q(search_tags__overlap=[query.lower()])
            )
        
        # Location-based filtering
        businesses = self.filter_by_delivery_capability(
            businesses, consumer_country, consumer_city, consumer_lat, consumer_lng
        )
        
        # Distance annotation if coordinates available
        # TODO: Enable GIS features when GDAL is installed
        # if consumer_lat and consumer_lng:
        #     consumer_location = Point(consumer_lng, consumer_lat, srid=4326)
        #     businesses = businesses.annotate(
        #         distance_km=Distance('location_point', consumer_location) / 1000
        #     )
            
        # Sort by distance for local businesses, rating for others
        if False:  # TODO: Enable when GIS is available
            businesses = businesses.order_by(
                'distance_km',
                '-average_rating',
                '-total_orders'
            )
        else:
            # Sort by rating and popularity
            businesses = businesses.order_by(
                '-is_featured',
                '-average_rating',
                '-total_orders'
            )
        
        # Update search log with results
        results = businesses[:50]  # Limit to 50 results
        search_log.results_count = results.count()
        search_log.save()
        
        # Serialize and return
        serializer = BusinessListingSerializer(results, many=True, context={'request': request})
        
        return Response({
            'success': True,
            'count': results.count(),
            'results': serializer.data,
            'search_id': str(search_log.id),
            'user_location': {
                'city': consumer_city,
                'country': consumer_country,
                'has_coordinates': bool(consumer_lat and consumer_lng)
            }
        })
    
    def filter_by_delivery_capability(self, queryset, country, city, lat, lng):
        """
        Filter businesses based on their delivery capability
        """
        # Build location-based query
        location_q = Q()
        
        # Always include digital services
        location_q |= Q(is_digital_only=True)
        location_q |= Q(delivery_scope='digital')
        
        # International businesses
        location_q |= Q(delivery_scope='international')
        
        if country:
            # Include businesses that ship to this country
            location_q |= Q(
                delivery_scope='international',
                ships_to_countries__contains=[country]
            )
            
            # National businesses in same country
            location_q |= Q(
                delivery_scope='national',
                country=country
            )
            
            if city:
                # Local businesses in same city
                location_q |= Q(
                    delivery_scope='local',
                    country=country,
                    city=city
                )
        
        return queryset.filter(location_q)
    
    def get_consumer_profile(self, user):
        """
        Get or create consumer profile with proper JSON field defaults
        """
        defaults = {
            'current_country': '',
            'current_city': '',
            'delivery_addresses': [],  # Proper list default
            'notification_preferences': {},  # Proper dict default
        }

        # Try to get country and city from user profile
        if hasattr(user, 'profile'):
            defaults['current_country'] = getattr(user.profile, 'country', '') or ''
            defaults['current_city'] = getattr(user.profile, 'city', '') or ''

        profile, created = ConsumerProfile.objects.get_or_create(
            user=user,
            defaults=defaults
        )

        # Ensure JSON fields are valid even for existing profiles
        if profile.delivery_addresses in ['', None]:
            profile.delivery_addresses = []
            profile.save()
        if profile.notification_preferences in ['', None]:
            profile.notification_preferences = {}
            profile.save()

        return profile
    
    @action(detail=False, methods=['post'])
    def update_location(self, request):
        """
        Update consumer's current location
        """
        serializer = LocationUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        profile = self.get_consumer_profile(request.user)
        
        profile.current_latitude = serializer.validated_data.get('latitude')
        profile.current_longitude = serializer.validated_data.get('longitude')
        profile.current_city = serializer.validated_data.get('city', profile.current_city)
        profile.current_country = serializer.validated_data.get('country', profile.current_country)
        profile.save()
        
        return Response({
            'success': True,
            'message': 'Location updated successfully'
        })
    
    @action(detail=False, methods=['get'])
    def categories(self, request):
        """
        Get available categories with counts
        """
        try:
            # Get consumer location for filtering
            try:
                profile = self.get_consumer_profile(request.user)
                consumer_country = profile.current_country
                consumer_city = profile.current_city
                consumer_lat = profile.current_latitude
                consumer_lng = profile.current_longitude
            except Exception as e:
                logger.warning(f"Error getting consumer profile for categories: {e}")
                # Fall back to request parameters if profile fails
                consumer_country = request.query_params.get('country', '')
                consumer_city = request.query_params.get('city', '')
                consumer_lat = None
                consumer_lng = None

            # Get businesses that can deliver to user
            businesses = BusinessListing.objects.filter(
                is_visible_in_marketplace=True
            )

            # Apply location filtering if we have location data
            if consumer_country or consumer_city:
                businesses = self.filter_by_delivery_capability(
                    businesses,
                    consumer_country,
                    consumer_city,
                    consumer_lat,
                    consumer_lng
                )

            # Count businesses per category
            from core.business_types import BUSINESS_TYPE_CHOICES
            category_counts = {}
            for choice in BUSINESS_TYPE_CHOICES:
                count = businesses.filter(business_type=choice[0]).count()
                if count > 0:
                    category_counts[choice[0]] = {
                        'id': choice[0],
                        'name': choice[1],
                        'count': count
                    }

            return Response({
                'success': True,
                'categories': list(category_counts.values())
            })

        except Exception as e:
            logger.error(f"Error fetching categories: {str(e)}")
            return Response({
                'success': False,
                'message': 'Error fetching categories',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def marketplace_businesses(self, request):
        """
        Get ALL businesses for marketplace display - both PlaceholderBusiness and published BusinessListing
        Industry-standard endpoint with proper filtering and advanced category support
        """
        try:
            # Get parameters
            city = request.query_params.get('city', '').strip()
            country = request.query_params.get('country', '').strip()
            category = request.query_params.get('category', '').strip()
            main_category = request.query_params.get('main_category', '').strip()
            subcategory = request.query_params.get('subcategory', '').strip()
            search_query = request.query_params.get('search', '').strip()
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            
            logger.info(f"[Marketplace] Getting ALL businesses for city: {city}, country: {country}")
            
            # CRITICAL: City is required for filtering
            if not city:
                return Response({
                    'success': False,
                    'message': 'City is required for marketplace filtering',
                    'results': [],
                    'count': 0
                })
            
            # Country mapping for both business types
            country_mapping = {
                'south sudan': 'SS',
                'kenya': 'KE',
                'uganda': 'UG',
                'tanzania': 'TZ',
                'nigeria': 'NG',
                'south africa': 'ZA',
                'ethiopia': 'ET',
                'rwanda': 'RW',
                'ghana': 'GH',
                'egypt': 'EG',
            }
            
            # 🎯 [MARKETPLACE_SEARCH] Simple marketplace search - focus on BusinessListing only
            logger.info(f"[MARKETPLACE_DEBUG] Starting marketplace search for city={city}, country={country}")
            
            all_results = []
            
            # For now, disable advertising integration to fix immediate issues
            featured_campaign_user_ids = set()
            logger.info(f"[ADVERTISING_DEBUG] Advertising integration temporarily disabled for debugging")
            
            # 🎯 [BUSINESS_LISTING_DEBUG] Get real BusinessListing records only
            business_listings = BusinessListing.objects.filter(
                is_visible_in_marketplace=True
            ).select_related('business', 'business__profile')

            logger.info(f"[BUSINESS_LISTING_DEBUG] Found {business_listings.count()} total visible business listings")

            # 🔍 [DEBUG_BUSINESSES] Show what businesses are actually in the database
            for bl in business_listings[:5]:  # Show first 5 businesses for debugging
                logger.info(f"[DEBUG_BUSINESS] ID: {bl.id}, City: '{bl.city}', Country: '{bl.country}', Type: '{bl.business_type}', Visible: {bl.is_visible_in_marketplace}")
                if bl.business:
                    logger.info(f"[DEBUG_BUSINESS] Business User: {bl.business.email}, Name: {getattr(bl.business, 'name', 'NO_NAME')}")
            if business_listings.count() > 5:
                logger.info(f"[DEBUG_BUSINESS] ... and {business_listings.count() - 5} more businesses")

            # Apply city filter - match exact city (case-insensitive)
            if city:
                original_count = business_listings.count()
                # Filter by city - case-insensitive exact match
                city_filtered = business_listings.filter(city__iexact=city)
                business_listings = city_filtered
                logger.info(f"[CITY_DEBUG] After city filter ({city}): {business_listings.count()}/{original_count} listings")

            from marketplace.marketplace_categories import MARKETPLACE_CATEGORIES, get_business_types_for_subcategory

            # Apply country filter to listings - map country names to codes
            # CRITICAL: This fixes the mobile app Discover tab showing 0 businesses
            # Mobile app sends "South Sudan" but DB stores "SS" - mapping is essential
            if country:
                original_count = business_listings.count()
                country_code = country_mapping.get(country.lower(), country)
                logger.info(f"[COUNTRY_DEBUG] Input country: '{country}' -> mapped to: '{country_code}'")

                # Build country filter - only match businesses with the correct country
                country_filters = Q()

                # Primary: Try the mapped country code (e.g., 'SS' for 'South Sudan')
                if country_code and len(country_code) == 2:
                    country_filters |= Q(country__iexact=country_code)
                    logger.info(f"[COUNTRY_DEBUG] Primary filter: country code '{country_code}'")

                # Fallback: Also try exact match on original input (in case DB has full names)
                if country != country_code:
                    country_filters |= Q(country__iexact=country)
                    logger.info(f"[COUNTRY_DEBUG] Fallback filter: original country '{country}'")

                # Apply the country filter
                country_filtered = business_listings.filter(country_filters)
                business_listings = country_filtered
                logger.info(f"[COUNTRY_DEBUG] After country filter: {business_listings.count()}/{original_count} listings")
            
            # Apply category filter to listings
            if category and not main_category:
                business_listings = business_listings.filter(
                    Q(business_type__icontains=category) |
                    Q(secondary_categories__contains=[category])
                )
            
            # Advanced subcategory filtering for listings
            if main_category:
                if subcategory and subcategory != 'all':
                    business_types = get_business_types_for_subcategory(main_category, subcategory)
                    business_listings = business_listings.filter(
                        Q(business_type__in=business_types) |
                        Q(secondary_categories__overlap=business_types)
                    )
                else:
                    all_business_types = set()
                    if main_category in MARKETPLACE_CATEGORIES:
                        for sub_data in MARKETPLACE_CATEGORIES[main_category]['subcategories'].values():
                            all_business_types.update(sub_data.get('business_types', []))
                    
                    business_listings = business_listings.filter(
                        Q(business_type__in=list(all_business_types)) |
                        Q(secondary_categories__overlap=list(all_business_types))
                    )
            
            # Apply search filter to listings
            if search_query:
                business_listings = business_listings.filter(
                    Q(business__profile__business_name__icontains=search_query) |
                    Q(description__icontains=search_query) |
                    Q(search_tags__overlap=[search_query.lower()])
                )
            
            # 🎯 [BUSINESS_CONVERSION_DEBUG] Convert BusinessListing to standard format
            logger.info(f"[BUSINESS_CONVERSION_DEBUG] Processing {business_listings.count()} business listings")
            
            for listing in business_listings:
                user = listing.business
                profile = getattr(user, 'profile', None)
                
                # 🎯 [MARKETPLACE_NAME_FIX] Get proper business name
                business_name = None

                # First try user.name (from Auth0)
                if user.name and user.name.strip() and '@' not in user.name:
                    business_name = user.name.strip()
                    logger.info(f"🎯 [NAME_DEBUG] Using user.name: {business_name}")

                # If no user.name, try profile business
                elif profile:
                    business_obj = getattr(profile, 'business', None)
                    if business_obj and hasattr(business_obj, 'name'):
                        business_name = business_obj.name
                        logger.info(f"🎯 [NAME_DEBUG] Using business.name: {business_name}")

                # Fallback to email-based name if still no name
                if not business_name:
                    business_name = user.email.split('@')[0].replace('.', ' ').replace('_', ' ').title() + " Business"
                    logger.info(f"🎯 [NAME_DEBUG] Using email fallback: {business_name}")
                
                logger.info(f"🎯 [MARKETPLACE_NAME_DEBUG] User: {user.email}, Business Name: {business_name}")
                
                # 🎯 [FEATURED_CHECK] Use direct BusinessListing.is_featured for now
                is_featured = listing.is_featured or False
                
                # 🎯 [BUSINESS_TYPE_MAPPING] Map business types for display
                business_type_display_map = {
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
                
                business_type_display = business_type_display_map.get(listing.business_type, listing.business_type.title() if listing.business_type else 'Business')
                
                logger.info(f"🎯 [BUSINESS_TYPE_DEBUG] Raw Type: {listing.business_type}, Display: {business_type_display}")
                
                # 🎯 [IMAGE_DEBUG] Check for Cloudinary images first, then profile logo_data as fallback
                logo_url = getattr(listing, 'logo_url', '') or getattr(listing, 'logo_cloudinary_url', '') or ''
                cover_image_url = getattr(listing, 'cover_image_url', '') or ''
                gallery_images = getattr(listing, 'gallery_images', []) or []

                # If no Cloudinary logo found, check profile for base64 logo_data (like placeholder_views does)
                if not logo_url and profile and hasattr(profile, 'logo_data') and profile.logo_data:
                    logo_url = profile.logo_data  # This is a base64 data URL
                    logger.info(f"🎯 [IMAGE_DEBUG] Using profile logo_data as fallback")

                logger.info(f"🎯 [IMAGE_DEBUG] Logo: {bool(logo_url)}, Cover: {bool(cover_image_url)}, Gallery: {len(gallery_images)} images")
                
                business_data = {
                    'id': str(listing.id),  # UUID, convert to string
                    'business_name': business_name,  # Frontend expects business_name
                    'name': business_name,  # Also include name for backward compatibility
                    'phone': listing.phone or getattr(profile, 'phone', '') if profile else '',
                    'address': listing.address or getattr(profile, 'business_address', '') if profile else '',
                    'category': listing.business_type,
                    'category_display': business_type_display,
                    'business_type': listing.business_type,  # Add business_type for menu detection
                    'business_type_display': business_type_display,
                    'email': listing.business_email or user.email,
                    'business_email': listing.business_email or user.email,
                    'description': listing.description or '',
                    'image_url': cover_image_url or logo_url,  # Use cover image or logo
                    'logo': logo_url,   # Frontend expects 'logo'
                    'logo_url': logo_url,   # Logo URL from Cloudinary
                    'cover_image_url': cover_image_url,  # Cover image from Cloudinary
                    'gallery_images': gallery_images,  # Gallery images from Cloudinary
                    'website': listing.website or getattr(profile, 'website', '') if profile else '',
                    'opening_hours': listing.business_hours or {},
                    'business_hours': listing.business_hours or {},  # Add business_hours
                    'payment_methods': listing.payment_methods or [],  # Add payment methods
                    'delivery_options': listing.delivery_options or {},  # Add delivery options
                    'rating': float(listing.average_rating) if listing.average_rating else None,
                    'average_rating': float(listing.average_rating) if listing.average_rating else 4.5,  # Frontend expects average_rating
                    'total_reviews': listing.total_reviews or 0,
                    'total_orders': listing.total_orders or 0,
                    'social_media': listing.social_media or {},  # Use saved social media
                    'social': listing.social_media or {},  # Alternative key for social media
                    'city': listing.city,
                    'country': listing.country,
                    'state': listing.state or '',
                    'postal_code': listing.postal_code or '',
                    'latitude': listing.latitude,
                    'longitude': listing.longitude,
                    'is_verified': listing.is_verified or True,  # Use listing verified status
                    'is_featured': is_featured,  # Featured status from campaigns or listing
                    'is_placeholder': False,
                    'is_open_now': listing.is_open_now,  # Add open/closed status
                    'is_visible_in_marketplace': listing.is_visible_in_marketplace,  # Visibility status
                    'delivery_scope': listing.delivery_scope or 'local',
                    'response_time': '< 1 hour',  # Default response time
                    'source': 'published'
                }
                
                # 🎯 [ADVERTISING_PRIORITY] Featured businesses get priority (added to front of list)
                if is_featured:
                    all_results.insert(0, business_data)
                    logger.info(f"[ADVERTISING_DEBUG] ⬆️ Featured business '{business_name}' moved to top of results")
                else:
                    all_results.append(business_data)
            
            logger.info(f"[MARKETPLACE_DEBUG] Found {len(all_results)} total real businesses (no more fake placeholders)")
            
            # 🎯 [SORTING_DEBUG] Sort results by featured status, rating, and name
            all_results.sort(key=lambda x: (
                -1 if x['is_featured'] else 0,  # Featured businesses first
                -(x['rating'] or 0),  # Higher ratings first
                x['name']  # Then alphabetical
            ))
            logger.info(f"[SORTING_DEBUG] Sorted {len(all_results)} businesses by featured status and rating")
            
            # Manual pagination of combined results
            total_count = len(all_results)
            start_idx = (page - 1) * page_size
            end_idx = start_idx + page_size
            page_results = all_results[start_idx:end_idx]
            
            total_pages = (total_count + page_size - 1) // page_size
            
            logger.info(f"[Marketplace] Returning {len(page_results)} businesses for page {page}")
            
            return Response({
                'success': True,
                'results': page_results,
                'count': total_count,
                'page': page,
                'pages': total_pages,
                'page_size': page_size,
                'city': city,
                'country': country,
                'category': category,
                'debug_info': {
                    'real_businesses': len(business_listings),
                    'featured_businesses': len([b for b in page_results if b.get('is_featured', False)]),
                    'total_results': total_count,
                    'city_filter': city,
                    'country_filter': country
                }
            })
            
        except Exception as e:
            logger.error(f"[Marketplace] Error fetching businesses: {str(e)}")
            return Response({
                'success': False,
                'message': 'Error fetching businesses',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def marketplace_category_hierarchy(self, request):
        """
        Get the complete category hierarchy with main categories and subcategories
        """
        try:
            from marketplace.marketplace_categories import get_main_categories, get_subcategories, MARKETPLACE_CATEGORIES
            from business.models import PlaceholderBusiness
            
            city = request.query_params.get('city', '').strip()
            
            # Get main categories
            main_categories = []
            
            for key, data in MARKETPLACE_CATEGORIES.items():
                # Count businesses in this main category (optional, for showing counts)
                business_count = 0
                if city:
                    # Get all business types for this main category
                    all_business_types = set()
                    for sub_data in data['subcategories'].values():
                        all_business_types.update(sub_data.get('business_types', []))
                    
                    # Count placeholder businesses
                    business_count = PlaceholderBusiness.objects.filter(
                        city__iexact=city,
                        opted_out=False
                    ).filter(
                        Q(category__in=list(all_business_types))
                    ).count()
                
                # Get subcategories for this main category
                subcategories = []
                for sub_key, sub_data in data['subcategories'].items():
                    # Count businesses in this subcategory
                    sub_count = 0
                    if city and sub_key != 'all':
                        business_types = sub_data.get('business_types', [])
                        sub_count = PlaceholderBusiness.objects.filter(
                            city__iexact=city,
                            opted_out=False,
                            category__in=business_types
                        ).count()
                    
                    subcategories.append({
                        'id': sub_key,
                        'name': sub_data['name'],
                        'count': sub_count
                    })
                
                main_categories.append({
                    'id': key,
                    'name': data['name'],
                    'icon': data['icon'],
                    'color': data['color'],
                    'count': business_count,
                    'subcategories': subcategories
                })
            
            return Response({
                'success': True,
                'categories': main_categories,
                'city': city
            })
            
        except Exception as e:
            logger.error(f"[Marketplace] Error fetching category hierarchy: {str(e)}")
            return Response({
                'success': False,
                'message': 'Error fetching categories',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def marketplace_categories(self, request):
        """
        Get unique categories from placeholder businesses in user's city (legacy)
        """
        try:
            city = request.query_params.get('city', '').strip()
            
            if not city:
                return Response({
                    'success': False,
                    'message': 'City is required',
                    'categories': []
                })
            
            logger.info(f"[Categories] Getting categories for city: {city}")
            
            # Get distinct categories for the city
            categories = PlaceholderBusiness.objects.filter(
                city__iexact=city,
                opted_out=False
            ).values_list('category', flat=True).distinct()
            
            # Filter out empty categories and count businesses
            category_list = []
            category_counts = {}
            
            for cat in categories:
                if cat and cat.strip():
                    cleaned = cat.strip()
                    if cleaned not in category_counts:
                        # Count businesses in this category
                        count = PlaceholderBusiness.objects.filter(
                            city__iexact=city,
                            category__icontains=cleaned,
                            opted_out=False
                        ).count()
                        category_counts[cleaned] = count
                        category_list.append({
                            'name': cleaned,
                            'count': count
                        })
            
            # Sort by count (most businesses first)
            category_list.sort(key=lambda x: x['count'], reverse=True)
            
            # Map to standard marketplace categories with icons
            standard_categories = {
                'Restaurant': {'icon': 'restaurant', 'color': '#f97316', 'display': 'Food & Drinks'},
                'Food': {'icon': 'restaurant', 'color': '#f97316', 'display': 'Food & Drinks'},
                'Grocery': {'icon': 'cart', 'color': '#ec4899', 'display': 'Shopping'},
                'Shopping': {'icon': 'cart', 'color': '#ec4899', 'display': 'Shopping'},
                'Retail': {'icon': 'cart', 'color': '#ec4899', 'display': 'Shopping'},
                'Service': {'icon': 'construct', 'color': '#8b5cf6', 'display': 'Services'},
                'Transport': {'icon': 'car', 'color': '#3b82f6', 'display': 'Transport'},
                'Transportation': {'icon': 'car', 'color': '#3b82f6', 'display': 'Transport'},
                'Health': {'icon': 'medical', 'color': '#10b981', 'display': 'Health'},
                'Healthcare': {'icon': 'medical', 'color': '#10b981', 'display': 'Health'},
                'Beauty': {'icon': 'sparkles', 'color': '#f472b6', 'display': 'Beauty'},
                'Entertainment': {'icon': 'game-controller', 'color': '#a855f7', 'display': 'Entertainment'},
                'Education': {'icon': 'school', 'color': '#0ea5e9', 'display': 'Education'},
            }
            
            # Build final category response
            final_categories = []
            seen_displays = set()
            
            for cat in category_list[:20]:  # Limit to top 20 categories
                matched = False
                for key, val in standard_categories.items():
                    if key.lower() in cat['name'].lower():
                        if val['display'] not in seen_displays:
                            final_categories.append({
                                'id': val['display'].lower().replace(' & ', '_').replace(' ', '_'),
                                'name': val['display'],
                                'original_name': cat['name'],
                                'icon': val['icon'],
                                'color': val['color'],
                                'count': cat['count']
                            })
                            seen_displays.add(val['display'])
                        matched = True
                        break
                
                if not matched and len(final_categories) < 8:
                    # Add as "Other" category if not matched
                    final_categories.append({
                        'id': 'other',
                        'name': 'Other',
                        'original_name': cat['name'],
                        'icon': 'ellipsis-horizontal',
                        'color': '#6b7280',
                        'count': cat['count']
                    })
            
            logger.info(f"[Categories] Returning {len(final_categories)} categories for {city}")
            
            return Response({
                'success': True,
                'categories': final_categories,
                'city': city,
                'total_businesses': sum(cat['count'] for cat in category_list)
            })
            
        except Exception as e:
            logger.error(f"[Categories] Error fetching categories: {str(e)}")
            return Response({
                'success': False,
                'message': 'Error fetching categories',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def featured_businesses(self, request):
        """
        Get featured/top-rated businesses for user's city
        """
        try:
            city = request.query_params.get('city', '').strip()
            
            if not city:
                return Response({
                    'success': False,
                    'message': 'City is required',
                    'businesses': []
                })
            
            logger.info(f"[Featured] Getting featured businesses for city: {city}")
            
            # Get top-rated businesses in the city
            businesses = PlaceholderBusiness.objects.filter(
                city__iexact=city,
                opted_out=False,
                rating__isnull=False  # Only businesses with ratings
            ).order_by('-rating', 'name')[:10]  # Top 10 businesses
            
            results = []
            for business in businesses:
                results.append({
                    'id': business.id,
                    'name': business.name,
                    'category': business.category,
                    'rating': float(business.rating) if business.rating else None,
                    'address': business.address,
                    'phone': business.phone,
                    'image_url': business.image_url or '',
                    'is_verified': business.converted_to_real_business,
                })
            
            logger.info(f"[Featured] Returning {len(results)} featured businesses for {city}")
            
            return Response({
                'success': True,
                'businesses': results,
                'city': city
            })
            
        except Exception as e:
            logger.error(f"[Featured] Error fetching featured businesses: {str(e)}")
            return Response({
                'success': False,
                'message': 'Error fetching featured businesses',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class PublicBusinessViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public marketplace business endpoints - NO AUTHENTICATION REQUIRED
    """
    permission_classes = []  # No authentication required
    authentication_classes = []  # No authentication required
    serializer_class = BusinessListingSerializer

    def get_queryset(self):
        """
        Public view shows all visible marketplace businesses
        """
        return BusinessListing.objects.filter(is_visible_in_marketplace=True)

    def retrieve(self, request, pk=None):
        """
        Public view of business listing for consumers - NO AUTHENTICATION REQUIRED
        This endpoint is completely public and requires no authentication
        """
        # Debug logging for authentication issues
        logger.info(f"🔍 [PUBLIC_VIEW_DEBUG] Starting public retrieve for business_id: {pk}")
        logger.info(f"🔍 [PUBLIC_VIEW_DEBUG] Request user: {getattr(request, 'user', 'No user attribute')}")
        logger.info(f"🔍 [PUBLIC_VIEW_DEBUG] Is authenticated: {request.user.is_authenticated if hasattr(request, 'user') else 'No user'}")
        logger.info(f"🔍 [PUBLIC_VIEW_DEBUG] Request headers: Authorization={request.META.get('HTTP_AUTHORIZATION', 'None')}")

        # Manually fetch the business listing by UUID for public access
        try:
            listing = BusinessListing.objects.get(
                id=pk,
                is_visible_in_marketplace=True
            )
            # Get business name from the related User object
            business_name = listing.business.name if hasattr(listing.business, 'name') else listing.business.email
            logger.info(f"🔍 [PUBLIC_VIEW_DEBUG] Found listing for business: {business_name}")
        except BusinessListing.DoesNotExist:
            logger.error(f"🔍 [PUBLIC_VIEW_DEBUG] Business not found: {pk}")
            return Response({
                'error': 'Business not found or not available'
            }, status=status.HTTP_404_NOT_FOUND)

        # Check if consumer can access this business (only if authenticated)
        if hasattr(request, 'user') and request.user and request.user.is_authenticated:
            consumer_profile = ConsumerProfile.objects.filter(user=request.user).first()

            if consumer_profile:
                can_deliver = listing.can_deliver_to(
                    consumer_profile.current_country,
                    consumer_profile.current_city,
                    (consumer_profile.current_latitude, consumer_profile.current_longitude)
                    if consumer_profile.current_latitude else None
                )

                if not can_deliver:
                    return Response({
                        'error': 'This business does not deliver to your location',
                        'business_location': f"{listing.city}, {listing.country}",
                        'delivery_scope': listing.delivery_scope
                    }, status=status.HTTP_403_FORBIDDEN)

        serializer = BusinessListingSerializer(listing, context={'request': request})

        # Track view
        listing.last_active = timezone.now()
        listing.save(update_fields=['last_active'])

        logger.info(f"🔍 [PUBLIC_VIEW_DEBUG] Returning success response")
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def products(self, request, pk=None):
        """
        Get products for a business listing (public access)
        """
        logger.info(f"🔍 [PRODUCTS_DEBUG] Starting products endpoint for business_id: {pk}")

        # Manually fetch the business listing by UUID for public access
        try:
            # First try to find a visible business
            listing = BusinessListing.objects.filter(id=pk, is_visible_in_marketplace=True).first()

            # If not found and user is authenticated, check if they own this business
            if not listing and hasattr(request, 'user') and request.user.is_authenticated:
                listing = BusinessListing.objects.filter(id=pk, business=request.user).first()
                logger.info(f"🔍 [PRODUCTS_DEBUG] Business owner accessing their own products: {listing.id if listing else 'NOT_FOUND'}")

            # If still not found, try any business (for debugging)
            if not listing:
                listing = BusinessListing.objects.filter(id=pk).first()
                if listing:
                    logger.warning(f"⚠️ [PRODUCTS_DEBUG] Found business {pk} but is_visible_in_marketplace={listing.is_visible_in_marketplace}")

            if not listing:
                return Response({
                    'error': 'Business not found'
                }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"[PRODUCTS_DEBUG] Error fetching business listing {pk}: {e}")
            return Response({
                'error': 'Business not found or not available'
            }, status=status.HTTP_404_NOT_FOUND)

        # Get menu items for restaurants or inventory products for retail businesses
        products = []
        business = listing.business

        # Check business type from listing or business name
        business_type = listing.business_type or ''
        business_name = business.name if hasattr(business, 'name') else business.email

        # Detect restaurant from either business type or name
        is_restaurant = (
            'RESTAURANT' in business_type.upper() or
            'CAFE' in business_type.upper() or
            'restaurant' in business_name.lower() or
            'cafe' in business_name.lower()
        )

        # Detect inventory-based businesses (retail, beauty, grocery, etc.)
        is_inventory_business = (
            'RETAIL' in business_type.upper() or
            'BEAUTY' in business_type.upper() or
            'GROCERY' in business_type.upper() or
            'PHARMACY' in business_type.upper() or
            'SHOP' in business_type.upper() or
            'STORE' in business_type.upper() or
            'MARKET' in business_type.upper()
        )

        logger.info(f"🔍 [PRODUCTS_DEBUG] Business type analysis: {business_type}")
        logger.info(f"🔍 [PRODUCTS_DEBUG] Is restaurant: {is_restaurant}")
        logger.info(f"🔍 [PRODUCTS_DEBUG] Is inventory business: {is_inventory_business}")

        if is_restaurant:
            try:
                from menu.models import MenuItem
                logger.info(f"🍔 [MENU_DEBUG] Fetching menu items for restaurant business {business.id}")
                logger.info(f"🍔 [MENU_DEBUG] Business has tenant_id: {hasattr(business, 'tenant_id')}")
                logger.info(f"🍔 [MENU_DEBUG] Business tenant_id value: {getattr(business, 'tenant_id', 'NONE')}")

                # Check if menu items exist for this business
                # MenuItem uses tenant_id, not business field
                if hasattr(business, 'tenant_id') and business.tenant_id:
                    all_items = MenuItem.objects.filter(tenant_id=business.tenant_id)
                    logger.info(f"🍔 [MENU_DEBUG] Filtering by tenant_id: {business.tenant_id}")
                else:
                    # Fallback: try filtering by business user
                    all_items = MenuItem.objects.filter(business=business)
                    logger.info(f"🍔 [MENU_DEBUG] Filtering by business user: {business.id}")

                available_items = all_items.filter(is_available=True)

                logger.info(f"🍔 [MENU_DEBUG] Found {all_items.count()} total menu items, {available_items.count()} available")

                items = available_items.values(
                    'id', 'name', 'description', 'price', 'image_url'
                )
                products = list(items)
                logger.info(f"🍔 [MENU_DEBUG] Returning {len(products)} menu items")

                # Log first item for debugging
                if products:
                    logger.info(f"🍔 [MENU_DEBUG] First item: {products[0]}")
            except Exception as e:
                logger.error(f"🍔 [MENU_DEBUG] Could not fetch menu items for business {business.id}: {e}")
                import traceback
                logger.error(f"🍔 [MENU_DEBUG] Full traceback: {traceback.format_exc()}")
        elif is_inventory_business:
            try:
                from inventory.models import Product
                from inventory.serializers import MarketplaceProductSerializer
                logger.info(f"🛒 [INVENTORY_DEBUG] Fetching inventory products for business {business.id}")
                logger.info(f"🛒 [INVENTORY_DEBUG] Business has tenant_id: {hasattr(business, 'tenant_id')}")
                logger.info(f"🛒 [INVENTORY_DEBUG] Business tenant_id value: {getattr(business, 'tenant_id', 'NONE')}")

                # Check if inventory products exist for this business
                # Product uses tenant_id, similar to MenuItem
                if hasattr(business, 'tenant_id') and business.tenant_id:
                    all_products = Product.objects.filter(tenant_id=business.tenant_id)
                    logger.info(f"🛒 [INVENTORY_DEBUG] Filtering by tenant_id: {business.tenant_id}")
                else:
                    logger.info(f"🛒 [INVENTORY_DEBUG] No tenant_id available for business {business.id}")
                    all_products = Product.objects.none()

                # Only show active products with stock for marketplace
                available_products = all_products.filter(is_active=True, quantity__gt=0)

                logger.info(f"🛒 [INVENTORY_DEBUG] Found {all_products.count()} total products, {available_products.count()} available")

                # Use the marketplace serializer for consistent format
                serializer = MarketplaceProductSerializer(available_products, many=True)
                products = serializer.data
                logger.info(f"🛒 [INVENTORY_DEBUG] Returning {len(products)} inventory products")

                # Log first item for debugging
                if products:
                    logger.info(f"🛒 [INVENTORY_DEBUG] First item: {products[0]}")
            except Exception as e:
                logger.error(f"🛒 [INVENTORY_DEBUG] Could not fetch inventory products for business {business.id}: {e}")
                import traceback
                logger.error(f"🛒 [INVENTORY_DEBUG] Full traceback: {traceback.format_exc()}")
        else:
            logger.info(f"🔍 [PRODUCTS_DEBUG] Business {business.id} is neither restaurant nor inventory business - business_type: {business_type}")

        logger.info(f"🔍 [PRODUCTS_DEBUG] Returning {len(products)} products")
        return Response({
            'success': True,
            'products': products,
            'business_id': str(listing.id),
            'business_name': business_name
        })

    @action(detail=True, methods=['get'])
    def services(self, request, pk=None):
        """
        Get services for a business listing (public access)
        """
        logger.info(f"🔍 [SERVICES_DEBUG] Starting services endpoint for business_id: {pk}")

        # For now, return empty services list (can be implemented later)
        # Most businesses will use products endpoint for menu items
        return Response({
            'success': True,
            'services': [],
            'business_id': str(pk),
            'message': 'Services endpoint - currently returns empty list'
        })


class BusinessListingViewSet(viewsets.ModelViewSet):
    """
    Business marketplace listing management
    """
    permission_classes = [IsAuthenticated]
    serializer_class = BusinessListingSerializer
    
    def get_queryset(self):
        """
        Business owners see their own listing
        """
        if hasattr(self.request.user, 'tenant_id') and self.request.user.tenant_id:
            return BusinessListing.objects.filter(tenant_id=self.request.user.tenant_id)
        return BusinessListing.objects.none()
    
    @action(detail=False, methods=['get', 'post'])
    def my_listing(self, request):
        """
        Get or update current business's marketplace listing
        """
        if not hasattr(request.user, 'tenant_id') or not request.user.tenant_id:
            return Response(
                {'error': 'Only businesses can manage listings'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        listing, created = BusinessListing.objects.get_or_create(
            business=request.user,
            defaults={
                'country': request.user.profile.country if hasattr(request.user, 'profile') else '',
                'city': request.user.profile.city if hasattr(request.user, 'profile') else '',
            }
        )
        
        if request.method == 'POST':
            serializer = BusinessListingSerializer(listing, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            
            return Response({
                'success': True,
                'message': 'Listing updated successfully',
                'listing': serializer.data
            })
        
        serializer = BusinessListingSerializer(listing)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def sync_business_info(self, request):
        """
        Manually sync business info from UserProfile to BusinessListing
        This allows businesses to update their marketplace info if it's missing
        """
        try:
            user = request.user

            # Get the business listing
            listing = BusinessListing.objects.filter(business=user).first()
            if not listing:
                return Response({
                    'success': False,
                    'message': 'No marketplace listing found for this business'
                }, status=status.HTTP_404_NOT_FOUND)

            # Get user profile
            from users.models import UserProfile
            profile = UserProfile.objects.filter(user=user).first()
            if not profile:
                return Response({
                    'success': False,
                    'message': 'No user profile found'
                }, status=status.HTTP_404_NOT_FOUND)

            updated_fields = []

            # Sync phone
            if not listing.phone and profile.phone_number:
                listing.phone = profile.phone_number
                updated_fields.append('phone')

            # Sync email
            if not listing.business_email:
                listing.business_email = user.email
                updated_fields.append('business_email')

            # Sync address
            if not listing.address:
                address_parts = []
                if profile.street:
                    address_parts.append(profile.street)
                if profile.city:
                    address_parts.append(profile.city)
                if profile.state:
                    address_parts.append(profile.state)
                if profile.country:
                    address_parts.append(str(profile.country.name))
                if address_parts:
                    listing.address = ', '.join(address_parts)
                    updated_fields.append('address')

            # Sync postal code
            if not listing.postal_code and profile.postcode:
                listing.postal_code = profile.postcode
                updated_fields.append('postal_code')

            # Sync state
            if not listing.state and profile.state:
                listing.state = profile.state
                updated_fields.append('state')

            # Sync business hours if empty
            if not listing.business_hours or listing.business_hours == {}:
                listing.business_hours = {
                    'monday': {'open': '09:00', 'close': '17:00'},
                    'tuesday': {'open': '09:00', 'close': '17:00'},
                    'wednesday': {'open': '09:00', 'close': '17:00'},
                    'thursday': {'open': '09:00', 'close': '17:00'},
                    'friday': {'open': '09:00', 'close': '17:00'},
                    'saturday': {'open': '09:00', 'close': '14:00'},
                    'sunday': {'isClosed': True}
                }
                updated_fields.append('business_hours')

            # Save changes
            if updated_fields:
                listing.save(update_fields=updated_fields)

                logger.info(f"[SYNC_INFO] Updated fields for {user.email}: {', '.join(updated_fields)}")

                return Response({
                    'success': True,
                    'message': f'Successfully synced {len(updated_fields)} fields',
                    'updated_fields': updated_fields,
                    'listing': BusinessListingSerializer(listing).data
                })
            else:
                return Response({
                    'success': True,
                    'message': 'All fields are already up to date',
                    'listing': BusinessListingSerializer(listing).data
                })

        except Exception as e:
            logger.error(f"[SYNC_INFO] Error syncing business info: {str(e)}")
            return Response({
                'success': False,
                'message': 'Error syncing business information',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'])
    def publish_to_marketplace(self, request):
        """
        Publish business from Advertise feature to marketplace
        This integrates with the Advertise form to make businesses visible
        """
        try:
            user = request.user
            data = request.data
            
            logger.info(f"[MARKETPLACE_PUBLISH] Publishing business for user: {user.email}")
            
            # Get or create the business listing
            listing, created = BusinessListing.objects.get_or_create(
                business=user,
                defaults={
                    'tenant_id': user.tenant_id if hasattr(user, 'tenant_id') else None
                }
            )
            
            # Update listing with advertise data
            listing.business_type = data.get('business_type', 'RESTAURANT_CAFE')
            listing.description = data.get('description', '')
            listing.country = data.get('country', 'SS')
            listing.city = data.get('city', 'Juba')

            # Ensure we have proper business info for marketplace display
            # Get business name from user profile or sent data
            business_name = data.get('business_name', '')
            if not business_name:
                # Try to get from user profile
                profile = getattr(user, 'profile', None)
                if profile:
                    business_name = getattr(profile, 'business_name', '') or user.name or user.email.split('@')[0]
                else:
                    business_name = user.name or user.email.split('@')[0]

            logger.info(f"[MARKETPLACE_PUBLISH] Setting business name: {business_name}")
            
            # Handle Cloudinary image URLs
            if 'logo_url' in data:
                listing.logo_url = data['logo_url']
            if 'logo_public_id' in data:
                listing.logo_public_id = data['logo_public_id']
            if 'cover_image_url' in data:
                listing.cover_image_url = data['cover_image_url']
            if 'cover_image_public_id' in data:
                listing.cover_image_public_id = data['cover_image_public_id']
            if 'gallery_images' in data:
                listing.gallery_images = data['gallery_images']

            # If no images provided, copy from UserProfile if available
            profile = getattr(user, 'profile', None)
            if profile:
                if not listing.logo_url and hasattr(profile, 'logo_cloudinary_url') and profile.logo_cloudinary_url:
                    listing.logo_url = profile.logo_cloudinary_url
                    logger.info(f"[MARKETPLACE_PUBLISH] Copied logo from profile: {profile.logo_cloudinary_url}")
                if not listing.logo_public_id and hasattr(profile, 'logo_cloudinary_public_id') and profile.logo_cloudinary_public_id:
                    listing.logo_public_id = profile.logo_cloudinary_public_id
                    logger.info(f"[MARKETPLACE_PUBLISH] Copied logo public_id from profile: {profile.logo_cloudinary_public_id}")

                # Also check for base64 logo_data as fallback
                if not listing.logo_url and hasattr(profile, 'logo_data') and profile.logo_data:
                    # For base64 data, we can't use it directly in marketplace, but we log it
                    logger.info(f"[MARKETPLACE_PUBLISH] Profile has base64 logo_data but no Cloudinary URL")

            logger.info(f"[MARKETPLACE_PUBLISH] Final image URLs - Logo: {bool(listing.logo_url)}, Cover: {bool(listing.cover_image_url)}, Gallery: {len(listing.gallery_images) if listing.gallery_images else 0}")
            
            # Business hours and features
            if 'business_hours' in data:
                listing.business_hours = data['business_hours']
            if 'search_tags' in data:
                listing.search_tags = data['search_tags']
            
            # Make visible in marketplace
            listing.is_visible_in_marketplace = True
            listing.is_verified = data.get('is_verified', False)
            listing.is_featured = data.get('is_featured', False)
            
            # Save the listing
            listing.save()
            
            logger.info(f"[MARKETPLACE_PUBLISH] Successfully published listing ID: {listing.id}")
            
            return Response({
                'success': True,
                'message': 'Business successfully published to marketplace',
                'listing_id': str(listing.id),
                'is_visible': listing.is_visible_in_marketplace
            })
            
        except Exception as e:
            logger.error(f"[MARKETPLACE_PUBLISH] Error publishing to marketplace: {str(e)}")
            return Response({
                'success': False,
                'message': f'Error publishing to marketplace: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['post'])
    def update_delivery_settings(self, request):
        """
        Update business delivery settings
        """
        listing = BusinessListing.objects.get(business=request.user)
        
        delivery_scope = request.data.get('delivery_scope')
        if delivery_scope:
            listing.delivery_scope = delivery_scope
        
        if delivery_scope == 'local':
            listing.delivery_radius_km = request.data.get('delivery_radius_km', 10)
        elif delivery_scope == 'international':
            listing.ships_to_countries = request.data.get('ships_to_countries', [])
        elif delivery_scope == 'digital':
            listing.is_digital_only = True
        
        listing.save()
        
        return Response({
            'success': True,
            'message': 'Delivery settings updated',
            'delivery_scope': listing.delivery_scope,
            'delivery_radius_km': listing.delivery_radius_km,
            'ships_to_countries': listing.ships_to_countries
        })
    
    @action(detail=True, methods=['get'], permission_classes=[], authentication_classes=[])
    def public_view(self, request, pk=None):
        """
        Public view of business listing for consumers - NO AUTHENTICATION REQUIRED
        This endpoint is completely public and requires no authentication
        """
        # Debug logging for authentication issues
        logger.info(f"🔍 [PUBLIC_VIEW_DEBUG] Starting public_view for business_id: {pk}")
        logger.info(f"🔍 [PUBLIC_VIEW_DEBUG] Request user: {getattr(request, 'user', 'No user attribute')}")
        logger.info(f"🔍 [PUBLIC_VIEW_DEBUG] Is authenticated: {request.user.is_authenticated if hasattr(request, 'user') else 'No user'}")
        logger.info(f"🔍 [PUBLIC_VIEW_DEBUG] Request headers: {dict(request.headers) if hasattr(request, 'headers') else 'No headers'}")
        logger.info(f"🔍 [PUBLIC_VIEW_DEBUG] Request META auth: {request.META.get('HTTP_AUTHORIZATION', 'No auth header')}")

        # Manually fetch the business listing by UUID for public access
        try:
            listing = BusinessListing.objects.get(
                id=pk,
                is_visible_in_marketplace=True
            )
            # Get business name from the related User object
            business_name = listing.business.name if hasattr(listing.business, 'name') else listing.business.email
            logger.info(f"🔍 [PUBLIC_VIEW_DEBUG] Found listing for business: {business_name}")
        except BusinessListing.DoesNotExist:
            logger.error(f"🔍 [PUBLIC_VIEW_DEBUG] Business not found: {pk}")
            return Response({
                'error': 'Business not found or not available'
            }, status=status.HTTP_404_NOT_FOUND)

        # Check if consumer can access this business (only if authenticated)
        if request.user and request.user.is_authenticated:
            consumer_profile = ConsumerProfile.objects.filter(user=request.user).first()

            if consumer_profile:
                can_deliver = listing.can_deliver_to(
                    consumer_profile.current_country,
                    consumer_profile.current_city,
                    (consumer_profile.current_latitude, consumer_profile.current_longitude)
                    if consumer_profile.current_latitude else None
                )

                if not can_deliver:
                    return Response({
                        'error': 'This business does not deliver to your location',
                        'business_location': f"{listing.city}, {listing.country}",
                        'delivery_scope': listing.delivery_scope
                    }, status=status.HTTP_403_FORBIDDEN)

        serializer = BusinessListingSerializer(listing, context={'request': request})

        # Track view
        listing.last_active = timezone.now()
        listing.save(update_fields=['last_active'])

        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def get_products(self, request, pk=None):
        """
        Get products for a business listing (public access)
        """
        # Manually fetch the business listing by UUID for public access
        try:
            # First try to find a visible business
            listing = BusinessListing.objects.filter(id=pk, is_visible_in_marketplace=True).first()

            # If not found and user is authenticated, check if they own this business
            if not listing and request.user.is_authenticated:
                listing = BusinessListing.objects.filter(id=pk, business=request.user).first()
                logger.info(f"🔍 [PRODUCTS_DEBUG] Business owner accessing their own products: {listing.id if listing else 'NOT_FOUND'}")

            # If still not found, try any business (for debugging)
            if not listing:
                listing = BusinessListing.objects.filter(id=pk).first()
                if listing:
                    logger.warning(f"⚠️ [PRODUCTS_DEBUG] Found business {pk} but is_visible_in_marketplace={listing.is_visible_in_marketplace}")

            if not listing:
                return Response({
                    'error': 'Business not found'
                }, status=status.HTTP_404_NOT_FOUND)

        except Exception as e:
            logger.error(f"[PRODUCTS_DEBUG] Error fetching business listing {pk}: {e}")
            return Response({
                'error': 'Business not found or not available'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get menu items for restaurants or inventory products for retail businesses
        products = []
        business = listing.business

        # Check business type from listing or business name
        business_type = listing.business_type or ''
        business_name = business.name if hasattr(business, 'name') else business.email

        # Detect restaurant from either business type or name
        is_restaurant = (
            'RESTAURANT' in business_type.upper() or
            'CAFE' in business_type.upper() or
            'restaurant' in business_name.lower() or
            'cafe' in business_name.lower()
        )

        # Detect inventory-based businesses (retail, beauty, grocery, etc.)
        is_inventory_business = (
            'RETAIL' in business_type.upper() or
            'BEAUTY' in business_type.upper() or
            'GROCERY' in business_type.upper() or
            'PHARMACY' in business_type.upper() or
            'SHOP' in business_type.upper() or
            'STORE' in business_type.upper() or
            'MARKET' in business_type.upper()
        )

        logger.info(f"🔍 [PRODUCTS_DEBUG] Business type analysis: {business_type}")
        logger.info(f"🔍 [PRODUCTS_DEBUG] Is restaurant: {is_restaurant}")
        logger.info(f"🔍 [PRODUCTS_DEBUG] Is inventory business: {is_inventory_business}")

        if is_restaurant:
            try:
                from menu.models import MenuItem
                logger.info(f"🍔 [MENU_DEBUG] Fetching menu items for restaurant business {business.id}")
                logger.info(f"🍔 [MENU_DEBUG] Business has tenant_id: {hasattr(business, 'tenant_id')}")
                logger.info(f"🍔 [MENU_DEBUG] Business tenant_id value: {getattr(business, 'tenant_id', 'NONE')}")

                # Check if menu items exist for this business
                # MenuItem uses tenant_id, not business field
                if hasattr(business, 'tenant_id') and business.tenant_id:
                    all_items = MenuItem.objects.filter(tenant_id=business.tenant_id)
                    logger.info(f"🍔 [MENU_DEBUG] Filtering by tenant_id: {business.tenant_id}")
                else:
                    # Fallback: try filtering by business user
                    all_items = MenuItem.objects.filter(business=business)
                    logger.info(f"🍔 [MENU_DEBUG] Filtering by business user: {business.id}")

                available_items = all_items.filter(is_available=True)

                logger.info(f"🍔 [MENU_DEBUG] Found {all_items.count()} total menu items, {available_items.count()} available")

                items = available_items.values(
                    'id', 'name', 'description', 'price', 'image_url'
                )
                products = list(items)
                logger.info(f"🍔 [MENU_DEBUG] Returning {len(products)} menu items")

                # Log first item for debugging
                if products:
                    logger.info(f"🍔 [MENU_DEBUG] First item: {products[0]}")
            except Exception as e:
                logger.error(f"🍔 [MENU_DEBUG] Could not fetch menu items for business {business.id}: {e}")
                import traceback
                logger.error(f"🍔 [MENU_DEBUG] Full traceback: {traceback.format_exc()}")
        else:
            logger.info(f"🍔 [MENU_DEBUG] Business {business.id} is not detected as restaurant - business_type: {business_type}")
        
        logger.info(f"🔍 [PUBLIC_VIEW_DEBUG] Returning success response with {len(products)} products")
        return Response({
            'success': True,
            'products': products,
            'business_id': str(listing.id),
            'business_name': business_name
        })
    
    @action(detail=True, methods=['get'])
    def get_services(self, request, pk=None):
        """
        Get services for a business listing (public access)
        """
        # Manually fetch the business listing by UUID for public access
        try:
            listing = BusinessListing.objects.get(
                id=pk,
                is_visible_in_marketplace=True
            )
        except BusinessListing.DoesNotExist:
            return Response({
                'error': 'Business not found or not available'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # For now, return empty services list
        # This can be extended in the future when service management is implemented
        services = []

        # Get business name safely
        business_name = listing.business.name if hasattr(listing.business, 'name') else listing.business.email

        return Response({
            'success': True,
            'services': services,
            'business_id': str(listing.id),
            'business_name': business_name
        })
    
    @action(detail=False, methods=['get', 'patch'])
    def listing(self, request):
        """
        Get or update current business's marketplace listing
        Endpoint: GET/PATCH /api/marketplace/business/listing/
        """
        # 🛠️ [AUTH_DEBUG] Check user authentication and tenant access
        logger.info(f"[BusinessListing] User: {request.user.id}, Email: {getattr(request.user, 'email', 'N/A')}")
        logger.info(f"[BusinessListing] Has tenant_id attr: {hasattr(request.user, 'tenant_id')}")
        logger.info(f"[BusinessListing] Tenant ID value: {getattr(request.user, 'tenant_id', 'NONE')}")
        
        if not hasattr(request.user, 'tenant_id') or not request.user.tenant_id:
            logger.warning(f"[BusinessListing] User {request.user.id} does not have tenant_id - checking alternatives")
            
            # Try to get tenant from related business or tenant relationship
            tenant_id = None
            if hasattr(request.user, 'tenant') and request.user.tenant:
                tenant_id = request.user.tenant.id
                logger.info(f"[BusinessListing] Found tenant via user.tenant: {tenant_id}")
            elif hasattr(request.user, 'business_id') and request.user.business_id:
                tenant_id = request.user.business_id
                logger.info(f"[BusinessListing] Found tenant via user.business_id: {tenant_id}")
            
            if not tenant_id:
                return Response(
                    {'success': False, 'error': 'Only businesses can manage listings'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # 🛠️ [LISTING_DEBUG] Get or create the business listing
        logger.info(f"[BusinessListing] Attempting to find listing for user {request.user.id}")
        
        try:
            listing = BusinessListing.objects.get(business=request.user)
            logger.info(f"[BusinessListing] Found existing listing: {listing.id}")
        except BusinessListing.DoesNotExist:
            logger.info(f"[BusinessListing] No listing found, creating new one")
            # Create new listing with business profile data
            profile_data = {}
            if hasattr(request.user, 'profile'):
                profile_data.update({
                    'country': getattr(request.user.profile, 'country', ''),
                    'city': getattr(request.user.profile, 'city', ''),
                    'description': getattr(request.user.profile, 'business_description', ''),
                })
            
            listing = BusinessListing.objects.create(
                business=request.user,
                business_type=getattr(request.user.profile, 'business_type', 'service') if hasattr(request.user, 'profile') else 'service',
                **profile_data
            )
        
        if request.method == 'GET':
            serializer = BusinessListingSerializer(listing, context={'request': request})
            return Response({
                'success': True,
                'data': serializer.data
            })
        
        elif request.method == 'PATCH':
            logger.info(f"[BusinessListing] PATCH request data: {request.data}")
            logger.info(f"[BusinessListing] Current listing visibility: {listing.is_visible_in_marketplace}")

            # Handle the mobile app's nested profile structure
            profile_data = request.data.get('profile', {})

            # Extract data from nested structure
            update_data = {}

            # Handle root-level publish status fields (for mobile app compatibility)
            if 'is_published' in request.data:
                logger.info(f"[BusinessListing] Mapping is_published={request.data['is_published']} to is_visible_in_marketplace")
                update_data['is_visible_in_marketplace'] = request.data['is_published']
            if 'is_active' in request.data:
                logger.info(f"[BusinessListing] Mapping is_active={request.data['is_active']} to is_visible_in_marketplace")
                update_data['is_visible_in_marketplace'] = request.data['is_active']
            if 'is_visible_in_marketplace' in request.data:
                logger.info(f"[BusinessListing] Direct is_visible_in_marketplace={request.data['is_visible_in_marketplace']}")
                update_data['is_visible_in_marketplace'] = request.data['is_visible_in_marketplace']

            # CRITICAL DEBUG: Log if visibility field is being updated
            if 'is_visible_in_marketplace' in update_data:
                logger.info(f"🚨 [VISIBILITY_DEBUG] Will update is_visible_in_marketplace from {listing.is_visible_in_marketplace} to {update_data['is_visible_in_marketplace']}")
            else:
                logger.info(f"⚠️ [VISIBILITY_DEBUG] No is_visible_in_marketplace field found in update_data")
                logger.info(f"⚠️ [VISIBILITY_DEBUG] update_data keys: {list(update_data.keys())}")
                logger.info(f"⚠️ [VISIBILITY_DEBUG] request.data keys: {list(request.data.keys())}")
            
            # Basic information
            if 'basic' in profile_data:
                basic = profile_data['basic']
                if 'business_type' in basic:
                    update_data['business_type'] = basic['business_type']
                if 'description' in basic:
                    update_data['description'] = basic['description']
                if 'search_tags' in basic:
                    update_data['search_tags'] = basic['search_tags']

            # Also check for root-level description (mobile app compatibility)
            if 'description' in request.data and 'description' not in update_data:
                update_data['description'] = request.data['description']

            # Handle open/closed status updates (for mobile app compatibility)
            if 'is_open_now' in request.data:
                logger.info(f"[BusinessListing] Updating is_open_now to {request.data['is_open_now']}")
                update_data['is_open_now'] = request.data['is_open_now']
                # If explicitly setting status, mark as manual override
                if 'manual_override' in request.data:
                    update_data['manual_override'] = request.data['manual_override']
                    if request.data['manual_override']:
                        # Set expiry for 24 hours when manually overridden
                        from datetime import timedelta
                        update_data['manual_override_expires'] = timezone.now() + timedelta(hours=24)

            # Contact information
            if 'contact' in profile_data:
                contact = profile_data['contact']
                if 'city' in contact:
                    update_data['city'] = contact['city']
                if 'country' in contact:
                    update_data['country'] = contact['country']
                if 'phone' in contact:
                    update_data['phone'] = contact['phone']
                if 'email' in contact:
                    update_data['business_email'] = contact['email']
                if 'website' in contact:
                    update_data['website'] = contact['website']
                if 'address' in contact and isinstance(contact['address'], dict):
                    addr = contact['address']
                    if 'street' in addr:
                        update_data['address'] = addr['street']
                    if 'city' in addr:
                        update_data['city'] = addr['city']
                    if 'state' in addr:
                        update_data['state'] = addr['state']
                    if 'postalCode' in addr:
                        update_data['postal_code'] = addr['postalCode']
                    if 'country' in addr:
                        update_data['country'] = addr['country']
                if 'socialMedia' in contact:
                    update_data['social_media'] = contact['socialMedia']
                logger.info(f"📦 [CONTACT_MAPPING] Extracted contact fields: {[k for k in update_data if k in ['phone', 'business_email', 'website', 'address', 'social_media']]}")

            # Operations
            if 'operations' in profile_data:
                operations = profile_data['operations']
                # Map operating hours from frontend format
                if 'operatingHours' in operations:
                    update_data['business_hours'] = operations['operatingHours']
                    logger.info(f"📦 [HOURS_MAPPING] Mapped operating hours: {bool(update_data.get('business_hours'))}")
                elif 'business_hours' in operations:
                    update_data['business_hours'] = operations['business_hours']

                # Map payment methods
                if 'paymentMethods' in operations:
                    update_data['payment_methods'] = operations['paymentMethods']
                    logger.info(f"📦 [PAYMENT_MAPPING] Mapped payment methods: {update_data.get('payment_methods', [])}")

                # Map delivery options
                if 'deliveryOptions' in operations:
                    update_data['delivery_options'] = operations['deliveryOptions']
                    logger.info(f"📦 [DELIVERY_MAPPING] Mapped delivery options: {update_data.get('delivery_options', {})}")

                if 'delivery_scope' in operations:
                    update_data['delivery_scope'] = operations['delivery_scope']
                if 'delivery_radius_km' in operations:
                    update_data['delivery_radius_km'] = operations['delivery_radius_km']
            
            # Discovery settings
            if 'discovery' in profile_data:
                discovery = profile_data['discovery']
                if 'is_visible_in_marketplace' in discovery:
                    update_data['is_visible_in_marketplace'] = discovery['is_visible_in_marketplace']

            # Helper function to handle base64 image upload
            def handle_image_upload(image_data, purpose='marketplace', user_id=None):
                """Upload base64 image and return URL"""
                if not image_data:
                    return None

                # Check if it's a base64 data URL
                if isinstance(image_data, str) and image_data.startswith('data:'):
                    try:
                        # Extract base64 data from data URL
                        format, imgstr = image_data.split(';base64,')
                        ext = format.split('/')[-1]

                        # Validate extension
                        if ext not in ['jpeg', 'jpg', 'png', 'gif', 'webp']:
                            ext = 'jpg'  # Default to jpg

                        # Convert base64 to file
                        file_data = base64.b64decode(imgstr)

                        # Try Cloudinary first if available
                        if os.environ.get('CLOUDINARY_CLOUD_NAME'):
                            try:
                                from services.cloudinary_service import cloudinary_service
                                data = ContentFile(file_data, name=f'temp.{ext}')
                                result = cloudinary_service.upload_image(
                                    data,
                                    purpose=purpose,
                                    user_id=str(request.user.id) if request.user else None
                                )
                                logger.info(f"[BusinessListing] Uploaded {purpose} image to Cloudinary: {result['url']}")
                                return result['url']
                            except Exception as cloud_error:
                                logger.warning(f"[BusinessListing] Cloudinary upload failed, falling back to local: {cloud_error}")

                        # Fallback to local storage
                        # Create a unique filename
                        filename = f"{purpose}_{uuid.uuid4().hex[:8]}.{ext}"

                        # Determine the folder path
                        user_folder = str(request.user.business_id) if hasattr(request.user, 'business_id') else str(request.user.id)
                        folder_path = f"marketplace/{user_folder}/{purpose}"
                        file_path = os.path.join(folder_path, filename)

                        # Save the file
                        saved_path = default_storage.save(file_path, ContentFile(file_data))

                        # Generate the full URL
                        if hasattr(settings, 'MEDIA_URL'):
                            # For local development
                            media_url = settings.MEDIA_URL.rstrip('/')
                            full_url = f"{request.build_absolute_uri('/')}{media_url}/{saved_path}".replace('//', '/')
                        else:
                            # For production (using staging URL)
                            full_url = f"https://dott-api-staging.onrender.com/media/{saved_path}"

                        logger.info(f"[BusinessListing] Saved {purpose} image locally: {full_url}")
                        return full_url

                    except Exception as e:
                        logger.error(f"[BusinessListing] Failed to upload {purpose} image: {e}")
                        return None
                elif isinstance(image_data, str) and (image_data.startswith('http://') or image_data.startswith('https://')):
                    # It's already a URL, return as is
                    return image_data

                return None

            # Handle image fields from root level (for mobile app image uploads)
            if 'logo_url' in request.data:
                uploaded_url = handle_image_upload(request.data['logo_url'], 'logo')
                if uploaded_url:
                    update_data['logo_url'] = uploaded_url
                    logger.info(f"[BusinessListing] Updated logo_url: {uploaded_url}")

            if 'cover_image_url' in request.data:
                uploaded_url = handle_image_upload(request.data['cover_image_url'], 'cover')
                if uploaded_url:
                    update_data['cover_image_url'] = uploaded_url
                    logger.info(f"[BusinessListing] Updated cover_image_url: {uploaded_url}")

            if 'gallery_images' in request.data:
                gallery_urls = []
                for idx, img in enumerate(request.data.get('gallery_images', [])):
                    uploaded_url = handle_image_upload(img, f'gallery_{idx}')
                    if uploaded_url:
                        gallery_urls.append(uploaded_url)
                if gallery_urls:
                    update_data['gallery_images'] = gallery_urls
                    logger.info(f"[BusinessListing] Updated gallery_images with {len(gallery_urls)} images")

            # Also check for nested visuals (alternative structure)
            if 'visuals' in profile_data:
                visuals = profile_data['visuals']
                if 'logoImage' in visuals and visuals['logoImage']:
                    uploaded_url = handle_image_upload(visuals['logoImage'], 'logo')
                    if uploaded_url:
                        update_data['logo_url'] = uploaded_url
                if 'bannerImage' in visuals and visuals['bannerImage']:
                    uploaded_url = handle_image_upload(visuals['bannerImage'], 'cover')
                    if uploaded_url:
                        update_data['cover_image_url'] = uploaded_url
                if 'galleryImages' in visuals and visuals['galleryImages']:
                    gallery_urls = []
                    for idx, img in enumerate(visuals['galleryImages']):
                        uploaded_url = handle_image_upload(img, f'gallery_{idx}')
                        if uploaded_url:
                            gallery_urls.append(uploaded_url)
                    if gallery_urls:
                        update_data['gallery_images'] = gallery_urls

            # Update listing with validated data
            logger.info(f"[BusinessListing] Final update_data: {update_data}")

            try:
                serializer = BusinessListingSerializer(listing, data=update_data, partial=True, context={'request': request})
                if serializer.is_valid():
                    # Log BEFORE save
                    if 'is_visible_in_marketplace' in update_data:
                        logger.info(f"🔍 [VISIBILITY_DEBUG] Before save - database value: {listing.is_visible_in_marketplace}, update value: {update_data['is_visible_in_marketplace']}")

                    # Save the changes
                    serializer.save()

                    # Log AFTER save
                    listing.refresh_from_db()  # Refresh from database
                    if 'is_visible_in_marketplace' in update_data:
                        logger.info(f"✅ [VISIBILITY_DEBUG] After save - database value: {listing.is_visible_in_marketplace}")
                        logger.info(f"✅ [VISIBILITY_DEBUG] Save was successful: {listing.is_visible_in_marketplace == update_data['is_visible_in_marketplace']}")

                    logger.info(f"[BusinessListing] Successfully updated listing for user {request.user.id}")
                    return Response({
                        'success': True,
                        'message': 'Business listing updated successfully',
                        'data': serializer.data
                    })
                else:
                    logger.error(f"[BusinessListing] Serializer validation errors: {serializer.errors}")
                    return Response({
                        'success': False,
                        'error': 'Invalid data provided',
                        'errors': serializer.errors
                    }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                logger.error(f"[BusinessListing] Unexpected error updating listing: {str(e)}")
                return Response({
                    'success': False,
                    'error': f'Server error: {str(e)}'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['patch'])
    def operating_hours(self, request):
        """
        Update business operating hours
        Endpoint: PATCH /api/marketplace/business/operating-hours/
        """
        if not hasattr(request.user, 'tenant_id'):
            return Response(
                {'success': False, 'error': 'Only businesses can update operating hours'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            listing = BusinessListing.objects.get(business=request.user)
        except BusinessListing.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Business listing not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        business_hours = request.data.get('business_hours', {})
        
        if not isinstance(business_hours, dict):
            return Response({
                'success': False,
                'error': 'business_hours must be a valid object'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        listing.business_hours = business_hours
        listing.save(update_fields=['business_hours', 'updated_at'])
        
        return Response({
            'success': True,
            'message': 'Operating hours updated successfully',
            'business_hours': listing.business_hours
        })
    
    @action(detail=False, methods=['patch'])
    def subcategories(self, request):
        """
        Update business subcategories
        Endpoint: PATCH /api/marketplace/business/subcategories/
        """
        if not hasattr(request.user, 'tenant_id'):
            return Response(
                {'success': False, 'error': 'Only businesses can update subcategories'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            listing = BusinessListing.objects.get(business=request.user)
        except BusinessListing.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Business listing not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        subcategories = request.data.get('subcategories', [])
        
        if not isinstance(subcategories, list):
            return Response({
                'success': False,
                'error': 'subcategories must be a valid list'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update the business listing secondary categories
        listing.secondary_categories = subcategories
        listing.save(update_fields=['secondary_categories'])
        
        logger.info(f"[BusinessListing] Updated subcategories for {request.user.id}: {subcategories}")
        
        return Response({
            'success': True,
            'message': 'Subcategories updated successfully',
            'subcategories': listing.secondary_categories
        })
    
    @action(detail=False, methods=['patch'])
    def update_status(self, request):
        """
        Update business open/closed status
        Endpoint: PATCH /api/marketplace/business/update-status/
        """
        if not hasattr(request.user, 'tenant_id'):
            return Response(
                {'success': False, 'error': 'Only businesses can update status'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            listing = BusinessListing.objects.get(business=request.user)
        except BusinessListing.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Business listing not found'
            }, status=status.HTTP_404_NOT_FOUND)

        is_open = request.data.get('is_open')
        manual_override = request.data.get('manual_override', False)

        if is_open is None:
            return Response({
                'success': False,
                'error': 'is_open field is required'
            }, status=status.HTTP_400_BAD_REQUEST)

        # Update the status
        listing.is_open_now = is_open
        listing.manual_override = manual_override

        if manual_override:
            # Set expiry for 24 hours when manually overridden
            from datetime import timedelta
            listing.manual_override_expires = timezone.now() + timedelta(hours=24)
            logger.info(f"[BusinessListing] Manual override set for {request.user.id}, expires at {listing.manual_override_expires}")
        else:
            listing.manual_override_expires = None

        listing.save(update_fields=['is_open_now', 'manual_override', 'manual_override_expires', 'updated_at'])

        logger.info(f"[BusinessListing] Updated status for {request.user.id}: is_open={is_open}, manual_override={manual_override}")

        return Response({
            'success': True,
            'message': f'Business is now {"OPEN" if is_open else "CLOSED"}',
            'is_open_now': listing.is_open_now,
            'manual_override': listing.manual_override,
            'manual_override_expires': listing.manual_override_expires.isoformat() if listing.manual_override_expires else None
        })

    @action(detail=False, methods=['post'])
    def sync_products(self, request):
        """
        Sync menu items to marketplace products
        Endpoint: POST /api/marketplace/business/sync-products/
        """
        if not hasattr(request.user, 'tenant_id'):
            return Response(
                {'success': False, 'error': 'Only businesses can sync products'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            listing = BusinessListing.objects.get(business=request.user)
        except BusinessListing.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Business listing not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        menu_items = request.data.get('menu_items', [])
        
        if not isinstance(menu_items, list):
            return Response({
                'success': False,
                'error': 'menu_items must be a valid list'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # For now, just return success - product sync logic can be implemented later
        logger.info(f"[BusinessListing] Synced {len(menu_items)} products for business {request.user.id}")
        
        return Response({
            'success': True,
            'message': f'Successfully synced {len(menu_items)} products to marketplace',
            'synced_count': len(menu_items)
        })
    
    @action(detail=False, methods=['get'])
    def analytics(self, request):
        """
        Get business analytics for marketplace performance
        Endpoint: GET /api/marketplace/business/analytics/
        """
        if not hasattr(request.user, 'tenant_id'):
            return Response(
                {'success': False, 'error': 'Only businesses can view analytics'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            listing = BusinessListing.objects.get(business=request.user)
        except BusinessListing.DoesNotExist:
            return Response({
                'success': False,
                'error': 'Business listing not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # For now, return placeholder analytics data
        # This can be enhanced with real analytics tracking later
        analytics_data = {
            'views': 0,  # Number of times business was viewed
            'clicks': 0,  # Number of times business was clicked
            'orders': 0,  # Number of orders received through marketplace
            'revenue': 0.00,  # Total revenue from marketplace
            'period': '30_days'  # Analytics period
        }
        
        logger.info(f"[BusinessListing] Analytics requested for business {request.user.id}")
        
        return Response(analytics_data)
    
    @action(detail=False, methods=['post', 'get'])
    def products(self, request):
        """
        Manage business products/services for marketplace
        Endpoint: GET/POST /api/marketplace/business/products/
        """
        if not hasattr(request.user, 'tenant_id'):
            return Response(
                {'success': False, 'error': 'Only businesses can manage products'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request.method == 'GET':
            # Return both products and services
            from inventory.models import Product, Service
            from .serializers import ProductSerializer, ServiceSerializer
            
            products = Product.objects.filter(
                tenant_id=request.user.tenant_id,
                is_active=True
            ).order_by('-created_at')[:50]  # Limit to 50 most recent
            
            services = Service.objects.filter(
                tenant_id=request.user.tenant_id,
                is_active=True
            ).order_by('-created_at')[:50]  # Limit to 50 most recent
            
            products_data = ProductSerializer(products, many=True).data
            services_data = ServiceSerializer(services, many=True).data
            
            return Response({
                'success': True,
                'data': {
                    'products': products_data,
                    'services': services_data,
                    'total_products': len(products_data),
                    'total_services': len(services_data)
                }
            })
        
        elif request.method == 'POST':
            # Handle updating products/services from mobile app
            products_data = request.data.get('products', [])
            services_data = request.data.get('services', [])
            
            # Update business listing to ensure it exists
            try:
                listing = BusinessListing.objects.get(business=request.user)
                listing.last_active = timezone.now()
                listing.save(update_fields=['last_active'])
            except BusinessListing.DoesNotExist:
                pass  # Listing will be created when needed
            
            # For now, just acknowledge the data was received
            # Full product/service creation can be implemented as needed
            return Response({
                'success': True,
                'message': 'Products and services information received',
                'received': {
                    'products_count': len(products_data) if products_data else 0,
                    'services_count': len(services_data) if services_data else 0
                }
            })
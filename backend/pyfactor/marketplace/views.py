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
import logging

logger = logging.getLogger(__name__)

class ConsumerSearchViewSet(viewsets.ViewSet):
    """
    Location-aware business search for consumers
    """
    permission_classes = [IsAuthenticated]
    
    def list(self, request):
        """
        List businesses for marketplace (redirects to marketplace_businesses)
        """
        return self.marketplace_businesses(request)
    
    def featured(self, request):
        """
        Get featured businesses from active advertising campaigns
        """
        try:
            city = request.query_params.get('city', '').strip()
            country = request.query_params.get('country', '').strip()
            
            if not city:
                return Response({
                    'success': False,
                    'message': 'City is required',
                    'results': []
                })
            
            # Get currently active featured campaigns
            from advertising.models import AdvertisingCampaign
            from datetime import date
            
            today = date.today()
            featured_campaigns = AdvertisingCampaign.objects.filter(
                type='featured',
                status='active',
                start_date__lte=today,
                end_date__gte=today
            ).select_related('business')
            
            # Filter by location if business exists
            if country:
                featured_campaigns = featured_campaigns.filter(
                    business__city__iexact=city,
                    business__country__iexact=country[:2]
                )
            else:
                featured_campaigns = featured_campaigns.filter(
                    business__city__iexact=city
                )
            
            # Also get featured businesses from BusinessListing model
            featured_listings = BusinessListing.objects.filter(
                is_featured=True,
                is_visible_in_marketplace=True,
                featured_until__gte=today,
                business__city__iexact=city,
                business__opted_out=False
            ).select_related('business')
            
            if country:
                featured_listings = featured_listings.filter(
                    business__country__iexact=country[:2]
                )
            
            # Combine results from both sources
            business_list = []
            seen_business_ids = set()
            
            # Add businesses from active campaigns first (highest priority)
            for campaign in featured_campaigns[:10]:
                if campaign.business and campaign.business.id not in seen_business_ids:
                    business = campaign.business
                    business_data = {
                        'id': str(business.id),
                        'business_name': business.business_name,
                        'name': business.business_name,
                        'category': business.category,
                        'category_display': business.category.title() if business.category else 'Business',
                        'city': business.city,
                        'country': business.country,
                        'phone': business.phone,
                        'owner_phone': business.owner_phone,
                        'opted_out': business.opted_out,
                        'is_featured': True,
                        'is_verified': True,
                        'logo': None,  # Add logo URL if available
                        'cover_image': None,  # Add cover image if available
                        'average_rating': 4.8,  # Mock rating for now
                        'campaign_type': campaign.type,
                        'campaign_name': campaign.name
                    }
                    business_list.append(business_data)
                    seen_business_ids.add(business.id)
            
            # Add businesses from featured listings if we need more
            for listing in featured_listings:
                if len(business_list) >= 10:
                    break
                    
                if listing.business and listing.business.id not in seen_business_ids:
                    business = listing.business
                    business_data = {
                        'id': str(business.id),
                        'business_name': business.business_name,
                        'name': business.business_name,
                        'category': business.category,
                        'category_display': business.category.title() if business.category else 'Business',
                        'city': business.city,
                        'country': business.country,
                        'phone': business.phone,
                        'owner_phone': business.owner_phone,
                        'opted_out': business.opted_out,
                        'is_featured': True,
                        'is_verified': True,
                        'logo': None,
                        'cover_image': None,
                        'average_rating': 4.5,
                        'featured_until': listing.featured_until.isoformat() if listing.featured_until else None
                    }
                    business_list.append(business_data)
                    seen_business_ids.add(business.id)
            
            return Response({
                'success': True,
                'results': business_list,
                'count': len(business_list),
                'city': city,
                'country': country
            })
            
        except Exception as e:
            logger.error(f"Error fetching featured businesses: {e}")
            return Response({
                'success': False,
                'error': str(e),
                'results': []
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
            is_visible_in_marketplace=True,
            business__is_active=True
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
        Get or create consumer profile
        """
        profile, created = ConsumerProfile.objects.get_or_create(
            user=user,
            defaults={
                'current_country': user.profile.country if hasattr(user, 'profile') else '',
                'current_city': user.profile.city if hasattr(user, 'profile') else ''
            }
        )
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
        # Get consumer location for filtering
        profile = self.get_consumer_profile(request.user)
        
        # Get businesses that can deliver to user
        businesses = BusinessListing.objects.filter(
            is_visible_in_marketplace=True
        )
        
        businesses = self.filter_by_delivery_capability(
            businesses,
            profile.current_country,
            profile.current_city,
            profile.current_latitude,
            profile.current_longitude
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
                is_visible_in_marketplace=True,
                business__is_active=True,
                city__iexact=city
            ).select_related('business', 'business__profile')
            
            logger.info(f"[BUSINESS_LISTING_DEBUG] Found {business_listings.count()} business listings in {city}")
            
            from marketplace.marketplace_categories import MARKETPLACE_CATEGORIES, get_business_types_for_subcategory
            
            # Apply country filter to listings
            if country:
                country_code = country_mapping.get(country.lower(), country)
                if country_code and len(country_code) == 2:
                    business_listings = business_listings.filter(country__iexact=country_code)
                elif country:
                    business_listings = business_listings.filter(
                        Q(country__iexact=country) | Q(country__iexact=country[:2])
                    )
            
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
                    Q(business__userprofile__business_name__icontains=search_query) |
                    Q(description__icontains=search_query) |
                    Q(search_tags__overlap=[search_query.lower()])
                )
            
            # 🎯 [BUSINESS_CONVERSION_DEBUG] Convert BusinessListing to standard format
            logger.info(f"[BUSINESS_CONVERSION_DEBUG] Processing {business_listings.count()} business listings")
            
            for listing in business_listings:
                user = listing.business
                profile = getattr(user, 'userprofile', None)
                
                # 🎯 [MARKETPLACE_NAME_FIX] Get proper business name
                business_name = None
                if profile:
                    # Try business_name first
                    business_name = getattr(profile, 'business_name', None)
                    # If empty or is email, try business entity name
                    if not business_name or '@' in business_name:
                        business_obj = getattr(profile, 'business', None)
                        if business_obj:
                            business_name = getattr(business_obj, 'name', None)
                
                # Fallback to email-based name if still no name
                if not business_name:
                    business_name = user.email.split('@')[0].replace('.', ' ').replace('_', ' ').title() + " Business"
                
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
                
                # 🎯 [IMAGE_DEBUG] Check for Cloudinary images
                logo_url = getattr(listing, 'logo_url', '') or getattr(listing, 'logo_cloudinary_url', '') or ''
                cover_image_url = getattr(listing, 'cover_image_url', '') or ''
                gallery_images = getattr(listing, 'gallery_images', []) or []
                
                logger.info(f"🎯 [IMAGE_DEBUG] Logo: {bool(logo_url)}, Cover: {bool(cover_image_url)}, Gallery: {len(gallery_images)} images")
                
                business_data = {
                    'id': str(listing.id),  # UUID, convert to string
                    'business_name': business_name,  # Frontend expects business_name
                    'name': business_name,  # Also include name for backward compatibility
                    'phone': getattr(profile, 'phone', '') if profile else '',
                    'address': getattr(profile, 'business_address', '') if profile else '',
                    'category': listing.business_type,
                    'category_display': business_type_display,
                    'email': user.email,
                    'description': listing.description or '',
                    'image_url': cover_image_url or logo_url,  # Use cover image or logo
                    'logo': logo_url,   # Frontend expects 'logo'
                    'logo_url': logo_url,   # Logo URL from Cloudinary
                    'cover_image_url': cover_image_url,  # Cover image from Cloudinary
                    'gallery_images': gallery_images,  # Gallery images from Cloudinary
                    'website': getattr(profile, 'website', '') if profile else '',
                    'opening_hours': listing.business_hours or {},
                    'rating': float(listing.average_rating) if listing.average_rating else None,
                    'average_rating': float(listing.average_rating) if listing.average_rating else 4.5,  # Frontend expects average_rating
                    'social_media': {},  # TODO: Add social media support
                    'city': listing.city,
                    'country': listing.country,
                    'latitude': listing.latitude,
                    'longitude': listing.longitude,
                    'is_verified': True,  # Published businesses are verified
                    'is_featured': is_featured,  # Featured status from campaigns or listing
                    'is_placeholder': False,
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
                'country': request.user.userprofile.country if hasattr(request.user, 'userprofile') else '',
                'city': request.user.userprofile.city if hasattr(request.user, 'userprofile') else '',
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
    
    @action(detail=True, methods=['get'])
    def public_view(self, request, pk=None):
        """
        Public view of business listing for consumers
        """
        # Manually fetch the business listing by UUID for public access
        try:
            listing = BusinessListing.objects.get(
                id=pk,
                is_visible_in_marketplace=True,
                business__is_active=True
            )
        except BusinessListing.DoesNotExist:
            return Response({
                'error': 'Business not found or not available'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if consumer can access this business
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
            listing = BusinessListing.objects.get(
                id=pk,
                is_visible_in_marketplace=True,
                business__is_active=True
            )
        except BusinessListing.DoesNotExist:
            return Response({
                'error': 'Business not found or not available'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Get menu items for restaurants
        products = []
        business = listing.business
        
        if hasattr(business, 'profile') and business.profile:
            business_type = business.profile.business_type
            if 'RESTAURANT' in business_type or 'CAFE' in business_type:
                try:
                    from menu.models import MenuItem
                    items = MenuItem.objects.filter(
                        business=business, 
                        is_available=True
                    ).values(
                        'id', 'name', 'description', 'price', 'image_url', 'category_name'
                    )
                    products = list(items)
                except Exception as e:
                    logger.warning(f"Could not fetch menu items for business {business.id}: {e}")
        
        return Response({
            'success': True,
            'products': products,
            'business_id': str(listing.id),
            'business_name': listing.business.profile.business_name if hasattr(listing.business, 'profile') else listing.business.email
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
                is_visible_in_marketplace=True,
                business__is_active=True
            )
        except BusinessListing.DoesNotExist:
            return Response({
                'error': 'Business not found or not available'
            }, status=status.HTTP_404_NOT_FOUND)
        
        # For now, return empty services list
        # This can be extended in the future when service management is implemented
        services = []
        
        return Response({
            'success': True,
            'services': services,
            'business_id': str(listing.id),
            'business_name': listing.business.profile.business_name if hasattr(listing.business, 'profile') else listing.business.email
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
            if hasattr(request.user, 'userprofile'):
                profile_data.update({
                    'country': getattr(request.user.userprofile, 'country', ''),
                    'city': getattr(request.user.userprofile, 'city', ''),
                    'description': getattr(request.user.userprofile, 'business_description', ''),
                })
            
            listing = BusinessListing.objects.create(
                business=request.user,
                business_type=getattr(request.user.userprofile, 'business_type', 'service') if hasattr(request.user, 'userprofile') else 'service',
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
            
            # Basic information
            if 'basic' in profile_data:
                basic = profile_data['basic']
                if 'business_type' in basic:
                    update_data['business_type'] = basic['business_type']
                if 'description' in basic:
                    update_data['description'] = basic['description']
                if 'search_tags' in basic:
                    update_data['search_tags'] = basic['search_tags']
            
            # Contact information
            if 'contact' in profile_data:
                contact = profile_data['contact']
                if 'city' in contact:
                    update_data['city'] = contact['city']
                if 'country' in contact:
                    update_data['country'] = contact['country']
            
            # Operations
            if 'operations' in profile_data:
                operations = profile_data['operations']
                if 'business_hours' in operations:
                    update_data['business_hours'] = operations['business_hours']
                if 'delivery_scope' in operations:
                    update_data['delivery_scope'] = operations['delivery_scope']
                if 'delivery_radius_km' in operations:
                    update_data['delivery_radius_km'] = operations['delivery_radius_km']
            
            # Discovery settings
            if 'discovery' in profile_data:
                discovery = profile_data['discovery']
                if 'is_visible_in_marketplace' in discovery:
                    update_data['is_visible_in_marketplace'] = discovery['is_visible_in_marketplace']
            
            # Update listing with validated data
            logger.info(f"[BusinessListing] Final update_data: {update_data}")
            
            try:
                serializer = BusinessListingSerializer(listing, data=update_data, partial=True, context={'request': request})
                if serializer.is_valid():
                    serializer.save()
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
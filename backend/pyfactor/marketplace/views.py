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
                'current_country': user.userprofile.country if hasattr(user, 'userprofile') else '',
                'current_city': user.userprofile.city if hasattr(user, 'userprofile') else ''
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
        Get placeholder businesses for marketplace display
        Industry-standard endpoint with proper filtering
        """
        try:
            # Get parameters
            city = request.query_params.get('city', '').strip()
            country = request.query_params.get('country', '').strip()
            category = request.query_params.get('category', '').strip()
            search_query = request.query_params.get('search', '').strip()
            page = int(request.query_params.get('page', 1))
            page_size = int(request.query_params.get('page_size', 20))
            
            logger.info(f"[Marketplace] Getting businesses for city: {city}, country: {country}")
            
            # Start with all active placeholder businesses
            businesses = PlaceholderBusiness.objects.filter(
                opted_out=False,  # Don't show businesses that opted out
            )
            
            # CRITICAL: Filter by city - users only see businesses in their city
            if city:
                businesses = businesses.filter(city__iexact=city)
                logger.info(f"[Marketplace] Filtered by city '{city}': {businesses.count()} businesses")
            else:
                # If no city provided, return empty (we require city-based filtering)
                return Response({
                    'success': False,
                    'message': 'City is required for marketplace filtering',
                    'results': [],
                    'count': 0
                })
            
            # Optional country filter (usually same as city's country)
            if country:
                businesses = businesses.filter(country__iexact=country)
                logger.info(f"[Marketplace] Filtered by country '{country}': {businesses.count()} businesses")
            
            # Category filter
            if category:
                businesses = businesses.filter(
                    Q(category__icontains=category)
                )
                logger.info(f"[Marketplace] Filtered by category '{category}': {businesses.count()} businesses")
            
            # Search filter - search in name, category, and description
            if search_query:
                businesses = businesses.filter(
                    Q(name__icontains=search_query) |
                    Q(category__icontains=search_query) |
                    Q(description__icontains=search_query)
                )
                logger.info(f"[Marketplace] Filtered by search '{search_query}': {businesses.count()} businesses")
            
            # Order by rating (if available) and name
            businesses = businesses.order_by('-rating', 'name')
            
            # Paginate results
            paginator = Paginator(businesses, page_size)
            page_obj = paginator.get_page(page)
            
            # Serialize the results
            results = []
            for business in page_obj:
                results.append({
                    'id': business.id,
                    'name': business.name,
                    'phone': business.phone,
                    'address': business.address,
                    'category': business.category,
                    'email': business.email or '',
                    'description': business.description or '',
                    'image_url': business.image_url or '',
                    'logo_url': business.logo_url or '',
                    'website': business.website or '',
                    'opening_hours': business.opening_hours or {},
                    'rating': float(business.rating) if business.rating else None,
                    'social_media': business.social_media or {},
                    'city': business.city,
                    'country': business.country,
                    'latitude': float(business.latitude) if business.latitude else None,
                    'longitude': float(business.longitude) if business.longitude else None,
                    'is_verified': business.converted_to_real_business,
                })
            
            logger.info(f"[Marketplace] Returning {len(results)} businesses for page {page}")
            
            return Response({
                'success': True,
                'results': results,
                'count': paginator.count,
                'page': page,
                'pages': paginator.num_pages,
                'page_size': page_size,
                'city': city,
                'country': country,
                'category': category
            })
            
        except Exception as e:
            logger.error(f"[Marketplace] Error fetching businesses: {str(e)}")
            return Response({
                'success': False,
                'message': 'Error fetching businesses',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=False, methods=['get'])
    def marketplace_categories(self, request):
        """
        Get unique categories from placeholder businesses in user's city
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
        if self.request.user.is_business:
            return BusinessListing.objects.filter(business=self.request.user)
        return BusinessListing.objects.none()
    
    @action(detail=False, methods=['get', 'post'])
    def my_listing(self, request):
        """
        Get or update current business's marketplace listing
        """
        if not request.user.is_business:
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
        listing = self.get_object()
        
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
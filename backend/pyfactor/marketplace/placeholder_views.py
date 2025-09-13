from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.core.paginator import Paginator
from business.models import PlaceholderBusiness
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_marketplace_businesses(request):
    """
    Get ALL businesses for marketplace display - both PlaceholderBusiness and published BusinessListing
    Filters by user's city and optional category/search
    """
    try:
        # Get parameters
        city = request.GET.get('city', '').strip()
        country = request.GET.get('country', '').strip()
        category = request.GET.get('category', '').strip()
        search_query = request.GET.get('search', '').strip()
        page = int(request.GET.get('page', 1))
        page_size = int(request.GET.get('page_size', 20))
        
        logger.info(f"[Marketplace] Fetching businesses for city: {city}, country: {country}")
        
        # CRITICAL: City is required for filtering
        if not city:
            return Response({
                'success': False,
                'message': 'City is required for marketplace filtering',
                'results': [],
                'count': 0
            })
        
        # Build combined results from both PlaceholderBusiness and BusinessListing
        all_results = []
        
        # 1. Get PlaceholderBusiness records (existing marketplace businesses)
        placeholder_businesses = PlaceholderBusiness.objects.filter(
            opted_out=False,
            city__iexact=city
        )
        
        # Apply country filter to placeholders
        if country:
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
            
            country_code = country_mapping.get(country.lower(), country)
            if len(country_code) == 2:
                placeholder_businesses = placeholder_businesses.filter(country__iexact=country_code)
            else:
                placeholder_businesses = placeholder_businesses.filter(
                    Q(country__iexact=country_code) | Q(country__iexact=country[:2])
                )
        
        # Apply category filter to placeholders
        if category:
            placeholder_businesses = placeholder_businesses.filter(category__icontains=category)
        
        # Apply search filter to placeholders
        if search_query:
            placeholder_businesses = placeholder_businesses.filter(
                Q(name__icontains=search_query) |
                Q(category__icontains=search_query) |
                Q(description__icontains=search_query)
            )
        
        # Convert PlaceholderBusiness to standard format
        for business in placeholder_businesses:
            all_results.append({
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
                'is_placeholder': True,
                'source': 'placeholder'
            })
        
        # 2. Get BusinessListing records (published real businesses)
        from marketplace.models import BusinessListing
        
        business_listings = BusinessListing.objects.filter(
            is_visible_in_marketplace=True,
            city__iexact=city
        ).select_related('business', 'business__profile')
        
        # Apply country filter to listings
        if country:
            country_code = country_mapping.get(country.lower(), country) if country else None
            if country_code and len(country_code) == 2:
                business_listings = business_listings.filter(country__iexact=country_code)
            elif country:
                business_listings = business_listings.filter(
                    Q(country__iexact=country) | Q(country__iexact=country[:2])
                )
        
        # Apply category filter to listings
        if category:
            business_listings = business_listings.filter(
                Q(business_type__icontains=category) |
                Q(secondary_categories__contains=[category])
            )
        
        # Apply search filter to listings
        if search_query:
            business_listings = business_listings.filter(
                Q(business__profile__business_name__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(search_tags__overlap=[search_query.lower()])
            )
        
        # Convert BusinessListing to standard format
        for listing in business_listings:
            user = listing.business
            profile = getattr(user, 'profile', None)  # Changed from 'userprofile' to 'profile'
            business_name = getattr(profile, 'business_name', user.email) if profile else user.email
            
            # Get the business type from profile if available, otherwise from listing
            business_type = getattr(profile, 'business_type', listing.business_type) if profile else listing.business_type
            
            # Get category display - for restaurants show 'food', for retail show 'shopping'
            category_display = 'food' if 'RESTAURANT' in business_type or 'CAFE' in business_type else listing.business_type
            
            # Get logo from profile
            logo_url = ''
            if profile and hasattr(profile, 'logo_data') and profile.logo_data:
                logo_url = profile.logo_data  # This is already a base64 data URL
            
            # Get menu items for restaurants
            menu_items = []
            products = []
            if 'RESTAURANT' in business_type or 'CAFE' in business_type:
                try:
                    from menu.models import MenuItem
                    items = MenuItem.objects.filter(business=user, is_available=True).values(
                        'id', 'name', 'description', 'price', 'image_url', 'category_name'
                    )[:10]  # Limit to 10 items for performance
                    menu_items = list(items)
                    products = menu_items  # Use same data for products field
                except Exception as e:
                    logger.warning(f"Could not fetch menu items for business {user.id}: {e}")
            
            all_results.append({
                'id': str(listing.id),  # UUID, convert to string
                'name': business_name,
                'business_name': business_name,
                'phone': getattr(profile, 'phone', '') if profile else '',
                'address': getattr(profile, 'business_address', '') if profile else '',
                'category': category_display,
                'category_display': category_display,
                'business_type': business_type,
                'email': user.email,
                'description': listing.description or '',
                'image_url': logo_url,  # Use logo for main image
                'logo_url': logo_url,
                'logo': logo_url,
                'website': getattr(profile, 'website', '') if profile else '',
                'opening_hours': listing.business_hours or {},
                'rating': float(listing.average_rating) if listing.average_rating else None,
                'social_media': {},
                'city': listing.city,
                'country': listing.country,
                'latitude': listing.latitude,
                'longitude': listing.longitude,
                'is_verified': True,  # Published businesses are verified
                'is_placeholder': False,
                'is_published': True,
                'source': 'published',
                'menu_items': menu_items,
                'products': products
            })
        
        logger.info(f"[Marketplace] Found {len(all_results)} total businesses ({len(placeholder_businesses)} placeholders, {len(business_listings)} published)")
        
        # Sort combined results by rating and name
        all_results.sort(key=lambda x: (
            -(x['rating'] or 0),  # Higher ratings first
            x['name']  # Then alphabetical
        ))
        
        # Manual pagination of combined results
        total_count = len(all_results)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        page_results = all_results[start_idx:end_idx]
        
        total_pages = (total_count + page_size - 1) // page_size
        
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
            'breakdown': {
                'placeholder_businesses': len(placeholder_businesses),
                'published_businesses': len(business_listings),
                'total': total_count
            }
        })
        
    except Exception as e:
        logger.error(f"Error fetching marketplace businesses: {str(e)}")
        return Response({
            'success': False,
            'message': 'Error fetching businesses',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_business_categories(request):
    """
    Get unique categories from placeholder businesses in user's city
    """
    try:
        city = request.GET.get('city', '').strip()
        
        if not city:
            return Response({
                'success': False,
                'message': 'City is required',
                'categories': []
            })
        
        # Get distinct categories for the city
        categories = PlaceholderBusiness.objects.filter(
            city__iexact=city,
            opted_out=False
        ).values_list('category', flat=True).distinct()
        
        # Filter out empty categories and clean them up
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
            
            if not matched:
                # Add as "Other" category if not matched
                if 'Other' not in seen_displays and len(final_categories) < 8:
                    final_categories.append({
                        'id': 'other',
                        'name': 'Other',
                        'original_name': cat['name'],
                        'icon': 'ellipsis-horizontal',
                        'color': '#6b7280',
                        'count': cat['count']
                    })
                    seen_displays.add('Other')
        
        return Response({
            'success': True,
            'categories': final_categories,
            'city': city,
            'total_businesses': sum(cat['count'] for cat in category_list)
        })
        
    except Exception as e:
        logger.error(f"Error fetching categories: {str(e)}")
        return Response({
            'success': False,
            'message': 'Error fetching categories',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_featured_businesses(request):
    """
    Get featured/top-rated businesses for user's city
    """
    try:
        city = request.GET.get('city', '').strip()
        
        if not city:
            return Response({
                'success': False,
                'message': 'City is required',
                'businesses': []
            })
        
        # Get featured businesses in the city
        # First try to get businesses with ratings
        businesses = PlaceholderBusiness.objects.filter(
            city__iexact=city,
            opted_out=False,
        ).order_by('-rating', 'name')[:6]  # Top 6 businesses
        
        # If we have less than 3 businesses, just get any businesses from the city
        if businesses.count() < 3:
            businesses = PlaceholderBusiness.objects.filter(
                city__iexact=city,
                opted_out=False,
            ).order_by('?')[:6]  # Random selection for variety
        
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
        
        return Response({
            'success': True,
            'businesses': results,
            'city': city
        })
        
    except Exception as e:
        logger.error(f"Error fetching featured businesses: {str(e)}")
        return Response({
            'success': False,
            'message': 'Error fetching featured businesses',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
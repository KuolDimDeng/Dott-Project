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
    Get placeholder businesses for marketplace display
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
        
        # Start with all placeholder businesses
        businesses = PlaceholderBusiness.objects.filter(
            opted_out=False,  # Don't show businesses that opted out
        )
        
        # IMPORTANT: Filter by city - users only see businesses in their city
        if city:
            businesses = businesses.filter(city__iexact=city)
        else:
            # If no city provided, return empty (we require city-based filtering)
            return Response({
                'success': False,
                'message': 'City is required for marketplace filtering',
                'results': [],
                'count': 0
            })
        
        # Optional country filter (handle both full names and ISO codes)
        if country:
            # Map common country names to ISO codes
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
            
            # Check if it's a full country name and map to ISO code
            country_code = country_mapping.get(country.lower(), country)
            
            # If it's already an ISO code (2 chars), use it directly
            if len(country_code) == 2:
                businesses = businesses.filter(country__iexact=country_code)
            else:
                # Try to match against the provided country string
                businesses = businesses.filter(
                    Q(country__iexact=country_code) | Q(country__iexact=country[:2])
                )
        
        # Category filter
        if category:
            businesses = businesses.filter(
                Q(category__icontains=category)
            )
        
        # Search filter - search in name, category, and description
        if search_query:
            businesses = businesses.filter(
                Q(name__icontains=search_query) |
                Q(category__icontains=search_query) |
                Q(description__icontains=search_query)
            )
        
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
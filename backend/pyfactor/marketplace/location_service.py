"""
Location service with intelligent fallback for areas with limited businesses
"""
import logging
from typing import List, Dict, Any, Optional, Tuple
from django.db.models import Q, F, QuerySet
from django.db import models
from math import radians, sin, cos, sqrt, atan2
from decimal import Decimal

logger = logging.getLogger(__name__)


class LocationService:
    """
    Service for handling location-based searches with progressive fallback
    """

    # Major cities in South Sudan for testing
    MAJOR_CITIES = {
        'SS': ['Juba', 'Wau', 'Malakal', 'Yei', 'Aweil', 'Yambio', 'Bor', 'Torit', 'Rumbek', 'Bentiu'],
        'KE': ['Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Eldoret'],
        'UG': ['Kampala', 'Gulu', 'Lira', 'Mbarara', 'Jinja'],
        'US': ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'],
    }

    # Approximate distances for expansion (in km)
    EXPANSION_LEVELS = {
        'neighborhood': 5,
        'city': 20,
        'nearby_cities': 50,
        'region': 100,
        'national': 500,
        'international': 10000,
    }

    @classmethod
    def haversine_distance(cls, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculate distance between two points on Earth (in km)
        """
        R = 6371  # Earth's radius in kilometers

        lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

        dlat = lat2 - lat1
        dlon = lon2 - lon1

        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))

        return R * c

    @classmethod
    def get_businesses_with_fallback(
        cls,
        city: str,
        country: str,
        category: Optional[str] = None,
        min_results: int = 10,
        max_results: int = 50
    ) -> Tuple[QuerySet, Dict[str, Any]]:
        """
        Get businesses with progressive location fallback
        Returns: (queryset, metadata)
        """
        from marketplace.models import BusinessListing

        results = []
        metadata = {
            'search_level': 'exact_city',
            'original_city': city,
            'original_country': country,
            'expanded_search': False,
            'included_cities': [],
            'included_delivery_scopes': [],
            'fallback_reason': None
        }

        base_query = BusinessListing.objects.filter(
            is_visible_in_marketplace=True
        )

        if category:
            base_query = base_query.filter(
                Q(business_type=category) |
                Q(secondary_categories__contains=[category])
            )

        # Level 1: Exact city match
        exact_city = base_query.filter(
            city__iexact=city,
            country__iexact=country[:2] if country else ''
        )

        if exact_city.count() >= min_results:
            metadata['included_cities'] = [city]
            return exact_city[:max_results], metadata

        # Start collecting results
        results = list(exact_city)
        metadata['included_cities'].append(city)

        # Level 2: Same city, any delivery scope (including digital/national)
        if len(results) < min_results:
            expanded_delivery = base_query.filter(
                Q(city__iexact=city) |
                Q(delivery_scope__in=['national', 'international', 'digital'])
            ).exclude(id__in=[r.id for r in results])

            for business in expanded_delivery[:min_results - len(results)]:
                results.append(business)
                if business.delivery_scope not in metadata['included_delivery_scopes']:
                    metadata['included_delivery_scopes'].append(business.delivery_scope)

            if len(results) >= min_results:
                metadata['search_level'] = 'expanded_delivery'
                metadata['expanded_search'] = True
                metadata['fallback_reason'] = 'Included businesses with wider delivery options'
                return cls._convert_to_queryset(results[:max_results]), metadata

        # Level 3: Nearby cities in same country
        if len(results) < min_results and country:
            nearby_cities = cls._get_nearby_cities(city, country)

            for nearby_city in nearby_cities:
                if len(results) >= min_results:
                    break

                nearby_businesses = base_query.filter(
                    city__iexact=nearby_city,
                    country__iexact=country[:2]
                ).exclude(id__in=[r.id for r in results])

                for business in nearby_businesses[:min_results - len(results)]:
                    results.append(business)
                    if nearby_city not in metadata['included_cities']:
                        metadata['included_cities'].append(nearby_city)

            if len(results) >= min_results:
                metadata['search_level'] = 'nearby_cities'
                metadata['expanded_search'] = True
                metadata['fallback_reason'] = f'Expanded to nearby cities: {", ".join(metadata["included_cities"][1:])}'
                return cls._convert_to_queryset(results[:max_results]), metadata

        # Level 4: Major cities in same country
        if len(results) < min_results and country:
            major_cities = cls.MAJOR_CITIES.get(country[:2].upper(), [])

            for major_city in major_cities:
                if len(results) >= min_results:
                    break
                if major_city.lower() == city.lower():
                    continue

                major_city_businesses = base_query.filter(
                    city__iexact=major_city,
                    country__iexact=country[:2]
                ).exclude(id__in=[r.id for r in results])

                for business in major_city_businesses[:min_results - len(results)]:
                    results.append(business)
                    if major_city not in metadata['included_cities']:
                        metadata['included_cities'].append(major_city)

            if len(results) >= min_results:
                metadata['search_level'] = 'major_cities'
                metadata['expanded_search'] = True
                metadata['fallback_reason'] = f'Expanded to major cities in {country}'
                return cls._convert_to_queryset(results[:max_results]), metadata

        # Level 5: Digital-only services (location independent)
        if len(results) < min_results:
            digital_services = base_query.filter(
                Q(is_digital_only=True) |
                Q(delivery_scope='digital')
            ).exclude(id__in=[r.id for r in results])

            for business in digital_services[:min_results - len(results)]:
                results.append(business)
                metadata['included_delivery_scopes'].append('digital')

            if len(results) >= min_results:
                metadata['search_level'] = 'digital_services'
                metadata['expanded_search'] = True
                metadata['fallback_reason'] = 'Included digital/online services available everywhere'
                return cls._convert_to_queryset(results[:max_results]), metadata

        # Level 6: International businesses that ship globally
        if len(results) < min_results:
            international_businesses = base_query.filter(
                Q(delivery_scope='international') |
                Q(ships_to_countries__contains=[country[:2].upper()])
            ).exclude(id__in=[r.id for r in results])

            for business in international_businesses[:min_results - len(results)]:
                results.append(business)
                if 'international' not in metadata['included_delivery_scopes']:
                    metadata['included_delivery_scopes'].append('international')

            metadata['search_level'] = 'international'
            metadata['expanded_search'] = True
            metadata['fallback_reason'] = 'Included international businesses that deliver to your location'

        # Return whatever we found
        if not results:
            metadata['fallback_reason'] = 'No businesses found even with expanded search'
        elif len(results) < min_results:
            metadata['fallback_reason'] = f'Only {len(results)} businesses found (less than minimum {min_results})'

        return cls._convert_to_queryset(results[:max_results]), metadata

    @classmethod
    def _get_nearby_cities(cls, city: str, country: str) -> List[str]:
        """
        Get list of nearby cities based on country
        """
        # For now, return predefined nearby cities
        # In production, this would use actual geographic data
        nearby_map = {
            'juba': ['Yei', 'Torit', 'Bor'],
            'nairobi': ['Kiambu', 'Thika', 'Machakos'],
            'kampala': ['Entebbe', 'Mukono', 'Wakiso'],
        }

        city_lower = city.lower()
        return nearby_map.get(city_lower, [])

    @classmethod
    def _convert_to_queryset(cls, results: List) -> QuerySet:
        """
        Convert list of model instances back to QuerySet-like object
        """
        from marketplace.models import BusinessListing

        if not results:
            return BusinessListing.objects.none()

        # Get IDs and preserve order
        ids = [r.id for r in results]

        # Create a queryset with the IDs
        queryset = BusinessListing.objects.filter(id__in=ids)

        # Preserve the original order
        id_order = {id: index for index, id in enumerate(ids)}
        sorted_results = sorted(queryset, key=lambda x: id_order.get(x.id, 999))

        # Return as a list that can be used like a queryset
        return sorted_results

    @classmethod
    def add_distance_info(cls, businesses: List[Dict], user_lat: Optional[float], user_lon: Optional[float]) -> List[Dict]:
        """
        Add distance information to business listings
        """
        if not user_lat or not user_lon:
            return businesses

        for business in businesses:
            if business.get('latitude') and business.get('longitude'):
                distance = cls.haversine_distance(
                    user_lat, user_lon,
                    business['latitude'], business['longitude']
                )

                business['distance_km'] = round(distance, 1)
                business['distance_display'] = cls._format_distance(distance)
            else:
                business['distance_km'] = None
                business['distance_display'] = 'Distance unknown'

        return businesses

    @classmethod
    def _format_distance(cls, distance_km: float) -> str:
        """
        Format distance for display
        """
        if distance_km < 1:
            return f"{int(distance_km * 1000)}m away"
        elif distance_km < 10:
            return f"{distance_km:.1f}km away"
        elif distance_km < 100:
            return f"{int(distance_km)}km away"
        else:
            return f"{int(distance_km)}km away (delivery available)"

    @classmethod
    def get_delivery_context(cls, business: Dict, user_city: str, user_country: str) -> Dict:
        """
        Add delivery context based on location
        """
        context = {
            'can_deliver': False,
            'delivery_message': '',
            'delivery_time_estimate': '',
            'delivery_fee_estimate': ''
        }

        business_city = business.get('city', '').lower()
        business_country = business.get('country', '').upper()
        delivery_scope = business.get('delivery_scope', 'local')

        # Same city - local delivery
        if business_city == user_city.lower():
            context['can_deliver'] = True
            context['delivery_message'] = 'Local delivery available'
            context['delivery_time_estimate'] = '30-60 minutes'
            context['delivery_fee_estimate'] = '$2-5'

        # Different city but national delivery
        elif delivery_scope == 'national' and business_country == user_country[:2].upper():
            context['can_deliver'] = True
            context['delivery_message'] = 'Nationwide delivery available'
            context['delivery_time_estimate'] = '1-3 business days'
            context['delivery_fee_estimate'] = '$10-25'

        # International delivery
        elif delivery_scope == 'international':
            context['can_deliver'] = True
            context['delivery_message'] = 'International shipping available'
            context['delivery_time_estimate'] = '5-10 business days'
            context['delivery_fee_estimate'] = 'Calculated at checkout'

        # Digital service
        elif delivery_scope == 'digital' or business.get('is_digital_only'):
            context['can_deliver'] = True
            context['delivery_message'] = 'Digital service - instant delivery'
            context['delivery_time_estimate'] = 'Immediate'
            context['delivery_fee_estimate'] = 'No delivery fee'

        else:
            context['delivery_message'] = 'Delivery may not be available to your location'

        return context
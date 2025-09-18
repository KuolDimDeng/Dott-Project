"""
Rating service for calculating real business and item ratings
"""
import logging
from decimal import Decimal
from typing import Optional, Dict, Tuple
from django.db.models import Avg, Count, Q
from django.utils import timezone
from datetime import timedelta

logger = logging.getLogger(__name__)


class RatingService:
    """
    Service for handling ratings and reviews
    """

    @classmethod
    def get_business_rating(cls, business_listing) -> Dict:
        """
        Get real business rating or appropriate default
        """
        rating_data = {
            'average_rating': None,
            'total_reviews': 0,
            'rating_display': 'New',
            'rating_badge': None,
            'has_ratings': False
        }

        try:
            # Check if business has reviews
            if hasattr(business_listing, 'reviews'):
                reviews = business_listing.reviews.filter(is_approved=True)

                if reviews.exists():
                    avg_rating = reviews.aggregate(
                        avg=Avg('rating'),
                        count=Count('id')
                    )

                    if avg_rating['avg']:
                        rating_data['average_rating'] = round(float(avg_rating['avg']), 1)
                        rating_data['total_reviews'] = avg_rating['count']
                        rating_data['has_ratings'] = True
                        rating_data['rating_display'] = f"{rating_data['average_rating']} ★"

                        # Add badge based on rating
                        if rating_data['average_rating'] >= 4.5:
                            rating_data['rating_badge'] = 'Excellent'
                        elif rating_data['average_rating'] >= 4.0:
                            rating_data['rating_badge'] = 'Very Good'
                        elif rating_data['average_rating'] >= 3.5:
                            rating_data['rating_badge'] = 'Good'

            # If no reviews, check if business is new
            if not rating_data['has_ratings']:
                if business_listing.created_at:
                    days_old = (timezone.now() - business_listing.created_at).days

                    if days_old <= 30:
                        rating_data['rating_badge'] = 'New Business'
                        rating_data['rating_display'] = 'New'
                    elif days_old <= 90:
                        rating_data['rating_badge'] = 'Recently Added'
                        rating_data['rating_display'] = 'Recent'
                    else:
                        rating_data['rating_display'] = 'Not Rated'

            # Use stored rating if available and no reviews exist
            if not rating_data['has_ratings'] and hasattr(business_listing, 'average_rating'):
                if business_listing.average_rating and business_listing.average_rating > 0:
                    rating_data['average_rating'] = float(business_listing.average_rating)
                    rating_data['total_reviews'] = business_listing.total_reviews or 0
                    rating_data['has_ratings'] = True
                    rating_data['rating_display'] = f"{rating_data['average_rating']} ★"

        except Exception as e:
            logger.error(f"Error calculating business rating: {e}")

        return rating_data

    @classmethod
    def get_product_rating(cls, product) -> Dict:
        """
        Get product rating based on orders and views
        """
        rating_data = {
            'popularity_score': 0,
            'engagement_rate': 0,
            'is_trending': False,
            'is_bestseller': False
        }

        try:
            # Calculate popularity score
            views = getattr(product, 'view_count', 0) or 0
            orders = getattr(product, 'order_count', 0) or 0

            if views > 0:
                # Engagement rate = orders/views
                rating_data['engagement_rate'] = round((orders / views) * 100, 1)

                # Popularity score (normalized to 0-100)
                view_score = min(views / 1000, 1) * 50  # Max 50 points from views
                order_score = min(orders / 100, 1) * 50  # Max 50 points from orders
                rating_data['popularity_score'] = int(view_score + order_score)

            # Check if trending (recent spike in orders)
            if hasattr(product, 'order_history'):
                recent_orders = product.order_history.filter(
                    created_at__gte=timezone.now() - timedelta(days=7)
                ).count()

                if recent_orders > 10:
                    rating_data['is_trending'] = True

            # Check if bestseller
            if orders > 50:
                rating_data['is_bestseller'] = True

        except Exception as e:
            logger.error(f"Error calculating product rating: {e}")

        return rating_data

    @classmethod
    def get_menu_item_rating(cls, menu_item) -> Dict:
        """
        Get menu item rating based on orders
        """
        rating_data = {
            'popularity_score': 0,
            'order_frequency': 'Low',
            'is_popular': False,
            'is_chef_special': False
        }

        try:
            orders = getattr(menu_item, 'order_count', 0) or 0
            views = getattr(menu_item, 'view_count', 0) or 0

            # Calculate popularity
            if orders > 0:
                if orders >= 100:
                    rating_data['order_frequency'] = 'Very High'
                    rating_data['is_popular'] = True
                elif orders >= 50:
                    rating_data['order_frequency'] = 'High'
                    rating_data['is_popular'] = True
                elif orders >= 20:
                    rating_data['order_frequency'] = 'Medium'
                else:
                    rating_data['order_frequency'] = 'Low'

                # Popularity score
                rating_data['popularity_score'] = min(orders, 100)

            # Check special flags
            if hasattr(menu_item, 'is_chef_special'):
                rating_data['is_chef_special'] = menu_item.is_chef_special

        except Exception as e:
            logger.error(f"Error calculating menu item rating: {e}")

        return rating_data

    @classmethod
    def calculate_trust_score(cls, business_listing) -> int:
        """
        Calculate trust score for a business (0-100)
        """
        score = 0

        try:
            # Verified status (20 points)
            if business_listing.is_verified:
                score += 20

            # Has real ratings (15 points)
            rating_data = cls.get_business_rating(business_listing)
            if rating_data['has_ratings']:
                score += 15

                # High rating bonus (up to 15 points)
                if rating_data['average_rating']:
                    score += int((rating_data['average_rating'] / 5.0) * 15)

            # Business age (10 points)
            if business_listing.created_at:
                days_old = (timezone.now() - business_listing.created_at).days
                if days_old > 180:
                    score += 10
                elif days_old > 90:
                    score += 7
                elif days_old > 30:
                    score += 5

            # Has images (10 points)
            if business_listing.logo_url or business_listing.cover_image_url:
                score += 10

            # Complete profile (10 points)
            if all([
                business_listing.description,
                business_listing.phone,
                business_listing.address
            ]):
                score += 10

            # Active business (10 points based on orders)
            if business_listing.total_orders > 10:
                score += 10
            elif business_listing.total_orders > 5:
                score += 5

            # Response time (10 points)
            if business_listing.average_response_time and business_listing.average_response_time < 60:
                score += 10
            elif business_listing.average_response_time and business_listing.average_response_time < 120:
                score += 5

        except Exception as e:
            logger.error(f"Error calculating trust score: {e}")

        return min(score, 100)  # Cap at 100

    @classmethod
    def get_rating_summary(cls, business_listing) -> Dict:
        """
        Get complete rating summary for a business
        """
        rating_data = cls.get_business_rating(business_listing)
        trust_score = cls.calculate_trust_score(business_listing)

        return {
            **rating_data,
            'trust_score': trust_score,
            'trust_badge': cls._get_trust_badge(trust_score),
            'is_trusted': trust_score >= 70,
            'is_verified': business_listing.is_verified,
            'response_time': cls._format_response_time(business_listing.average_response_time)
        }

    @classmethod
    def _get_trust_badge(cls, score: int) -> Optional[str]:
        """
        Get trust badge based on score
        """
        if score >= 90:
            return 'Top Rated'
        elif score >= 80:
            return 'Highly Trusted'
        elif score >= 70:
            return 'Trusted'
        elif score >= 60:
            return 'Reliable'
        return None

    @classmethod
    def _format_response_time(cls, minutes: Optional[int]) -> str:
        """
        Format response time for display
        """
        if not minutes:
            return 'Unknown'

        if minutes < 15:
            return '< 15 min'
        elif minutes < 30:
            return '< 30 min'
        elif minutes < 60:
            return '< 1 hour'
        elif minutes < 120:
            return '< 2 hours'
        elif minutes < 240:
            return '< 4 hours'
        elif minutes < 1440:
            return 'Same day'
        else:
            return '1-2 days'
"""
Management command to calculate featuring scores for products and menu items
Run this periodically (e.g., daily) to update scoring for automatic featuring
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db.models import Avg, Count, Q, F
from datetime import timedelta
from decimal import Decimal
from marketplace.models import BusinessListing
from marketplace.analytics_models import FeaturingScore, ProductView
from inventory.models import Product
from menu.models import MenuItem
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Calculate featuring scores for products and menu items based on analytics'

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=7,
            help='Number of days to look back for metrics (default: 7)'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Run without saving changes to database'
        )

    def handle(self, *args, **options):
        days_back = options['days']
        dry_run = options['dry_run']

        self.stdout.write(f"Calculating featuring scores for the last {days_back} days...")
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN - No changes will be saved"))

        # Calculate cutoff date
        cutoff_date = timezone.now() - timedelta(days=days_back)

        # Process products
        self.stdout.write("Processing products...")
        products_processed = self.process_products(cutoff_date, dry_run)

        # Process menu items
        self.stdout.write("Processing menu items...")
        menu_items_processed = self.process_menu_items(cutoff_date, dry_run)

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully processed {products_processed} products and {menu_items_processed} menu items"
            )
        )

    def process_products(self, cutoff_date, dry_run):
        """Calculate scores for all active products"""
        products_processed = 0

        # Get all active products with their business listings
        products = Product.objects.filter(
            is_active=True,
            quantity__gt=0
        ).select_related('tenant')

        for product in products:
            try:
                # Get business listing
                business_listing = BusinessListing.objects.filter(
                    business_id=product.tenant_id
                ).first()

                if not business_listing or not business_listing.is_visible_in_marketplace:
                    continue

                # Calculate metrics
                metrics = self.calculate_item_metrics(
                    item=product,
                    item_type='product',
                    cutoff_date=cutoff_date
                )

                # Calculate scores
                scores = self.calculate_scores(
                    item=product,
                    metrics=metrics,
                    business_listing=business_listing
                )

                # Update or create featuring score
                if not dry_run:
                    featuring_score, created = FeaturingScore.objects.update_or_create(
                        product=product,
                        defaults={
                            'business': business_listing,
                            'popularity_score': scores['popularity'],
                            'recency_score': scores['recency'],
                            'engagement_score': scores['engagement'],
                            'business_quality_score': scores['business_quality'],
                            'inventory_score': scores['inventory'],
                            'overall_score': scores['overall'],
                            'total_views_7d': metrics['views'],
                            'total_orders_7d': metrics['orders'],
                            'total_revenue_7d': metrics['revenue'],
                            'avg_rating': metrics['avg_rating'],
                        }
                    )

                    # Update product's featured_score field
                    product.featured_score = scores['overall']
                    product.save(update_fields=['featured_score'])

                products_processed += 1

            except Exception as e:
                logger.error(f"Error processing product {product.id}: {e}")
                continue

        return products_processed

    def process_menu_items(self, cutoff_date, dry_run):
        """Calculate scores for all available menu items"""
        items_processed = 0

        # Get all available menu items with their business listings
        menu_items = MenuItem.objects.filter(
            is_available=True
        ).select_related('tenant', 'category')

        for item in menu_items:
            try:
                # Get business listing
                business_listing = BusinessListing.objects.filter(
                    business_id=item.tenant_id
                ).first()

                if not business_listing or not business_listing.is_visible_in_marketplace:
                    continue

                # Calculate metrics
                metrics = self.calculate_item_metrics(
                    item=item,
                    item_type='menu_item',
                    cutoff_date=cutoff_date
                )

                # Calculate scores
                scores = self.calculate_scores(
                    item=item,
                    metrics=metrics,
                    business_listing=business_listing
                )

                # Update or create featuring score
                if not dry_run:
                    featuring_score, created = FeaturingScore.objects.update_or_create(
                        menu_item=item,
                        defaults={
                            'business': business_listing,
                            'popularity_score': scores['popularity'],
                            'recency_score': scores['recency'],
                            'engagement_score': scores['engagement'],
                            'business_quality_score': scores['business_quality'],
                            'inventory_score': scores['inventory'],
                            'overall_score': scores['overall'],
                            'total_views_7d': metrics['views'],
                            'total_orders_7d': metrics['orders'],
                            'total_revenue_7d': metrics['revenue'],
                            'avg_rating': metrics['avg_rating'],
                        }
                    )

                    # Update menu item's featured_score field
                    item.featured_score = scores['overall']
                    item.save(update_fields=['featured_score'])

                items_processed += 1

            except Exception as e:
                logger.error(f"Error processing menu item {item.id}: {e}")
                continue

        return items_processed

    def calculate_item_metrics(self, item, item_type, cutoff_date):
        """Calculate metrics for an item from analytics data"""
        metrics = {
            'views': 0,
            'orders': 0,
            'revenue': Decimal('0'),
            'avg_rating': Decimal('0'),
            'click_through_rate': Decimal('0'),
            'conversion_rate': Decimal('0'),
        }

        # Get view count from analytics
        try:
            if item_type == 'product':
                view_count = ProductView.objects.filter(
                    product=item,
                    viewed_at__gte=cutoff_date
                ).count()
            else:
                view_count = ProductView.objects.filter(
                    menu_item=item,
                    viewed_at__gte=cutoff_date
                ).count()

            metrics['views'] = view_count
        except:
            # Use the item's own view_count field as fallback
            metrics['views'] = getattr(item, 'view_count', 0)

        # Get order count and revenue
        metrics['orders'] = getattr(item, 'order_count', 0)

        # Calculate revenue (orders * price)
        price = getattr(item, 'price', 0) or 0
        if hasattr(item, 'effective_price'):  # Menu items
            price = item.effective_price or 0
        metrics['revenue'] = Decimal(str(metrics['orders'])) * Decimal(str(price))

        # Get rating
        if hasattr(item, 'rating'):
            metrics['avg_rating'] = item.rating or Decimal('0')

        # Calculate CTR and conversion rate
        if metrics['views'] > 0:
            metrics['click_through_rate'] = (Decimal(metrics['orders']) / Decimal(metrics['views'])) * 100
            metrics['conversion_rate'] = metrics['click_through_rate']  # Simplified for now

        return metrics

    def calculate_scores(self, item, metrics, business_listing):
        """Calculate individual and overall scores for an item"""
        scores = {
            'popularity': Decimal('0'),
            'recency': Decimal('0'),
            'engagement': Decimal('0'),
            'business_quality': Decimal('0'),
            'inventory': Decimal('0'),
            'overall': Decimal('0'),
        }

        # Popularity score (based on views and orders)
        # Normalize to 0-100 scale
        if metrics['views'] > 0:
            view_score = min(metrics['views'] / 100, 1) * 50  # Max 50 points from views
            order_score = min(metrics['orders'] / 20, 1) * 50  # Max 50 points from orders
            scores['popularity'] = Decimal(str(view_score + order_score))

        # Recency score (newer items get higher scores)
        created_at = getattr(item, 'created_at', None)
        if created_at:
            days_old = (timezone.now() - created_at).days
            if days_old <= 7:
                scores['recency'] = Decimal('100')
            elif days_old <= 30:
                scores['recency'] = Decimal('75')
            elif days_old <= 90:
                scores['recency'] = Decimal('50')
            else:
                scores['recency'] = Decimal('25')

        # Engagement score (based on CTR and conversion)
        if metrics['click_through_rate'] > 0:
            scores['engagement'] = min(metrics['click_through_rate'] * 10, Decimal('100'))

        # Business quality score
        business_rating = business_listing.average_rating or Decimal('0')
        scores['business_quality'] = business_rating * 20  # Convert 5-star to 100 scale

        # Inventory score (prefer items with good stock)
        if hasattr(item, 'quantity'):
            if item.quantity > 50:
                scores['inventory'] = Decimal('100')
            elif item.quantity > 20:
                scores['inventory'] = Decimal('75')
            elif item.quantity > 5:
                scores['inventory'] = Decimal('50')
            else:
                scores['inventory'] = Decimal('25')
        elif hasattr(item, 'unlimited_stock'):
            scores['inventory'] = Decimal('100') if item.unlimited_stock else Decimal('50')
        else:
            scores['inventory'] = Decimal('75')  # Default for menu items

        # Calculate weighted overall score
        weights = {
            'popularity': Decimal('0.3'),
            'recency': Decimal('0.1'),
            'engagement': Decimal('0.25'),
            'business_quality': Decimal('0.2'),
            'inventory': Decimal('0.15'),
        }

        scores['overall'] = sum(
            scores[key] * weights[key] for key in weights
        )

        # Apply bonus for manually featured items
        if getattr(item, 'is_featured', False):
            scores['overall'] = min(scores['overall'] + Decimal('20'), Decimal('100'))

        return scores
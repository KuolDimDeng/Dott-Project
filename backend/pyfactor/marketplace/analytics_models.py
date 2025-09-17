"""
Analytics tracking models for marketplace featuring system
"""
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()


class ProductView(models.Model):
    """Track individual product views in marketplace"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # What was viewed
    product = models.ForeignKey('inventory.Product', on_delete=models.CASCADE, related_name='view_analytics', null=True, blank=True)
    menu_item = models.ForeignKey('menu.MenuItem', on_delete=models.CASCADE, related_name='view_analytics', null=True, blank=True)
    business = models.ForeignKey('marketplace.BusinessListing', on_delete=models.CASCADE, related_name='view_analytics')

    # Who viewed it
    viewer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    viewer_ip = models.GenericIPAddressField(null=True, blank=True)
    viewer_location_city = models.CharField(max_length=100, blank=True)
    viewer_location_country = models.CharField(max_length=2, blank=True)

    # View context
    view_source = models.CharField(max_length=50, choices=[
        ('search', 'Search Results'),
        ('featured', 'Featured Section'),
        ('category', 'Category Browse'),
        ('business_page', 'Business Page'),
        ('direct', 'Direct Link'),
        ('recommendation', 'Recommendation'),
    ], default='search')

    # Search context (if from search)
    search_query = models.CharField(max_length=200, blank=True)
    search_position = models.IntegerField(null=True, blank=True, help_text="Position in search results")

    # Engagement metrics
    view_duration_seconds = models.IntegerField(default=0)
    clicked_through = models.BooleanField(default=False)
    added_to_cart = models.BooleanField(default=False)

    # Timestamp
    viewed_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'marketplace_product_views'
        indexes = [
            models.Index(fields=['-viewed_at']),
            models.Index(fields=['product', '-viewed_at']),
            models.Index(fields=['menu_item', '-viewed_at']),
            models.Index(fields=['business', '-viewed_at']),
            models.Index(fields=['viewer', '-viewed_at']),
        ]

    def __str__(self):
        item = self.product or self.menu_item
        return f"View: {item} at {self.viewed_at}"


class ProductClick(models.Model):
    """Track clicks on products for engagement metrics"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # What was clicked
    product = models.ForeignKey('inventory.Product', on_delete=models.CASCADE, related_name='click_analytics', null=True, blank=True)
    menu_item = models.ForeignKey('menu.MenuItem', on_delete=models.CASCADE, related_name='click_analytics', null=True, blank=True)
    business = models.ForeignKey('marketplace.BusinessListing', on_delete=models.CASCADE, related_name='click_analytics')

    # Who clicked
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    # Click context
    click_source = models.CharField(max_length=50, choices=[
        ('featured_carousel', 'Featured Carousel'),
        ('search_result', 'Search Result'),
        ('category_grid', 'Category Grid'),
        ('business_menu', 'Business Menu'),
        ('recommendation', 'Recommendation'),
    ])

    # Result of click
    resulted_in_view = models.BooleanField(default=True)
    resulted_in_cart_add = models.BooleanField(default=False)
    resulted_in_order = models.BooleanField(default=False)

    # Timestamp
    clicked_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = 'marketplace_product_clicks'
        indexes = [
            models.Index(fields=['-clicked_at']),
            models.Index(fields=['product', '-clicked_at']),
            models.Index(fields=['menu_item', '-clicked_at']),
        ]


class FeaturingPerformance(models.Model):
    """Track performance of featured items"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # What was featured
    product = models.ForeignKey('inventory.Product', on_delete=models.CASCADE, null=True, blank=True)
    menu_item = models.ForeignKey('menu.MenuItem', on_delete=models.CASCADE, null=True, blank=True)
    business = models.ForeignKey('marketplace.BusinessListing', on_delete=models.CASCADE)

    # Featuring period
    featured_from = models.DateTimeField()
    featured_until = models.DateTimeField()

    # Performance metrics
    total_impressions = models.IntegerField(default=0, help_text="Times shown in featured section")
    total_clicks = models.IntegerField(default=0, help_text="Times clicked from featured section")
    total_views = models.IntegerField(default=0, help_text="Product page views from featuring")
    total_cart_adds = models.IntegerField(default=0, help_text="Added to cart from featuring")
    total_orders = models.IntegerField(default=0, help_text="Orders generated from featuring")
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    # Calculated metrics
    click_through_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="CTR percentage")
    conversion_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Order conversion percentage")

    # Featuring details
    featuring_type = models.CharField(max_length=20, choices=[
        ('manual', 'Manual'),
        ('auto', 'Automatic'),
        ('promoted', 'Promoted/Paid'),
    ])
    featuring_priority = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'marketplace_featuring_performance'
        indexes = [
            models.Index(fields=['-featured_from']),
            models.Index(fields=['product', '-featured_from']),
            models.Index(fields=['menu_item', '-featured_from']),
        ]

    def calculate_metrics(self):
        """Calculate CTR and conversion rate"""
        if self.total_impressions > 0:
            self.click_through_rate = (self.total_clicks / self.total_impressions) * 100
        if self.total_clicks > 0:
            self.conversion_rate = (self.total_orders / self.total_clicks) * 100
        return self


class ConsumerPreference(models.Model):
    """Track consumer preferences for personalized featuring"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consumer = models.OneToOneField(User, on_delete=models.CASCADE, related_name='marketplace_preferences')

    # Preference scores by category
    category_preferences = models.JSONField(default=dict,
        help_text="Category preference scores: {'food': 0.8, 'electronics': 0.3, ...}")

    # Business type preferences
    business_type_preferences = models.JSONField(default=dict,
        help_text="Business type scores: {'restaurant': 0.9, 'retail': 0.5, ...}")

    # Price range preference
    preferred_price_range = models.CharField(max_length=20, choices=[
        ('budget', 'Budget'),
        ('moderate', 'Moderate'),
        ('premium', 'Premium'),
        ('luxury', 'Luxury'),
    ], default='moderate')

    # Brand affinity
    favorite_businesses = models.JSONField(default=list,
        help_text="List of frequently ordered from business IDs")

    # Dietary/Product preferences
    preferences_tags = models.JSONField(default=list,
        help_text="Tags like 'vegan', 'organic', 'eco-friendly', etc.")

    # Behavioral metrics
    average_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    order_frequency_days = models.IntegerField(default=30, help_text="Average days between orders")
    last_order_date = models.DateTimeField(null=True, blank=True)

    # Time preferences
    preferred_ordering_times = models.JSONField(default=dict,
        help_text="Preferred times: {'morning': 0.2, 'lunch': 0.5, 'evening': 0.3}")

    # Location preferences
    prefers_nearby = models.BooleanField(default=True)
    max_delivery_distance_km = models.IntegerField(default=10)

    # Update tracking
    last_calculated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'marketplace_consumer_preferences'

    def __str__(self):
        return f"Preferences: {self.consumer.email}"


class FeaturingScore(models.Model):
    """Pre-calculated featuring scores for products/menu items"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Item being scored
    product = models.OneToOneField('inventory.Product', on_delete=models.CASCADE, null=True, blank=True, related_name='featuring_score')
    menu_item = models.OneToOneField('menu.MenuItem', on_delete=models.CASCADE, null=True, blank=True, related_name='featuring_score')
    business = models.ForeignKey('marketplace.BusinessListing', on_delete=models.CASCADE)

    # Score components
    popularity_score = models.DecimalField(max_digits=5, decimal_places=2, default=0,
        help_text="Based on views, orders, ratings")
    recency_score = models.DecimalField(max_digits=5, decimal_places=2, default=0,
        help_text="Newer items get higher scores")
    engagement_score = models.DecimalField(max_digits=5, decimal_places=2, default=0,
        help_text="Based on click-through and conversion rates")
    business_quality_score = models.DecimalField(max_digits=5, decimal_places=2, default=0,
        help_text="Based on business rating and reliability")
    inventory_score = models.DecimalField(max_digits=5, decimal_places=2, default=0,
        help_text="Higher for items with good stock levels")

    # Combined scores
    overall_score = models.DecimalField(max_digits=5, decimal_places=2, default=0,
        help_text="Weighted combination of all scores")
    personalized_scores = models.JSONField(default=dict,
        help_text="Per-user personalized scores: {user_id: score, ...}")

    # Metrics used for scoring
    total_views_7d = models.IntegerField(default=0)
    total_orders_7d = models.IntegerField(default=0)
    total_revenue_7d = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)

    # Update tracking
    last_calculated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'marketplace_featuring_scores'
        indexes = [
            models.Index(fields=['-overall_score']),
            models.Index(fields=['business', '-overall_score']),
            models.Index(fields=['-last_calculated']),
        ]

    def calculate_overall_score(self):
        """Calculate weighted overall score"""
        weights = {
            'popularity': 0.3,
            'recency': 0.1,
            'engagement': 0.25,
            'business_quality': 0.2,
            'inventory': 0.15,
        }

        self.overall_score = (
            self.popularity_score * weights['popularity'] +
            self.recency_score * weights['recency'] +
            self.engagement_score * weights['engagement'] +
            self.business_quality_score * weights['business_quality'] +
            self.inventory_score * weights['inventory']
        )
        return self.overall_score
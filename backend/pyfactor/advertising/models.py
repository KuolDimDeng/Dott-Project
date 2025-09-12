import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

User = get_user_model()


class AdvertisingCampaign(models.Model):
    """
    Model for advertising campaigns that businesses can create
    """
    CAMPAIGN_TYPES = [
        ('featured', 'Featured Listing'),
        ('banner', 'Banner Ad'),
        ('spotlight', 'Spotlight'),
        ('premium', 'Premium Package'),
    ]
    
    CAMPAIGN_STATUS = [
        ('draft', 'Draft'),
        ('pending_payment', 'Pending Payment'),
        ('active', 'Active'),
        ('paused', 'Paused'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    ]
    
    PLATFORMS = [
        ('marketplace', 'Marketplace'),
        ('discovery', 'Discovery'),
        ('search', 'Search Results'),
        ('homepage', 'Homepage'),
    ]
    
    TARGET_LOCATIONS = [
        ('local', 'Local (City)'),
        ('national', 'National'),
        ('international', 'International'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey('custom_auth.User', on_delete=models.CASCADE, 
                                 related_name='advertising_campaigns')
    
    # Campaign details
    name = models.CharField(max_length=255)
    description = models.TextField()
    type = models.CharField(max_length=20, choices=CAMPAIGN_TYPES, default='featured')
    status = models.CharField(max_length=20, choices=CAMPAIGN_STATUS, default='draft')
    
    # Budget and pricing
    total_budget = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    daily_budget = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    spent_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Schedule
    start_date = models.DateField()
    end_date = models.DateField()
    
    # Targeting
    platforms = models.JSONField(default=list)  # List of platform IDs
    target_location = models.CharField(max_length=20, choices=TARGET_LOCATIONS, default='local')
    target_audience = models.CharField(max_length=50, default='all')
    target_keywords = models.JSONField(default=list, blank=True)
    
    # Creative assets
    image_url = models.URLField(max_length=500, blank=True, null=True)
    cloudinary_public_id = models.CharField(max_length=255, blank=True, null=True)
    banner_text = models.CharField(max_length=255, blank=True)
    call_to_action = models.CharField(max_length=50, default='Learn More')
    landing_url = models.URLField(max_length=500, blank=True, null=True)
    
    # Performance metrics
    impressions = models.IntegerField(default=0)
    clicks = models.IntegerField(default=0)
    conversions = models.IntegerField(default=0)
    ctr = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))  # Click-through rate
    conversion_rate = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('0.00'))
    
    # Payment information
    payment_status = models.CharField(max_length=20, default='pending')
    payment_method = models.CharField(max_length=50, blank=True)
    payment_reference = models.CharField(max_length=255, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    activated_at = models.DateTimeField(null=True, blank=True)
    paused_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # Created by
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_campaigns')
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['business', 'status']),
            models.Index(fields=['start_date', 'end_date']),
            models.Index(fields=['type', 'status']),
        ]
    
    def __str__(self):
        return f"{self.name} - {self.get_type_display()}"
    
    def is_active(self):
        """Check if campaign is currently active"""
        today = timezone.now().date()
        return (
            self.status == 'active' and 
            self.start_date <= today <= self.end_date and
            self.spent_amount < self.total_budget
        )
    
    def update_metrics(self):
        """Update calculated metrics"""
        if self.impressions > 0:
            self.ctr = Decimal(str(round((self.clicks / self.impressions) * 100, 2)))
        if self.clicks > 0:
            self.conversion_rate = Decimal(str(round((self.conversions / self.clicks) * 100, 2)))
        self.save(update_fields=['ctr', 'conversion_rate'])
    
    def activate(self):
        """Activate the campaign after payment"""
        self.status = 'active'
        self.activated_at = timezone.now()
        self.payment_status = 'paid'
        self.paid_at = timezone.now()
        self.save()
        
        # 🎯 [ADVERTISING_ACTIVATION] Update business listing when featured campaign activates
        if self.type == 'featured' and self.business:
            from marketplace.models import BusinessListing
            import logging
            logger = logging.getLogger(__name__)
            
            logger.info(f"[ADVERTISING_DEBUG] Activating featured campaign for user {self.business.id}")
            
            try:
                # Find existing business listing for this user
                listing = BusinessListing.objects.get(business=self.business)
                listing.is_featured = True
                listing.featured_until = self.end_date
                listing.save()
                logger.info(f"[ADVERTISING_DEBUG] ✓ Updated existing listing for user {self.business.id}")
                
            except BusinessListing.DoesNotExist:
                # Create listing if it doesn't exist and user has required business info
                profile = getattr(self.business, 'userprofile', None)
                if profile and getattr(profile, 'business_name', None):
                    listing = BusinessListing.objects.create(
                        business=self.business,
                        is_featured=True,
                        featured_until=self.end_date,
                        is_visible_in_marketplace=True,
                        # Copy data from user profile
                        city=getattr(profile, 'city', ''),
                        country=getattr(profile, 'country', ''),
                        business_type=getattr(profile, 'business_type', 'OTHER'),
                        description=f"Featured business: {profile.business_name}"
                    )
                    logger.info(f"[ADVERTISING_DEBUG] ✓ Created new listing for user {self.business.id}")
                else:
                    logger.warning(f"[ADVERTISING_DEBUG] ⚠️ Cannot create listing for user {self.business.id} - missing business profile")
    
    def pause(self):
        """Pause the campaign"""
        self.status = 'paused'
        self.paused_at = timezone.now()
        self.save()
    
    def resume(self):
        """Resume a paused campaign"""
        if self.status == 'paused':
            self.status = 'active'
            self.save()
    
    def complete(self):
        """Mark campaign as completed"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()
        
        # 🎯 [ADVERTISING_COMPLETION] Remove featured status when campaign completes
        if self.type == 'featured' and self.business:
            from marketplace.models import BusinessListing
            import logging
            logger = logging.getLogger(__name__)
            
            logger.info(f"[ADVERTISING_DEBUG] Completing featured campaign for user {self.business.id}")
            
            try:
                listing = BusinessListing.objects.get(business=self.business)
                listing.is_featured = False
                listing.featured_until = None
                listing.save()
                logger.info(f"[ADVERTISING_DEBUG] ✓ Removed featured status for user {self.business.id}")
            except BusinessListing.DoesNotExist:
                logger.warning(f"[ADVERTISING_DEBUG] ⚠️ No listing found for user {self.business.id}")


class CampaignAnalytics(models.Model):
    """
    Daily analytics for campaigns
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(AdvertisingCampaign, on_delete=models.CASCADE, related_name='daily_analytics')
    date = models.DateField()
    
    # Daily metrics
    impressions = models.IntegerField(default=0)
    clicks = models.IntegerField(default=0)
    conversions = models.IntegerField(default=0)
    spend = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Breakdown by platform
    platform_metrics = models.JSONField(default=dict)
    
    # Breakdown by hour
    hourly_metrics = models.JSONField(default=dict)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['campaign', 'date']
        ordering = ['-date']
        indexes = [
            models.Index(fields=['campaign', 'date']),
        ]
    
    def __str__(self):
        return f"{self.campaign.name} - {self.date}"


class CampaignImpression(models.Model):
    """
    Track individual impressions for billing and analytics
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(AdvertisingCampaign, on_delete=models.CASCADE, related_name='impression_logs')
    
    # User who saw the ad
    viewer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    viewer_ip = models.GenericIPAddressField(null=True, blank=True)
    viewer_location = models.CharField(max_length=100, blank=True)
    
    # Where it was shown
    platform = models.CharField(max_length=50)
    page_url = models.URLField(max_length=500, blank=True)
    position = models.IntegerField(default=1)  # Position on the page
    
    # Interaction
    clicked = models.BooleanField(default=False)
    clicked_at = models.DateTimeField(null=True, blank=True)
    converted = models.BooleanField(default=False)
    converted_at = models.DateTimeField(null=True, blank=True)
    
    # Cost (for CPC/CPM billing)
    cost = models.DecimalField(max_digits=10, decimal_places=4, default=Decimal('0.00'))
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['campaign', 'created_at']),
            models.Index(fields=['campaign', 'clicked']),
        ]
    
    def __str__(self):
        return f"Impression for {self.campaign.name} at {self.created_at}"


class FeaturedBusinessSchedule(models.Model):
    """
    Schedule for featured businesses to ensure no conflicts
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey('custom_auth.User', on_delete=models.CASCADE)
    campaign = models.ForeignKey(AdvertisingCampaign, on_delete=models.CASCADE)
    
    start_date = models.DateField()
    end_date = models.DateField()
    priority = models.IntegerField(default=1)  # Higher priority shows first
    
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=2)
    
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ['business', 'start_date', 'end_date']
        ordering = ['-priority', 'start_date']
        indexes = [
            models.Index(fields=['city', 'country', 'is_active']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    def __str__(self):
        business_name = getattr(getattr(self.business, 'userprofile', None), 'business_name', self.business.email)
        return f"{business_name} featured from {self.start_date} to {self.end_date}"
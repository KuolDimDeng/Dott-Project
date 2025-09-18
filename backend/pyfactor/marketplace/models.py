from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone
import uuid

User = get_user_model()

class BusinessListing(models.Model):
    """
    Extended business information for marketplace
    """
    DELIVERY_SCOPE_CHOICES = [
        ('local', 'Local Delivery Only'),
        ('national', 'Nationwide Delivery'),
        ('international', 'International Shipping'),
        ('digital', 'Digital/Online Service'),
    ]
    
    # Import comprehensive business types from central location
    from core.business_types import BUSINESS_TYPE_CHOICES
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.OneToOneField(User, on_delete=models.CASCADE, related_name='marketplace_listing')
    
    # Use standardized field name and choices
    business_type = models.CharField(max_length=50, choices=BUSINESS_TYPE_CHOICES)
    secondary_categories = ArrayField(
        models.CharField(max_length=50),
        blank=True,
        default=list
    )
    
    # Location & Delivery
    delivery_scope = models.CharField(
        max_length=20, 
        choices=DELIVERY_SCOPE_CHOICES,
        default='local'
    )
    delivery_radius_km = models.IntegerField(default=10)  # For local delivery
    ships_to_countries = ArrayField(
        models.CharField(max_length=2),  # ISO country codes
        blank=True,
        default=list
    )
    is_digital_only = models.BooleanField(default=False)
    
    # Business location (from UserProfile)
    country = models.CharField(max_length=2)  # ISO country code
    city = models.CharField(max_length=100)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    # Visibility & Status
    is_visible_in_marketplace = models.BooleanField(default=True)
    is_verified = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    featured_until = models.DateField(null=True, blank=True)  # When featured status expires
    
    # Business hours
    business_hours = models.JSONField(default=dict, blank=True)
    is_open_now = models.BooleanField(default=True)
    manual_override = models.BooleanField(default=False, help_text='Whether open/closed status is manually overridden')
    manual_override_expires = models.DateTimeField(null=True, blank=True, help_text='When the manual override expires')

    # Payment and delivery options
    payment_methods = ArrayField(
        models.CharField(max_length=50),
        blank=True,
        default=list,
        help_text='Accepted payment methods (cash, card, mobile_money, etc.)'
    )
    delivery_options = models.JSONField(
        default=dict,
        blank=True,
        help_text='Delivery options configuration (delivery, pickup, shipping)'
    )

    # Contact information
    phone = models.CharField(max_length=20, blank=True, null=True, help_text='Business phone number')
    business_email = models.EmailField(max_length=255, blank=True, null=True, help_text='Business contact email')
    website = models.URLField(max_length=255, blank=True, null=True, help_text='Business website URL')
    address = models.TextField(blank=True, null=True, help_text='Full business address')
    postal_code = models.CharField(max_length=20, blank=True, null=True, help_text='Postal/ZIP code')
    state = models.CharField(max_length=100, blank=True, null=True, help_text='State/Province')
    social_media = models.JSONField(default=dict, blank=True, help_text='Social media links')

    # Search optimization
    search_tags = ArrayField(
        models.CharField(max_length=50),
        blank=True,
        default=list
    )
    description = models.TextField(blank=True)
    
    # Cloudinary image fields
    logo_url = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text='Cloudinary URL for business logo'
    )
    logo_public_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text='Cloudinary public ID for logo'
    )
    
    # Cover image for marketplace listing
    cover_image_url = models.URLField(
        max_length=500,
        null=True,
        blank=True,
        help_text='Cloudinary URL for cover/banner image'
    )
    cover_image_public_id = models.CharField(
        max_length=255,
        null=True,
        blank=True,
        help_text='Cloudinary public ID for cover image'
    )
    
    # Gallery images (up to 10 images)
    gallery_images = models.JSONField(
        default=list,
        blank=True,
        help_text='List of Cloudinary image URLs and public IDs for gallery'
    )
    
    # Subcategory fields for marketplace categorization
    manual_subcategories = ArrayField(
        models.CharField(max_length=50),
        blank=True,
        default=list,
        help_text="Subcategories manually selected by business owner"
    )
    
    auto_subcategories = ArrayField(
        models.CharField(max_length=50),
        blank=True,
        default=list,
        help_text="Auto-detected subcategories based on business type and keywords"
    )
    
    # Ratings & Reviews
    average_rating = models.DecimalField(max_digits=2, decimal_places=1, default=0)
    total_reviews = models.IntegerField(default=0)
    total_orders = models.IntegerField(default=0)
    
    # Response metrics
    average_response_time = models.IntegerField(default=0)  # in minutes
    response_rate = models.IntegerField(default=0)  # percentage
    
    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    last_active = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'marketplace_business_listing'
        indexes = [
            models.Index(fields=['business_type', 'is_visible_in_marketplace']),
            models.Index(fields=['country', 'city', 'delivery_scope']),
            models.Index(fields=['average_rating', '-total_orders']),
            models.Index(fields=['-last_active']),
        ]
    
    def __str__(self):
        return f"{self.business.business_name} - {self.get_business_type_display()}"
    
    @property
    def subcategories(self):
        """Combined subcategories (manual overrides auto)"""
        return self.manual_subcategories if self.manual_subcategories else self.auto_subcategories
    
    @property
    def main_category(self):
        """Main category derived from business type"""
        from .marketplace_categories import MARKETPLACE_CATEGORIES
        
        # Check subcategories first
        if self.subcategories:
            # Extract main category from subcategory key (e.g., 'food.burgers' -> 'food')
            main_cat = self.subcategories[0].split('.')[0] if '.' in self.subcategories[0] else None
            if main_cat:
                return main_cat
        
        # Fallback to mapping business_type to main category
        for main_cat, cat_data in MARKETPLACE_CATEGORIES.items():
            for sub_key, sub_data in cat_data['subcategories'].items():
                if self.business_type in sub_data.get('business_types', []):
                    return main_cat
        return 'more'  # Default to 'more' category
    
    def save(self, *args, **kwargs):
        """Override save to auto-populate contact fields from UserProfile if empty"""
        # Auto-populate contact info from UserProfile if not set
        if self.business and not any([self.phone, self.business_email, self.address, self.website]):
            try:
                from users.models import UserProfile
                profile = UserProfile.objects.filter(user=self.business).first()
                if profile:
                    # Sync phone
                    if not self.phone and profile.phone_number:
                        self.phone = profile.phone_number

                    # Sync email
                    if not self.business_email:
                        self.business_email = self.business.email

                    # Sync address
                    if not self.address:
                        # Build address from UserProfile components
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
                            self.address = ', '.join(address_parts)

                    # Sync website
                    if not self.website and hasattr(profile, 'website') and profile.website:
                        self.website = profile.website

                    # Sync postal code
                    if not self.postal_code and profile.postcode:
                        self.postal_code = profile.postcode

                    # Sync state
                    if not self.state and profile.state:
                        self.state = profile.state

                    # Sync social media
                    if not self.social_media or self.social_media == {}:
                        social = {}
                        if hasattr(profile, 'facebook') and profile.facebook:
                            social['facebook'] = profile.facebook
                        if hasattr(profile, 'instagram') and profile.instagram:
                            social['instagram'] = profile.instagram
                        if hasattr(profile, 'twitter') and profile.twitter:
                            social['twitter'] = profile.twitter
                        if hasattr(profile, 'linkedin') and profile.linkedin:
                            social['linkedin'] = profile.linkedin
                        if social:
                            self.social_media = social

                    # Sync business hours if empty
                    if not self.business_hours or self.business_hours == {}:
                        if hasattr(profile, 'operating_hours') and profile.operating_hours:
                            self.business_hours = profile.operating_hours
                        else:
                            # Set default business hours
                            self.business_hours = {
                                'monday': {'open': '09:00', 'close': '17:00'},
                                'tuesday': {'open': '09:00', 'close': '17:00'},
                                'wednesday': {'open': '09:00', 'close': '17:00'},
                                'thursday': {'open': '09:00', 'close': '17:00'},
                                'friday': {'open': '09:00', 'close': '17:00'},
                                'saturday': {'open': '09:00', 'close': '14:00'},
                                'sunday': {'isClosed': True}
                            }
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error syncing UserProfile data to BusinessListing: {e}")

        super().save(*args, **kwargs)

    def can_deliver_to(self, consumer_country, consumer_city, consumer_coords=None):
        """Check if business can deliver to consumer location"""

        # Digital services can deliver anywhere
        if self.is_digital_only or self.delivery_scope == 'digital':
            return True

        # International delivery
        if self.delivery_scope == 'international':
            # Check if specific countries are set
            if self.ships_to_countries:
                return consumer_country in self.ships_to_countries
            return True  # Ships worldwide

        # National delivery (same country only)
        if self.delivery_scope == 'national':
            return self.country == consumer_country

        # Local delivery
        if self.delivery_scope == 'local':
            # Must be same city
            if self.city != consumer_city:
                return False

            # If we have coordinates, check distance
            if consumer_coords and self.latitude and self.longitude:
                from geopy.distance import geodesic
                business_coords = (self.latitude, self.longitude)
                distance_km = geodesic(business_coords, consumer_coords).kilometers
                return distance_km <= self.delivery_radius_km

            # Same city without coords - assume deliverable
            return True

        return False


class ConsumerProfile(models.Model):
    """
    Consumer-specific profile information
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='consumer_profile')
    
    # Location
    default_delivery_address = models.TextField(blank=True)
    delivery_addresses = models.JSONField(default=list, blank=True)  # Array of saved addresses
    current_latitude = models.FloatField(null=True, blank=True)
    current_longitude = models.FloatField(null=True, blank=True)
    current_city = models.CharField(max_length=100, blank=True)
    current_country = models.CharField(max_length=2, blank=True)  # ISO code
    
    # Preferences
    preferred_categories = ArrayField(
        models.CharField(max_length=50),
        blank=True,
        default=list
    )
    favorite_businesses = models.ManyToManyField(
        BusinessListing,
        blank=True,
        related_name='favorited_by'
    )
    
    # Search history
    recent_searches = ArrayField(
        models.CharField(max_length=100),
        blank=True,
        default=list,
        size=20  # Keep last 20 searches
    )
    
    # Consumer metrics
    total_orders = models.IntegerField(default=0)
    total_spent = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    average_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Consumer rating (as rated by businesses)
    consumer_rating = models.DecimalField(max_digits=2, decimal_places=1, default=5.0)
    total_ratings_received = models.IntegerField(default=0)
    
    # Preferences
    preferred_payment_method = models.CharField(max_length=20, default='cash')
    notification_preferences = models.JSONField(default=dict, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    last_order_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'marketplace_consumer_profiles'
        indexes = [
            models.Index(fields=['current_country', 'current_city']),
            models.Index(fields=['-last_order_at']),
        ]
    
    def __str__(self):
        return f"Consumer: {self.user.email}"



class BusinessSearch(models.Model):
    """
    Track and optimize search queries
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    consumer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    # Search details
    search_query = models.CharField(max_length=200)
    category_filter = models.CharField(max_length=50, blank=True)
    location_filter = models.CharField(max_length=100, blank=True)
    
    # Search context
    consumer_country = models.CharField(max_length=2, blank=True)
    consumer_city = models.CharField(max_length=100, blank=True)
    consumer_latitude = models.FloatField(null=True, blank=True)
    consumer_longitude = models.FloatField(null=True, blank=True)
    
    # Results
    results_count = models.IntegerField(default=0)
    clicked_results = ArrayField(
        models.UUIDField(),
        blank=True,
        default=list
    )
    
    # Conversion
    resulted_in_order = models.BooleanField(default=False)
    order_id = models.UUIDField(null=True, blank=True)
    
    # Metadata
    searched_at = models.DateTimeField(default=timezone.now)
    device_type = models.CharField(max_length=20, blank=True)  # mobile, desktop, app
    
    class Meta:
        db_table = 'marketplace_business_searches'
        indexes = [
            models.Index(fields=['-searched_at']),
            models.Index(fields=['consumer', '-searched_at']),
            models.Index(fields=['search_query', 'category_filter']),
        ]
    
    def __str__(self):
        return f"Search: {self.search_query} at {self.searched_at}"


# Import order models at the end to make them available to Django
# This avoids circular imports during app initialization
from .order_models import ConsumerOrder  # noqa
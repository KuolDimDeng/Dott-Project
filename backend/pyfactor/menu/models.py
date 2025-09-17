"""
Menu Management Models for Restaurant-type Businesses
"""
import uuid
import os
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from custom_auth.tenant_base_model import TenantAwareModel


def menu_item_image_path(instance, filename):
    """Generate upload path for menu item images"""
    ext = filename.split('.')[-1]
    filename = f'{instance.id}.{ext}'
    return os.path.join('menu_items', str(instance.tenant_id), filename)


class MenuCategory(TenantAwareModel):
    """Categories for organizing menu items"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    display_order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    icon = models.CharField(max_length=50, blank=True, help_text="Icon name for mobile app")
    
    # Common restaurant categories
    CATEGORY_CHOICES = [
        ('APPETIZERS', 'Appetizers & Starters'),
        ('SOUPS', 'Soups'),
        ('SALADS', 'Salads'),
        ('MAINS', 'Main Courses'),
        ('PIZZA', 'Pizza'),
        ('PASTA', 'Pasta'),
        ('SANDWICHES', 'Sandwiches & Burgers'),
        ('SEAFOOD', 'Seafood'),
        ('MEAT', 'Meat Dishes'),
        ('VEGETARIAN', 'Vegetarian'),
        ('SIDES', 'Side Dishes'),
        ('DESSERTS', 'Desserts'),
        ('BEVERAGES', 'Beverages'),
        ('HOT_DRINKS', 'Hot Drinks'),
        ('COLD_DRINKS', 'Cold Drinks'),
        ('ALCOHOLIC', 'Alcoholic Beverages'),
        ('KIDS', 'Kids Menu'),
        ('BREAKFAST', 'Breakfast'),
        ('LUNCH', 'Lunch Specials'),
        ('DINNER', 'Dinner Specials'),
        ('CUSTOM', 'Custom Category'),
    ]
    category_type = models.CharField(max_length=20, choices=CATEGORY_CHOICES, default='CUSTOM')
    
    class Meta:
        db_table = 'menu_categories'
        ordering = ['display_order', 'name']
        verbose_name_plural = 'Menu Categories'
        unique_together = ['tenant_id', 'name']
    
    def __str__(self):
        return self.name


class MenuItem(TenantAwareModel):
    """Individual menu items for restaurants"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic Information
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.ForeignKey(MenuCategory, on_delete=models.CASCADE, related_name='menu_items')
    
    # Pricing
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    discounted_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True,
                                          validators=[MinValueValidator(0)])
    cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True,
                              validators=[MinValueValidator(0)], help_text="Cost to make this item")
    
    # Images
    image = models.ImageField(upload_to=menu_item_image_path, null=True, blank=True,
                             help_text="Primary image file (for backward compatibility)")
    image_url = models.URLField(blank=True, help_text="Primary image URL from Cloudinary")
    image_public_id = models.CharField(max_length=255, blank=True, help_text="Cloudinary public ID")
    thumbnail_url = models.URLField(blank=True, help_text="Thumbnail image URL from Cloudinary")
    additional_images = models.JSONField(default=list, blank=True, help_text="List of additional image URLs")
    
    # Availability
    is_available = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_new = models.BooleanField(default=False)
    is_popular = models.BooleanField(default=False)

    # Enhanced featuring fields
    featured_until = models.DateTimeField(null=True, blank=True, help_text="When featured status expires")
    featured_priority = models.IntegerField(default=0, help_text="Higher priority items show first")
    featured_score = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                        help_text="Calculated score for automatic featuring")
    view_count = models.IntegerField(default=0, help_text="Number of times viewed in marketplace")
    
    # Preparation
    preparation_time = models.IntegerField(null=True, blank=True, help_text="Preparation time in minutes")
    serving_size = models.CharField(max_length=50, blank=True, help_text="e.g., '2 pieces', '300g', 'Large'")
    calories = models.IntegerField(null=True, blank=True, validators=[MinValueValidator(0)])
    
    # Dietary Information
    is_vegetarian = models.BooleanField(default=False)
    is_vegan = models.BooleanField(default=False)
    is_gluten_free = models.BooleanField(default=False)
    is_dairy_free = models.BooleanField(default=False)
    is_halal = models.BooleanField(default=False)
    is_kosher = models.BooleanField(default=False)
    is_spicy = models.BooleanField(default=False)
    spice_level = models.IntegerField(null=True, blank=True, 
                                      validators=[MinValueValidator(0), MaxValueValidator(5)],
                                      help_text="Spice level from 0-5")
    
    # Allergen Information
    allergens = models.JSONField(default=list, blank=True, 
                                help_text="List of allergens: nuts, shellfish, eggs, dairy, gluten, soy, etc.")
    
    # Ingredients (optional, can link to inventory)
    ingredients = models.JSONField(default=list, blank=True,
                                 help_text="List of main ingredients")
    inventory_items = models.ManyToManyField('inventory.Product', blank=True,
                                            help_text="Link to inventory items used")
    
    # Customization Options
    customization_options = models.JSONField(default=list, blank=True,
                                           help_text="Options like size, toppings, cooking preferences")
    # Example: [
    #   {"name": "Size", "options": [{"name": "Small", "price_diff": 0}, {"name": "Large", "price_diff": 3}]},
    #   {"name": "Extra Cheese", "price": 1.5}
    # ]
    
    # Display
    display_order = models.IntegerField(default=0)
    tags = models.JSONField(default=list, blank=True, help_text="Tags for searching and filtering")
    
    # Stock Management
    stock_quantity = models.IntegerField(null=True, blank=True, 
                                        help_text="For items with limited daily quantity")
    unlimited_stock = models.BooleanField(default=True)
    
    # Ratings and Reviews
    rating = models.DecimalField(max_digits=3, decimal_places=2, null=True, blank=True,
                                validators=[MinValueValidator(0), MaxValueValidator(5)])
    review_count = models.IntegerField(default=0)
    order_count = models.IntegerField(default=0, help_text="Number of times ordered")
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Business
    business = models.ForeignKey('users.Business', on_delete=models.CASCADE, 
                                related_name='menu_items', null=True, blank=True)
    
    class Meta:
        db_table = 'menu_items'
        ordering = ['category', 'display_order', 'name']
        indexes = [
            models.Index(fields=['tenant_id', 'is_available']),
            models.Index(fields=['tenant_id', 'category']),
            models.Index(fields=['tenant_id', 'is_featured']),
        ]
    
    def __str__(self):
        return f"{self.name} - ${self.price}"
    
    @property
    def profit_margin(self):
        """Calculate profit margin if cost is set"""
        if self.cost and self.price:
            return ((self.price - self.cost) / self.price) * 100
        return None
    
    @property
    def effective_price(self):
        """Return discounted price if available, otherwise regular price"""
        return self.discounted_price if self.discounted_price else self.price
    
    def save(self, *args, **kwargs):
        """Override save to handle Cloudinary upload"""
        # Save first to ensure we have an ID
        is_new = self.pk is None
        super().save(*args, **kwargs)

        # If we have an image file but no Cloudinary URL, upload to Cloudinary
        if self.image and not self.image_public_id:
            try:
                from services.cloudinary_service import cloudinary_service

                # Upload to Cloudinary
                result = cloudinary_service.upload_image(
                    self.image,
                    purpose='menu_item',
                    user_id=str(self.tenant_id)
                )

                # Update fields with Cloudinary URLs
                self.image_url = result['url']
                self.image_public_id = result['public_id']
                self.thumbnail_url = result.get('thumbnail_url', '')

                # Save the Cloudinary URLs
                super().save(update_fields=['image_url', 'image_public_id', 'thumbnail_url'])

            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to upload menu item image to Cloudinary: {e}")
                # Fallback to local URL if Cloudinary fails
                from django.conf import settings
                domain = getattr(settings, 'BACKEND_DOMAIN', 'https://dott-api-staging.onrender.com')
                self.image_url = f"{domain}{settings.MEDIA_URL}{self.image}"
                super().save(update_fields=['image_url'])


class MenuItemReview(TenantAwareModel):
    """Customer reviews for menu items"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    menu_item = models.ForeignKey(MenuItem, on_delete=models.CASCADE, related_name='reviews')
    customer_name = models.CharField(max_length=100)
    customer_email = models.EmailField(blank=True)
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True)
    is_verified_purchase = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'menu_item_reviews'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.customer_name} - {self.menu_item.name} ({self.rating}★)"


class MenuSpecial(TenantAwareModel):
    """Daily or time-based specials"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    description = models.TextField()
    menu_items = models.ManyToManyField(MenuItem, related_name='specials')
    
    # Special Type
    SPECIAL_TYPE_CHOICES = [
        ('DAILY', 'Daily Special'),
        ('WEEKLY', 'Weekly Special'),
        ('HAPPY_HOUR', 'Happy Hour'),
        ('LUNCH', 'Lunch Special'),
        ('DINNER', 'Dinner Special'),
        ('WEEKEND', 'Weekend Special'),
        ('SEASONAL', 'Seasonal Special'),
        ('HOLIDAY', 'Holiday Special'),
    ]
    special_type = models.CharField(max_length=20, choices=SPECIAL_TYPE_CHOICES)
    
    # Timing
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    
    # Days of week (for recurring specials)
    monday = models.BooleanField(default=False)
    tuesday = models.BooleanField(default=False)
    wednesday = models.BooleanField(default=False)
    thursday = models.BooleanField(default=False)
    friday = models.BooleanField(default=False)
    saturday = models.BooleanField(default=False)
    sunday = models.BooleanField(default=False)
    
    # Pricing
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True,
                                             validators=[MinValueValidator(0), MaxValueValidator(100)])
    fixed_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'menu_specials'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.special_type}"
"""
StoreItems models for global product catalog
This provides a shared product database across all merchants
"""
import uuid
from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.utils import timezone
from django.db.models import Q


class StoreItem(models.Model):
    """
    Global product catalog - shared across all tenants
    This is NOT tenant-aware as products are global
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Product identification
    barcode = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="EAN/UPC barcode"
    )
    name = models.CharField(max_length=255, db_index=True)
    brand = models.CharField(max_length=100, blank=True, null=True, db_index=True)

    # Categorization
    category = models.CharField(max_length=100, db_index=True)
    subcategory = models.CharField(max_length=100, blank=True, null=True)

    # Product details
    description = models.TextField(blank=True, null=True)
    image_url = models.URLField(blank=True, null=True, help_text="Image URL from Cloudinary or external source")
    image_public_id = models.CharField(max_length=255, blank=True, help_text="Cloudinary public ID")
    thumbnail_url = models.URLField(blank=True, help_text="Thumbnail image URL from Cloudinary")
    unit = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="e.g., 'bottle', 'pack', 'kg'"
    )
    size = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text="e.g., '500ml', '1kg', '6-pack'"
    )

    # Regional tracking
    region_code = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="Country/region code where product is sold"
    )

    # Verification status
    verified = models.BooleanField(
        default=False,
        help_text="Verified by 3+ merchants"
    )
    verification_count = models.IntegerField(default=0)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by_merchant_id = models.IntegerField(
        null=True,
        blank=True,
        help_text="ID of merchant who first added this product"
    )

    class Meta:
        db_table = 'store_items'
        indexes = [
            models.Index(fields=['barcode']),
            models.Index(fields=['name', 'brand']),
            models.Index(fields=['category', 'subcategory']),
            models.Index(fields=['region_code']),
            models.Index(fields=['verified']),
        ]
        verbose_name = 'Store Item'
        verbose_name_plural = 'Store Items'

    def __str__(self):
        return f"{self.name} ({self.barcode})"

    @classmethod
    def search(cls, query, limit=20):
        """Smart search across multiple fields"""
        return cls.objects.filter(
            Q(barcode__icontains=query) |
            Q(name__icontains=query) |
            Q(brand__icontains=query) |
            Q(category__icontains=query)
        )[:limit]

    @classmethod
    def find_similar(cls, name, brand=None):
        """Find similar products for duplicate detection"""
        filters = Q(name__icontains=name.split()[0])
        if brand:
            filters &= Q(brand__icontains=brand)
        return cls.objects.filter(filters)[:5]


class StoreItemVerification(models.Model):
    """Track merchant verifications of store items"""
    store_item = models.ForeignKey(
        StoreItem,
        on_delete=models.CASCADE,
        related_name='verifications'
    )
    merchant_id = models.IntegerField()
    is_correct = models.BooleanField(default=True)
    notes = models.TextField(blank=True, null=True)
    verified_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'store_item_verifications'
        unique_together = ('store_item', 'merchant_id')
        indexes = [
            models.Index(fields=['store_item', 'merchant_id']),
        ]

    def save(self, *args, **kwargs):
        """Update verification count on parent item"""
        super().save(*args, **kwargs)

        # Update verification count
        count = StoreItemVerification.objects.filter(
            store_item=self.store_item,
            is_correct=True
        ).count()

        self.store_item.verification_count = count
        self.store_item.verified = (count >= 3)
        self.store_item.save(update_fields=['verification_count', 'verified'])


class StoreItemPriceHistory(models.Model):
    """Track price changes across regions for market intelligence"""
    store_item = models.ForeignKey(
        StoreItem,
        on_delete=models.CASCADE,
        related_name='price_history'
    )
    merchant_id = models.IntegerField()
    price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    currency = models.CharField(max_length=3, default='USD')
    location = models.CharField(max_length=100, blank=True, null=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'store_item_price_history'
        indexes = [
            models.Index(fields=['store_item', 'recorded_at']),
            models.Index(fields=['location', 'recorded_at']),
        ]
        ordering = ['-recorded_at']

    @classmethod
    def get_area_average(cls, store_item_id, location, days=30):
        """Get average price in area over last N days"""
        from django.db.models import Avg
        from datetime import timedelta

        cutoff_date = timezone.now() - timedelta(days=days)

        return cls.objects.filter(
            store_item_id=store_item_id,
            location__icontains=location.split(',')[0],  # Match by city
            recorded_at__gte=cutoff_date
        ).aggregate(
            avg_price=Avg('price')
        )['avg_price']


class MerchantStoreItem(models.Model):
    """
    Link between merchant's Product and global StoreItem
    Stores merchant-specific pricing and stock
    """
    # Relations
    merchant_id = models.IntegerField(db_index=True)
    store_item = models.ForeignKey(
        StoreItem,
        on_delete=models.CASCADE,
        related_name='merchant_items'
    )
    product_id = models.UUIDField(
        null=True,
        blank=True,
        help_text="Link to merchant's existing Product if applicable"
    )

    # Merchant-specific pricing
    sell_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    cost_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    currency = models.CharField(max_length=3, default='USD')

    # Inventory
    stock_quantity = models.IntegerField(default=0)
    min_stock = models.IntegerField(default=5)
    max_stock = models.IntegerField(null=True, blank=True)

    # Status
    is_active = models.BooleanField(default=True)
    out_of_stock = models.BooleanField(default=False)

    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_sold_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'merchant_store_items'
        unique_together = ('merchant_id', 'store_item')
        indexes = [
            models.Index(fields=['merchant_id', 'store_item']),
            models.Index(fields=['merchant_id', 'is_active']),
            models.Index(fields=['merchant_id', 'stock_quantity']),
        ]

    def __str__(self):
        return f"Merchant {self.merchant_id} - {self.store_item.name}"

    @property
    def profit_margin(self):
        """Calculate profit margin percentage"""
        if self.cost_price and self.sell_price:
            margin = ((self.sell_price - self.cost_price) / self.sell_price) * 100
            return round(margin, 2)
        return None

    @property
    def markup(self):
        """Calculate markup percentage"""
        if self.cost_price and self.cost_price > 0:
            markup = ((self.sell_price - self.cost_price) / self.cost_price) * 100
            return round(markup, 2)
        return None

    def record_price_change(self):
        """Record price in history for market intelligence"""
        from users.models import UserProfile
        try:
            profile = UserProfile.objects.get(user_id=self.merchant_id)
            location = f"{profile.city}, {profile.country}"
        except:
            location = None

        StoreItemPriceHistory.objects.create(
            store_item=self.store_item,
            merchant_id=self.merchant_id,
            price=self.sell_price,
            currency=self.currency,
            location=location
        )

    def save(self, *args, **kwargs):
        """Record price changes on save"""
        if self.pk:  # Existing item
            old_item = MerchantStoreItem.objects.filter(pk=self.pk).first()
            if old_item and old_item.sell_price != self.sell_price:
                self.record_price_change()
        else:  # New item
            self.record_price_change()

        super().save(*args, **kwargs)
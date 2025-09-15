"""
Enhancement to link Product model with StoreItems
Add this to the Product model in models.py
"""

# Add this import at the top of models.py:
# from .models_storeitems import StoreItem

# Add these fields to the Product model after line 316 (after is_active field):

    # Link to global store item catalog
    store_item = models.ForeignKey(
        'StoreItem',  # Will be imported from models_storeitems
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='merchant_products',
        help_text='Link to global product catalog'
    )

    # Barcode field for scanning
    barcode = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        db_index=True,
        help_text='Product barcode for scanning'
    )

    # Additional pricing fields for better management
    markup_type = models.CharField(
        max_length=20,
        choices=[
            ('percentage', 'Percentage Markup'),
            ('fixed', 'Fixed Amount'),
            ('formula', 'Custom Formula'),
        ],
        default='percentage',
        help_text='How markup is calculated'
    )

    # Quick price update fields
    last_price_update = models.DateTimeField(null=True, blank=True)
    price_update_reason = models.CharField(max_length=200, blank=True, null=True)

    # Stock management
    auto_reorder = models.BooleanField(default=False, help_text='Automatically reorder when low')
    max_stock = models.IntegerField(null=True, blank=True, help_text='Maximum stock level')

    # Analytics fields
    times_sold = models.IntegerField(default=0, help_text='Number of times sold')
    last_sold_at = models.DateTimeField(null=True, blank=True)
    popularity_score = models.IntegerField(default=0, help_text='Calculated popularity score')

    @property
    def profit_margin(self):
        """Calculate profit margin percentage"""
        if self.cost and self.price:
            margin = ((self.price - self.cost) / self.price) * 100
            return round(margin, 2)
        return None

    @property
    def suggested_price(self):
        """Get suggested price based on markup settings"""
        if not self.cost:
            return None

        if self.markup_type == 'percentage':
            return self.cost * (1 + self.markup_percentage / 100)
        elif self.markup_type == 'fixed':
            return self.cost + Decimal(str(self.markup_percentage))
        return self.price

    def update_from_store_item(self):
        """Update product details from linked store item"""
        if self.store_item:
            self.name = self.store_item.name
            self.description = self.store_item.description or self.description
            self.barcode = self.store_item.barcode
            # Don't override price - that's merchant-specific
            self.save()

    def sync_with_store_item(self):
        """Create or update MerchantStoreItem for better tracking"""
        if self.store_item and self.tenant_id:
            from .models_storeitems import MerchantStoreItem

            MerchantStoreItem.objects.update_or_create(
                merchant_id=self.tenant_id,
                store_item=self.store_item,
                defaults={
                    'product_id': self.id,
                    'sell_price': self.price or 0,
                    'cost_price': self.cost,
                    'stock_quantity': self.quantity,
                    'is_active': self.is_active,
                }
            )
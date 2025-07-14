from django.db import models
from django.contrib.auth import get_user_model
from users.models import UserProfile
from custom_auth.models import Tenant
from decimal import Decimal
import uuid
from django.utils import timezone

User = get_user_model()

class WhatsAppBusinessSettings(models.Model):
    """Settings for WhatsApp Business integration per tenant"""
    tenant = models.OneToOneField(Tenant, on_delete=models.CASCADE, related_name='whatsapp_business_settings')
    is_enabled = models.BooleanField(default=True)
    business_name = models.CharField(max_length=255, blank=True, null=True)
    business_description = models.TextField(blank=True, null=True)
    whatsapp_number = models.CharField(max_length=20, blank=True, null=True)
    welcome_message = models.TextField(default="Welcome to our business! Browse our catalog and shop with ease.")
    auto_reply_enabled = models.BooleanField(default=True)
    catalog_enabled = models.BooleanField(default=True)
    payment_enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'whatsapp_business_settings'

    def __str__(self):
        return f"WhatsApp Business Settings - {self.tenant.name}"

class WhatsAppCatalog(models.Model):
    """Product catalog for WhatsApp Business"""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='whatsapp_catalogs')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    catalog_url = models.URLField(blank=True, null=True)  # Generated sharing URL
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'whatsapp_catalogs'

    def __str__(self):
        return f"{self.name} - {self.tenant.name}"

class WhatsAppProduct(models.Model):
    """Products in WhatsApp catalog"""
    CURRENCY_CHOICES = [
        ('USD', 'US Dollar'),
        ('KES', 'Kenyan Shilling'),
        ('NGN', 'Nigerian Naira'),
        ('GHS', 'Ghanaian Cedi'),
        ('UGX', 'Ugandan Shilling'),
        ('RWF', 'Rwandan Franc'),
        ('TZS', 'Tanzanian Shilling'),
        ('EUR', 'Euro'),
        ('GBP', 'British Pound'),
    ]

    catalog = models.ForeignKey(WhatsAppCatalog, on_delete=models.CASCADE, related_name='products')
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='USD')
    image_url = models.URLField(blank=True, null=True)
    sku = models.CharField(max_length=100, blank=True, null=True)
    stock_quantity = models.IntegerField(default=0)
    is_available = models.BooleanField(default=True)
    category = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'whatsapp_products'

    def __str__(self):
        return f"{self.name} - {self.catalog.name}"

class WhatsAppOrder(models.Model):
    """Orders placed through WhatsApp Business"""
    ORDER_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('processing', 'Processing'),
        ('shipped', 'Shipped'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
    ]

    PAYMENT_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]

    PAYMENT_METHOD_CHOICES = [
        ('mpesa', 'M-Pesa'),
        ('card', 'Credit/Debit Card'),
        ('bank_transfer', 'Bank Transfer'),
        ('cod', 'Cash on Delivery'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='whatsapp_orders')
    customer_phone = models.CharField(max_length=20)
    customer_name = models.CharField(max_length=255, blank=True, null=True)
    customer_address = models.TextField(blank=True, null=True)
    
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, choices=WhatsAppProduct.CURRENCY_CHOICES, default='USD')
    
    order_status = models.CharField(max_length=20, choices=ORDER_STATUS_CHOICES, default='pending')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES, blank=True, null=True)
    
    # Payment processing
    payment_reference = models.CharField(max_length=100, blank=True, null=True)
    payment_link = models.URLField(blank=True, null=True)
    
    # Dott fee (2.5% + $0.30 or regional equivalent)
    dott_fee_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    dott_fee_currency = models.CharField(max_length=3, default='USD')
    
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'whatsapp_orders'

    def __str__(self):
        return f"Order {self.id} - {self.customer_phone}"

    def calculate_dott_fee(self):
        """Calculate Dott's transaction fee (2.5% + $0.30 or regional equivalent)"""
        base_fee = Decimal('0.30')  # Base fee in USD
        percentage_fee = self.total_amount * Decimal('0.025')  # 2.5%
        
        # Convert base fee to local currency if needed
        if self.currency == 'KES':
            base_fee = Decimal('40.00')  # ~$0.30 in KES
        elif self.currency == 'NGN':
            base_fee = Decimal('500.00')  # ~$0.30 in NGN
        elif self.currency == 'GHS':
            base_fee = Decimal('4.00')  # ~$0.30 in GHS
        
        total_fee = percentage_fee + base_fee
        self.dott_fee_amount = total_fee
        self.dott_fee_currency = self.currency
        return total_fee

class WhatsAppOrderItem(models.Model):
    """Items in a WhatsApp order"""
    order = models.ForeignKey(WhatsAppOrder, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(WhatsAppProduct, on_delete=models.CASCADE)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    class Meta:
        db_table = 'whatsapp_order_items'

    def __str__(self):
        return f"{self.product.name} x {self.quantity} - Order {self.order.id}"

    def save(self, *args, **kwargs):
        """Auto-calculate total price"""
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)

class WhatsAppMessage(models.Model):
    """Track WhatsApp messages sent through the platform"""
    MESSAGE_TYPE_CHOICES = [
        ('catalog_share', 'Catalog Share'),
        ('order_confirmation', 'Order Confirmation'),
        ('payment_link', 'Payment Link'),
        ('status_update', 'Status Update'),
        ('customer_support', 'Customer Support'),
    ]

    MESSAGE_STATUS_CHOICES = [
        ('sent', 'Sent'),
        ('delivered', 'Delivered'),
        ('read', 'Read'),
        ('failed', 'Failed'),
    ]

    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='whatsapp_messages')
    recipient_phone = models.CharField(max_length=20)
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPE_CHOICES)
    message_content = models.TextField()
    whatsapp_message_id = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=20, choices=MESSAGE_STATUS_CHOICES, default='sent')
    
    # Optional relation to order
    related_order = models.ForeignKey(WhatsAppOrder, on_delete=models.SET_NULL, null=True, blank=True, related_name='messages')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'whatsapp_messages'

    def __str__(self):
        return f"{self.message_type} to {self.recipient_phone} - {self.tenant.name}"

class WhatsAppAnalytics(models.Model):
    """Analytics for WhatsApp Business performance"""
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE, related_name='whatsapp_analytics')
    date = models.DateField()
    
    # Message metrics
    messages_sent = models.IntegerField(default=0)
    messages_delivered = models.IntegerField(default=0)
    messages_read = models.IntegerField(default=0)
    
    # Catalog metrics
    catalog_shares = models.IntegerField(default=0)
    catalog_views = models.IntegerField(default=0)
    
    # Order metrics
    orders_initiated = models.IntegerField(default=0)
    orders_completed = models.IntegerField(default=0)
    orders_cancelled = models.IntegerField(default=0)
    
    # Revenue metrics
    total_revenue = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    dott_fees_collected = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'whatsapp_analytics'
        unique_together = ['tenant', 'date']

    def __str__(self):
        return f"Analytics {self.date} - {self.tenant.name}"
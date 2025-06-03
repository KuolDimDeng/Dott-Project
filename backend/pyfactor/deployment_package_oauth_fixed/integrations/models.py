from django.db import models
from users.models import UserProfile
from django.conf import settings
from django.utils import timezone
from django.contrib.auth import get_user_model  # Import the get_user_model function

User = get_user_model()

class Integration(models.Model):
    PLATFORM_CHOICES = [
        ('woocommerce', 'WooCommerce'),
        ('shopify', 'Shopify'),
        ('magento', 'Magento'),
        ('bigcommerce', 'BigCommerce'),
        ('prestashop', 'PrestaShop'),
        ('squarespace', 'Squarespace'),
        ('wix', 'Wix eCommerce'),
        ('opencart', 'OpenCart'),
        ('volusion', 'Volusion'),
        ('3dcart', '3dcart (Shift4Shop)'),
    ]

    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='integrations')
    platform = models.CharField(max_length=50, choices=PLATFORM_CHOICES)
    is_active = models.BooleanField(default=False)
    api_key = models.CharField(max_length=255, blank=True, null=True)
    api_secret = models.CharField(max_length=255, blank=True, null=True)
    store_url = models.URLField(blank=True, null=True)

    def __str__(self):
        return f"{self.user_profile.user.email} - {self.platform}"

class WooCommerceIntegration(models.Model):
    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE, related_name='woocommerce_integration')
    site_url = models.URLField()
    consumer_key = models.CharField(max_length=255)
    consumer_secret = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.user_profile.user.email} - WooCommerce"

class WooCommerceOrder(models.Model):
    integration = models.ForeignKey(WooCommerceIntegration, on_delete=models.CASCADE, related_name='orders')
    order_id = models.IntegerField(unique=True)
    status = models.CharField(max_length=50)
    currency = models.CharField(max_length=10)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    date_created = models.DateTimeField()
    billing = models.JSONField()
    shipping = models.JSONField()
    line_items = models.JSONField(default=dict)

    def __str__(self):
        return f"Order {self.order_id} - {self.status}"

def get_default_user_id():
    return settings.DEFAULT_USER_ID

class ShopifyIntegration(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, default=get_default_user_id)
    shop_url = models.URLField(unique=True)
    access_token = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    access_token_last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('user', 'shop_url')

    def __str__(self):
        return f"{self.user.email} - {self.shop_url}"

class ShopifyOrder(models.Model):
    integration = models.ForeignKey(ShopifyIntegration, on_delete=models.CASCADE, related_name='orders')
    id = models.BigAutoField(primary_key=True)
    email = models.EmailField(max_length=255)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    total_price = models.DecimalField(max_digits=10, decimal_places=2)
    subtotal_price = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3)
    financial_status = models.CharField(max_length=50)
    fulfillment_status = models.CharField(max_length=50)
    customer_id = models.BigIntegerField()
    shipping_address = models.TextField()
    billing_address = models.TextField()

    class Meta:
        db_table = 'shopify_orders'

    def __str__(self):
        return f"Shopify Order {self.id}"

class ShopifyProduct(models.Model):
    id = models.BigAutoField(primary_key=True)
    integration = models.ForeignKey(ShopifyIntegration, on_delete=models.CASCADE, related_name='products')
    product_id = models.BigIntegerField(unique=True)
    title = models.CharField(max_length=255)
    body_html = models.TextField()
    vendor = models.CharField(max_length=255)
    product_type = models.CharField(max_length=255)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()
    published_at = models.DateTimeField()
    template_suffix = models.CharField(max_length=255, blank=True, null=True)
    status = models.CharField(max_length=255)
    published_scope = models.CharField(max_length=255)
    tags = models.CharField(max_length=255, blank=True, null=True)
    admin_graphql_api_id = models.CharField(max_length=255)

    class Meta:
        db_table = 'shopify_products'

    def __str__(self):
        return f"Shopify Product {self.id}"

class ShopifyCustomer(models.Model):
    id = models.BigAutoField(primary_key=True)
    integration = models.ForeignKey(ShopifyIntegration, on_delete=models.CASCADE, related_name='customers')
    customer_id = models.BigIntegerField(unique=True)
    email = models.EmailField(max_length=255)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    created_at = models.DateTimeField()
    updated_at = models.DateTimeField()

    class Meta:
        db_table = 'shopify_customers'

    def __str__(self):
        return f"Shopify Customer {self.id}"

class ShopifyOrderItem(models.Model):
    id = models.BigAutoField(primary_key=True)
    order = models.ForeignKey(ShopifyOrder, on_delete=models.CASCADE, related_name='items')
    product_id = models.BigIntegerField()
    variant_id = models.BigIntegerField()
    title = models.CharField(max_length=255)
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    sku = models.CharField(max_length=100)

    class Meta:
        db_table = 'shopify_order_items'

    def __str__(self):
        return f"Shopify Item {self.id} for Order {self.order.id}"

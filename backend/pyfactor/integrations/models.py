from django.db import models

# Create your models here.
#/Users/kuoldeng/projectx/backend/pyfactor/integrations/models.py
from django.db import models
from users.models import UserProfile
from django.db.models import JSONField


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
        ('other', 'Other'),
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

class WooCommerceOrder(models.Model):
    integration = models.ForeignKey(WooCommerceIntegration, on_delete=models.CASCADE, related_name='orders')
    order_id = models.IntegerField(unique=True)
    status = models.CharField(max_length=50)
    currency = models.CharField(max_length=10)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    date_created = models.DateTimeField()
    billing = JSONField()
    shipping = JSONField()
    line_items = JSONField(default=dict)

    def __str__(self):
        return f"Order {self.order_id} - {self.status}"
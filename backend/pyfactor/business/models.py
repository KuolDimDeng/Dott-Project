from django.db import models
from django.conf import settings
from django.utils import timezone

class Subscription(models.Model):
    SUBSCRIPTION_CHOICES = (
        ('free', 'FREE'),
        ('professional', 'Professional'),

    )

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    subscription_type = models.CharField(max_length=20, choices=SUBSCRIPTION_CHOICES, default='trial')
    start_date = models.DateTimeField(default=timezone.now)
    #end_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"Subscription (ID: {self.id})"

class Billing(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=8, decimal_places=2)
    transaction_date = models.DateTimeField(default=timezone.now)
    transaction_id = models.CharField(max_length=100, unique=True)

    def __str__(self):
        return f"{self.user.username}'s billing - {self.transaction_id}"
    
    def get_subscription_price(subscription_type):
        if subscription_type == 'free':
            return 0
        elif subscription_type == 'professional':
            return 19.99
        else:
            return 0
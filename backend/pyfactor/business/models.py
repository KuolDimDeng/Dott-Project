from django.db import models
from django.conf import settings
from django.utils import timezone
from hr.models import Employee

import uuid
from django_countries.fields import CountryField

BUSINESS_TYPES = [
    ('ecommerce', 'E-Commerce'),
    ('SUBSCRIPTION_SERVICES', 'Subscription-Based Services'),
    ('CONTENT_CREATION', 'Content Creation and Monetization'),
    ('FREELANCING', 'Freelancing'),
    ('FOOD_BEVERAGE', 'Food and Beverage'),
    ('HEALTHCARE', 'Healthcare'),
    ('REAL_ESTATE_CONSTRUCTION', 'Real Estate and Construction'),
    ('NON_PROFIT', 'Non-Profit'),
    ('TRANSPORTATION', 'Transportation'),
    ('HOSPITALITY', 'Hospitality'),
    ('PROPERTY_MANAGEMENT', 'Property Management'),
    ('STORAGE', 'Storage'),
]

class Business(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='owned_businesses', null=True)
    business_num = models.CharField(max_length=6, unique=True, editable=False)
    name = models.CharField(max_length=200)
    business_type = models.CharField(max_length=50, choices=BUSINESS_TYPES)
    street = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=200, blank=True)
    state = models.CharField(max_length=200, blank=True)
    postcode = models.CharField(max_length=20, blank=True)
    country = CountryField(default='US')
    address = models.TextField()  # Add this field
    email = models.EmailField()  # Add this field
    phone_number = models.CharField(max_length=20, blank=True)
    database_name = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, through='BusinessMember', related_name='businesses')

    def save(self, *args, **kwargs):
        if not self.owner_id and hasattr(self, '_owner_id'):
            self.owner_id = self._owner_id
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name if self.name else f"Business {self.pk if self.pk else 'unsaved'}"

class Subscription(models.Model):

    SUBSCRIPTION_TYPES = (
        ('free', 'Free Plan'),
        ('professional', 'Professional Plan'),

    )
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='subscriptions')
    subscription_type = models.CharField(max_length=20, choices=SUBSCRIPTION_TYPES)
    start_date = models.DateField()
    is_active = models.BooleanField(default=True)
    end_date = models.DateField(null=True, blank=True)

    def __str__(self):
        return f"Subscription {self.pk if self.pk else 'unsaved'}"

class Billing(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='billings')
    subscription = models.ForeignKey(Subscription, on_delete=models.SET_NULL, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField(default=timezone.now)
    is_paid = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.business.name} - {self.amount} - {self.date}"
    
class BusinessMember(models.Model):
    ROLE_CHOICES = [
        ('OWNER', 'Business Owner'),
        ('ADMIN', 'Administrator'),
        ('EMPLOYEE', 'Employee'),
        ('ACCOUNTANT', 'Accountant'),
        ('HR_ADMIN', 'HR Administrator'),
        ('MANAGER', 'Manager'),
        ('VIEWER', 'Viewer'),
        # Add more roles as needed
    ]

    business = models.ForeignKey('Business', on_delete=models.CASCADE, related_name='business_memberships')    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='business_memberships')
    employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, related_name='business_memberships')
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('business', 'user')

    def __str__(self):
        return f"{self.user.email} - {self.business.name} - {self.get_role_display()}"
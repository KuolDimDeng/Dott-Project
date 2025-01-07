from django.db import models
from django.conf import settings
from django.utils import timezone
from hr.models import Employee

import uuid
from django_countries.fields import CountryField

from .choices import (
    BUSINESS_TYPES, 
    LEGAL_STRUCTURE_CHOICES, 
    SUBSCRIPTION_TYPES,
    BILLING_CYCLES
)




class Business(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_businesses'
    )    
    business_num = models.CharField(max_length=6, unique=True, editable=False)
    business_name = models.CharField(max_length=200)
    business_type = models.CharField(max_length=50, choices=BUSINESS_TYPES)
    street = models.CharField(max_length=200, blank=True)
    city = models.CharField(max_length=200, blank=True)
    state = models.CharField(max_length=200, blank=True)
    postcode = models.CharField(max_length=20, blank=True)
    country = CountryField(default='US')
    address = models.TextField(null=True, blank=True)  # Make optional if not required immediately
    email = models.EmailField(null=True, blank=True)  # Make optional if not required immediately
    phone_number = models.CharField(max_length=20, blank=True)
    database_name = models.CharField(max_length=255, unique=True, null=True, blank=True)  # Allow null initially
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)
    members = models.ManyToManyField(settings.AUTH_USER_MODEL, through='BusinessMember', related_name='businesses')
    
    legal_structure = models.CharField(
        max_length=50,
        choices=LEGAL_STRUCTURE_CHOICES,
        default='SOLE_PROPRIETORSHIP'
    )
    
    
    date_founded = models.DateField(
        null=True,
        blank=True,
        help_text="The date when the business was founded"
    )

    def save(self, *args, **kwargs):
        if not self.owner_id and hasattr(self, '_owner_id'):
            self.owner_id = self._owner_id
        super().save(*args, **kwargs)


    def __str__(self):
        return self.business_name if self.business_name else f"Business {self.pk if self.pk else 'unsaved'}"

    class Meta:
        indexes = [
            models.Index(fields=['business_num']),
            models.Index(fields=['business_name']),
            models.Index(fields=['database_name']),
            models.Index(fields=['owner']),
        ]



class Subscription(models.Model):

    
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='subscriptions')
    subscription_type = models.CharField(
        max_length=20, 
        choices=SUBSCRIPTION_TYPES
    )
    start_date = models.DateField()
    is_active = models.BooleanField(default=True)
    end_date = models.DateField(null=True, blank=True)
    billing_cycle = models.CharField(
            max_length=20, 
            choices=BILLING_CYCLES, 
            default='monthly'
        )

    def __str__(self):
        return f"Subscription {self.pk if self.pk else 'unsaved'}"

class Billing(models.Model):
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='billings')
    subscription = models.ForeignKey(Subscription, on_delete=models.SET_NULL, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField(default=timezone.now)
    is_paid = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.business.business_name} - {self.amount} - {self.date}"
    
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
        return f"{self.user.email} - {self.business.business_name} - {self.get_role_display()}"
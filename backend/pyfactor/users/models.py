import re
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models, connections
from django.utils import timezone
from django_countries.fields import CountryField
from django.core.exceptions import ValidationError
from business.models import Business
from custom_auth.models import User
import uuid




class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    business = models.ForeignKey('business.Business', on_delete=models.SET_NULL, null=True, related_name='employees')
    occupation = models.CharField(max_length=200, null=True)
    street = models.CharField(max_length=200, null=True)
    city = models.CharField(max_length=200, null=True)
    state = models.CharField(max_length=200, null=True)
    postcode = models.CharField(max_length=200, null=True)
    country = CountryField(default='US')
    phone_number = models.CharField(max_length=200, null=True)
    database_name = models.CharField(max_length=255, unique=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True, null=True)
    is_business_owner = models.BooleanField(default=False)
    shopify_access_token = models.CharField(max_length=255, null=True, blank=True)

    def to_dict(self):
        return {
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'full_name': self.user.get_full_name(),
            'occupation': self.occupation,
            'business_name': self.business.name if self.business_id is not None else None,
            'database_name': self.database_name,
            # Add other fields as needed
        }

    def save(self, *args, **kwargs):
        if not self.database_name and self.user:
            safe_id = re.sub(r'[^a-zA-Z0-9_]', '', str(self.user.id).replace('-', '_'))
            safe_email = re.sub(r'[^a-zA-Z0-9_]', '', self.user.email.split('@')[0])
            self.database_name = f"{safe_id}_{safe_email}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"User Profile: {self.id}"  # Changed from self.user.email to self.id


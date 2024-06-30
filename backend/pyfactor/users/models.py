from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from django_countries.fields import CountryField
from django.core.exceptions import ValidationError

BUSINESS_TYPES = [
    ('COMMERCE', 'Commerce'),
    ('CHARITY', 'Charity'),
    ('HOSPITALITY', 'Hospitality'),
    ('PROPERTY_MANAGEMENT', 'Property Management'),
    ('TRANSPORTATION', 'Transportation'),
    ('STORAGE', 'Storage'),
]

class UserManager(BaseUserManager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)

        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superuser must have is_staff=True.')
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must have is_superuser=True.')

        return self.create_user(email, password, **extra_fields)
    
    def get_by_natural_key(self, email):
        return self.get(email=email)

class User(AbstractBaseUser, PermissionsMixin):
    email = models.EmailField('email address', unique=True)
    first_name = models.CharField(max_length=100, blank=True)
    last_name = models.CharField(max_length=100, blank=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)

    USERNAME_FIELD = 'email'
    EMAIL_FIELD = 'email'
    REQUIRED_FIELDS = []

    objects = UserManager()

    class Meta:
        db_table = 'users_user'

    def __str__(self):
        return self.email

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

    def get_short_name(self):
        return self.first_name

class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    business_name = models.CharField(max_length=200, null=True)
    business_type = models.CharField(max_length=20, choices=BUSINESS_TYPES, null=True)
    occupation = models.CharField(max_length=200, null=True)
    street = models.CharField(max_length=200, null=True)
    city = models.CharField(max_length=200, null=True)
    state = models.CharField(max_length=200, null=True)
    postcode = models.CharField(max_length=200, null=True)
    country = CountryField(default='US')
    phone_number = models.CharField(max_length=200, null=True)
    database_name = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True, null=True)

    def to_dict(self):
        return {
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'full_name': self.user.get_full_name(),
            'occupation': self.occupation,
            'business_name': self.business_name,
            'database_name': self.database_name,
            # Add other fields as needed
        }

    def save(self, *args, **kwargs):
        if self.pk is None and not self.user:
            raise ValidationError('UserProfile must have an associated User instance.')
        super().save(*args, **kwargs)

    def __str__(self):
        return f"User Profile: {self.id}"

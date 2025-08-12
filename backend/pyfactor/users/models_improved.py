# Improved models that preserve multi-tenant RLS architecture
# This file shows the new structure - we'll migrate to this gradually

import uuid
import logging
from django.db import models
from django.utils import timezone
from django_countries.fields import CountryField
from custom_auth.models import User
from custom_auth.tenant_base_model import TenantAwareModel

logger = logging.getLogger(__name__)

# Import choices
from users.choices import (
    BUSINESS_TYPES,
    LEGAL_STRUCTURE_CHOICES,
    SUBSCRIPTION_TYPES,
    BILLING_CYCLES
)
from users.business_categories import SIMPLIFIED_BUSINESS_TYPES


class Business(TenantAwareModel):
    """
    Improved Business model that consolidates essential fields
    while preserving multi-tenant RLS architecture.
    
    Key principle: business.id == tenant.id for RLS compatibility
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Keep tenant_id from TenantAwareModel parent
    # In our system: tenant_id == business.id (they're the same entity)
    
    # Business identification
    name = models.CharField(max_length=255, db_index=True)
    business_num = models.CharField(max_length=6, unique=True, null=True, blank=True)
    
    # Owner relationship - improved with proper FK
    owner = models.ForeignKey(
        User, 
        on_delete=models.CASCADE,
        related_name='owned_businesses',
        null=True,  # Nullable during migration
        blank=True,
        db_column='owner_id',  # Keep existing column name
        help_text="The user who owns this business"
    )
    
    # Essential business details (moved from BusinessDetails)
    business_type = models.CharField(
        max_length=50, 
        choices=BUSINESS_TYPES, 
        blank=True, 
        null=True,
        db_index=True
    )
    simplified_business_type = models.CharField(
        max_length=50,
        choices=SIMPLIFIED_BUSINESS_TYPES,
        null=True,
        blank=True,
        help_text="Simplified category for feature access (SERVICE/RETAIL/MIXED)"
    )
    legal_structure = models.CharField(
        max_length=50,
        choices=LEGAL_STRUCTURE_CHOICES,
        default='SOLE_PROPRIETORSHIP'
    )
    
    # Location (essential for tax/currency)
    country = CountryField(default='US', db_index=True)
    date_founded = models.DateField(null=True, blank=True)
    
    # Currency preferences (essential for display)
    preferred_currency_code = models.CharField(
        max_length=3,
        default='USD',
        db_index=True,
        help_text='3-letter ISO currency code'
    )
    preferred_currency_name = models.CharField(
        max_length=50,
        default='US Dollar'
    )
    preferred_currency_symbol = models.CharField(
        max_length=10,
        default='$'
    )
    currency_updated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Last manual currency update'
    )
    
    # Accounting preferences
    accounting_standard = models.CharField(
        max_length=10,
        choices=[
            ('IFRS', 'IFRS (International)'),
            ('GAAP', 'US GAAP'),
        ],
        default='IFRS'
    )
    
    # Logo (base64 stored in DB for simplicity)
    logo_data = models.TextField(
        null=True,
        blank=True,
        help_text='Business logo as base64 data URL'
    )
    
    # Stripe integration
    stripe_account_id = models.CharField(
        max_length=255, 
        null=True, 
        blank=True, 
        unique=True,
        db_index=True
    )
    stripe_onboarding_complete = models.BooleanField(default=False)
    stripe_charges_enabled = models.BooleanField(default=False)
    stripe_payouts_enabled = models.BooleanField(default=False)
    stripe_customer_id = models.CharField(max_length=100, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = 'users_business'  # Keep existing table
        indexes = [
            models.Index(fields=['business_num']),
            models.Index(fields=['owner', 'is_active']),
            models.Index(fields=['stripe_account_id']),
            models.Index(fields=['country', 'preferred_currency_code']),
        ]
    
    def save(self, *args, **kwargs):
        """Override save to maintain tenant_id = business.id"""
        # Generate business number if needed
        if not self.business_num:
            self.business_num = self.generate_business_number()
        
        # CRITICAL: Set tenant_id = business.id for RLS
        if not self.tenant_id:
            self.tenant_id = self.id
            
        # Auto-detect currency based on country
        if not self.currency_updated_at and self.country:
            from currency.currency_detection import detect_currency_for_country
            try:
                currency_info = detect_currency_for_country(str(self.country))
                if currency_info:
                    self.preferred_currency_code = currency_info['code']
                    self.preferred_currency_name = currency_info['name']
                    self.preferred_currency_symbol = currency_info['symbol']
            except Exception as e:
                logger.warning(f"Could not auto-detect currency: {e}")
        
        # Set accounting standard based on country
        if not self.accounting_standard:
            self.accounting_standard = 'GAAP' if str(self.country) == 'US' else 'IFRS'
            
        super().save(*args, **kwargs)
    
    def generate_business_number(self):
        """Generate unique 6-digit business number"""
        import random
        import string
        while True:
            number = ''.join(random.choices(string.digits, k=6))
            if not Business.objects.filter(business_num=number).exists():
                return number
    
    def __str__(self):
        return self.name
    
    @property
    def is_tenant(self):
        """This business IS the tenant in our multi-tenant system"""
        return True
    
    def get_currency_display(self):
        """Get formatted currency for display"""
        return f"{self.preferred_currency_code} ({self.preferred_currency_symbol})"


class BusinessMember(TenantAwareModel):
    """
    Improved membership model for multi-user businesses.
    Maintains RLS through TenantAwareModel.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    business = models.ForeignKey(
        Business, 
        on_delete=models.CASCADE, 
        related_name='members'
    )
    user = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='business_memberships'
    )
    
    ROLE_CHOICES = [
        ('owner', 'Business Owner'),
        ('admin', 'Administrator'),
        ('manager', 'Manager'),
        ('employee', 'Employee'),
        ('viewer', 'Viewer'),
    ]
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, db_index=True)
    
    # Permissions
    can_edit_business = models.BooleanField(default=False)
    can_manage_users = models.BooleanField(default=False)
    can_view_reports = models.BooleanField(default=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    joined_at = models.DateTimeField(auto_now_add=True)
    invited_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sent_invitations'
    )
    
    class Meta:
        db_table = 'users_businessmember'
        unique_together = ('business', 'user')
        indexes = [
            models.Index(fields=['business', 'is_active']),
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['role']),
        ]
    
    def save(self, *args, **kwargs):
        """Ensure tenant_id is set from business"""
        if not self.tenant_id and self.business_id:
            self.tenant_id = self.business_id
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.user.email} - {self.business.name} ({self.role})"


class UserProfile(models.Model):
    """
    Simplified UserProfile for personal information only.
    Business relationship is through User model.
    """
    user = models.OneToOneField(
        User, 
        on_delete=models.CASCADE, 
        related_name='profile'
    )
    
    # Personal contact information
    phone_number = models.CharField(max_length=200, null=True, blank=True)
    occupation = models.CharField(max_length=200, null=True, blank=True)
    
    # Personal address
    street = models.CharField(max_length=200, null=True, blank=True)
    city = models.CharField(max_length=200, null=True, blank=True)
    state = models.CharField(max_length=200, null=True, blank=True)
    county = models.CharField(max_length=100, null=True, blank=True)
    postcode = models.CharField(max_length=200, null=True, blank=True)
    country = CountryField(default='US')
    
    # Preferences
    show_whatsapp_commerce = models.BooleanField(
        null=True, 
        blank=True,
        help_text='Show WhatsApp Commerce in menu'
    )
    display_legal_structure = models.BooleanField(
        default=True,
        help_text='Show legal structure after business name'
    )
    
    # Metadata
    metadata = models.JSONField(default=dict, blank=True, null=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users_userprofile'
    
    def __str__(self):
        return f"Profile for {self.user.email}"
    
    def get_display_name(self):
        """Get user's display name"""
        if self.user.first_name or self.user.last_name:
            return f"{self.user.first_name} {self.user.last_name}".strip()
        return self.user.email.split('@')[0]


# Utility functions for business access (RLS-aware)
def get_user_business(user, use_tenant_context=True):
    """
    Get user's primary business (RLS-aware).
    
    Args:
        user: User object
        use_tenant_context: If True, respects current tenant context (RLS)
    
    Returns:
        Business object or None
    """
    if not user or not user.is_authenticated:
        return None
    
    # Method 1: Direct owned business (owner relationship)
    try:
        owned = user.owned_businesses.filter(is_active=True).first()
        if owned:
            return owned
    except Exception:
        pass
    
    # Method 2: Through membership (for non-owners)
    try:
        membership = user.business_memberships.filter(
            is_active=True
        ).select_related('business').first()
        if membership:
            return membership.business
    except Exception:
        pass
    
    # Method 3: Legacy business_id field (backward compatibility)
    if hasattr(user, 'business_id') and user.business_id:
        try:
            return Business.objects.get(id=user.business_id, is_active=True)
        except Business.DoesNotExist:
            pass
    
    # Method 4: Tenant-based lookup (current system)
    if hasattr(user, 'tenant_id') and user.tenant_id:
        try:
            return Business.objects.get(id=user.tenant_id, is_active=True)
        except Business.DoesNotExist:
            pass
    
    return None


def ensure_business_tenant_sync(business):
    """
    Ensure business.id == tenant.id for RLS compatibility.
    Call this after creating a business.
    """
    from custom_auth.models import Tenant
    
    # Check if tenant exists with same ID
    try:
        tenant = Tenant.objects.get(id=business.id)
        # Update tenant name to match business
        if tenant.name != business.name:
            tenant.name = business.name
            tenant.save()
    except Tenant.DoesNotExist:
        # Create tenant with same ID as business
        tenant = Tenant.objects.create(
            id=business.id,
            name=business.name,
            owner_id=str(business.owner_id) if business.owner_id else None,
            rls_enabled=True,
            is_active=business.is_active
        )
    
    return tenant
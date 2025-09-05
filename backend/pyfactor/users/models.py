#/Users/kuoldeng/projectx/backend/pyfactor/users/models.py
import re
import uuid
import logging
import random
import string
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models, connections
from django.utils import timezone
from django_countries.fields import CountryField
from django.core.exceptions import ValidationError
from django.core.validators import EmailValidator, MinValueValidator
from custom_auth.models import User

logger = logging.getLogger(__name__)

# Import choices from local choices module
from users.choices import (
    BUSINESS_TYPES,
    LEGAL_STRUCTURE_CHOICES,
    SUBSCRIPTION_TYPES,
    BILLING_CYCLES
)
from users.business_categories import SIMPLIFIED_BUSINESS_TYPES


# Business model moved from business app to users app
# Place business model definition before models that reference it
class Business(models.Model):
    """
    Business model - core model for storing business information.
    Consolidated to include essential fields for better performance.
    Maintains multi-tenant RLS architecture (tenant_id = business.id).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Note: owner_id is stored as UUID in DB but references integer User.id
    # This is a legacy schema issue. Use get_owner() method for safe access
    owner_id = models.UUIDField(verbose_name='Owner ID', null=True, blank=True)
    name = models.CharField(max_length=255)  # This matches the actual column in your DB
    
    # Entity type for progressive registration
    entity_type = models.CharField(
        max_length=20,
        choices=[
            ('INDIVIDUAL', 'Individual Service Provider'),
            ('SMALL_BUSINESS', 'Small Business (1-10 employees)'),
            ('MEDIUM_BUSINESS', 'Medium Business (11-50 employees)'),
            ('LARGE_COMPANY', 'Large Company (50+ employees)'),
            ('NON_PROFIT', 'Non-Profit Organization'),
        ],
        default='INDIVIDUAL',
        help_text='Type of business entity'
    )
    
    # Consolidated fields (previously in BusinessDetails)
    business_type = models.CharField(max_length=50, choices=BUSINESS_TYPES, blank=True, null=True)
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
    
    # Registration status
    registration_status = models.CharField(
        max_length=20,
        choices=[
            ('REGISTERED', 'Yes, fully registered'),
            ('INFORMAL', 'No, operating informally'),
            ('IN_PROCESS', 'Registration in process'),
        ],
        default='INFORMAL',
        help_text='Business registration status'
    )
    registration_number = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='Business registration or license number'
    )
    
    country = CountryField(default='US')
    date_founded = models.DateField(null=True, blank=True)
    
    # Currency preferences (essential for display)
    preferred_currency_code = models.CharField(
        max_length=3,
        default='USD',
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
    
    # Contact information
    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        help_text='Primary business phone number'
    )
    email = models.EmailField(
        max_length=254,
        blank=True,
        null=True,
        help_text='Primary business email'
    )
    address = models.TextField(
        blank=True,
        null=True,
        help_text='Business street address'
    )
    city = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text='City where business is located'
    )
    
    # Marketplace fields
    marketplace_category = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        help_text='Category for marketplace search visibility'
    )
    delivery_scope = models.CharField(
        max_length=20,
        choices=[
            ('local', 'Local Delivery Only'),
            ('national', 'Nationwide Delivery'),
            ('international', 'International Shipping'),
            ('digital', 'Digital/Online Service'),
        ],
        default='local',
        help_text='How far the business can deliver'
    )
    
    # Logo (base64 stored in DB for simplicity)
    logo_data = models.TextField(
        null=True,
        blank=True,
        help_text='Business logo as base64 data URL'
    )
    
    # Multi-tenant field (RLS)
    tenant_id = models.UUIDField(null=True, blank=True, db_index=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)  # This matches 'updated_at' in your DB
    business_num = models.CharField(max_length=6, unique=True, null=True, blank=True)
    
    # Stripe Connect fields
    stripe_account_id = models.CharField(max_length=255, null=True, blank=True, unique=True, help_text="Stripe Connect Express account ID")
    stripe_onboarding_complete = models.BooleanField(default=False, help_text="Whether Stripe Connect onboarding is complete")
    stripe_charges_enabled = models.BooleanField(default=False, help_text="Whether the connected account can accept charges")
    stripe_payouts_enabled = models.BooleanField(default=False, help_text="Whether the connected account can receive payouts")
    
    # Stripe Customer fields for ACH debits (payroll)
    stripe_customer_id = models.CharField(max_length=100, blank=True, help_text="Stripe Customer ID for ACH debits")
    default_bank_token = models.CharField(max_length=100, blank=True, help_text="Payment method ID for ACH debits")
    ach_mandate_id = models.CharField(max_length=100, blank=True, help_text="ACH mandate for recurring debits")
    
    # Payroll bank account assignment
    payroll_bank_account_id = models.UUIDField(null=True, blank=True, help_text="Bank account designated for payroll processing")

    # Helper property for backward compatibility with BusinessDetails
    @property
    def details(self):
        """Get the related BusinessDetails instance (for backward compatibility)"""
        from users.models import BusinessDetails
        try:
            return BusinessDetails.objects.get(business=self)
        except BusinessDetails.DoesNotExist:
            return None

    # Virtual properties to maintain compatibility with existing code
    @property
    def business_name(self):
        return self.name
        
    @business_name.setter
    def business_name(self, value):
        self.name = value
    
    def get_currency_display(self):
        """Get formatted currency for display"""
        return f"{self.preferred_currency_code} ({self.preferred_currency_symbol})"
    
    def get_owner(self):
        """
        Safely get the owner User object despite schema mismatch.
        owner_id is stored as UUID but actually contains integer User.id values.
        """
        if not self.owner_id:
            return None
        
        try:
            # Try to extract integer from UUID bytes
            # The UUID might be storing an integer like 250 as 00000000-0000-0000-0000-0000000000fa
            owner_id_str = str(self.owner_id)
            
            # Check if it's a special format UUID with integer in last part
            if owner_id_str.startswith('00000000-0000-0000-0000-'):
                # Extract the hex value from the last segment
                hex_part = owner_id_str.split('-')[-1]
                owner_id_int = int(hex_part, 16)
                
                from custom_auth.models import User
                return User.objects.filter(id=owner_id_int).first()
            
            # Otherwise try direct integer conversion
            owner_id_int = int(str(self.owner_id).replace('-', ''), 16)
            if owner_id_int < 1000000:  # Reasonable user ID range
                from custom_auth.models import User
                return User.objects.filter(id=owner_id_int).first()
                
        except (ValueError, TypeError):
            pass
        
        return None


    def save(self, *args, **kwargs):
        # Generate a unique business number if not provided
        if not self.business_num:
            self.business_num = self.generate_business_number()
        
        # CRITICAL: Set tenant_id = business.id for RLS
        if not self.tenant_id:
            self.tenant_id = self.id
        
        # Auto-detect currency based on country if not manually set
        if not self.currency_updated_at and self.country:
            try:
                from currency.currency_detection import detect_currency_for_country
                currency_info = detect_currency_for_country(str(self.country))
                if currency_info:
                    self.preferred_currency_code = currency_info['code']
                    self.preferred_currency_name = currency_info['name']
                    self.preferred_currency_symbol = currency_info['symbol']
            except Exception as e:
                logger.debug(f"Could not auto-detect currency: {e}")
        
        # Set accounting standard based on country
        if not self.accounting_standard:
            self.accounting_standard = 'GAAP' if str(self.country) == 'US' else 'IFRS'

        # Perform the actual save operation
        super().save(*args, **kwargs)
        
        # Sync BusinessDetails for backward compatibility
        if hasattr(self, '_sync_to_details') and self._sync_to_details:
            from users.models import BusinessDetails
            try:
                details, created = BusinessDetails.objects.get_or_create(
                    business=self,
                    defaults={
                        'business_type': self.business_type,
                        'simplified_business_type': self.simplified_business_type,
                        'legal_structure': self.legal_structure,
                        'country': self.country,
                        'date_founded': self.date_founded,
                        'preferred_currency_code': self.preferred_currency_code,
                        'preferred_currency_name': self.preferred_currency_name,
                        'preferred_currency_symbol': self.preferred_currency_symbol,
                        'currency_updated_at': self.currency_updated_at,
                        'accounting_standard': self.accounting_standard,
                        'logo_data': self.logo_data
                    }
                )
                if not created:
                    # Update existing details
                    for field in ['business_type', 'simplified_business_type', 'legal_structure',
                                  'country', 'date_founded', 'preferred_currency_code',
                                  'preferred_currency_name', 'preferred_currency_symbol',
                                  'currency_updated_at', 'accounting_standard', 'logo_data']:
                        setattr(details, field, getattr(self, field))
                    details.save()
            except Exception as e:
                logger.debug(f"Could not sync to BusinessDetails: {e}")

    def generate_business_number(self):
        """Generate a unique 6-digit business number"""
        import random
        import string
        while True:
            number = ''.join(random.choices(string.digits, k=6))
            if not Business.objects.filter(business_num=number).exists():
                return number

    def __str__(self):
        return self.name

    class Meta:
        db_table = 'users_business'  # Explicitly set the table name
        indexes = [
            models.Index(fields=['business_num']),
        ]

class BusinessDetails(models.Model):
    """
    BusinessDetails model - extends Business model with additional fields.
    This is a one-to-one extension that stores business type, legal structure,
    and other business-related details.
    
    Note: The business_type field here is the canonical source of the
    business_type value, accessed via a property on the Business model.
    """
    business = models.OneToOneField(Business, on_delete=models.CASCADE, primary_key=True, related_name='details')
    business_type = models.CharField(max_length=50, choices=BUSINESS_TYPES, blank=True, null=True)
    business_subtype_selections = models.JSONField(default=dict, blank=True)
    legal_structure = models.CharField(
        max_length=50,
        choices=LEGAL_STRUCTURE_CHOICES,
        default='SOLE_PROPRIETORSHIP'
    )
    date_founded = models.DateField(null=True, blank=True)
    country = CountryField(default='US')
    
    # Simplified business type for feature access (added 2025-07-26)
    # Only applies to new users onboarding after this date
    simplified_business_type = models.CharField(
        max_length=50,
        choices=SIMPLIFIED_BUSINESS_TYPES,
        null=True,
        blank=True,
        help_text="Simplified business category for feature access (Jobs/POS)"
    )
    
    # Business Logo field - deprecated, use logo_data instead
    logo = models.ImageField(
        upload_to='business_logos/',
        null=True,
        blank=True,
        max_length=500,
        help_text='Business logo (max 5MB, JPG/PNG/GIF/WebP) - DEPRECATED'
    )
    
    # Business Logo stored as base64 in database
    logo_data = models.TextField(
        null=True,
        blank=True,
        help_text='Business logo stored as base64 data URL (e.g., data:image/png;base64,...)'
    )
    
    # Currency preferences
    preferred_currency_code = models.CharField(
        max_length=3,
        default='USD',
        help_text='3-letter ISO currency code (e.g., USD, EUR, KES)'
    )
    preferred_currency_name = models.CharField(
        max_length=50,
        default='US Dollar',
        help_text='Full currency name'
    )
    preferred_currency_symbol = models.CharField(
        max_length=10,
        default='$',
        help_text='Currency symbol (e.g., $, €, £)'
    )
    currency_updated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Last time currency was updated'
    )
    
    # USD display toggles
    show_usd_on_invoices = models.BooleanField(
        default=True,
        help_text='Show USD equivalent in parentheses on invoices'
    )
    show_usd_on_quotes = models.BooleanField(
        default=True,
        help_text='Show USD equivalent in parentheses on quotes'
    )
    show_usd_on_reports = models.BooleanField(
        default=False,
        help_text='Show USD equivalent in parentheses on reports'
    )
    
    # Accounting Standards
    accounting_standard = models.CharField(
        max_length=10,
        choices=[
            ('IFRS', 'IFRS (International)'),
            ('GAAP', 'US GAAP'),
        ],
        default='IFRS',
        help_text='Accounting standard used for financial reporting'
    )
    accounting_standard_updated_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text='Last time accounting standard was changed'
    )
    
    # Inventory valuation method (depends on accounting standard)
    inventory_valuation_method = models.CharField(
        max_length=20,
        choices=[
            ('FIFO', 'First In, First Out (FIFO)'),
            ('LIFO', 'Last In, First Out (LIFO)'),
            ('WEIGHTED_AVERAGE', 'Weighted Average'),
        ],
        default='WEIGHTED_AVERAGE',
        help_text='Inventory valuation method (LIFO only available for US GAAP)'
    )
    
    # Additional fields
    
    def save(self, *args, **kwargs):
        """Override save to automatically set simplified_business_type based on business_type"""
        if self.business_type and not self.simplified_business_type:
            # Import here to avoid circular import
            from .business_categories import get_simplified_business_type
            self.simplified_business_type = get_simplified_business_type(self.business_type)
        
        # Set default accounting standard based on country if not already set
        if not self.accounting_standard and self.country:
            from .accounting_standards import get_default_accounting_standard
            self.accounting_standard = get_default_accounting_standard(self.country)
            self.accounting_standard_updated_at = timezone.now()
        
        # Validate inventory valuation method
        if self.accounting_standard == 'IFRS' and self.inventory_valuation_method == 'LIFO':
            # LIFO is not allowed under IFRS, switch to weighted average
            self.inventory_valuation_method = 'WEIGHTED_AVERAGE'
        
        super().save(*args, **kwargs)
    
    class Meta:
        db_table = 'users_business_details'

class Subscription(models.Model):
    SUBSCRIPTION_STATUS_CHOICES = [
        ('active', 'Active'),
        ('past_due', 'Past Due'),
        ('grace_period', 'Grace Period'),
        ('suspended', 'Suspended'),
        ('canceled', 'Canceled')
    ]
    
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='subscriptions')
    selected_plan = models.CharField(
        max_length=20,
        choices=[
            ('free', 'Free'),
            ('professional', 'Professional')
        ],
        default='free'
    )
    start_date = models.DateField()
    is_active = models.BooleanField(default=True)
    end_date = models.DateField(null=True, blank=True)
    billing_cycle = models.CharField(
            max_length=20,
            choices=BILLING_CYCLES,
            default='monthly'
        )
    stripe_subscription_id = models.CharField(max_length=255, null=True, blank=True, unique=True)
    
    # Grace period fields
    status = models.CharField(
        max_length=20,
        choices=SUBSCRIPTION_STATUS_CHOICES,
        default='active'
    )
    grace_period_ends = models.DateTimeField(null=True, blank=True)
    failed_payment_count = models.IntegerField(default=0)
    last_payment_attempt = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Subscription {self.pk if self.pk else 'unsaved'}"
    
    @property
    def is_in_grace_period(self):
        """Check if subscription is currently in grace period"""
        from django.utils import timezone
        return (
            self.status in ['past_due', 'grace_period'] and 
            self.grace_period_ends and 
            self.grace_period_ends > timezone.now()
        )
    
    @property
    def grace_period_expired(self):
        """Check if grace period has expired"""
        from django.utils import timezone
        return (
            self.grace_period_ends and 
            self.grace_period_ends <= timezone.now()
        )
    
    @property
    def should_have_access(self):
        """Determine if user should have paid plan access"""
        return self.status == 'active' or self.is_in_grace_period
    
    def start_grace_period(self, days=7):
        """Start grace period for failed payment"""
        from django.utils import timezone
        from datetime import timedelta
        
        self.status = 'grace_period'
        self.grace_period_ends = timezone.now() + timedelta(days=days)
        self.failed_payment_count += 1
        self.last_payment_attempt = timezone.now()
        self.save(update_fields=['status', 'grace_period_ends', 'failed_payment_count', 'last_payment_attempt'])
    
    def suspend_subscription(self):
        """Suspend subscription after grace period expires"""
        self.status = 'suspended'
        self.is_active = False
        self.grace_period_ends = None
        self.save(update_fields=['status', 'is_active', 'grace_period_ends'])
    
    def reactivate_subscription(self):
        """Reactivate subscription after successful payment"""
        self.status = 'active'
        self.is_active = True
        self.grace_period_ends = None
        self.failed_payment_count = 0
        self.save(update_fields=['status', 'is_active', 'grace_period_ends', 'failed_payment_count'])

class BusinessMember(models.Model):
    ROLE_CHOICES = [
        ('owner', 'Business Owner'),
        ('employee', 'employee')
    ]

    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='business_memberships')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='business_memberships')
    #employee = models.ForeignKey('hr.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='business_memberships')
    employee = None  # Will fix this after initial migration
    role = models.CharField(max_length=20, choices=ROLE_CHOICES)
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('business', 'user')

    # type: ignore[attr-defined] - Django automatically adds get_role_display method
    def __str__(self):
        # Get the display value for role manually to avoid linter error
        role_display = dict(self.ROLE_CHOICES).get(self.role, self.role)
        return f"{self.user.email} - {self.business.business_name} - {role_display}"


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile', unique=True)
    # Use direct ID field for business relationship to be explicit
    business_id = models.UUIDField(null=True, blank=True)
    # Add property for backward compatibility
    @property
    def business(self):
        if not self.business_id:
            return None
        try:
            return Business.objects.get(id=self.business_id)
        except Business.DoesNotExist:
            return None
    
    @business.setter
    def business(self, business_obj):
        if business_obj is None:
            self.business_id = None
        else:
            self.business_id = business_obj.id
            
    # Use direct ID field for tenant relationship
    tenant_id = models.UUIDField(null=True, blank=True)
    # Add property for backward compatibility
    @property
    def tenant(self):
        if not self.tenant_id:
            return None
        from django.apps import apps
        Tenant = apps.get_model('custom_auth', 'Tenant')
        try:
            return Tenant.objects.get(id=self.tenant_id)
        except Tenant.DoesNotExist:
            return None
    
    @tenant.setter
    def tenant(self, tenant_obj):
        if tenant_obj is None:
            self.tenant_id = None
        else:
            self.tenant_id = tenant_obj.id
    
    # Keep existing fields
    occupation = models.CharField(max_length=200, null=True, blank=True)
    street = models.CharField(max_length=200, null=True, blank=True)
    city = models.CharField(max_length=200, null=True, blank=True)
    state = models.CharField(max_length=200, null=True, blank=True)
    county = models.CharField(max_length=100, null=True, blank=True, help_text='County for business location')
    postcode = models.CharField(max_length=200, null=True, blank=True)
    country = CountryField(default='US')
    phone_number = models.CharField(max_length=200, null=True, blank=True)
    
    # WhatsApp Business preference - defaults based on country
    show_whatsapp_commerce = models.BooleanField(null=True, blank=True, help_text='Whether to show WhatsApp Commerce in menu (null = use country default)')
    
    # Legal structure display preference
    display_legal_structure = models.BooleanField(default=True, help_text='Whether to show legal structure (LLC, Corp, Ltd) after business name in header')
    
    # POS preferences
    show_zero_stock_pos = models.BooleanField(default=False, help_text='Whether to show products with zero stock in POS (for backorders)')
    
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)
    # Add updated_at field to match database schema
    updated_at = models.DateTimeField(auto_now=True)  # Ensure this field exists
    # Ensure we only have one auto-updating timestamp field to avoid confusion
    # modified_at will be used as the standard field for tracking updates

    is_business_owner = models.BooleanField(default=False)
    shopify_access_token = models.CharField(max_length=255, null=True, blank=True)
    # Deprecated: schema_name is no longer used with RLS approach
    # schema_name = models.CharField(max_length=63, null=True, blank=True)
    
    # Add metadata field to store additional information like pending schema setup
    metadata = models.JSONField(default=dict, blank=True, null=True)
    
    # Schema setup tracking fields
    setup_task_id = models.CharField(max_length=255, null=True, blank=True)
    setup_status = models.CharField(max_length=20, default='not_started',
                                  choices=[
                                      ('not_started', 'Not Started'),
                                      ('pending', 'Pending'),
                                      ('in_progress', 'In Progress'),
                                      ('complete', 'Complete'),
                                      ('error', 'Error'),
                                  ])
    setup_started_at = models.DateTimeField(null=True, blank=True)
    setup_completed_at = models.DateTimeField(null=True, blank=True) 
    setup_error = models.TextField(null=True, blank=True)
    
    # Move these fields to the Tenant model as they're tenant-specific
    # Remove:
    # - database_name
    # - database_status
    # - last_setup_attempt
    # - setup_error_message
    # - database_setup_task_id
    # - last_health_check

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['user'], name='unique_user_profile'),
            # Remove database_name constraint as it moves to Tenant model
        ]
        indexes = [
            models.Index(fields=['tenant_id']),  # Index for tenant ID queries
            models.Index(fields=['business_id']),  # Index for business ID queries
        ]

    def get_whatsapp_commerce_preference(self):
        """
        Get the effective WhatsApp Commerce preference for this user.
        Returns True/False based on user preference or country default.
        """
        # If user has explicitly set a preference, use it
        if self.show_whatsapp_commerce is not None:
            return self.show_whatsapp_commerce
        
        # Otherwise, use country default
        if self.country:
            try:
                from django.conf import settings
                import importlib.util
                
                # Import the WhatsApp country detection utility
                whatsapp_util_path = settings.BASE_DIR.parent / 'frontend' / 'pyfactor_next' / 'src' / 'utils' / 'whatsappCountryDetection.js'
                
                # For now, we'll implement a simple check based on known WhatsApp business countries
                # This should match the logic in whatsappCountryDetection.js
                whatsapp_business_countries = [
                    # Africa
                    'NG', 'ZA', 'KE', 'GH', 'EG', 'MA', 'TN', 'DZ', 'ET', 'UG', 'TZ', 'ZW',
                    'ZM', 'BW', 'MW', 'MZ', 'AO', 'CM', 'CI', 'SN', 'ML', 'BF', 'NE', 'TD',
                    'GN', 'RW', 'BI', 'TG', 'BJ', 'LR', 'SL', 'GW', 'GM', 'CV', 'ST', 'GQ',
                    'DJ', 'ER', 'SO', 'SS', 'SD', 'LY', 'MR', 'MG', 'KM', 'SC', 'MU', 'LS',
                    'SZ', 'NA', 'CF', 'CG', 'CD', 'GA',
                    # Latin America
                    'BR', 'MX', 'AR', 'CO', 'PE', 'VE', 'CL', 'EC', 'GT', 'CU', 'BO', 'DO',
                    'HN', 'PY', 'NI', 'CR', 'PA', 'UY', 'JM', 'TT', 'GY', 'SR', 'BZ', 'BB',
                    'BS', 'BM', 'AG', 'DM', 'GD', 'KN', 'LC', 'VC', 'HT', 'SV',
                    # Middle East
                    'AE', 'SA', 'QA', 'KW', 'BH', 'OM', 'JO', 'LB', 'SY', 'IQ', 'YE', 'PS',
                    'IL', 'TR', 'IR', 'AF', 'PK',
                    # South Asia
                    'IN', 'BD', 'LK', 'NP', 'BT', 'MV',
                    # Southeast Asia
                    'ID', 'MY', 'TH', 'PH', 'VN', 'SG', 'MM', 'KH', 'LA', 'BN', 'TL',
                    # Other regions
                    'RU', 'UA', 'KZ', 'UZ', 'KG', 'TJ', 'TM', 'AM', 'AZ', 'GE'
                ]
                
                return str(self.country) in whatsapp_business_countries
                
            except Exception:
                # If anything fails, default to True (show WhatsApp)
                return True
        
        # Default to True if no country is set
        return True

    def save(self, *args, **kwargs):
        # If this is a business owner profile, ensure tenant is created
        if self.is_business_owner and not self.tenant_id:
            from custom_auth.models import Tenant  # Import here to avoid circular import
            
            # Use UUID directly for tenant_id
            try:
                # Try to get existing tenant first
                tenant = Tenant.objects.get(owner_id=self.user.id)
            except Tenant.DoesNotExist:
                # Create new tenant with tenant_id
                business_name = self.business.name if self.business else f"Business-{self.user.id}"
                tenant = Tenant.objects.create(
                    name=business_name,
                    owner_id=self.user.id,
                    setup_status='pending',
                    rls_enabled=True
                )
    
                # Store setup information in user profile metadata
                if not hasattr(self, 'metadata') or not isinstance(self.metadata, dict):
                    self.metadata = {}
                
                self.metadata['pending_tenant_setup'] = {
                    'user_id': str(self.user.id),
                    'business_id': str(self.business.id if self.business else None),
                    'timestamp': timezone.now().isoformat(),
                    'source': 'user_profile_save',
                    'deferred': True  # Flag to indicate this setup should be deferred
                }
                
                # Update tenant to indicate setup is deferred
                tenant.setup_status = 'deferred'
                tenant.save(update_fields=['setup_status'])
                
                logger.info(f"Deferred tenant setup for user {self.user.email} - tenant_id: {tenant.id}")
            
            # Use tenant_id directly
            self.tenant_id = tenant.id
        
        now = timezone.now()
        self.modified_at = now
        self.updated_at = now
        super().save(*args, **kwargs)

    def to_dict(self):
        # Get business first to avoid multiple property access
        business = self.business
        
        return {
            'email': self.user.email,
            'first_name': self.user.first_name,
            'last_name': self.user.last_name,
            'full_name': self.user.get_full_name(),
            'occupation': self.occupation,
            'business_name': business.business_name if business is not None else None,
            'tenant_name': self.tenant.name if self.tenant else None,
            'is_business_owner': self.is_business_owner,
            'country': str(self.country),
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }

class UserMenuPrivilege(models.Model):
    """
    Model for storing user menu item access privileges.
    Links to a BusinessMember to define which menu items a specific user can access.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_member = models.OneToOneField(BusinessMember, on_delete=models.CASCADE, related_name='menu_privileges')
    menu_items = models.JSONField(default=list, help_text="List of menu items the user has access to")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_privileges')
    
    class Meta:
        db_table = 'users_menu_privilege'
        indexes = [
            models.Index(fields=['business_member']),
        ]
    
    def __str__(self):
        return f"Menu privileges for {self.business_member}"


class BusinessSettings(models.Model):
    """
    Business settings and preferences
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant_id = models.UUIDField(unique=True)
    
    # Pricing model defaults
    default_pricing_model = models.CharField(
        max_length=20,
        choices=[
            ('direct', 'Direct (One-time price)'),
            ('time_weight', 'Time & Weight (Price × Days × Weight)'),
            ('time_only', 'Time Only (Price × Days)'),
            ('weight_only', 'Weight Only (Price × Weight)'),
        ],
        default='direct',
        help_text='Default pricing model for new products'
    )
    
    # Default rates for time/weight pricing
    default_daily_rate = models.DecimalField(
        max_digits=10, decimal_places=2, default=0,
        help_text='Default rate per day for time-based pricing'
    )
    default_weight_unit = models.CharField(
        max_length=10, default='kg',
        help_text='Default weight unit (kg, lbs, etc.)'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users_business_settings'
        indexes = [
            models.Index(fields=['tenant_id']),
        ]
    
    def __str__(self):
        return f"Settings for tenant {self.tenant_id}"


class MenuVisibilitySettings(models.Model):
    """
    Store which menu items are visible for each business
    This acts as the master control for menu visibility
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey(Business, on_delete=models.CASCADE, related_name='menu_visibility_settings')
    menu_item = models.CharField(max_length=100, help_text="Menu item identifier (e.g., jobs, pos, sales)")
    is_visible = models.BooleanField(default=True, help_text="Whether this menu item is visible")
    parent_menu = models.CharField(max_length=100, null=True, blank=True, help_text="Parent menu identifier if this is a submenu")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'users_menu_visibility_settings'
        unique_together = ['business', 'menu_item']
        indexes = [
            models.Index(fields=['business', 'is_visible']),
        ]
    
    def __str__(self):
        return f"{self.menu_item} visibility for {self.business.name}"
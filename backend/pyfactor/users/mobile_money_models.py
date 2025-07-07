"""
Mobile money configuration for countries and providers
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone


class MobileMoneyCountry(models.Model):
    """
    Countries that support mobile money payments via Paystack
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    country_code = models.CharField(
        max_length=2, 
        unique=True, 
        help_text="ISO 3166-1 alpha-2 country code"
    )
    country_name = models.CharField(max_length=100)
    currency_code = models.CharField(
        max_length=3,
        help_text="ISO 4217 currency code (e.g., KES, NGN)"
    )
    
    # Paystack configuration
    paystack_enabled = models.BooleanField(default=True)
    paystack_country_code = models.CharField(
        max_length=10,
        help_text="Paystack's country identifier"
    )
    
    # Available providers
    providers = models.JSONField(
        default=list,
        help_text="List of available mobile money providers"
    )
    
    # Display configuration
    display_name = models.CharField(
        max_length=100,
        help_text="User-friendly name for payment method"
    )
    display_order = models.IntegerField(default=0)
    
    # Status
    is_active = models.BooleanField(default=True)
    is_beta = models.BooleanField(
        default=False,
        help_text="Show beta tag for new integrations"
    )
    
    # Metadata
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Mobile Money Country"
        verbose_name_plural = "Mobile Money Countries"
        ordering = ['display_order', 'country_name']
        db_table = 'mobile_money_countries'
    
    def __str__(self):
        return f"{self.country_name} - {self.display_name}"
    
    @classmethod
    def supports_mobile_money(cls, country_code):
        """Check if a country supports mobile money"""
        return cls.objects.filter(
            country_code=country_code.upper(),
            is_active=True,
            paystack_enabled=True
        ).exists()
    
    @classmethod
    def get_payment_methods(cls, country_code):
        """Get available payment methods for a country"""
        payment_methods = []
        
        # Always add Stripe card option
        payment_methods.append({
            'id': 'card',
            'name': 'Credit/Debit Card (USD)',
            'provider': 'stripe',
            'icon': 'credit-card',
            'description': 'Pay in USD with Visa, Mastercard, or other cards',
            'currency': 'USD',
            'note': 'Charged in USD, your bank will convert'
        })
        
        # Add mobile money if available
        try:
            mm_country = cls.objects.get(
                country_code=country_code.upper(),
                is_active=True,
                paystack_enabled=True
            )
            
            # Put mobile money first for supported countries
            payment_methods.insert(0, {
                'id': 'mobile_money',
                'name': mm_country.display_name,
                'provider': 'paystack',
                'icon': 'phone',
                'description': f'Pay with {", ".join(mm_country.providers)}',
                'currency': mm_country.currency_code,
                'is_beta': mm_country.is_beta,
                'providers': mm_country.providers,
                'recommended': True,
                'note': f'Pay in {mm_country.currency_code} - no conversion fees'
            })
        except cls.DoesNotExist:
            pass
        
        return payment_methods


class MobileMoneyProvider(models.Model):
    """
    Mobile money providers (M-Pesa, MTN Money, etc.)
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    display_name = models.CharField(max_length=100)
    
    # Countries where available
    countries = models.ManyToManyField(
        MobileMoneyCountry,
        related_name='available_providers'
    )
    
    # Provider configuration
    requires_phone_number = models.BooleanField(default=True)
    phone_number_regex = models.CharField(
        max_length=200,
        blank=True,
        help_text="Regex pattern for validating phone numbers"
    )
    phone_number_example = models.CharField(
        max_length=50,
        blank=True,
        help_text="Example phone number format"
    )
    
    # API configuration
    api_identifier = models.CharField(
        max_length=50,
        help_text="Provider ID used in Paystack API"
    )
    
    # Display
    icon_url = models.URLField(blank=True)
    color_hex = models.CharField(
        max_length=7,
        blank=True,
        help_text="Brand color for UI"
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Mobile Money Provider"
        verbose_name_plural = "Mobile Money Providers"
        ordering = ['name']
        db_table = 'mobile_money_providers'
    
    def __str__(self):
        return self.display_name


# Initial data for mobile money countries
MOBILE_MONEY_COUNTRIES_DATA = [
    {
        'code': 'KE',
        'name': 'Kenya',
        'currency': 'KES',
        'paystack_code': 'KE',
        'display_name': 'Mobile Money (M-Pesa)',
        'providers': ['M-Pesa'],
        'is_active': True,
        'is_beta': False
    },
    # Ready to add more countries when needed:
    # {
    #     'code': 'NG',
    #     'name': 'Nigeria',
    #     'currency': 'NGN',
    #     'paystack_code': 'NG',
    #     'display_name': 'Mobile Money',
    #     'providers': ['MTN Mobile Money', 'Airtel Money'],
    #     'is_active': False,
    #     'is_beta': True
    # },
    # {
    #     'code': 'GH',
    #     'name': 'Ghana',
    #     'currency': 'GHS',
    #     'paystack_code': 'GH',
    #     'display_name': 'Mobile Money',
    #     'providers': ['MTN Mobile Money', 'Vodafone Cash', 'AirtelTigo Money'],
    #     'is_active': False,
    #     'is_beta': True
    # },
    # {
    #     'code': 'ZA',
    #     'name': 'South Africa',
    #     'currency': 'ZAR',
    #     'paystack_code': 'ZA',
    #     'display_name': 'Mobile Payment',
    #     'providers': ['SnapScan', 'Zapper'],
    #     'is_active': False,
    #     'is_beta': True
    # }
]
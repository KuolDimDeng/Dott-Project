"""
Regional discount models for developing countries
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta


class DevelopingCountry(models.Model):
    """
    List of developing countries eligible for 50% discount
    Based on World Bank classifications
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    country_code = models.CharField(
        max_length=2, 
        unique=True, 
        help_text="ISO 3166-1 alpha-2 country code"
    )
    country_name = models.CharField(max_length=100)
    income_level = models.CharField(
        max_length=50,
        choices=[
            ('low', 'Low income'),
            ('lower_middle', 'Lower middle income'),
            ('upper_middle', 'Upper middle income'),
        ],
        default='lower_middle'
    )
    discount_percentage = models.IntegerField(default=50)
    is_active = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Developing Country"
        verbose_name_plural = "Developing Countries"
        ordering = ['country_name']
        db_table = 'developing_countries'
    
    def __str__(self):
        return f"{self.country_name} ({self.country_code}) - {self.discount_percentage}% discount"
    
    @classmethod
    def is_eligible(cls, country_code):
        """Check if a country is eligible for discount"""
        return cls.objects.filter(
            country_code=country_code.upper(),
            is_active=True
        ).exists()
    
    @classmethod
    def get_discount(cls, country_code):
        """Get discount percentage for a country"""
        try:
            country = cls.objects.get(
                country_code=country_code.upper(),
                is_active=True
            )
            return country.discount_percentage
        except cls.DoesNotExist:
            return 0


class DiscountVerification(models.Model):
    """
    Track discount verifications and potential abuse
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.OneToOneField(
        'Business', 
        on_delete=models.CASCADE,
        related_name='discount_verification'
    )
    claimed_country = models.CharField(max_length=2)
    detected_country = models.CharField(max_length=2, blank=True)
    ip_address = models.GenericIPAddressField()
    
    # Verification data
    verification_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending'),
            ('verified', 'Verified'),
            ('flagged', 'Flagged for Review'),
            ('rejected', 'Rejected'),
        ],
        default='pending'
    )
    
    # Risk indicators
    ip_country_match = models.BooleanField(default=True)
    payment_country_match = models.BooleanField(default=True)
    employee_location_match = models.BooleanField(default=True)
    risk_score = models.IntegerField(default=0)
    
    # Verification timeline
    grace_period_ends = models.DateTimeField()
    verified_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        null=True, 
        blank=True,
        on_delete=models.SET_NULL,
        related_name='discount_reviews'
    )
    review_notes = models.TextField(blank=True)
    
    # Behavioral data
    login_countries = models.JSONField(default=dict)  # Track login locations
    payment_methods = models.JSONField(default=list)  # Track payment origins
    
    # Audit fields
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Discount Verification"
        verbose_name_plural = "Discount Verifications"
        db_table = 'discount_verifications'
    
    def __str__(self):
        return f"{self.business.name} - {self.verification_status}"
    
    def save(self, *args, **kwargs):
        if not self.grace_period_ends:
            self.grace_period_ends = timezone.now() + timedelta(days=30)
        super().save(*args, **kwargs)
    
    def calculate_risk_score(self):
        """Calculate risk score based on various factors"""
        score = 0
        
        # IP mismatch: +30 points
        if not self.ip_country_match:
            score += 30
        
        # Payment method mismatch: +40 points
        if not self.payment_country_match:
            score += 40
        
        # Employee location mismatch: +30 points
        if not self.employee_location_match:
            score += 30
        
        # Multiple login countries: +10 points per country over 2
        login_country_count = len(self.login_countries.keys())
        if login_country_count > 2:
            score += (login_country_count - 2) * 10
        
        self.risk_score = min(score, 100)  # Cap at 100
        return self.risk_score
    
    def should_flag_for_review(self):
        """Determine if account should be flagged"""
        return self.calculate_risk_score() >= 70


# Initial data for developing countries
DEVELOPING_COUNTRIES_DATA = [
    # Africa
    {'code': 'KE', 'name': 'Kenya', 'income': 'lower_middle'},
    {'code': 'NG', 'name': 'Nigeria', 'income': 'lower_middle'},
    {'code': 'GH', 'name': 'Ghana', 'income': 'lower_middle'},
    {'code': 'ZA', 'name': 'South Africa', 'income': 'upper_middle'},
    {'code': 'EG', 'name': 'Egypt', 'income': 'lower_middle'},
    {'code': 'MA', 'name': 'Morocco', 'income': 'lower_middle'},
    {'code': 'TZ', 'name': 'Tanzania', 'income': 'lower_middle'},
    {'code': 'UG', 'name': 'Uganda', 'income': 'low'},
    {'code': 'ET', 'name': 'Ethiopia', 'income': 'low'},
    {'code': 'RW', 'name': 'Rwanda', 'income': 'low'},
    {'code': 'SN', 'name': 'Senegal', 'income': 'lower_middle'},
    {'code': 'CI', 'name': 'Ivory Coast', 'income': 'lower_middle'},
    {'code': 'CM', 'name': 'Cameroon', 'income': 'lower_middle'},
    {'code': 'ZM', 'name': 'Zambia', 'income': 'lower_middle'},
    {'code': 'ZW', 'name': 'Zimbabwe', 'income': 'lower_middle'},
    
    # Asia
    {'code': 'IN', 'name': 'India', 'income': 'lower_middle'},
    {'code': 'BD', 'name': 'Bangladesh', 'income': 'lower_middle'},
    {'code': 'PK', 'name': 'Pakistan', 'income': 'lower_middle'},
    {'code': 'ID', 'name': 'Indonesia', 'income': 'upper_middle'},
    {'code': 'PH', 'name': 'Philippines', 'income': 'lower_middle'},
    {'code': 'VN', 'name': 'Vietnam', 'income': 'lower_middle'},
    {'code': 'LK', 'name': 'Sri Lanka', 'income': 'lower_middle'},
    {'code': 'NP', 'name': 'Nepal', 'income': 'lower_middle'},
    {'code': 'MM', 'name': 'Myanmar', 'income': 'lower_middle'},
    {'code': 'KH', 'name': 'Cambodia', 'income': 'lower_middle'},
    
    # Latin America
    {'code': 'MX', 'name': 'Mexico', 'income': 'upper_middle'},
    {'code': 'BR', 'name': 'Brazil', 'income': 'upper_middle'},
    {'code': 'CO', 'name': 'Colombia', 'income': 'upper_middle'},
    {'code': 'PE', 'name': 'Peru', 'income': 'upper_middle'},
    {'code': 'EC', 'name': 'Ecuador', 'income': 'upper_middle'},
    {'code': 'BO', 'name': 'Bolivia', 'income': 'lower_middle'},
    {'code': 'GT', 'name': 'Guatemala', 'income': 'upper_middle'},
    {'code': 'HN', 'name': 'Honduras', 'income': 'lower_middle'},
    {'code': 'NI', 'name': 'Nicaragua', 'income': 'lower_middle'},
    {'code': 'SV', 'name': 'El Salvador', 'income': 'lower_middle'},
    
    # Middle East & North Africa
    {'code': 'JO', 'name': 'Jordan', 'income': 'upper_middle'},
    {'code': 'LB', 'name': 'Lebanon', 'income': 'upper_middle'},
    {'code': 'TN', 'name': 'Tunisia', 'income': 'lower_middle'},
    {'code': 'DZ', 'name': 'Algeria', 'income': 'lower_middle'},
    
    # Eastern Europe
    {'code': 'UA', 'name': 'Ukraine', 'income': 'lower_middle'},
    {'code': 'MD', 'name': 'Moldova', 'income': 'upper_middle'},
    {'code': 'AL', 'name': 'Albania', 'income': 'upper_middle'},
    {'code': 'BA', 'name': 'Bosnia and Herzegovina', 'income': 'upper_middle'},
]
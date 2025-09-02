# Business Contact Models
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class PlaceholderBusiness(models.Model):
    """
    Businesses scraped from public sources (Google Places, Yelp, etc.)
    before they join Dott officially
    """
    
    # Basic business info
    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)  # +254701234567
    address = models.TextField(blank=True)
    category = models.CharField(max_length=100, blank=True)
    
    # Optional enhanced info (added for richer data when available)
    email = models.EmailField(max_length=254, blank=True, null=True, help_text='Business email address if available')
    description = models.TextField(blank=True, null=True, help_text='Business description or tagline')
    image_url = models.URLField(max_length=500, blank=True, null=True, help_text='Main business image URL')
    logo_url = models.URLField(max_length=500, blank=True, null=True, help_text='Business logo URL if available')
    website = models.URLField(max_length=255, blank=True, null=True, help_text='Business website URL')
    opening_hours = models.JSONField(blank=True, null=True, help_text='Business opening hours as JSON')
    rating = models.DecimalField(max_digits=3, decimal_places=2, blank=True, null=True, help_text='Average rating (1.00 to 5.00)')
    social_media = models.JSONField(blank=True, null=True, help_text='Social media links (facebook, instagram, twitter, etc.)')
    
    # Location data
    country = models.CharField(max_length=2)  # KE, SS, etc.
    city = models.CharField(max_length=100, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    
    # Source tracking
    source = models.CharField(max_length=50)  # 'google_places', 'yelp', 'local_directory'
    source_id = models.CharField(max_length=255, blank=True)  # External ID from source
    
    # Contact tracking
    contact_count = models.IntegerField(default=0)  # How many times contacted
    max_contact_limit = models.IntegerField(default=3)  # Maximum contacts allowed (3 for placeholders)
    contact_limit_reached = models.BooleanField(default=False)  # True when limit hit
    last_contacted = models.DateTimeField(null=True, blank=True)
    opted_out = models.BooleanField(default=False)  # Business replied STOP
    
    # Conversion tracking
    converted_to_real_business = models.BooleanField(default=False)
    real_business_user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    conversion_date = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'placeholder_businesses'
        unique_together = [['phone', 'name']]  # Prevent duplicates
        indexes = [
            models.Index(fields=['country', 'city']),
            models.Index(fields=['phone']),
            models.Index(fields=['opted_out']),
            models.Index(fields=['converted_to_real_business']),
        ]
    
    def can_be_contacted(self) -> bool:
        """
        Check if placeholder business can still be contacted
        Returns False if: opted out, converted, or reached contact limit
        """
        if self.opted_out:
            return False
        if self.converted_to_real_business:
            return False  # Verified businesses use different system
        if self.contact_limit_reached:
            return False
        return self.contact_count < self.max_contact_limit
    
    def get_remaining_contacts(self) -> int:
        """Get number of contacts remaining before limit"""
        if not self.can_be_contacted():
            return 0
        return max(0, self.max_contact_limit - self.contact_count)
    
    def increment_contact_count(self):
        """Increment contact count and check if limit reached"""
        self.contact_count += 1
        self.last_contacted = timezone.now()
        
        if self.contact_count >= self.max_contact_limit:
            self.contact_limit_reached = True
        
        self.save(update_fields=['contact_count', 'last_contacted', 'contact_limit_reached'])
    
    def reset_to_unlimited(self, real_business_user):
        """
        Convert placeholder to unlimited when they register and verify
        Called when business completes registration
        """
        self.converted_to_real_business = True
        self.real_business_user = real_business_user
        self.conversion_date = timezone.now()
        self.max_contact_limit = 999999  # Effectively unlimited
        self.contact_limit_reached = False
        self.save()

    def __str__(self):
        return f"{self.name} ({self.phone}) - {self.country} [{self.contact_count}/{self.max_contact_limit}]"

class BusinessContactLog(models.Model):
    """
    Log every time a customer contacts a placeholder business
    """
    
    # Business info
    placeholder_business = models.ForeignKey(PlaceholderBusiness, on_delete=models.CASCADE, related_name='contacts')
    business_phone = models.CharField(max_length=20)  # Denormalized for quick lookups
    business_name = models.CharField(max_length=255)  # Denormalized
    
    # Customer info
    customer = models.ForeignKey(User, on_delete=models.CASCADE)
    customer_name = models.CharField(max_length=255)
    customer_request = models.TextField()  # What they wanted to order
    
    # SMS details
    sms_message_id = models.CharField(max_length=100, blank=True)  # From Africa's Talking
    sms_status = models.CharField(max_length=20, default='sent')  # sent, delivered, failed
    sms_cost = models.DecimalField(max_digits=6, decimal_places=4, null=True, blank=True)  # SMS cost
    
    # Tracking
    contacted_at = models.DateTimeField(auto_now_add=True)
    delivery_confirmed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'business_contact_logs'
        indexes = [
            models.Index(fields=['customer', 'contacted_at']),
            models.Index(fields=['placeholder_business', 'contacted_at']),
            models.Index(fields=['business_phone', 'contacted_at']),
            models.Index(fields=['sms_message_id']),
        ]
    
    def __str__(self):
        return f"{self.customer_name} -> {self.business_name} ({self.contacted_at})"

class SMSOptOut(models.Model):
    """
    Businesses that replied STOP - never contact them again
    """
    
    phone_number = models.CharField(max_length=20, unique=True)
    opted_out_at = models.DateTimeField(auto_now_add=True)
    original_message = models.TextField(blank=True)  # The STOP message they sent
    
    class Meta:
        db_table = 'sms_opt_outs'
        indexes = [
            models.Index(fields=['phone_number']),
        ]
    
    def __str__(self):
        return f"{self.phone_number} (opted out {self.opted_out_at})"

class BusinessLead(models.Model):
    """
    Businesses that showed interest via SMS reply (but haven't signed up yet)
    """
    
    phone_number = models.CharField(max_length=20)
    interest_message = models.TextField()  # Their SMS reply
    received_at = models.DateTimeField(auto_now_add=True)
    
    # Follow-up tracking
    followed_up = models.BooleanField(default=False)
    follow_up_count = models.IntegerField(default=0)
    last_follow_up = models.DateTimeField(null=True, blank=True)
    
    # Conversion
    converted = models.BooleanField(default=False)
    converted_user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)
    conversion_date = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'business_leads'
        indexes = [
            models.Index(fields=['phone_number']),
            models.Index(fields=['converted']),
            models.Index(fields=['followed_up']),
        ]
    
    def __str__(self):
        return f"{self.phone_number} (interested {self.received_at})"
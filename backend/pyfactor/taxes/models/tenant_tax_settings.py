# taxes/models/tenant_tax_settings.py
from django.db import models
from django.contrib.auth import get_user_model
from django_countries.fields import CountryField
from decimal import Decimal

User = get_user_model()


class TenantTaxSettings(models.Model):
    """
    Tenant-specific tax settings that override global defaults
    """
    TAX_TYPE_CHOICES = [
        ('sales_tax', 'Sales Tax'),
        ('vat', 'VAT'),
        ('gst', 'GST'),
        ('consumption_tax', 'Consumption Tax'),
        ('none', 'No Tax'),
    ]
    
    # Tenant identification
    tenant_id = models.CharField(max_length=255, db_index=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='tax_settings')
    
    # Sales tax settings
    sales_tax_enabled = models.BooleanField(default=True)
    sales_tax_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        help_text='Tax rate as decimal (e.g., 0.0875 for 8.75%)'
    )
    sales_tax_type = models.CharField(
        max_length=20, 
        choices=TAX_TYPE_CHOICES,
        default='sales_tax'
    )
    
    # Location info (for reference)
    country = CountryField()
    region_code = models.CharField(max_length=10, blank=True)
    region_name = models.CharField(max_length=100, blank=True)
    
    # Override info
    is_custom_rate = models.BooleanField(
        default=True,
        help_text='Whether this is a custom rate (True) or copied from global (False)'
    )
    original_global_rate = models.DecimalField(
        max_digits=6, 
        decimal_places=4,
        null=True,
        blank=True,
        help_text='The global rate at time of override'
    )
    
    # Additional settings
    tax_inclusive_pricing = models.BooleanField(
        default=False,
        help_text='Whether prices include tax'
    )
    show_tax_on_receipts = models.BooleanField(default=True)
    tax_registration_number = models.CharField(
        max_length=100, 
        blank=True,
        help_text='VAT/GST/Tax registration number'
    )
    
    # Metadata
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='tax_settings_created'
    )
    updated_by = models.ForeignKey(
        User, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='tax_settings_updated'
    )
    
    class Meta:
        verbose_name = 'Tenant Tax Settings'
        verbose_name_plural = 'Tenant Tax Settings'
        unique_together = [['tenant_id', 'country', 'region_code']]
        indexes = [
            models.Index(fields=['tenant_id', 'country']),
        ]
    
    def __str__(self):
        return f"{self.tenant_id} - {self.country} @ {self.sales_tax_rate*100:.2f}%"
    
    @property
    def rate_percentage(self):
        """Return rate as percentage"""
        return float(self.sales_tax_rate * 100) if self.sales_tax_rate else 0.0
    
    def save(self, *args, **kwargs):
        # Mark as custom rate when saving
        if not self.pk:  # New record
            self.is_custom_rate = True
        super().save(*args, **kwargs)
"""
Tax Rate Validation Models
Simple, secure staging and history tracking for tax rate updates
"""
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from decimal import Decimal
import json


class TaxRateChangeLog(models.Model):
    """
    Tracks all changes to tax rates for audit trail
    """
    CHANGE_TYPE_CHOICES = [
        ('rate_change', 'Tax Rate Changed'),
        ('authority_change', 'Tax Authority Updated'),
        ('filing_change', 'Filing Info Updated'),
        ('new_rate', 'New Tax Rate Added'),
        ('bulk_update', 'Bulk Update Applied'),
    ]
    
    SEVERITY_CHOICES = [
        ('info', 'Information'),
        ('warning', 'Warning'),
        ('critical', 'Critical'),
    ]
    
    # What changed
    country = models.CharField(max_length=2)
    country_name = models.CharField(max_length=100)
    region_name = models.CharField(max_length=100, blank=True)
    change_type = models.CharField(max_length=20, choices=CHANGE_TYPE_CHOICES)
    severity = models.CharField(max_length=10, choices=SEVERITY_CHOICES, default='info')
    
    # Change details
    field_name = models.CharField(max_length=50)
    old_value = models.TextField(blank=True, null=True)
    new_value = models.TextField(blank=True, null=True)
    change_percentage = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    
    # Metadata
    change_date = models.DateTimeField(default=timezone.now)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='tax_changes')
    change_source = models.CharField(max_length=50, default='manual')  # 'api', 'manual', 'import'
    batch_id = models.CharField(max_length=50, blank=True)
    
    # Approval
    requires_approval = models.BooleanField(default=False)
    approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='tax_approvals')
    approved_date = models.DateTimeField(null=True, blank=True)
    approval_notes = models.TextField(blank=True)
    
    class Meta:
        ordering = ['-change_date']
        indexes = [
            models.Index(fields=['country', 'change_date']),
            models.Index(fields=['batch_id', 'approved']),
            models.Index(fields=['severity', 'requires_approval']),
        ]
    
    def __str__(self):
        return f"{self.country} - {self.field_name}: {self.old_value} → {self.new_value}"
    
    def calculate_severity(self):
        """Auto-calculate severity based on change type and magnitude"""
        if self.field_name == 'rate' and self.old_value and self.new_value:
            try:
                old_rate = Decimal(self.old_value)
                new_rate = Decimal(self.new_value)
                change_pct = abs((new_rate - old_rate) / old_rate * 100)
                
                if change_pct > 20:  # More than 20% change
                    return 'critical'
                elif change_pct > 5:  # More than 5% change
                    return 'warning'
            except:
                pass
        
        # Authority changes are always warnings
        if self.change_type == 'authority_change':
            return 'warning'
        
        return 'info'


class TaxRateValidationBatch(models.Model):
    """
    Groups changes for batch approval
    """
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('applied', 'Applied to Production'),
    ]
    
    batch_id = models.CharField(max_length=50, unique=True)
    created_date = models.DateTimeField(default=timezone.now)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='created_batches')
    
    # Summary
    total_changes = models.IntegerField(default=0)
    countries_affected = models.IntegerField(default=0)
    critical_changes = models.IntegerField(default=0)
    warning_changes = models.IntegerField(default=0)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_batches')
    reviewed_date = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    
    # Applied
    applied_date = models.DateTimeField(null=True, blank=True)
    rollback_available = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-created_date']
    
    def __str__(self):
        return f"Batch {self.batch_id} - {self.status} ({self.total_changes} changes)"
    
    def calculate_summary(self):
        """Calculate batch statistics"""
        changes = TaxRateChangeLog.objects.filter(batch_id=self.batch_id)
        
        self.total_changes = changes.count()
        self.countries_affected = changes.values('country').distinct().count()
        self.critical_changes = changes.filter(severity='critical').count()
        self.warning_changes = changes.filter(severity='warning').count()
        self.save()
    
    def get_change_summary(self):
        """Get a summary of changes by type"""
        changes = TaxRateChangeLog.objects.filter(batch_id=self.batch_id)
        summary = {}
        
        for change_type, label in TaxRateChangeLog.CHANGE_TYPE_CHOICES:
            count = changes.filter(change_type=change_type).count()
            if count > 0:
                summary[label] = count
        
        return summary


class GlobalSalesTaxRateStaging(models.Model):
    """
    Staging table for tax rate updates - mirrors GlobalSalesTaxRate
    """
    # Copy all fields from GlobalSalesTaxRate
    country = models.CharField(max_length=2)
    country_name = models.CharField(max_length=100)
    region_code = models.CharField(max_length=10, blank=True)
    region_name = models.CharField(max_length=100, blank=True)
    locality = models.CharField(max_length=100, blank=True)
    
    tax_type = models.CharField(max_length=20)
    rate = models.DecimalField(max_digits=6, decimal_places=4)
    
    # Filing information
    tax_authority_name = models.CharField(max_length=200, blank=True)
    filing_frequency = models.CharField(max_length=20, blank=True)
    filing_day_of_month = models.IntegerField(null=True, blank=True)
    online_filing_available = models.BooleanField(default=False)
    online_portal_name = models.CharField(max_length=100, blank=True)
    online_portal_url = models.URLField(max_length=500, blank=True)
    main_form_name = models.CharField(max_length=100, blank=True)
    filing_instructions = models.TextField(blank=True)
    manual_filing_fee = models.DecimalField(max_digits=6, decimal_places=2, default=35.00)
    online_filing_fee = models.DecimalField(max_digits=6, decimal_places=2, default=65.00)
    
    # Deadline fields
    filing_deadline_days = models.IntegerField(null=True, blank=True)
    filing_deadline_description = models.TextField(blank=True)
    grace_period_days = models.IntegerField(default=0, blank=True)
    penalty_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    deadline_notes = models.TextField(blank=True)
    
    # Metadata
    effective_date = models.DateField()
    is_current = models.BooleanField(default=True)
    
    # Staging metadata
    batch_id = models.CharField(max_length=50)
    staging_date = models.DateTimeField(default=timezone.now)
    validation_status = models.CharField(max_length=20, default='pending')
    validation_notes = models.TextField(blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['country', 'batch_id']),
            models.Index(fields=['batch_id', 'validation_status']),
        ]
    
    def __str__(self):
        return f"STAGING: {self.country_name} - {self.rate*100}% ({self.batch_id})"
#/Users/kuoldeng/projectx/backend/pyfactor/crm/models.py
import uuid
import random
import re
import string
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.contrib.auth import get_user_model
from pyfactor.logging_config import get_logger
from django.db.models import Sum
from django.apps import apps
from custom_auth.models import TenantAwareModel, TenantManager



logger = get_logger()

class Customer(TenantAwareModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_name = models.CharField(max_length=255, blank=True, null=True)
    first_name = models.CharField(max_length=255, blank=True, null=True)
    last_name = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    account_number = models.CharField(max_length=6, unique=True, editable=False)
    website = models.URLField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    currency = models.CharField(max_length=3, blank=True, null=True)
    billing_country = models.CharField(max_length=100, blank=True, null=True)
    billing_state = models.CharField(max_length=100, blank=True, null=True)
    ship_to_name = models.CharField(max_length=255, blank=True, null=True)
    shipping_country = models.CharField(max_length=100, blank=True, null=True)
    shipping_state = models.CharField(max_length=100, blank=True, null=True)
    shipping_phone = models.CharField(max_length=20, blank=True, null=True)
    delivery_instructions = models.TextField(blank=True, null=True)
    street = models.CharField(max_length=255, blank=True, null=True)
    postcode = models.CharField(max_length=20, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    class Meta:
        db_table = 'crm_customer'
        indexes = [
            models.Index(fields=['tenant_id', 'account_number']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['tenant_id', 'account_number'], name='unique_crm_customer_account_number_per_tenant'),
        ]
    
    def save(self, *args, **kwargs):
        if not self.account_number:
            # Generate unique account number within tenant
            prefix = "C"
            random_suffix = ''.join(random.choices('0123456789', k=5))
            self.account_number = f"{prefix}{random_suffix}"
            
            # Ensure uniqueness within tenant
            while Customer.objects.filter(tenant_id=self.tenant_id, account_number=self.account_number).exists():
                random_suffix = ''.join(random.choices('0123456789', k=5))
                self.account_number = f"{prefix}{random_suffix}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.business_name} (Account: {self.account_number})"
    
    @staticmethod
    def generate_account_number():
        while True:
            uuid_numbers = re.sub('[^0-9]', '', str(uuid.uuid4()))
            account_number = (uuid_numbers[:5] + '00000')[:5]
            if not Customer.objects.filter(account_number=account_number).exists():
                return account_number
            # If it exists, generate a new one with a random suffix
            random_suffix = ''.join(random.choices('0123456789', k=2))
            account_number = (uuid_numbers[:3] + random_suffix + '00000')[:5]
            if not Customer.objects.filter(account_number=account_number).exists():
                return account_number
            
    def total_income(self):
        """Calculate the total income from all invoices for this customer.
        The 'invoices' relation is defined in the Invoice model with related_name='invoices'
        """
        # Get the Invoice model dynamically
        Invoice = apps.get_model('sales', 'Invoice')
        
        # Query all invoices for this customer and sum their totalAmount
        total = Invoice.objects.filter(customer=self).aggregate(Sum('totalAmount'))
        return total['totalAmount__sum'] or 0

class Contact(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='contacts')
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    job_title = models.CharField(max_length=100, blank=True, null=True)
    department = models.CharField(max_length=100, blank=True, null=True)
    is_primary = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.customer.business_name}"

class Lead(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_name = models.CharField(max_length=255, blank=True, null=True)
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    source = models.CharField(max_length=100, blank=True, null=True)
    status = models.CharField(max_length=50, choices=[
        ('new', 'New'),
        ('contacted', 'Contacted'),
        ('qualified', 'Qualified'),
        ('unqualified', 'Unqualified'),
        ('converted', 'Converted')
    ], default='new')
    notes = models.TextField(blank=True, null=True)
    assigned_to = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    converted_to = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='converted_leads')

    def __str__(self):
        return f"{self.first_name} {self.last_name} - {self.company_name or 'No Company'}"

class Opportunity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='opportunities')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    stage = models.CharField(max_length=50, choices=[
        ('prospecting', 'Prospecting'),
        ('qualification', 'Qualification'),
        ('needs_analysis', 'Needs Analysis'),
        ('value_proposition', 'Value Proposition'),
        ('decision_makers', 'Identifying Decision Makers'),
        ('proposal', 'Proposal/Price Quote'),
        ('negotiation', 'Negotiation/Review'),
        ('closed_won', 'Closed Won'),
        ('closed_lost', 'Closed Lost')
    ], default='prospecting')
    probability = models.IntegerField(default=0)
    expected_close_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    assigned_to = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.customer.business_name}"

class Deal(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='deals')
    opportunity = models.OneToOneField(Opportunity, on_delete=models.SET_NULL, null=True, blank=True, related_name='deal')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=50, choices=[
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired')
    ], default='draft')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} - {self.customer.business_name}"

class Activity(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=50, choices=[
        ('call', 'Call'),
        ('meeting', 'Meeting'),
        ('email', 'Email'),
        ('task', 'Task'),
        ('note', 'Note')
    ])
    subject = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    due_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=50, choices=[
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('deferred', 'Deferred'),
        ('cancelled', 'Cancelled')
    ], default='not_started')
    priority = models.CharField(max_length=20, choices=[
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High')
    ], default='medium')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='activities', null=True, blank=True)
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='activities', null=True, blank=True)
    opportunity = models.ForeignKey(Opportunity, on_delete=models.CASCADE, related_name='activities', null=True, blank=True)
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name='activities', null=True, blank=True)
    assigned_to = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.type} - {self.subject}"

class Campaign(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    type = models.CharField(max_length=50, choices=[
        ('email', 'Email'),
        ('social', 'Social Media'),
        ('event', 'Event'),
        ('webinar', 'Webinar'),
        ('direct_mail', 'Direct Mail'),
        ('telemarketing', 'Telemarketing'),
        ('other', 'Other')
    ])
    status = models.CharField(max_length=50, choices=[
        ('planning', 'Planning'),
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ], default='planning')
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    budget = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    expected_revenue = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    actual_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

class CampaignMember(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name='members')
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='campaigns', null=True, blank=True)
    lead = models.ForeignKey(Lead, on_delete=models.CASCADE, related_name='campaigns', null=True, blank=True)
    status = models.CharField(max_length=50, choices=[
        ('sent', 'Sent'),
        ('received', 'Received'),
        ('opened', 'Opened'),
        ('clicked', 'Clicked'),
        ('responded', 'Responded'),
        ('converted', 'Converted'),
        ('bounced', 'Bounced'),
        ('unsubscribed', 'Unsubscribed')
    ], default='sent')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        member = self.customer if self.customer else self.lead
        return f"{self.campaign.name} - {member}"

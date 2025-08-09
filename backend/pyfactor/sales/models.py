#/Users/kuoldeng/projectx/backend/pyfactor/sales/models.py
import uuid
from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.utils.text import slugify
import random
import string
import re
from datetime import timedelta
from django.contrib.auth import get_user_model
from pyfactor.logging_config import get_logger
from django.dispatch import receiver
from django.db.models.signals import post_save
from io import BytesIO
from barcode import Code128
from barcode.writer import ImageWriter
from crm.models import Customer
from inventory.models import Product, Service, CustomChargePlan, Department
from django.utils.functional import cached_property
from custom_auth.models import TenantAwareModel, TenantManager
from django.contrib import admin
from typing import cast, Optional, List, Any, Union  # Add proper typing imports


logger = get_logger()

def get_current_datetime():
    return timezone.now()

def default_due_datetime():
    return get_current_datetime() + timedelta(days=30)

class Invoice(TenantAwareModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_num = models.CharField(max_length=20, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='invoices')
    totalAmount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    date = models.DateField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    due_date = models.DateField(default=default_due_datetime)
    status = models.CharField(max_length=20, choices=[('draft', 'Draft'), ('sent', 'Sent'), ('paid', 'Paid')], default='draft')
    transaction = models.OneToOneField('finance.FinanceTransaction', on_delete=models.CASCADE, related_name='sales_invoice', null=True, blank=True)
    accounts_receivable = models.ForeignKey('finance.Account', on_delete=models.SET_NULL, related_name='invoices_receivable', null=True)
    sales_revenue = models.ForeignKey('finance.Account', on_delete=models.SET_NULL, related_name='invoices_revenue', null=True)
    sales_tax_payable = models.ForeignKey('finance.Account', on_delete=models.SET_NULL, related_name='invoices_tax_payable', null=True)
    cost_of_goods_sold = models.ForeignKey('finance.Account', on_delete=models.SET_NULL, related_name='invoices_cogs', null=True)
    inventory = models.ForeignKey('finance.Account', on_delete=models.SET_NULL, related_name='invoices_inventory', null=True)
    is_paid = models.BooleanField(default=False)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='USD')
    
    # Exchange rate fields for compliance and historical accuracy
    exchange_rate = models.DecimalField(
        max_digits=12, decimal_places=6, null=True, blank=True,
        help_text='Exchange rate to USD at creation time'
    )
    exchange_rate_date = models.DateTimeField(
        null=True, blank=True,
        help_text='When exchange rate was captured'
    )
    currency_locked = models.BooleanField(
        default=False,
        help_text='Currency is locked once invoice is sent or paid'
    )
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    # Additional fields to match SQL schema
    invoice_date = models.DateTimeField(default=timezone.now)
    subtotal = models.DecimalField(max_digits=19, decimal_places=4, default=0)
    tax_total = models.DecimalField(max_digits=19, decimal_places=4, default=0)
    total = models.DecimalField(max_digits=19, decimal_places=4, default=0)
    amount_paid = models.DecimalField(max_digits=19, decimal_places=4, default=0)
    balance_due = models.DecimalField(max_digits=19, decimal_places=4, default=0)
    notes = models.TextField(blank=True, null=True)
    terms = models.TextField(blank=True, null=True)
    sales_order = models.ForeignKey('SalesOrder', on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'sales_invoice'
        indexes = [
            models.Index(fields=['tenant_id', 'invoice_num']),
            models.Index(fields=['tenant_id', 'customer']),
            models.Index(fields=['tenant_id', 'status']),
            models.Index(fields=['tenant_id', 'is_paid', 'due_date']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['tenant_id', 'invoice_num'], name='unique_invoice_num_per_tenant'),
        ]

    def __str__(self):
        return self.invoice_num
        
    def save(self, *args, **kwargs):
        if not self.invoice_num:
            # Generate a unique invoice number
            prefix = "INV-"
            random_suffix = ''.join(random.choices('0123456789', k=6))
            self.invoice_num = f"{prefix}{random_suffix}"
            
            # Ensure uniqueness within tenant
            while Invoice.objects.filter(tenant_id=self.tenant_id, invoice_num=self.invoice_num).exists():
                random_suffix = ''.join(random.choices('0123456789', k=6))
                self.invoice_num = f"{prefix}{random_suffix}"
        
        # Lock currency if invoice is sent or paid
        if self.pk:  # Only for existing invoices
            try:
                old_invoice = Invoice.objects.get(pk=self.pk)
                if old_invoice.currency_locked or old_invoice.status in ['sent', 'paid'] or old_invoice.is_paid:
                    # Currency is immutable once sent or paid
                    self.currency = old_invoice.currency
                    self.exchange_rate = old_invoice.exchange_rate
                    self.exchange_rate_date = old_invoice.exchange_rate_date
                    self.currency_locked = True
                    logger.warning(f"[CURRENCY-LOCK] Invoice {self.invoice_num} currency is locked. Cannot change from {old_invoice.currency}")
            except Invoice.DoesNotExist:
                pass
        
        # Auto-lock currency when status changes to sent or paid
        if self.status in ['sent', 'paid'] or self.is_paid:
            self.currency_locked = True
            logger.info(f"[CURRENCY-LOCK] Locking currency for invoice {self.invoice_num} (status: {self.status}, is_paid: {self.is_paid})")
                
        super().save(*args, **kwargs)

    def clean(self):
        if self.totalAmount <= 0:
            raise ValidationError('Invoice amount must be positive.')

    def total_with_tax(self):
        tax_rate = getattr(self.customer, 'sales_tax', 0)
        return self.totalAmount * (1 + tax_rate / 100)
    
    @property
    def outstanding_amount(self):
        return self.totalAmount if not self.is_paid else Decimal('0.00')

    @property
    def days_overdue(self, as_of_date=None):
        if not as_of_date:
            as_of_date = timezone.now().date()
        if self.is_paid:
            return 0
        return max(0, (as_of_date - self.due_date.date()).days)
    
class SalesTax(TenantAwareModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    rate = models.DecimalField(max_digits=5, decimal_places=2)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    class Meta:
        db_table = 'sales_tax'
        indexes = [
            models.Index(fields=['tenant_id', 'name']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.rate}%)"


class SalesProduct(TenantAwareModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    sku = models.CharField(max_length=100, blank=True, null=True)
    unit_price = models.DecimalField(max_digits=19, decimal_places=4)
    cost_price = models.DecimalField(max_digits=19, decimal_places=4, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    tax = models.ForeignKey('SalesTax', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    class Meta:
        db_table = 'sales_product'
        indexes = [
            models.Index(fields=['tenant_id', 'sku']),
        ]
    
    def __str__(self):
        return self.name


class InvoiceItem(TenantAwareModel):
    invoice = models.ForeignKey(Invoice, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=200, null=True, blank=True)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    tax_amount = models.DecimalField(max_digits=19, decimal_places=4, blank=True, null=True)
    total = models.DecimalField(max_digits=19, decimal_places=4, default=0)
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    class Meta:
        db_table = 'sales_invoiceitem'
        indexes = [
            models.Index(fields=['tenant_id', 'invoice']),
        ]

    def subtotal(self):
        return self.quantity * self.unit_price

    def __str__(self):
        return f"InvoiceItem {self.id} for Invoice {self.invoice_id}"  # type: ignore



class Estimate(TenantAwareModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    estimate_num = models.CharField(max_length=20, unique=True, editable=False, null=True, blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='estimates')
    totalAmount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))], default=Decimal('0.00'))
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    date = models.DateTimeField(default=get_current_datetime)
    valid_until = models.DateTimeField(default=default_due_datetime)
    title = models.CharField(max_length=200, default='Estimate')
    summary = models.TextField(blank=True)
    logo = models.ImageField(upload_to='estimate_logos/', null=True, blank=True)
    customer_ref = models.CharField(max_length=100, blank=True)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='USD')
    footer = models.TextField(blank=True)
    
    # Exchange rate fields for compliance and historical accuracy
    exchange_rate = models.DecimalField(
        max_digits=12, decimal_places=6, null=True, blank=True,
        help_text='Exchange rate to USD at creation time'
    )
    exchange_rate_date = models.DateTimeField(
        null=True, blank=True,
        help_text='When exchange rate was captured'
    )
    currency_locked = models.BooleanField(
        default=False,
        help_text='Currency is locked once estimate is accepted'
    )
    
    # Additional fields to match SQL schema
    estimate_date = models.DateTimeField(default=timezone.now)
    expiry_date = models.DateTimeField(blank=True, null=True)
    status = models.CharField(max_length=50, default='draft')
    subtotal = models.DecimalField(max_digits=19, decimal_places=4, default=0)
    tax_total = models.DecimalField(max_digits=19, decimal_places=4, default=0)
    total = models.DecimalField(max_digits=19, decimal_places=4, default=0)
    notes = models.TextField(blank=True, null=True)
    terms = models.TextField(blank=True, null=True)
    created_by = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True)
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()

    class Meta:
        app_label = 'sales'
        db_table = 'sales_estimate'
        indexes = [
            models.Index(fields=['tenant_id', 'estimate_num']),
        ]
        
    def __str__(self):
        return self.estimate_num

    @staticmethod
    def generate_estimate_number():
        while True:
            uuid_part = uuid.uuid4().hex[:8].upper()
            estimate_num = f'EST-{uuid_part}'
            if not Estimate.objects.filter(estimate_num=estimate_num).exists():
                return estimate_num
            # If it exists, generate a new one with a random suffix
            random_suffix = ''.join(random.choices('0123456789ABCDEF', k=4))
            estimate_num = f'EST-{uuid_part}-{random_suffix}'
            if not Estimate.objects.filter(estimate_num=estimate_num).exists():
                return estimate_num

    def clean(self):
        if self.totalAmount <= 0:
            raise ValidationError('Estimate amount must be positive.')

    def total_with_discount(self):
        return self.totalAmount - (self.totalAmount * self.discount / 100)
    
    def total_with_tax(self):
        tax_rate = getattr(self.customer, 'sales_tax', 0)
        return self.total_with_discount() * (1 + tax_rate / 100)


class EstimateItem(TenantAwareModel):
    estimate = models.ForeignKey(Estimate, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=200, null=True, blank=True)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    tax_amount = models.DecimalField(max_digits=19, decimal_places=4, blank=True, null=True)
    total = models.DecimalField(max_digits=19, decimal_places=4, default=0)
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    class Meta:
        db_table = 'sales_estimateitem'
        indexes = [
            models.Index(fields=['tenant_id', 'estimate']),
        ]

    def subtotal(self):
        return self.quantity * self.unit_price

    def __str__(self):
        return f"EstimateItem {self.id} for Estimate {self.estimate_id}"  # type: ignore


# Using Django signals to automatically update totalAmount when EstimateItem is saved
@receiver(post_save, sender=EstimateItem)
def update_estimate_total(sender, instance, **kwargs):
    estimate = instance.estimate
    total = sum(item.subtotal() for item in estimate.items.all())
    estimate.totalAmount = total - estimate.discount
    estimate.save()

class EstimateAttachment(TenantAwareModel):
    estimate = models.ForeignKey(Estimate, related_name='attachments', on_delete=models.CASCADE)
    file = models.FileField(upload_to='estimate_attachments/')
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'estimate']),
        ]

    def __str__(self):
        return f"Attachment for {self.estimate}"


class SalesOrder(TenantAwareModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=50, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='USD')
    date = models.DateField()
    created_by = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    totalAmount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # Additional fields to match SQL schema
    order_date = models.DateTimeField(default=timezone.now)
    due_date = models.DateField(default=default_due_datetime)
    status = models.CharField(max_length=50, default='pending')
    payment_terms = models.CharField(max_length=50, default='net_30')
    subtotal = models.DecimalField(max_digits=19, decimal_places=4, default=0)
    tax_total = models.DecimalField(max_digits=19, decimal_places=4, default=0)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    shipping_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total = models.DecimalField(max_digits=19, decimal_places=4, default=0)
    total_amount = models.DecimalField(max_digits=19, decimal_places=4, default=0)
    notes = models.TextField(blank=True, null=True)
    estimate = models.ForeignKey(Estimate, on_delete=models.SET_NULL, null=True, blank=True)

    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    class Meta:
        db_table = 'sales_salesorder'
        ordering = ['-date']
        indexes = [
            models.Index(fields=['tenant_id', 'order_number']),
            models.Index(fields=['tenant_id', 'customer']),
            models.Index(fields=['tenant_id', 'date']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['tenant_id', 'order_number'], name='unique_order_number_per_tenant'),
        ]

    def save(self, *args, **kwargs):
        if not self.order_number:
            # Generate a unique order number within tenant
            prefix = "SO-"
            random_suffix = ''.join(random.choices('0123456789ABCDEF', k=8))
            self.order_number = f"{prefix}{random_suffix}"
            
            # Ensure uniqueness within tenant
            while SalesOrder.objects.filter(tenant_id=self.tenant_id, order_number=self.order_number).exists():
                random_suffix = ''.join(random.choices('0123456789ABCDEF', k=8))
                self.order_number = f"{prefix}{random_suffix}"
                
        super().save(*args, **kwargs)

    def calculate_total_amount(self):
        # Calculate subtotal from items
        self.subtotal = sum(item.subtotal() for item in self.items.all())  # type: ignore
        
        # Apply discount
        discount_amount = (self.subtotal * self.discount_percentage / 100) if self.discount_percentage else 0
        
        # Calculate tax
        self.tax_total = (self.subtotal - discount_amount) * self.tax_rate / 100 if self.tax_rate else 0
        
        # Calculate total
        self.total = self.subtotal - discount_amount + self.tax_total + (self.shipping_cost or 0)
        self.total_amount = self.total
        self.totalAmount = self.total  # For backward compatibility
        
        self.save()

    def clean(self):
        if self.totalAmount is not None and self.totalAmount <= 0:
            raise ValidationError('Sales order amount must be positive.')

    def __str__(self):
        return f"Sales Order {self.order_number}"
        
class SalesOrderItem(TenantAwareModel):
    sales_order = models.ForeignKey(SalesOrder, related_name='items', on_delete=models.CASCADE)
    item_type = models.CharField(max_length=20, choices=[('product', 'Product'), ('service', 'Service')], default='product')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True)
    item_id = models.CharField(max_length=100, blank=True, null=True)  # For frontend reference
    description = models.CharField(max_length=200, null=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, blank=True, null=True)
    tax_amount = models.DecimalField(max_digits=19, decimal_places=4, blank=True, null=True)
    total = models.DecimalField(max_digits=19, decimal_places=4, default=0)
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    class Meta:
        db_table = 'sales_salesorderitem'
        ordering = ['id']
        indexes = [
            models.Index(fields=['tenant_id', 'sales_order']),
        ]
    
    def __str__(self):
        return f"SalesOrderItem {self.id} for SalesOrder {self.sales_order_id}"  # type: ignore

    def subtotal(self):
        return self.quantity * self.unit_price


class POSTransaction(TenantAwareModel):
    """
    POS Transaction model for Point of Sale operations.
    This represents the main transaction record with multiple items.
    """
    PAYMENT_METHOD_CHOICES = [
        ('cash', 'Cash'),
        ('card', 'Credit/Debit Card'), 
        ('mobile_money', 'Mobile Money'),
        ('bank_transfer', 'Bank Transfer'),
        ('check', 'Check'),
        ('store_credit', 'Store Credit'),
    ]
    
    STATUS_CHOICES = [
        ('completed', 'Completed'),
        ('voided', 'Voided'),
        ('refunded', 'Refunded'),
        ('partial_refund', 'Partially Refunded'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction_number = models.CharField(max_length=50, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='pos_transactions')
    subtotal = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    discount_amount = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_total = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    total_amount = models.DecimalField(max_digits=15, decimal_places=4)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHOD_CHOICES)
    amount_tendered = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True)
    change_due = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='completed')
    notes = models.TextField(blank=True, null=True)
    
    # Relationships
    invoice = models.OneToOneField('Invoice', on_delete=models.SET_NULL, null=True, blank=True, related_name='pos_transaction')
    journal_entry = models.OneToOneField('finance.JournalEntry', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, related_name='pos_transactions_created')
    voided_by = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True, related_name='pos_transactions_voided')
    voided_at = models.DateTimeField(null=True, blank=True)
    void_reason = models.TextField(null=True, blank=True)
    
    # Tax jurisdiction tracking
    tax_jurisdiction = models.JSONField(
        default=dict,
        blank=True,
        help_text='Store all tax jurisdiction components and rates'
    )
    tax_calculation_method = models.CharField(
        max_length=20,
        choices=[
            ('destination', 'Customer Shipping Address'),
            ('billing', 'Customer Billing Address'),
            ('origin', 'Business Location'),
            ('manual', 'Manually Entered'),
            ('exempt', 'Tax Exempt'),
        ],
        default='origin',
        help_text='Method used to calculate tax'
    )
    shipping_address_used = models.BooleanField(
        default=False,
        help_text='Whether shipping address was used for tax calculation'
    )
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    class Meta:
        db_table = 'sales_pos_transaction'
        indexes = [
            models.Index(fields=['tenant_id', 'transaction_number']),
            models.Index(fields=['tenant_id', 'customer']),
            models.Index(fields=['tenant_id', 'payment_method']),
            models.Index(fields=['tenant_id', 'status']),
            models.Index(fields=['tenant_id', 'created_at']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['tenant_id', 'transaction_number'], name='unique_pos_transaction_number_per_tenant'),
        ]
    
    def save(self, *args, **kwargs):
        if not self.transaction_number:
            logger.info(f"🎯 [POSTransaction.save] === TRANSACTION NUMBER GENERATION START ===")
            logger.info(f"🎯 [POSTransaction.save] Tenant ID: {self.tenant_id}")
            
            # Generate unique transaction number
            prefix = "POS"
            year = timezone.now().year
            month = timezone.now().month
            month_prefix = f"{prefix}-{year}{month:02d}-"
            
            logger.info(f"🎯 [POSTransaction.save] Month prefix: {month_prefix}")
            
            # Get the highest transaction number for this month
            # This ensures we always increment properly, even across days
            last_transaction = POSTransaction.objects.filter(
                tenant_id=self.tenant_id,
                transaction_number__startswith=month_prefix
            ).order_by('-transaction_number').first()
            
            logger.info(f"🎯 [POSTransaction.save] Last transaction found: {last_transaction.transaction_number if last_transaction else 'None'}")
            
            if last_transaction and last_transaction.transaction_number.startswith(month_prefix):
                # Extract the sequence number from the last transaction
                try:
                    # Handle both formats: POS-202508-0001 and POS-202508-0001-1
                    parts = last_transaction.transaction_number.replace(month_prefix, '').split('-')
                    last_sequence = int(parts[0])
                    next_sequence = last_sequence + 1
                    logger.info(f"🎯 [POSTransaction.save] Last sequence: {last_sequence}, Next: {next_sequence}")
                except (ValueError, IndexError) as e:
                    logger.warning(f"🎯 [POSTransaction.save] Error parsing sequence: {e}")
                    # If we can't parse, start from 1
                    next_sequence = 1
            else:
                # First transaction of the month
                next_sequence = 1
                logger.info(f"🎯 [POSTransaction.save] First transaction of month, starting with sequence: {next_sequence}")
            
            self.transaction_number = f"{month_prefix}{next_sequence:04d}"
            logger.info(f"🎯 [POSTransaction.save] Generated transaction number: {self.transaction_number}")
            
            # Ensure uniqueness (handle race conditions with retry logic)
            max_attempts = 10
            attempt = 0
            while POSTransaction.objects.filter(
                tenant_id=self.tenant_id, 
                transaction_number=self.transaction_number
            ).exists() and attempt < max_attempts:
                logger.warning(f"🎯 [POSTransaction.save] Transaction number {self.transaction_number} already exists, attempt {attempt + 1}")
                next_sequence += 1
                self.transaction_number = f"{month_prefix}{next_sequence:04d}"
                attempt += 1
                logger.info(f"🎯 [POSTransaction.save] Retrying with: {self.transaction_number}")
            
            if attempt >= max_attempts:
                # Fallback: add timestamp to ensure uniqueness
                import time
                timestamp_suffix = int(time.time())
                self.transaction_number = f"{month_prefix}{next_sequence:04d}-{timestamp_suffix}"
                logger.warning(f"🎯 [POSTransaction.save] Max attempts reached, using timestamp fallback: {self.transaction_number}")
            
            logger.info(f"🎯 [POSTransaction.save] Final transaction number: {self.transaction_number}")
            logger.info(f"🎯 [POSTransaction.save] === TRANSACTION NUMBER GENERATION END ===")
                
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"POS Transaction {self.transaction_number}"
    
    @property
    def total_items(self):
        return sum(item.quantity for item in self.items.all())
    
    @property
    def refund_amount(self):
        """Calculate total refunded amount"""
        return sum(refund.amount for refund in self.refunds.all())
    
    def calculate_totals(self):
        """Recalculate all totals based on line items"""
        items = self.items.all()
        
        # Calculate subtotal
        self.subtotal = sum(item.line_total for item in items)
        
        # Apply discount
        if self.discount_percentage > 0:
            self.discount_amount = (self.subtotal * self.discount_percentage / 100)
        
        # Calculate after discount
        after_discount = self.subtotal - self.discount_amount
        
        # Calculate tax
        self.tax_total = sum(item.tax_amount for item in items)
        
        # Calculate total
        self.total_amount = after_discount + self.tax_total
        
        # Calculate change
        if self.amount_tendered:
            self.change_due = max(0, self.amount_tendered - self.total_amount)


class POSTransactionItem(TenantAwareModel):
    """
    Individual line items within a POS transaction.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    transaction = models.ForeignKey(POSTransaction, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.PROTECT, null=True, blank=True)
    service = models.ForeignKey(Service, on_delete=models.PROTECT, null=True, blank=True)
    
    # Item details (captured at time of sale for historical accuracy)
    item_name = models.CharField(max_length=255)
    item_sku = models.CharField(max_length=100, blank=True, null=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    unit_price = models.DecimalField(max_digits=15, decimal_places=4)
    line_discount = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    line_discount_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Tax information
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    tax_inclusive = models.BooleanField(default=False)
    
    # Calculated fields
    line_total = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    cost_price = models.DecimalField(max_digits=15, decimal_places=4, null=True, blank=True)
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    class Meta:
        db_table = 'sales_pos_transaction_item'
        indexes = [
            models.Index(fields=['tenant_id', 'transaction']),
            models.Index(fields=['tenant_id', 'product']),
            models.Index(fields=['tenant_id', 'service']),
        ]
    
    def clean(self):
        # Ensure either product or service is selected, but not both
        if self.product and self.service:
            raise ValidationError('Item cannot be both a product and a service')
        if not self.product and not self.service:
            raise ValidationError('Item must be either a product or a service')
    
    def calculate_totals(self):
        """Calculate line totals including discounts and tax"""
        # Base amount
        base_amount = self.quantity * self.unit_price
        
        # Apply line discount
        if self.line_discount_percentage > 0:
            self.line_discount = base_amount * self.line_discount_percentage / 100
        
        # Amount after discount
        discounted_amount = base_amount - self.line_discount
        
        # Calculate tax
        if self.tax_inclusive:
            # Tax is included in the price
            self.tax_amount = discounted_amount * self.tax_rate / (100 + self.tax_rate)
            self.line_total = discounted_amount
        else:
            # Tax is added to the price
            self.tax_amount = discounted_amount * self.tax_rate / 100
            self.line_total = discounted_amount + self.tax_amount
    
    def save(self, *args, **kwargs):
        self.calculate_totals()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.item_name} x {self.quantity} @ {self.unit_price}"


class Sale(TenantAwareModel):
    """
    Legacy Sale model - maintained for backward compatibility.
    New POS transactions should use POSTransaction model.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField(default=1)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_method = models.CharField(max_length=20, choices=[('cash', 'Cash'), ('card', 'Card'), ('invoice', 'Invoice')])
    amount_given = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    change_due = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True)
    invoice = models.OneToOneField('Invoice', on_delete=models.SET_NULL, null=True, related_name='sale')
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'customer']),
            models.Index(fields=['tenant_id', 'payment_method']),
            models.Index(fields=['tenant_id', 'created_at']),
        ]

class SaleItem(TenantAwareModel):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'sale']),
        ]

    def save(self, *args, **kwargs):
        # This appears to incorrectly reference attributes from the Sale model
        # Simplify to just set the total based on quantity and price
        # Remove the payment_method check since that's on the Sale model, not SaleItem
        super().save(*args, **kwargs)
        

class POSRefund(TenantAwareModel):
    """
    POS Refund model for handling returns and refunds.
    """
    REFUND_TYPE_CHOICES = [
        ('full', 'Full Refund'),
        ('partial', 'Partial Refund'),
        ('exchange', 'Exchange'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('processed', 'Processed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    refund_number = models.CharField(max_length=50, editable=False)
    original_transaction = models.ForeignKey(POSTransaction, on_delete=models.PROTECT, related_name='refunds')
    refund_type = models.CharField(max_length=10, choices=REFUND_TYPE_CHOICES)
    total_amount = models.DecimalField(max_digits=15, decimal_places=4)
    tax_amount = models.DecimalField(max_digits=15, decimal_places=4, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    reason = models.TextField()
    notes = models.TextField(blank=True, null=True)
    
    # Relationships
    journal_entry = models.OneToOneField('finance.JournalEntry', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, related_name='pos_refunds_created')
    approved_by = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True, related_name='pos_refunds_approved')
    approved_at = models.DateTimeField(null=True, blank=True)
    processed_at = models.DateTimeField(null=True, blank=True)
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    class Meta:
        db_table = 'sales_pos_refund'
        indexes = [
            models.Index(fields=['tenant_id', 'refund_number']),
            models.Index(fields=['tenant_id', 'original_transaction']),
            models.Index(fields=['tenant_id', 'status']),
            models.Index(fields=['tenant_id', 'created_at']),
        ]
        constraints = [
            models.UniqueConstraint(fields=['tenant_id', 'refund_number'], name='unique_pos_refund_number_per_tenant'),
        ]
    
    def save(self, *args, **kwargs):
        if not self.refund_number:
            # Generate unique refund number
            prefix = "REF"
            year = timezone.now().year
            month = timezone.now().month
            
            # Get the highest refund number for this month
            # This ensures we always increment properly, even across days
            month_prefix = f"{prefix}-{year}{month:02d}-"
            last_refund = POSRefund.objects.filter(
                tenant_id=self.tenant_id,
                refund_number__startswith=month_prefix
            ).order_by('-refund_number').first()
            
            if last_refund and last_refund.refund_number.startswith(month_prefix):
                # Extract the sequence number from the last refund
                try:
                    # Handle both formats: REF-202508-0001 and REF-202508-0001-1
                    parts = last_refund.refund_number.replace(month_prefix, '').split('-')
                    last_sequence = int(parts[0])
                    next_sequence = last_sequence + 1
                except (ValueError, IndexError):
                    # If we can't parse, start from 1
                    next_sequence = 1
            else:
                # First refund of the month
                next_sequence = 1
            
            self.refund_number = f"{month_prefix}{next_sequence:04d}"
            
            # Ensure uniqueness (handle race conditions with retry logic)
            max_attempts = 10
            attempt = 0
            while POSRefund.objects.filter(
                tenant_id=self.tenant_id,
                refund_number=self.refund_number
            ).exists() and attempt < max_attempts:
                next_sequence += 1
                self.refund_number = f"{month_prefix}{next_sequence:04d}"
                attempt += 1
            
            if attempt >= max_attempts:
                # Fallback: add timestamp to ensure uniqueness
                import time
                self.refund_number = f"{month_prefix}{next_sequence:04d}-{int(time.time())}"
                
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Refund {self.refund_number} for {self.original_transaction.transaction_number}"


class POSRefundItem(TenantAwareModel):
    """
    Individual items being refunded within a POS refund.
    """
    refund = models.ForeignKey(POSRefund, on_delete=models.CASCADE, related_name='items')
    original_item = models.ForeignKey(POSTransactionItem, on_delete=models.PROTECT)
    quantity_returned = models.DecimalField(max_digits=10, decimal_places=3)
    unit_refund_amount = models.DecimalField(max_digits=15, decimal_places=4)
    total_refund_amount = models.DecimalField(max_digits=15, decimal_places=4)
    condition = models.CharField(max_length=50, blank=True, null=True)  # e.g., 'damaged', 'defective', 'unused'
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    class Meta:
        db_table = 'sales_pos_refund_item'
        indexes = [
            models.Index(fields=['tenant_id', 'refund']),
            models.Index(fields=['tenant_id', 'original_item']),
        ]
    
    def save(self, *args, **kwargs):
        # Calculate total refund amount
        self.total_refund_amount = self.quantity_returned * self.unit_refund_amount
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Refund {self.quantity_returned} x {self.original_item.item_name}"


class Refund(TenantAwareModel):
    """
    Legacy Refund model - maintained for backward compatibility.
    New refunds should use POSRefund model.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='refunds')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'sale']),
        ]

    def __str__(self):
        return f"Refund for Sale {self.sale.id}"
    
class RefundItem(TenantAwareModel):
    refund = models.ForeignKey(Refund, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Add tenant-aware manager
    objects = TenantManager()
    all_objects = models.Manager()
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'refund']),
        ]


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


class Sale(TenantAwareModel):
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
        

class Refund(TenantAwareModel):
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


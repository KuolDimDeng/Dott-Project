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


logger = get_logger()

def get_current_datetime():
    return timezone.now()

def default_due_datetime():
    return get_current_datetime() + timedelta(days=30)

class Invoice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_num = models.CharField(max_length=20, unique=True, editable=False)
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

    def __str__(self):
        return self.invoice_num

    @classmethod
    def generate_invoice_number(cls):
        while True:
            uuid_part = uuid.uuid4().hex[-8:].upper()
            invoice_num = f'INV{uuid_part}'
            if not cls.objects.filter(invoice_num=invoice_num).exists():
                return invoice_num
            # If it exists, generate a new one with a random suffix
            random_suffix = ''.join(random.choices('0123456789ABCDEF', k=4))
            invoice_num = f'INV{uuid_part}-{random_suffix}'
            if not cls.objects.filter(invoice_num=invoice_num).exists():
                return invoice_num

    def save(self, *args, **kwargs):
        if not self.invoice_num:
            self.invoice_num = self.generate_invoice_number()
        super().save(*args, **kwargs)

    def clean(self):
        if self.amount <= 0:
            raise ValidationError('Invoice amount must be positive.')

    def total_with_tax(self):
        return self.amount * (1 + self.customer.salesTax / 100)
    
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
    
class InvoiceItem(models.Model):
    invoice = models.ForeignKey(Invoice, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=200, null=True, blank=True)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    def subtotal(self):
        return self.quantity * self.unit_price

    def __str__(self):
        return f"InvoiceItem {self.id} for Invoice {self.invoice_id}"



class Estimate(models.Model):
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

    class Meta:
        app_label = 'sales'
        
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
        return self.total_with_discount() * (1 + self.customer.salesTax / 100)


class EstimateItem(models.Model):
    estimate = models.ForeignKey(Estimate, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=200, null=True, blank=True)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    def subtotal(self):
        return self.quantity * self.unit_price

    def __str__(self):
        return f"EstimateItem {self.id} for Estimate {self.estimate_id}"


# Using Django signals to automatically update totalAmount when EstimateItem is saved
@receiver(post_save, sender=EstimateItem)
def update_estimate_total(sender, instance, **kwargs):
    estimate = instance.estimate
    total = sum(item.subtotal() for item in estimate.items.all())
    estimate.totalAmount = total - estimate.discount
    estimate.save()

class EstimateAttachment(models.Model):
    estimate = models.ForeignKey(Estimate, related_name='attachments', on_delete=models.CASCADE)
    file = models.FileField(upload_to='estimate_attachments/')


    def save(self, *args, **kwargs):
        if not self.estimate_num:
            self.estimate_num = str(self.id)[-5:]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.estimate_num

    def clean(self):
        if self.amount <= 0:
            raise ValidationError('Estimate amount must be positive.')


class SalesOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=50, unique=True, editable=False)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='USD')
    date = models.DateField()
    created_by = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    totalAmount = models.DecimalField(max_digits=10, decimal_places=2, default=0)


    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = self.generate_order_number()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_order_number():
        while True:
            uuid_part = uuid.uuid4().hex[:8].upper()
            order_number = f"SO-{uuid_part}"
            if not SalesOrder.objects.filter(order_number=order_number).exists():
                return order_number
            # If it exists, generate a new one with a random suffix
            random_suffix = ''.join(random.choices('0123456789ABCDEF', k=4))
            order_number = f"SO-{uuid_part}-{random_suffix}"
            if not SalesOrder.objects.filter(order_number=order_number).exists():
                return order_number


    def calculate_total_amount(self):
        total = sum(item.subtotal() for item in self.items.all())
        self.totalAmount = total - self.discount
        self.save()

    def clean(self):
        if self.amount is not None and self.amount <= 0:
            raise ValidationError('Sales order amount must be positive.')

    class Meta:
        ordering = ['-date']
        app_label = 'sales'

    def __str__(self):
        return f"Sales Order {self.order_number}"
        
class SalesOrderItem(models.Model):
    sales_order = models.ForeignKey(SalesOrder, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=200, null=True)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    
    def __str__(self):
        return f"SalesOrderItem {self.id} for SalesOrder {self.sales_order_id}"

    def subtotal(self):
        return self.quantity * self.unit_price

    class Meta:
        ordering = ['id']
        app_label = 'sales'


class Sale(models.Model):
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

class SaleItem(models.Model):
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)


    def save(self, *args, **kwargs):
        self.total_amount = self.product.price * self.quantity
        if self.payment_method == 'cash' and self.amount_given:
            self.change_due = self.amount_given - self.total_amount
        super().save(*args, **kwargs)
        

class Refund(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='refunds')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    reason = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Refund for Sale {self.sale.id}"
    
class RefundItem(models.Model):
    refund = models.ForeignKey(Refund, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    

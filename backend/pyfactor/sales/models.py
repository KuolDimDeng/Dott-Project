from django.db import models
from datetime import timedelta
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from decimal import Decimal


class Item(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sellEnabled = models.BooleanField(default=False)
    buyEnabled = models.BooleanField(default=False)
    salesTax = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

    def __str__(self):
        return self.name

    def clean(self):
        if self.price < 0:
            raise ValidationError('Price must be non-negative.')

class Product(Item):
    department = models.ForeignKey('Department', on_delete=models.SET_NULL, null=True, related_name='products')

class Service(Item):
    pass

class Customer(models.Model):
    customerName = models.CharField(max_length=255, blank=True, null=True)
    first_name = models.CharField(max_length=255, blank=True, null=True)
    last_name = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    accountNumber = models.CharField(max_length=50, blank=True, null=True)
    website = models.URLField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    currency = models.CharField(max_length=3, blank=True, null=True)
    billingCountry = models.CharField(max_length=100, blank=True, null=True)
    billingState = models.CharField(max_length=100, blank=True, null=True)
    shipToName = models.CharField(max_length=255, blank=True, null=True)
    shippingCountry = models.CharField(max_length=100, blank=True, null=True)
    shippingState = models.CharField(max_length=100, blank=True, null=True)
    shippingPhone = models.CharField(max_length=20, blank=True, null=True)
    deliveryInstructions = models.TextField(blank=True, null=True)
    street = models.CharField(max_length=255, blank=True, null=True)
    postcode = models.CharField(max_length=20, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.customerName if self.customerName else f"{self.first_name} {self.last_name}"

class Bill(models.Model):
    bill_num = models.CharField(max_length=20)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='bills')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.bill_num

    def clean(self):
        if self.amount <= 0:
            raise ValidationError('Bill amount must be positive.')

def default_due_date():
    return timezone.now() + timedelta(days=30)

class Invoice(models.Model):
    invoice_num = models.CharField(max_length=20)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='invoices')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    date = models.DateField(default=timezone.now)  # New date field
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    due_date = models.DateField(default=default_due_date)
    status = models.CharField(max_length=20, choices=[('draft', 'Draft'), ('sent', 'Sent'), ('paid', 'Paid')], default='draft')
    transaction = models.OneToOneField('finance.Transaction', on_delete=models.CASCADE, related_name='sales_invoice', null=True, blank=True)
    accounts_receivable = models.ForeignKey('finance.Account', on_delete=models.SET_NULL, related_name='invoices_receivable', null=True)
    sales_revenue = models.ForeignKey('finance.Account', on_delete=models.SET_NULL, related_name='invoices_revenue', null=True)
    sales_tax_payable = models.ForeignKey('finance.Account', on_delete=models.SET_NULL, related_name='invoices_tax_payable', null=True)
    cost_of_goods_sold = models.ForeignKey('finance.Account', on_delete=models.SET_NULL, related_name='invoices_cogs', null=True)
    inventory = models.ForeignKey('finance.Account', on_delete=models.SET_NULL, related_name='invoices_inventory', null=True)
    is_paid = models.BooleanField(default=False)



    def __str__(self):
        return self.invoice_num

    def clean(self):
        if self.amount <= 0:
            raise ValidationError('Invoice amount must be positive.')

    def total_with_tax(self):
        return self.amount * (1 + self.customer.salesTax / 100)

class Vendor(models.Model):
    vendor_name = models.CharField(max_length=100)
    street = models.CharField(max_length=100)
    postcode = models.CharField(max_length=10, default='Enter Postcode')
    city = models.CharField(max_length=100, default='Enter City')
    state = models.CharField(max_length=100, default='Enter State')
    phone = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.vendor_name

class Estimate(models.Model):
    estimate_num = models.CharField(max_length=20)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='estimates')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.estimate_num

    def clean(self):
        if self.amount <= 0:
            raise ValidationError('Estimate amount must be positive.')

class SalesOrder(models.Model):
    order_num = models.CharField(max_length=20)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='sales_orders')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.order_num

    def clean(self):
        if self.amount <= 0:
            raise ValidationError('Sales order amount must be positive.')

class Department(models.Model):
    dept_code = models.CharField(max_length=20)
    dept_name = models.CharField(max_length=20)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.dept_name
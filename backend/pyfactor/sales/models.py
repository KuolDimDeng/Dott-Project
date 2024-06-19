from django.db import models
from datetime import timedelta
from django.utils import timezone

class Product(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sellEnabled = models.BooleanField(default=False)
    buyEnabled = models.BooleanField(default=False)
    salesTax = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    date_created = models.DateField(auto_now_add=True)
    
    def __str__(self):
        return self.name

class Service(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    sellEnabled = models.BooleanField(default=False)
    buyEnabled = models.BooleanField(default=False)
    salesTax = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    date_created = models.DateField(auto_now_add=True)
    
    def __str__(self):
        return self.name

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
    def __str__(self):
        return self.customerName

class Bill(models.Model):
    bill_num = models.CharField(max_length=20)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='bills')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date_created = models.DateField(auto_now_add=True)

    def __str__(self):
        return self.bill_num

def default_due_date():
    return timezone.now() + timedelta(days=30)

class Invoice(models.Model):
    invoice_num = models.CharField(max_length=20)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='invoices')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date_created = models.DateField(auto_now_add=True)
    due_date = models.DateField(default=default_due_date)
    status = models.CharField(max_length=20, choices=[('draft', 'Draft'), ('sent', 'Sent'), ('paid', 'Paid')], default='draft')
    transaction = models.OneToOneField('finance.Transaction', on_delete=models.CASCADE, related_name='sales_invoice', null=True, blank=True)

    def __str__(self):
        return self.invoice_num

class Vendor(models.Model):
    vendor_name = models.CharField(max_length=100)
    street = models.CharField(max_length=100)
    postcode = models.CharField(max_length=10, default='Enter Postcode')
    city = models.CharField(max_length=100, default='Enter City')
    state = models.CharField(max_length=100, default='Enter State')
    phone = models.CharField(max_length=20, blank=True, null=True)

    def __str__(self):
        return self.vendor_name

class Estimate(models.Model):
    estimate_num = models.CharField(max_length=20)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='estimates')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date_created = models.DateField(auto_now_add=True)

    def __str__(self):
        return self.estimate_num

class SalesOrder(models.Model):
    order_num = models.CharField(max_length=20)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='sales_orders')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date_created = models.DateField(auto_now_add=True)

    def __str__(self):
        return self.order_num

class Department(models.Model):
    dept_code = models.CharField(max_length=20)
    product_num = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='product')
    date_created = models.DateField(auto_now_add=True)
    dept_name = models.CharField(max_length=20)

    def __str__(self):
        return self.dept_name

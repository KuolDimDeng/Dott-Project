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



logger = get_logger()

def get_current_datetime():
    return timezone.now()

def default_due_datetime():
    return get_current_datetime() + timedelta(days=30)

class ProductManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().using(self._db)
    
class ServiceManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().using(self._db)


class Item(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
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
        
    @classmethod
    def generate_unique_code(cls, name, field):
        base = slugify(name)[:20]
        while True:
            code = f"{base}_{''.join(random.choices(string.ascii_uppercase + string.digits, k=5))}"
            if not cls.objects.filter(**{field: code}).exists():
                return code

class Product(Item):
    product_code = models.CharField(max_length=50, unique=True, editable=False)
    department = models.ForeignKey('Department', on_delete=models.SET_NULL, null=True, related_name='products')
    stock_quantity = models.IntegerField(default=0)
    reorder_level = models.IntegerField(default=0)
    objects = ProductManager()


    class Meta:
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['product_code']),
        ]
        app_label = 'sales'

    def save(self, *args, **kwargs):
        if not self.product_code:
            self.product_code = self.generate_unique_code(self.name, 'product_code')
        super().save(*args, **kwargs)

    @classmethod
    def from_db(cls, db, field_names, values):
        instance = super().from_db(db, field_names, values)
        instance._state.db = db
        return instance

class Service(Item):
    service_code = models.CharField(max_length=50, unique=True, editable=False)
    duration = models.DurationField(null=True, blank=True)
    is_recurring = models.BooleanField(default=False)
    
    objects = ServiceManager()


    class Meta:
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['service_code']),
        ]

    def save(self, *args, **kwargs):
        if not self.service_code:
            self.service_code = self.generate_unique_code(self.name, 'service_code')
        super().save(*args, **kwargs)
        
    @classmethod
    def from_db(cls, db, field_names, values):
        instance = super().from_db(db, field_names, values)
        instance._state.db = db
        return instance

class Customer(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    customerName = models.CharField(max_length=255, blank=True, null=True)
    first_name = models.CharField(max_length=255, blank=True, null=True)
    last_name = models.CharField(max_length=255, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    accountNumber = models.CharField(max_length=6, unique=True, editable=False)
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
    
    def save(self, *args, **kwargs):
        if not self.accountNumber:
            uuid_numbers = re.sub('[^0-9]', '', str(self.id))
            self.accountNumber = (uuid_numbers[:5] + '00000')[:5]
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.customerName} (Account: {self.accountNumber})"
    
class Bill(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bill_number = models.CharField(max_length=20, unique=True, editable=False, blank=True, null=True)
    vendor = models.ForeignKey('Vendor', on_delete=models.CASCADE, related_name='bills')
    bill_date = models.DateTimeField(default=get_current_datetime)
    due_date = models.DateTimeField(default=default_due_datetime)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    # Add other fields as needed
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.bill_number:
            self.bill_number = self.generate_bill_number()
        super().save(*args, **kwargs)

    def generate_bill_number(self):
        # Get the first 5 characters of the UUID, convert to uppercase
        uuid_part = str(self.id)[:8].upper()
        return f"BILL-{uuid_part}"

    def __str__(self):
            return f"Bill {self.id or 'Unsaved'}"

    class Meta:
        ordering = ['-bill_date']
        
    def clean(self):
        if self.total_amount <= 0:
            raise ValidationError('Bill amount must be positive.')


class Invoice(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice_num = models.CharField(max_length=20, unique=True, editable=False)
    customer = models.ForeignKey('Customer', on_delete=models.CASCADE, related_name='invoices')
    amount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    date = models.DateTimeField(default=get_current_datetime)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    due_date = models.DateTimeField(default=default_due_datetime)
    status = models.CharField(max_length=20, choices=[('draft', 'Draft'), ('sent', 'Sent'), ('paid', 'Paid')], default='draft')
    transaction = models.OneToOneField('finance.FinanceTransaction', on_delete=models.CASCADE, related_name='sales_invoice', null=True, blank=True)
    accounts_receivable = models.ForeignKey('finance.Account', on_delete=models.SET_NULL, related_name='invoices_receivable', null=True)
    sales_revenue = models.ForeignKey('finance.Account', on_delete=models.SET_NULL, related_name='invoices_revenue', null=True)
    sales_tax_payable = models.ForeignKey('finance.Account', on_delete=models.SET_NULL, related_name='invoices_tax_payable', null=True)
    cost_of_goods_sold = models.ForeignKey('finance.Account', on_delete=models.SET_NULL, related_name='invoices_cogs', null=True)
    inventory = models.ForeignKey('finance.Account', on_delete=models.SET_NULL, related_name='invoices_inventory', null=True)
    is_paid = models.BooleanField(default=False)

    def __str__(self):
        return self.invoice_num

    @staticmethod
    def generate_invoice_number(uuid_value):
        uuid_part = str(uuid_value)[-8:].upper()
        return f'INV{uuid_part}'

    def save(self, *args, **kwargs):
        if not self.invoice_num:
            self.invoice_num = self.generate_invoice_number(self.id)
        super().save(*args, **kwargs)

    def clean(self):
        if self.amount <= 0:
            raise ValidationError('Invoice amount must be positive.')

    def total_with_tax(self):
        return self.amount * (1 + self.customer.salesTax / 100)

class Vendor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor_number = models.CharField(max_length=20, unique=True, editable=False)
    vendor_name = models.CharField(max_length=100)
    street = models.CharField(max_length=100)
    postcode = models.CharField(max_length=10)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.vendor_number:
            self.vendor_number = self.generate_vendor_number()
        super().save(*args, **kwargs)

    def generate_vendor_number(self):
        uuid_part = str(self.id)[:8].upper()
        return f"V-{uuid_part}"

    def __str__(self):
        return f"{self.vendor_name} ({self.vendor_number})"

    class Meta:
        ordering = ['vendor_name']

class Estimate(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    estimate_num = models.CharField(max_length=20, unique=True, editable=False, null=True, blank=True)
    customer = models.ForeignKey('Customer', on_delete=models.CASCADE, related_name='estimates')
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
    def generate_estimate_number(uuid_value):
        uuid_part = str(uuid_value)[:8].upper()
        return f'EST-{uuid_part}'

    def clean(self):
        if self.totalAmount <= 0:
            raise ValidationError('Estimate amount must be positive.')

    def total_with_discount(self):
        return self.totalAmount - (self.totalAmount * self.discount / 100)
    
    def total_with_tax(self):
        return self.total_with_discount() * (1 + self.customer.salesTax / 100)


class EstimateItem(models.Model):
    estimate = models.ForeignKey(Estimate, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey('Product', on_delete=models.SET_NULL, null=True, blank=True)
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True, blank=True)
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
    customer = models.ForeignKey('Customer', on_delete=models.CASCADE)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)    
    currency = models.CharField(max_length=3, default='USD')
    date = models.DateField()
    created_by = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = self.generate_order_number()
        super().save(*args, **kwargs)

    def generate_order_number(self):
        uuid_part = str(self.id)[:8].upper()
        return f"SO-{uuid_part}"


    def clean(self):
        if self.amount is not None and self.amount <= 0:
            raise ValidationError('Sales order amount must be positive.')

    class Meta:
        ordering = ['-date']
        app_label = 'sales'
        
class SalesOrderItem(models.Model):
    sales_order = models.ForeignKey(SalesOrder, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    service = models.ForeignKey(Service, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=200, null=True)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    def __str__(self):
        return f"SalesOrderItem {self.id} for SalesOrder {self.sales_order_id}"

    def subtotal(self):
        return self.quantity * self.unit_price

    class Meta:
        ordering = ['id']
        app_label = 'sales'

class Department(models.Model):
    dept_code = models.CharField(max_length=20)
    dept_name = models.CharField(max_length=20)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.dept_name



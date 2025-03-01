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


logger = get_logger()

def get_current_datetime():
    return timezone.now()

def default_due_datetime():
    return get_current_datetime() + timedelta(days=30)

class CustomChargePlan(models.Model):
    name = models.CharField(max_length=100)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    UNIT_CHOICES = [
        ('kg', 'Kilogram'),
        ('unit', 'Per Unit'),
        ('hour', 'Per Hour'),
        ('day', 'Per Day'),
        ('week', 'Per Week'),
        ('month', 'Per Month'),
        ('custom', 'Custom'),
    ]
    unit = models.CharField(max_length=10, choices=UNIT_CHOICES)
    custom_unit = models.CharField(max_length=50, blank=True, null=True)
    PERIOD_CHOICES = [
        ('hour', 'Hour'),
        ('day', 'Day'),
        ('week', 'Week'),
        ('month', 'Month'),
        ('custom', 'Custom'),
    ]
    period = models.CharField(max_length=10, choices=PERIOD_CHOICES)
    custom_period = models.CharField(max_length=50, blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        unit = self.custom_unit if self.unit == 'custom' else self.get_unit_display()
        period = self.custom_period if self.period == 'custom' else self.get_period_display()
        return f"{self.name}: {self.quantity} {unit} per {period} for {self.price}"


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
    is_for_sale = models.BooleanField(default=True)
    is_for_rent = models.BooleanField(default=False)
    salesTax = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    height = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    width = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    height_unit = models.CharField(max_length=10, choices=[('cm', 'Centimeter'), ('m', 'Meter'), ('in', 'Inch')], default='cm')
    width_unit = models.CharField(max_length=10, choices=[('cm', 'Centimeter'), ('m', 'Meter'), ('in', 'Inch')], default='cm')
    weight = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    weight_unit = models.CharField(max_length=10, choices=[('kg', 'Kilogram'), ('lb', 'Pound'), ('g', 'Gram')], default='kg')
    charge_period = models.CharField(max_length=10, choices=[('hour', 'Hour'), ('day', 'Day'), ('month', 'Month'), ('year', 'Year')], default='day')
    charge_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    custom_charge_plans = models.ManyToManyField(CustomChargePlan, blank=True)


    class Meta:
        abstract = True

    def __str__(self):
        return self.name

    def clean(self):
        if self.price < 0:
            raise ValidationError('Price must be non-negative.')

    @property
    def days_in_stock(self):
        return (timezone.now() - self.created_at).days

    @classmethod
    def generate_unique_code(cls, name, field):
        base = slugify(name)[:20]
        while True:
            code = f"{base}_{''.join(random.choices(string.ascii_uppercase + string.digits, k=5))}"
            if not cls.objects.filter(**{field: code}).exists():
                return code
            code = f"{base}_{''.join(random.choices(string.ascii_uppercase + string.digits, k=8))}"
            if not cls.objects.filter(**{field: code}).exists():
                return code


class Product(Item):
    product_code = models.CharField(max_length=50, unique=True, editable=False)
    department = models.ForeignKey('Department', on_delete=models.SET_NULL, null=True, related_name='products')
    stock_quantity = models.IntegerField(default=0)
    reorder_level = models.IntegerField(default=0)
    objects = models.Manager()

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
    
    def get_barcode_image(self):
        rv = BytesIO()
        Code128(self.product_code, writer=ImageWriter()).write(rv)
        return rv.getvalue()

class Service(Item):
    service_code = models.CharField(max_length=50, unique=True, editable=False)
    duration = models.DurationField(null=True, blank=True)
    is_recurring = models.BooleanField(default=False)
    objects = models.Manager()

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

class ProductTypeFields(models.Model):
    """Store dynamic fields for products based on business type"""
    product = models.OneToOneField('Product', on_delete=models.CASCADE, related_name='type_fields')
    
    # Common fields many businesses might use
    category = models.CharField(max_length=100, blank=True, null=True)
    subcategory = models.CharField(max_length=100, blank=True, null=True)
    
    # Fields for various business types
    # E-commerce fields
    material = models.CharField(max_length=100, blank=True, null=True)
    brand = models.CharField(max_length=100, blank=True, null=True)
    condition = models.CharField(max_length=50, blank=True, null=True)
    
    # Food/beverage fields
    ingredients = models.TextField(blank=True, null=True)
    allergens = models.TextField(blank=True, null=True)
    nutritional_info = models.TextField(blank=True, null=True)
    
    # Apparel fields
    size = models.CharField(max_length=20, blank=True, null=True)
    color = models.CharField(max_length=50, blank=True, null=True)
    gender = models.CharField(max_length=20, blank=True, null=True)
    
    # Trucking/vehicle fields
    vehicle_type = models.CharField(max_length=100, blank=True, null=True)
    load_capacity = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    
    # Store additional fields that don't fit the predefined ones
    extra_fields = models.JSONField(default=dict, blank=True)
    
    class Meta:
        verbose_name = "Product Type Field"
        verbose_name_plural = "Product Type Fields"

class ServiceTypeFields(models.Model):
    """Store dynamic fields for services based on business type"""
    service = models.OneToOneField('Service', on_delete=models.CASCADE, related_name='type_fields')
    
    # Common fields
    category = models.CharField(max_length=100, blank=True, null=True)
    subcategory = models.CharField(max_length=100, blank=True, null=True)
    
    # Professional service fields
    skill_level = models.CharField(max_length=50, blank=True, null=True)
    certification = models.CharField(max_length=100, blank=True, null=True)
    experience_years = models.PositiveIntegerField(null=True, blank=True)
    
    # Appointment-based fields
    min_booking_notice = models.DurationField(null=True, blank=True)
    buffer_time = models.DurationField(null=True, blank=True)
    
    # Event/venue fields
    max_capacity = models.PositiveIntegerField(null=True, blank=True)
    amenities = models.TextField(blank=True, null=True)
    
    # Transportation fields
    service_area = models.CharField(max_length=100, blank=True, null=True)
    vehicle_requirements = models.TextField(blank=True, null=True)
    
    # Store additional fields
    extra_fields = models.JSONField(default=dict, blank=True)
    
    class Meta:
        verbose_name = "Service Type Field"
        verbose_name_plural = "Service Type Fields"

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
    
    def generate_account_number():
        while True:
            uuid_numbers = re.sub('[^0-9]', '', str(uuid.uuid4()))
            account_number = (uuid_numbers[:5] + '00000')[:5]
            if not Customer.objects.filter(accountNumber=account_number).exists():
                return account_number
            # If it exists, generate a new one with a random suffix
            random_suffix = ''.join(random.choices('0123456789', k=2))
            account_number = (uuid_numbers[:3] + random_suffix + '00000')[:5]
            if not Customer.objects.filter(accountNumber=account_number).exists():
                return account_number
            
    def total_income(self):
        return sum(invoice.totalAmount for invoice in self.invoices.all())
    

   

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
    product = models.ForeignKey('Product', on_delete=models.SET_NULL, null=True, blank=True)
    service = models.ForeignKey('Service', on_delete=models.SET_NULL, null=True, blank=True)
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

class Department(models.Model):
    dept_code = models.CharField(max_length=20)
    dept_name = models.CharField(max_length=20)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.dept_name


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
    product = models.ForeignKey('Product', on_delete=models.CASCADE)
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
    product = models.ForeignKey('Product', on_delete=models.CASCADE)
    quantity = models.PositiveIntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    

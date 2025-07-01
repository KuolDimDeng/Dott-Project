#/Users/kuoldeng/projectx/backend/pyfactor/purchases/models.py
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
from sales.models import Product  # Import Product from sales app



logger = get_logger()

def get_current_datetime():
    return timezone.now()

def default_due_datetime():
    return get_current_datetime() + timedelta(days=30)

class Expense(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor = models.CharField(max_length=100)
    date = models.DateField()
    category = models.CharField(max_length=100)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    description = models.TextField(blank=True)
    payment_method = models.CharField(max_length=50)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


    def __str__(self):
        return f"Expense for {self.vendor} on {self.date}"

    class Meta:
        ordering = ['-date']
        app_label = 'purchases'

class Vendor(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vendor_number = models.CharField(max_length=20, unique=True, editable=False)
    vendor_name = models.CharField(max_length=100)
    street = models.CharField(max_length=100)
    postcode = models.CharField(max_length=10)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    phone = models.CharField(max_length=20, blank=True, null=True)
    is_1099_vendor = models.BooleanField(default=False)
    tax_id = models.CharField(max_length=20, blank=True, null=True)  # For EIN or SSN
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.vendor_number:
            self.vendor_number = self.generate_vendor_number()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_vendor_number():
        while True:
            uuid_part = uuid.uuid4().hex[:8].upper()
            vendor_number = f"V-{uuid_part}"
            if not Vendor.objects.filter(vendor_number=vendor_number).exists():
                return vendor_number
            # If it exists, generate a new one with a random suffix
            random_suffix = ''.join(random.choices('0123456789ABCDEF', k=4))
            vendor_number = f"V-{uuid_part}-{random_suffix}"
            if not Vendor.objects.filter(vendor_number=vendor_number).exists():
                return vendor_number

    def __str__(self):
        return f"{self.vendor_name} ({self.vendor_number})"

    class Meta:
        ordering = ['vendor_name']
        app_label = 'purchases'

 
class Bill(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bill_number = models.CharField(max_length=20, unique=True, editable=False, blank=True, null=True)
    vendor = models.ForeignKey('Vendor', on_delete=models.CASCADE, related_name='bills')
    bill_date = models.DateTimeField(default=get_current_datetime)
    due_date = models.DateTimeField(null=False, blank=False, default=default_due_datetime)
    totalAmount = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    # Add other fields as needed
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    currency = models.CharField(max_length=3, default='USD')  # Add this line if it's not present
    poso_number = models.CharField(max_length=50, blank=True, null=True)  # Add this line if it's missing
    notes = models.TextField(blank=True, null=True)
    is_paid = models.BooleanField(default=False)



    def save(self, *args, **kwargs):
        if not self.bill_number:
            self.bill_number = self.generate_bill_number()
        super().save(*args, **kwargs)
        
    @property
    def calculated_total_amount(self):
        return sum(item.amount for item in self.items.all())


    @staticmethod
    def generate_bill_number():
        while True:
            uuid_part = uuid.uuid4().hex[:8].upper()
            bill_number = f"BILL-{uuid_part}"
            if not Bill.objects.filter(bill_number=bill_number).exists():
                return bill_number
            # If it exists, generate a new one with a random suffix
            random_suffix = ''.join(random.choices('0123456789ABCDEF', k=4))
            bill_number = f"BILL-{uuid_part}-{random_suffix}"
            if not Bill.objects.filter(bill_number=bill_number).exists():
                return bill_number

    def __str__(self):
        return self.bill_number
    
    class Meta:
        ordering = ['-bill_date']
        
    def clean(self):
        if self.total_amount <= 0:
            raise ValidationError('Bill amount must be positive.')
        
    def save(self, *args, **kwargs):
        if not self.bill_number:
            self.bill_number = self.generate_bill_number()
        super().save(*args, **kwargs)




class BillItem(models.Model):
    bill = models.ForeignKey(Bill, related_name='items', on_delete=models.CASCADE)
    category = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=2)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    amount = models.DecimalField(max_digits=10, decimal_places=2)

    def subtotal(self):
        return self.quantity * self.unit_price

    def __str__(self):
        return f"BillItem {self.id} for Bill {self.bill_id}"
    

class PurchaseOrder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=50, unique=True, editable=False)
    vendor = models.ForeignKey('Vendor', on_delete=models.CASCADE)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    currency = models.CharField(max_length=3, default='USD')
    date = models.DateField()
    expected_delivery_date = models.DateField(null=True, blank=True)
    created_by = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    totalAmount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('sent', 'Sent'),
        ('received', 'Received'),
        ('cancelled', 'Cancelled')
    ], default='draft')

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = self.generate_order_number()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_order_number():
        while True:
            uuid_part = uuid.uuid4().hex[:8].upper()
            order_number = f"PO-{uuid_part}"
            if not PurchaseOrder.objects.filter(order_number=order_number).exists():
                return order_number
            random_suffix = ''.join(random.choices('0123456789ABCDEF', k=4))
            order_number = f"PO-{uuid_part}-{random_suffix}"
            if not PurchaseOrder.objects.filter(order_number=order_number).exists():
                return order_number

    def calculate_total_amount(self):
        total = sum(item.subtotal() for item in self.items.all())
        self.totalAmount = total - self.discount
        self.save()

    def clean(self):
        if self.totalAmount <= 0:
            raise ValidationError('Purchase order amount must be positive.')

    class Meta:
        ordering = ['-date']
        app_label = 'purchases'

    def __str__(self):
        return f"Purchase Order {self.order_number}"

class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=200, null=True, blank=True)
    quantity = models.IntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    def subtotal(self):
        return self.quantity * self.unit_price

    def __str__(self):
        return f"PurchaseOrderItem {self.id} for PurchaseOrder {self.purchase_order_id}"

    class Meta:
        ordering = ['id']
        app_label = 'purchases'

class PurchaseReturn(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    return_number = models.CharField(max_length=20, unique=True, editable=False)
    purchase_order = models.ForeignKey('PurchaseOrder', on_delete=models.CASCADE, related_name='returns')
    date = models.DateField()
    reason = models.TextField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('completed', 'Completed'),
        ('rejected', 'Rejected')
    ], default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.return_number:
            self.return_number = self.generate_return_number()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_return_number():
        last_return = PurchaseReturn.objects.order_by('-id').first()
        if last_return:
            last_number = int(last_return.return_number[3:])
            new_number = last_number + 1
        else:
            new_number = 1
        return f"PR-{new_number:06d}"

    def __str__(self):
        return f"Purchase Return {self.return_number}"

class PurchaseReturnItem(models.Model):
    purchase_return = models.ForeignKey(PurchaseReturn, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Return Item for {self.purchase_return.return_number}"
    
class Procurement(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    procurement_number = models.CharField(max_length=20, unique=True, editable=False)
    vendor = models.ForeignKey('Vendor', on_delete=models.CASCADE, related_name='procurements')
    date = models.DateField()
    description = models.TextField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ], default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        if not self.procurement_number:
            self.procurement_number = self.generate_procurement_number()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_procurement_number():
        last_procurement = Procurement.objects.order_by('-id').first()
        if last_procurement:
            last_number = int(last_procurement.procurement_number[4:])
            new_number = last_number + 1
        else:
            new_number = 1
        return f"PROC-{new_number:06d}"

    def __str__(self):
        return f"Procurement {self.procurement_number}"

class ProcurementItem(models.Model):
    procurement = models.ForeignKey(Procurement, related_name='items', on_delete=models.CASCADE)
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True, blank=True)
    description = models.CharField(max_length=200)
    quantity = models.IntegerField()
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    def save(self, *args, **kwargs):
        self.total_price = self.quantity * self.unit_price
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Item for {self.procurement.procurement_number}"


class Purchase(models.Model):
    """Model for tracking purchases and payments to vendors for 1099 reporting"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant_id = models.IntegerField()
    vendor = models.ForeignKey('Vendor', on_delete=models.CASCADE, related_name='purchases')
    purchase_date = models.DateField()
    payment_date = models.DateField(null=True, blank=True)
    description = models.TextField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled')
    ], default='pending')
    payment_method = models.CharField(max_length=50, blank=True, null=True)
    reference_number = models.CharField(max_length=100, blank=True, null=True)
    is_1099_eligible = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Purchase from {self.vendor.vendor_name} - ${self.total_amount}"

    class Meta:
        ordering = ['-purchase_date']
        app_label = 'purchases'
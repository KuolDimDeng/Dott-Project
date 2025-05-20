import uuid
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.contrib.auth import get_user_model
from pyfactor.logging_config import get_logger

logger = get_logger()

class Equipment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    equipment_type = models.CharField(max_length=100, choices=[
        ('truck', 'Truck'),
        ('trailer', 'Trailer'),
        ('van', 'Van'),
        ('forklift', 'Forklift'),
        ('container', 'Container'),
        ('other', 'Other')
    ], verbose_name="Vehicle Type")
    make = models.CharField(max_length=100, blank=True, null=True)
    model = models.CharField(max_length=100, blank=True, null=True)
    year = models.IntegerField(blank=True, null=True)
    vin = models.CharField(max_length=100, blank=True, null=True, verbose_name="VIN/Serial Number")
    license_plate = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=50, choices=[
        ('active', 'Active'),
        ('maintenance', 'In Maintenance'),
        ('out_of_service', 'Out of Service'),
        ('retired', 'Retired')
    ], default='active')
    purchase_date = models.DateField(blank=True, null=True)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    current_value = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.equipment_type})"

    class Meta:
        verbose_name = "Vehicle"
        verbose_name_plural = "Vehicles"

class Driver(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True, related_name='driver_profile')
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    license_number = models.CharField(max_length=100)
    license_state = models.CharField(max_length=100)
    license_expiration = models.DateField()
    status = models.CharField(max_length=50, choices=[
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('on_leave', 'On Leave')
    ], default='active')
    hire_date = models.DateField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

class Route(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    start_location = models.CharField(max_length=255)
    end_location = models.CharField(max_length=255)
    distance = models.DecimalField(max_digits=10, decimal_places=2, help_text="Distance in miles")
    estimated_time = models.DurationField(help_text="Estimated travel time")
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.start_location} to {self.end_location})"

class Load(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_number = models.CharField(max_length=100, unique=True)
    customer = models.ForeignKey('crm.Customer', on_delete=models.CASCADE, related_name='loads')
    route = models.ForeignKey(Route, on_delete=models.SET_NULL, null=True, blank=True, related_name='loads')
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='loads')
    equipment = models.ForeignKey(Equipment, on_delete=models.SET_NULL, null=True, blank=True, related_name='loads')
    status = models.CharField(max_length=50, choices=[
        ('pending', 'Pending'),
        ('assigned', 'Assigned'),
        ('in_transit', 'In Transit'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled')
    ], default='pending')
    pickup_date = models.DateTimeField()
    delivery_date = models.DateTimeField()
    pickup_location = models.CharField(max_length=255)
    delivery_location = models.CharField(max_length=255)
    cargo_description = models.TextField()
    weight = models.DecimalField(max_digits=10, decimal_places=2, help_text="Weight in pounds")
    volume = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, help_text="Volume in cubic feet")
    value = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    rate = models.DecimalField(max_digits=10, decimal_places=2)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Load {self.reference_number} - {self.customer.customerName}"

    def save(self, *args, **kwargs):
        if not self.reference_number:
            # Generate a unique reference number
            last_load = Load.objects.order_by('-created_at').first()
            if last_load and last_load.reference_number.startswith('LOAD-'):
                try:
                    num = int(last_load.reference_number.split('-')[1]) + 1
                    self.reference_number = f"LOAD-{num:06d}"
                except (IndexError, ValueError):
                    self.reference_number = f"LOAD-{1:06d}"
            else:
                self.reference_number = f"LOAD-{1:06d}"
        super().save(*args, **kwargs)

class Expense(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    load = models.ForeignKey(Load, on_delete=models.CASCADE, related_name='expenses', null=True, blank=True)
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name='expenses', null=True, blank=True)
    expense_type = models.CharField(max_length=100, choices=[
        ('fuel', 'Fuel'),
        ('maintenance', 'Maintenance'),
        ('repair', 'Repair'),
        ('toll', 'Toll'),
        ('parking', 'Parking'),
        ('food', 'Food'),
        ('lodging', 'Lodging'),
        ('other', 'Other')
    ])
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField()
    description = models.TextField(blank=True, null=True)
    receipt = models.FileField(upload_to='transport/receipts/', blank=True, null=True)
    created_by = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.expense_type} - {self.amount}"

class Maintenance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name='maintenance_records')
    maintenance_type = models.CharField(max_length=100, choices=[
        ('preventive', 'Preventive Maintenance'),
        ('repair', 'Repair'),
        ('inspection', 'Inspection'),
        ('other', 'Other')
    ])
    description = models.TextField()
    date_performed = models.DateField()
    odometer_reading = models.IntegerField(blank=True, null=True, help_text="Odometer reading in miles")
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    performed_by = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    next_maintenance_date = models.DateField(blank=True, null=True)
    next_maintenance_odometer = models.IntegerField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.maintenance_type} for {self.equipment.name} on {self.date_performed}"

class Compliance(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    equipment = models.ForeignKey(Equipment, on_delete=models.CASCADE, related_name='compliance_records', null=True, blank=True)
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='compliance_records', null=True, blank=True)
    document_type = models.CharField(max_length=100, choices=[
        ('registration', 'Registration'),
        ('insurance', 'Insurance'),
        ('inspection', 'Inspection'),
        ('permit', 'Permit'),
        ('license', 'License'),
        ('certification', 'Certification'),
        ('other', 'Other')
    ])
    document_number = models.CharField(max_length=100, blank=True, null=True)
    issue_date = models.DateField()
    expiration_date = models.DateField()
    issuing_authority = models.CharField(max_length=255, blank=True, null=True)
    document_file = models.FileField(upload_to='transport/compliance/', blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        related_to = self.equipment.name if self.equipment else self.driver.first_name + " " + self.driver.last_name
        return f"{self.document_type} for {related_to} (Expires: {self.expiration_date})"

    @property
    def is_expired(self):
        return self.expiration_date < timezone.now().date()

    @property
    def days_until_expiration(self):
        delta = self.expiration_date - timezone.now().date()
        return delta.days

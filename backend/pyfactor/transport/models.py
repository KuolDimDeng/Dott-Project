import uuid
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.contrib.auth import get_user_model
from pyfactor.logging_config import get_logger

logger = get_logger()

class Equipment(models.Model):
    tenant_id = models.UUIDField(null=True, blank=True, db_index=True, help_text='Tenant isolation field')
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

class Trip(models.Model):
    """Enhanced trip/job model with Google Maps integration and payment support"""
    tenant_id = models.UUIDField(null=True, blank=True, db_index=True, help_text='Tenant isolation field')
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_number = models.CharField(max_length=100, unique=True)
    
    # Core relationships
    customer = models.ForeignKey('crm.Customer', on_delete=models.CASCADE, related_name='transport_trips')
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='trips')
    vehicle = models.ForeignKey(Equipment, on_delete=models.SET_NULL, null=True, blank=True, related_name='trips')
    
    # Trip status
    status = models.CharField(max_length=50, choices=[
        ('pending', 'Pending'),
        ('assigned', 'Assigned'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ], default='pending')
    
    # Basic route info
    origin_address = models.TextField(help_text="Starting point address")
    destination_address = models.TextField(help_text="Final destination address")
    
    # Google Maps integration fields
    origin_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    origin_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    destination_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    destination_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    
    # Auto-calculated route data
    estimated_distance = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Distance in miles")
    estimated_duration = models.DurationField(null=True, blank=True, help_text="Estimated travel time")
    estimated_fuel_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Calculated fuel cost")
    
    # Cargo details
    cargo_description = models.TextField()
    weight = models.DecimalField(max_digits=10, decimal_places=2, help_text="Weight in pounds", null=True, blank=True)
    volume = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, help_text="Volume in cubic feet")
    cargo_value = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True, help_text="Declared cargo value")
    
    # Financial details
    agreed_rate = models.DecimalField(max_digits=10, decimal_places=2, help_text="Agreed payment rate")
    currency = models.CharField(max_length=3, default='USD')
    
    # Time tracking
    scheduled_pickup = models.DateTimeField(help_text="Scheduled pickup time")
    scheduled_delivery = models.DateTimeField(help_text="Scheduled delivery time")
    actual_start = models.DateTimeField(null=True, blank=True)
    actual_completion = models.DateTimeField(null=True, blank=True)
    
    # Payment status
    payment_status = models.CharField(max_length=50, choices=[
        ('pending', 'Payment Pending'),
        ('paid', 'Paid'),
        ('partial', 'Partially Paid'),
        ('overdue', 'Overdue'),
        ('disputed', 'Disputed')
    ], default='pending')
    
    # Additional info
    special_instructions = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    
    # Tracking
    created_by = models.ForeignKey(get_user_model(), on_delete=models.SET_NULL, null=True, blank=True, related_name='trips_created')
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Trip {self.reference_number} - {self.customer.customerName if self.customer else 'No Customer'}"

    def save(self, *args, **kwargs):
        if not self.reference_number:
            # Generate unique trip reference number
            last_trip = Trip.objects.order_by('-created_at').first()
            if last_trip and last_trip.reference_number.startswith('TRIP-'):
                try:
                    num = int(last_trip.reference_number.split('-')[1]) + 1
                    self.reference_number = f"TRIP-{num:06d}"
                except (IndexError, ValueError):
                    self.reference_number = f"TRIP-{1:06d}"
            else:
                self.reference_number = f"TRIP-{1:06d}"
        super().save(*args, **kwargs)
    
    @property
    def total_stops(self):
        """Return total number of stops including origin and destination"""
        return self.stops.count() + 2  # +2 for origin and destination
    
    @property
    def completed_stops(self):
        """Return number of completed stops"""
        return self.stops.filter(is_completed=True).count()
    
    @property
    def progress_percentage(self):
        """Calculate completion percentage"""
        total = self.total_stops
        if total == 0:
            return 0
        completed = self.completed_stops
        if self.status == 'completed':
            return 100
        return int((completed / total) * 100)

class TripStop(models.Model):
    """Multiple stops for each trip with Google Places integration"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='stops')
    stop_order = models.PositiveIntegerField(help_text="Order of this stop in the route")
    
    # Location details (Google Places integration)
    address = models.TextField(help_text="Full address of the stop")
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    google_place_id = models.CharField(max_length=255, blank=True, null=True, help_text="Google Places API place ID")
    
    # Stop type and purpose
    stop_type = models.CharField(max_length=50, choices=[
        ('pickup', 'Pickup'),
        ('delivery', 'Delivery'),
        ('fuel', 'Fuel Stop'),
        ('rest', 'Rest Stop'),
        ('toll', 'Toll Payment'),
        ('inspection', 'Inspection Point'),
        ('customer_visit', 'Customer Visit'),
        ('warehouse', 'Warehouse Stop'),
        ('other', 'Other')
    ], default='delivery')
    
    # Customer association (optional - for pickup/delivery stops)
    customer = models.ForeignKey('crm.Customer', on_delete=models.SET_NULL, null=True, blank=True, 
                               help_text="Customer associated with this stop")
    
    # Time tracking
    estimated_arrival = models.DateTimeField()
    actual_arrival = models.DateTimeField(null=True, blank=True)
    estimated_departure = models.DateTimeField()
    actual_departure = models.DateTimeField(null=True, blank=True)
    
    # Completion tracking
    is_completed = models.BooleanField(default=False)
    completion_notes = models.TextField(blank=True, null=True)
    completion_timestamp = models.DateTimeField(null=True, blank=True)
    
    # Proof of delivery/service
    proof_photo = models.ImageField(upload_to='transport/proof/', blank=True, null=True)
    customer_signature = models.TextField(blank=True, null=True, help_text="Base64 encoded signature")
    delivered_to_name = models.CharField(max_length=255, blank=True, null=True)
    delivered_to_phone = models.CharField(max_length=20, blank=True, null=True)
    
    # Stop-specific details
    special_instructions = models.TextField(blank=True, null=True)
    access_code = models.CharField(max_length=50, blank=True, null=True, help_text="Building/gate access code")
    
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Stop {self.stop_order}: {self.get_stop_type_display()} at {self.address[:50]}..."

    class Meta:
        ordering = ['trip', 'stop_order']
        constraints = [
            models.UniqueConstraint(fields=['trip', 'stop_order'], name='unique_stop_order_per_trip')
        ]

class TripPayment(models.Model):
    """Payment tracking for transport jobs with multi-method support"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name='payments')
    
    # Payment method selection
    payment_method = models.CharField(max_length=50, choices=[
        ('STRIPE', 'Credit/Debit Card'),
        ('M_PESA', 'M-Pesa'),
        ('MTN_MOMO', 'MTN Mobile Money'),
        ('FLUTTERWAVE', 'Flutterwave'),
        ('BANK_TRANSFER', 'Bank Transfer'),
        ('WISE', 'Wise Transfer'),
        ('CASH', 'Cash Payment'),
        ('OTHER', 'Other Method')
    ])
    
    # Payment amounts
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=10, decimal_places=2, help_text="Amount after platform fees")
    
    # Integration with existing payment system
    payment_gateway = models.ForeignKey('payments.PaymentGateway', on_delete=models.SET_NULL, null=True, blank=True)
    stripe_payment_intent_id = models.CharField(max_length=255, null=True, blank=True)
    mpesa_transaction_id = models.CharField(max_length=255, null=True, blank=True)
    wise_transfer_id = models.CharField(max_length=255, null=True, blank=True)
    
    # Customer payment details
    customer_phone = models.CharField(max_length=20, null=True, blank=True, help_text="For mobile money payments")
    customer_email = models.EmailField(null=True, blank=True, help_text="For payment receipts")
    customer_name = models.CharField(max_length=255, null=True, blank=True)
    
    # Driver settlement info
    driver_bank_account = models.ForeignKey('banking.WiseItem', on_delete=models.SET_NULL, null=True, blank=True,
                                          help_text="Driver's bank account for settlement")
    settlement_status = models.CharField(max_length=50, choices=[
        ('pending', 'Settlement Pending'),
        ('processing', 'Processing Settlement'),
        ('completed', 'Settlement Completed'),
        ('failed', 'Settlement Failed'),
        ('manual', 'Manual Settlement Required')
    ], default='pending')
    
    settlement_date = models.DateTimeField(null=True, blank=True)
    settlement_reference = models.CharField(max_length=255, null=True, blank=True)
    
    # Payment status
    status = models.CharField(max_length=50, choices=[
        ('pending', 'Payment Pending'),
        ('processing', 'Processing'),
        ('completed', 'Payment Completed'),
        ('failed', 'Payment Failed'),
        ('cancelled', 'Payment Cancelled'),
        ('refunded', 'Payment Refunded')
    ], default='pending')
    
    # Timestamps
    payment_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Additional tracking
    receipt_sent = models.BooleanField(default=False)
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Payment {self.amount} {self.currency} for Trip {self.trip.reference_number}"
    
    def calculate_platform_fee(self):
        """Calculate platform fee based on payment method"""
        if self.payment_method in ['STRIPE']:
            # Card payments: 0.1% + $0.30
            self.platform_fee = (self.amount * Decimal('0.001')) + Decimal('0.30')
        elif self.payment_method in ['M_PESA', 'MTN_MOMO', 'FLUTTERWAVE']:
            # Mobile money: 2%
            self.platform_fee = self.amount * Decimal('0.02')
        elif self.payment_method in ['BANK_TRANSFER', 'WISE']:
            # Bank transfers: 0.1% + $0.30
            self.platform_fee = (self.amount * Decimal('0.001')) + Decimal('0.30')
        else:
            # Cash or other: no platform fee
            self.platform_fee = Decimal('0.00')
        
        self.net_amount = self.amount - self.platform_fee
        return self.platform_fee

    class Meta:
        ordering = ['-created_at']

class Load(models.Model):
    """Legacy load model - kept for compatibility"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    reference_number = models.CharField(max_length=100, unique=True)
    customer = models.ForeignKey('crm.Customer', on_delete=models.CASCADE, related_name='loads')
    route = models.ForeignKey(Route, on_delete=models.SET_NULL, null=True, blank=True, related_name='loads')
    driver = models.ForeignKey(Driver, on_delete=models.SET_NULL, null=True, blank=True, related_name='loads')
    equipment = models.ForeignKey(Equipment, on_delete=models.SET_NULL, null=True, blank=True, related_name='loads')
    
    # Link to new Trip model
    trip = models.OneToOneField(Trip, on_delete=models.SET_NULL, null=True, blank=True, related_name='legacy_load')
    
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

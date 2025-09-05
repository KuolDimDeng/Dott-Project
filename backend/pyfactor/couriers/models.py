"""
Courier Delivery Service Models
Extends existing transport models for consumer delivery marketplace
"""
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.contrib.postgres.fields import ArrayField
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

User = get_user_model()


class CourierCompany(models.Model):
    """
    Courier company that can manage multiple couriers and cover multiple cities
    This model is for future use when partnering with courier companies
    """
    COMPANY_STATUS = [
        ('pending', 'Pending Approval'),
        ('active', 'Active'),
        ('suspended', 'Suspended'),
        ('terminated', 'Terminated'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    legal_name = models.CharField(max_length=200)
    registration_number = models.CharField(max_length=100, unique=True)
    
    # Contact Information
    email = models.EmailField()
    phone = models.CharField(max_length=20)
    website = models.URLField(blank=True)
    
    # Address
    headquarters_address = models.TextField()
    headquarters_city = models.CharField(max_length=100)
    headquarters_country = models.CharField(max_length=2)  # ISO country code
    
    # Coverage Areas - Cities and countries they operate in
    coverage_cities = ArrayField(models.CharField(max_length=100), default=list)
    coverage_countries = ArrayField(models.CharField(max_length=2), default=list)  # ISO codes
    
    # Company Details
    fleet_size = models.IntegerField(default=0)
    established_date = models.DateField(null=True, blank=True)
    insurance_provider = models.CharField(max_length=100, blank=True)
    insurance_policy_number = models.CharField(max_length=100, blank=True)
    insurance_expiry = models.DateField(null=True, blank=True)
    
    # Platform Integration
    api_key = models.CharField(max_length=255, blank=True)  # For API integration
    webhook_url = models.URLField(blank=True)  # For status updates
    
    # Commission and Fees
    platform_commission_rate = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('15.00'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))]
    )  # Platform takes this % from company
    company_courier_commission = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('70.00'),
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))]
    )  # Company pays this % to their couriers
    
    # Status
    status = models.CharField(max_length=20, choices=COMPANY_STATUS, default='pending')
    is_exclusive = models.BooleanField(default=False)  # If true, only this company handles deliveries in their cities
    priority_rank = models.IntegerField(default=100)  # Lower number = higher priority when multiple companies available
    
    # Verification
    verified = models.BooleanField(default=False)
    verification_documents = models.JSONField(default=dict)  # Store document URLs/references
    
    # Performance Metrics
    total_deliveries = models.IntegerField(default=0)
    successful_deliveries = models.IntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=Decimal('0.00'))
    
    # Banking Details (for payouts)
    bank_name = models.CharField(max_length=100, blank=True)
    bank_account_number = models.CharField(max_length=100, blank=True)
    bank_routing_number = models.CharField(max_length=100, blank=True)
    payment_terms = models.IntegerField(default=7)  # Days before payout
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, 
                                   related_name='approved_courier_companies')
    
    # Feature Flags (for future features)
    supports_express_delivery = models.BooleanField(default=False)
    supports_scheduled_delivery = models.BooleanField(default=True)
    supports_cash_on_delivery = models.BooleanField(default=True)
    supports_refrigerated = models.BooleanField(default=False)
    supports_fragile = models.BooleanField(default=True)
    max_package_weight_kg = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('50.00'))
    max_package_dimension_cm = models.IntegerField(default=200)  # Longest dimension
    
    tenant = models.ForeignKey('users.Tenant', on_delete=models.CASCADE, related_name='courier_companies')
    
    class Meta:
        verbose_name_plural = 'Courier Companies'
        ordering = ['priority_rank', 'name']
        indexes = [
            models.Index(fields=['status', 'priority_rank']),
            models.Index(fields=['headquarters_country', 'headquarters_city']),
        ]
    
    def __str__(self):
        return f"{self.name} ({self.headquarters_city}, {self.headquarters_country})"
    
    def calculate_platform_fee(self, delivery_amount):
        """Calculate platform's fee from this delivery"""
        return delivery_amount * (self.platform_commission_rate / 100)
    
    def is_available_in_city(self, city, country):
        """Check if company operates in a specific city"""
        return (city in self.coverage_cities or 
                country in self.coverage_countries)


class CourierCompanyBranch(models.Model):
    """
    Branch offices of courier companies in different cities
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(CourierCompany, on_delete=models.CASCADE, related_name='branches')
    
    branch_name = models.CharField(max_length=100)
    branch_code = models.CharField(max_length=20)
    
    # Location
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=2)  # ISO code
    address = models.TextField()
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    
    # Contact
    manager_name = models.CharField(max_length=100)
    phone = models.CharField(max_length=20)
    email = models.EmailField()
    
    # Capacity
    max_daily_deliveries = models.IntegerField(default=100)
    current_active_couriers = models.IntegerField(default=0)
    
    # Status
    is_active = models.BooleanField(default=True)
    operating_hours = models.JSONField(default=dict)  # Store daily operating hours
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['company', 'branch_code']
        ordering = ['company', 'city']
    
    def __str__(self):
        return f"{self.company.name} - {self.branch_name} ({self.city})"


class CourierProfile(models.Model):
    """
    Extended courier profile for delivery services
    Can be independent courier or work for a courier company
    """
    VEHICLE_TYPES = [
        ('bicycle', 'Bicycle'),
        ('motorcycle', 'Motorcycle'),
        ('car', 'Car'),
        ('van', 'Van/Pickup'),
        ('truck', 'Truck'),
        ('scooter', 'E-Scooter'),
    ]
    
    AVAILABILITY_STATUS = [
        ('online', 'Online - Available'),
        ('busy', 'Busy - On Delivery'),
        ('offline', 'Offline'),
        ('break', 'On Break'),
    ]
    
    EMPLOYMENT_TYPE = [
        ('independent', 'Independent Courier'),
        ('company', 'Company Employee'),
        ('partner', 'Partner Driver'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='courier_profile')
    business = models.OneToOneField('users.Business', on_delete=models.CASCADE, 
                                   related_name='courier_business_profile', null=True, blank=True)
    
    # Company Association (null if independent)
    courier_company = models.ForeignKey(CourierCompany, on_delete=models.SET_NULL, 
                                       null=True, blank=True, related_name='couriers')
    company_branch = models.ForeignKey(CourierCompanyBranch, on_delete=models.SET_NULL,
                                      null=True, blank=True, related_name='couriers')
    employment_type = models.CharField(max_length=20, choices=EMPLOYMENT_TYPE, default='independent')
    company_employee_id = models.CharField(max_length=50, blank=True)  # Company's internal ID
    
    # Link to existing transport driver if available (for legacy compatibility)
    transport_driver = models.OneToOneField('transport.Driver', on_delete=models.SET_NULL, 
                                           null=True, blank=True, related_name='courier_profile')
    
    # Vehicle Information
    vehicle_type = models.CharField(max_length=20, choices=VEHICLE_TYPES)
    vehicle_make = models.CharField(max_length=50, blank=True)
    vehicle_model = models.CharField(max_length=50, blank=True)
    vehicle_year = models.IntegerField(null=True, blank=True)
    vehicle_color = models.CharField(max_length=30, blank=True)
    vehicle_registration = models.CharField(max_length=50, unique=True)
    
    # Driving License
    license_number = models.CharField(max_length=50, unique=True)
    license_expiry = models.DateField()
    license_front_photo = models.TextField(help_text='Base64 encoded license front')
    license_back_photo = models.TextField(help_text='Base64 encoded license back')
    
    # Identity Verification
    id_type = models.CharField(max_length=20, choices=[
        ('national_id', 'National ID'),
        ('passport', 'Passport'),
        ('voter_id', 'Voter ID'),
    ])
    id_number = models.CharField(max_length=50, unique=True)
    id_front_photo = models.TextField(help_text='Base64 encoded ID front')
    id_back_photo = models.TextField(help_text='Base64 encoded ID back', blank=True)
    selfie_with_id = models.TextField(help_text='Base64 encoded selfie holding ID')
    
    # Verification Status
    is_verified = models.BooleanField(default=False)
    verification_date = models.DateTimeField(null=True, blank=True)
    verified_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                   related_name='couriers_verified')
    verification_notes = models.TextField(blank=True)
    
    # Service Configuration
    service_radius_km = models.IntegerField(default=10, validators=[MinValueValidator(1), MaxValueValidator(100)])
    max_package_weight_kg = models.DecimalField(max_digits=5, decimal_places=2, default=20.00)
    accepts_cash = models.BooleanField(default=True)
    accepts_fragile = models.BooleanField(default=False)
    accepts_food_delivery = models.BooleanField(default=True)
    
    # Availability
    availability_status = models.CharField(max_length=20, choices=AVAILABILITY_STATUS, default='offline')
    last_online = models.DateTimeField(null=True, blank=True)
    current_latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    current_longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    location_updated_at = models.DateTimeField(null=True, blank=True)
    
    # Working Hours (JSON format: {"monday": {"start": "08:00", "end": "20:00"}, ...})
    working_hours = models.JSONField(default=dict, blank=True)
    
    # Performance Metrics
    total_deliveries = models.IntegerField(default=0)
    successful_deliveries = models.IntegerField(default=0)
    cancelled_deliveries = models.IntegerField(default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, default=5.00,
                                        validators=[MinValueValidator(1), MaxValueValidator(5)])
    total_ratings = models.IntegerField(default=0)
    on_time_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=100.00)
    
    # Earnings
    total_earnings = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    pending_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    last_payout_date = models.DateTimeField(null=True, blank=True)
    
    # Trust Levels
    trust_level = models.IntegerField(default=1, validators=[MinValueValidator(1), MaxValueValidator(5)],
                                     help_text='1=New, 2=Basic, 3=Verified, 4=Trusted, 5=Elite')
    can_handle_cash = models.BooleanField(default=False)
    max_order_value = models.DecimalField(max_digits=10, decimal_places=2, default=100.00)
    
    # Bank/Payment Info
    bank_account_number = models.CharField(max_length=50, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    mpesa_number = models.CharField(max_length=20, blank=True)
    preferred_payout_method = models.CharField(max_length=20, choices=[
        ('bank', 'Bank Transfer'),
        ('mpesa', 'M-Pesa'),
        ('cash', 'Cash Pickup'),
    ], default='mpesa')
    
    # Additional Documents
    insurance_document = models.TextField(blank=True, help_text='Base64 encoded insurance document')
    insurance_expiry = models.DateField(null=True, blank=True)
    criminal_record_check = models.TextField(blank=True, help_text='Base64 encoded criminal record')
    criminal_check_date = models.DateField(null=True, blank=True)
    
    # Emergency Contact
    emergency_contact_name = models.CharField(max_length=100, blank=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True)
    emergency_contact_relationship = models.CharField(max_length=50, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    suspended_at = models.DateTimeField(null=True, blank=True)
    suspension_reason = models.TextField(blank=True)
    
    class Meta:
        db_table = 'courier_profiles'
        indexes = [
            models.Index(fields=['availability_status', 'current_latitude', 'current_longitude']),
            models.Index(fields=['user', 'is_verified']),
            models.Index(fields=['trust_level', 'average_rating']),
        ]
    
    def __str__(self):
        return f"Courier: {self.user.email} ({self.vehicle_type})"
    
    def update_location(self, latitude, longitude):
        """Update courier's current location"""
        self.current_latitude = latitude
        self.current_longitude = longitude
        self.location_updated_at = timezone.now()
        self.save(update_fields=['current_latitude', 'current_longitude', 'location_updated_at'])
    
    def go_online(self):
        """Set courier as available for deliveries"""
        self.availability_status = 'online'
        self.last_online = timezone.now()
        self.save(update_fields=['availability_status', 'last_online'])
    
    def go_offline(self):
        """Set courier as unavailable"""
        self.availability_status = 'offline'
        self.save(update_fields=['availability_status'])
    
    def calculate_trust_level(self):
        """Auto-calculate trust level based on performance"""
        if self.total_deliveries < 5:
            return 1  # New courier
        elif self.total_deliveries < 50 and self.average_rating >= 4.0:
            return 2  # Basic
        elif self.total_deliveries < 200 and self.average_rating >= 4.3 and self.is_verified:
            return 3  # Verified
        elif self.total_deliveries < 500 and self.average_rating >= 4.5:
            return 4  # Trusted
        elif self.total_deliveries >= 500 and self.average_rating >= 4.7:
            return 5  # Elite
        return self.trust_level


class DeliveryOrder(models.Model):
    """
    Delivery orders connecting consumers, businesses, and couriers
    """
    ORDER_STATUS = [
        ('pending', 'Pending - Looking for Driver'),
        ('courier_assigned', 'Courier Assigned'),
        ('courier_heading_pickup', 'Courier Heading to Pickup'),
        ('arrived_at_pickup', 'Driver at Pickup Location'),
        ('package_picked', 'Package Picked Up'),
        ('in_transit', 'In Transit'),
        ('arrived_at_delivery', 'Arrived at Delivery Location'),
        ('delivered', 'Delivered'),
        ('cancelled', 'Cancelled'),
        ('failed', 'Delivery Failed'),
    ]
    
    PACKAGE_TYPES = [
        ('document', 'Documents'),
        ('parcel', 'Parcel'),
        ('food', 'Food/Groceries'),
        ('fragile', 'Fragile Items'),
        ('electronics', 'Electronics'),
        ('clothing', 'Clothing'),
        ('medicine', 'Medicine'),
        ('other', 'Other'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_number = models.CharField(max_length=20, unique=True)
    
    # Core relationships
    consumer = models.ForeignKey(User, on_delete=models.CASCADE, related_name='delivery_orders_placed')
    business = models.ForeignKey('marketplace.BusinessListing', on_delete=models.CASCADE, 
                                related_name='delivery_orders')
    courier = models.ForeignKey(CourierProfile, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name='deliveries')
    
    # Courier Company Assignment (for future use)
    assigned_company = models.ForeignKey(CourierCompany, on_delete=models.SET_NULL, 
                                        null=True, blank=True, related_name='delivery_orders')
    assigned_branch = models.ForeignKey(CourierCompanyBranch, on_delete=models.SET_NULL,
                                       null=True, blank=True, related_name='delivery_orders')
    company_tracking_number = models.CharField(max_length=100, blank=True)  # Company's internal tracking
    
    # Link to marketplace order if applicable
    # Note: ConsumerOrder is in marketplace.order_models, not marketplace.models
    marketplace_order = models.OneToOneField('marketplace.ConsumerOrder', on_delete=models.CASCADE,
                                            null=True, blank=True, related_name='delivery')
    
    # Package details
    package_type = models.CharField(max_length=20, choices=PACKAGE_TYPES, default='parcel')
    package_description = models.TextField()
    estimated_weight_kg = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    declared_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_fragile = models.BooleanField(default=False)
    requires_signature = models.BooleanField(default=False)
    
    # Pickup details
    pickup_address = models.TextField()
    pickup_latitude = models.DecimalField(max_digits=10, decimal_places=7)
    pickup_longitude = models.DecimalField(max_digits=10, decimal_places=7)
    pickup_contact_name = models.CharField(max_length=100)
    pickup_contact_phone = models.CharField(max_length=20)
    pickup_instructions = models.TextField(blank=True)
    
    # Delivery details
    delivery_address = models.TextField()
    delivery_latitude = models.DecimalField(max_digits=10, decimal_places=7)
    delivery_longitude = models.DecimalField(max_digits=10, decimal_places=7)
    delivery_contact_name = models.CharField(max_length=100)
    delivery_contact_phone = models.CharField(max_length=20)
    delivery_instructions = models.TextField(blank=True)
    
    # Timing
    requested_pickup_time = models.DateTimeField()
    requested_delivery_time = models.DateTimeField()
    actual_pickup_time = models.DateTimeField(null=True, blank=True)
    actual_delivery_time = models.DateTimeField(null=True, blank=True)
    
    # Status
    status = models.CharField(max_length=30, choices=ORDER_STATUS, default='pending')
    courier_assigned_at = models.DateTimeField(null=True, blank=True)
    
    # Distance and routing
    estimated_distance_km = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    estimated_duration_minutes = models.IntegerField(null=True, blank=True)
    actual_route_taken = models.JSONField(default=list, blank=True)  # Array of lat/lng points
    
    # Pricing
    delivery_fee = models.DecimalField(max_digits=10, decimal_places=2)
    surge_multiplier = models.DecimalField(max_digits=3, decimal_places=2, default=1.00)
    final_delivery_fee = models.DecimalField(max_digits=10, decimal_places=2)
    courier_earnings = models.DecimalField(max_digits=10, decimal_places=2)
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2)
    tip_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Payment
    payment_method = models.CharField(max_length=20, choices=[
        ('cash', 'Cash on Delivery'),
        ('card', 'Credit/Debit Card'),
        ('mpesa', 'M-Pesa'),
        ('wallet', 'App Wallet'),
    ], default='cash')
    is_paid = models.BooleanField(default=False)
    payment_reference = models.CharField(max_length=100, blank=True)
    
    # Proof of delivery
    delivery_photo = models.TextField(blank=True, help_text='Base64 encoded delivery photo')
    recipient_signature = models.TextField(blank=True, help_text='Base64 encoded signature')
    delivered_to_name = models.CharField(max_length=100, blank=True)
    delivery_notes = models.TextField(blank=True)
    
    # Ratings and feedback
    courier_rating = models.IntegerField(null=True, blank=True, 
                                       validators=[MinValueValidator(1), MaxValueValidator(5)])
    consumer_rating = models.IntegerField(null=True, blank=True,
                                         validators=[MinValueValidator(1), MaxValueValidator(5)])
    courier_feedback = models.TextField(blank=True)
    consumer_feedback = models.TextField(blank=True)
    
    # Cancellation/failure tracking
    cancelled_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='cancelled_deliveries')
    cancellation_reason = models.TextField(blank=True)
    failure_reason = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'delivery_orders'
        indexes = [
            models.Index(fields=['status', 'courier', 'created_at']),
            models.Index(fields=['consumer', 'status']),
            models.Index(fields=['business', 'status']),
            models.Index(fields=['order_number']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Delivery {self.order_number}: {self.get_status_display()}"
    
    def save(self, *args, **kwargs):
        if not self.order_number:
            # Generate unique order number
            import random
            self.order_number = f"DEL{timezone.now().strftime('%Y%m%d')}{random.randint(1000, 9999)}"
        
        # Calculate fees
        if self.delivery_fee and not self.final_delivery_fee:
            self.final_delivery_fee = self.delivery_fee * self.surge_multiplier
            self.platform_fee = self.final_delivery_fee * Decimal('0.25')  # 25% platform fee
            self.courier_earnings = self.final_delivery_fee * Decimal('0.75')  # 75% to courier
        
        super().save(*args, **kwargs)
    
    def assign_courier(self, courier):
        """Assign a courier to this delivery"""
        self.courier = courier
        self.status = 'courier_assigned'
        self.courier_assigned_at = timezone.now()
        
        # If courier belongs to a company, assign company details
        if courier.courier_company:
            self.assigned_company = courier.courier_company
            self.assigned_branch = courier.company_branch
        
        self.save()
        
        # Update courier status
        courier.availability_status = 'busy'
        courier.save()
    
    def assign_to_company(self, company, branch=None):
        """Assign delivery to a courier company (for future use)"""
        self.assigned_company = company
        self.assigned_branch = branch
        self.status = 'pending'  # Company will assign their courier
        self.save()
        
        # TODO: Send notification to company via webhook
        # if company.webhook_url:
        #     send_delivery_to_company_webhook(company, self)
    
    @classmethod
    def find_best_company(cls, pickup_city, pickup_country, delivery_city, delivery_country):
        """
        Find the best courier company for a delivery route (for future use)
        Returns None if feature is disabled or no companies available
        """
        from django.conf import settings
        
        # Feature flag - disabled by default
        if not getattr(settings, 'ENABLE_COURIER_COMPANIES', False):
            return None
        
        # Find companies that cover both pickup and delivery locations
        companies = CourierCompany.objects.filter(
            status='active',
            verified=True
        ).filter(
            models.Q(coverage_cities__contains=[pickup_city]) |
            models.Q(coverage_countries__contains=[pickup_country])
        ).filter(
            models.Q(coverage_cities__contains=[delivery_city]) |
            models.Q(coverage_countries__contains=[delivery_country])
        ).order_by('priority_rank', '-average_rating')
        
        # Return the best available company
        for company in companies:
            if company.is_available_in_city(pickup_city, pickup_country):
                if company.is_available_in_city(delivery_city, delivery_country):
                    return company
        
        return None
    
    def mark_picked_up(self):
        """Mark package as picked up"""
        self.status = 'package_picked'
        self.actual_pickup_time = timezone.now()
        self.save()
    
    def mark_delivered(self, photo=None, signature=None, delivered_to=None):
        """Mark order as delivered"""
        self.status = 'delivered'
        self.actual_delivery_time = timezone.now()
        if photo:
            self.delivery_photo = photo
        if signature:
            self.recipient_signature = signature
        if delivered_to:
            self.delivered_to_name = delivered_to
        self.save()
        
        # Update courier metrics
        if self.courier:
            self.courier.total_deliveries += 1
            self.courier.successful_deliveries += 1
            self.courier.pending_earnings += self.courier_earnings + self.tip_amount
            self.courier.availability_status = 'online'
            self.courier.save()


class CourierEarnings(models.Model):
    """
    Track courier earnings and payouts
    Supports both independent couriers and company couriers
    """
    PAYOUT_STATUS = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
    ]
    
    EARNINGS_TYPE = [
        ('courier', 'Direct Courier Earnings'),
        ('company', 'Company Payout'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    courier = models.ForeignKey(CourierProfile, on_delete=models.CASCADE, related_name='earnings', 
                               null=True, blank=True)  # Null if company payout
    company = models.ForeignKey(CourierCompany, on_delete=models.CASCADE, related_name='earnings',
                               null=True, blank=True)  # Null if independent courier
    earnings_type = models.CharField(max_length=20, choices=EARNINGS_TYPE, default='courier')
    
    # Earnings period
    period_start = models.DateField()
    period_end = models.DateField()
    
    # Earnings breakdown
    total_deliveries = models.IntegerField(default=0)
    base_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    surge_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tips_earned = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    bonuses = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    deductions = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Payout information
    payout_method = models.CharField(max_length=20, choices=[
        ('bank', 'Bank Transfer'),
        ('mpesa', 'M-Pesa'),
        ('cash', 'Cash Pickup'),
    ])
    payout_status = models.CharField(max_length=20, choices=PAYOUT_STATUS, default='pending')
    payout_reference = models.CharField(max_length=100, blank=True)
    payout_date = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    processed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    
    class Meta:
        db_table = 'courier_earnings'
        indexes = [
            models.Index(fields=['courier', 'period_start']),
            models.Index(fields=['payout_status']),
        ]
        ordering = ['-period_end']
    
    def __str__(self):
        return f"{self.courier.user.email}: {self.period_start} to {self.period_end}"
    
    def calculate_net_earnings(self):
        """Calculate net earnings"""
        self.net_earnings = (
            self.base_earnings + 
            self.surge_earnings + 
            self.tips_earned + 
            self.bonuses - 
            self.deductions
        )
        return self.net_earnings


class CourierNotification(models.Model):
    """
    Push notifications for couriers about new delivery requests
    """
    NOTIFICATION_TYPES = [
        ('new_order', 'New Delivery Request'),
        ('order_cancelled', 'Order Cancelled'),
        ('earnings_update', 'Earnings Update'),
        ('payout_ready', 'Payout Ready'),
        ('system_message', 'System Message'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    courier = models.ForeignKey(CourierProfile, on_delete=models.CASCADE, related_name='notifications')
    
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPES)
    title = models.CharField(max_length=200)
    message = models.TextField()
    
    # Related order if applicable
    delivery_order = models.ForeignKey(DeliveryOrder, on_delete=models.CASCADE, 
                                      null=True, blank=True, related_name='courier_notifications')
    
    # Notification status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    is_pushed = models.BooleanField(default=False)
    pushed_at = models.DateTimeField(null=True, blank=True)
    
    # Response tracking (for new order notifications)
    response_deadline = models.DateTimeField(null=True, blank=True)
    was_accepted = models.BooleanField(null=True, blank=True)
    response_time = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'courier_notifications'
        indexes = [
            models.Index(fields=['courier', 'is_read']),
            models.Index(fields=['created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.courier.user.email}: {self.title}"


class DeliveryTracking(models.Model):
    """
    Real-time tracking points for deliveries
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    delivery_order = models.ForeignKey(DeliveryOrder, on_delete=models.CASCADE, related_name='tracking_points')
    
    latitude = models.DecimalField(max_digits=10, decimal_places=7)
    longitude = models.DecimalField(max_digits=10, decimal_places=7)
    altitude = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    accuracy = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    speed_kmh = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    heading = models.IntegerField(null=True, blank=True, help_text='Compass heading in degrees')
    
    recorded_at = models.DateTimeField(default=timezone.now)
    
    class Meta:
        db_table = 'delivery_tracking'
        indexes = [
            models.Index(fields=['delivery_order', 'recorded_at']),
        ]
        ordering = ['recorded_at']
    
    def __str__(self):
        return f"Tracking: {self.delivery_order.order_number} at {self.recorded_at}"
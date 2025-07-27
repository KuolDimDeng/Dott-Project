from django.db import models
from django.core.validators import MinValueValidator
from django.utils import timezone
from django.db.models.signals import post_save, post_delete, pre_delete
from django.dispatch import receiver
from decimal import Decimal
from custom_auth.models import TenantAwareModel, TenantManager
from crm.models import Customer
from hr.models import Employee
from inventory.models import Product
from users.models import User
from finance.models import Account, FinanceTransaction


class Vehicle(TenantAwareModel):
    """Track vehicles/equipment for job assignments"""
    
    VEHICLE_TYPE_CHOICES = [
        ('car', 'Car'),
        ('van', 'Van'),
        ('truck', 'Truck'),
        ('pickup', 'Pickup Truck'),
        ('suv', 'SUV'),
        ('trailer', 'Trailer'),
        ('equipment', 'Heavy Equipment'),
        ('other', 'Other'),
    ]
    
    FUEL_TYPE_CHOICES = [
        ('gasoline', 'Gasoline'),
        ('diesel', 'Diesel'),
        ('electric', 'Electric'),
        ('hybrid', 'Hybrid'),
        ('natural_gas', 'Natural Gas'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('maintenance', 'Under Maintenance'),
        ('repair', 'Under Repair'),
        ('inactive', 'Inactive'),
        ('retired', 'Retired'),
    ]
    
    # Basic Information
    registration_number = models.CharField(max_length=50, unique=True)
    vehicle_type = models.CharField(max_length=20, choices=VEHICLE_TYPE_CHOICES, default='van')
    make = models.CharField(max_length=50)
    model = models.CharField(max_length=50)
    year = models.IntegerField()
    color = models.CharField(max_length=30, blank=True)
    
    # Technical Details
    vin = models.CharField(max_length=17, blank=True, verbose_name='VIN Number')
    fuel_type = models.CharField(max_length=20, choices=FUEL_TYPE_CHOICES, default='gasoline')
    mileage = models.IntegerField(default=0, help_text='Current mileage/odometer reading')
    license_plate = models.CharField(max_length=20, blank=True)
    
    # Status and Assignment
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    is_available = models.BooleanField(default=True)
    assigned_to = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True,
                                  related_name='assigned_vehicles')
    
    # Financial Information
    purchase_date = models.DateField(null=True, blank=True)
    purchase_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    insurance_policy = models.CharField(max_length=100, blank=True)
    insurance_expiry = models.DateField(null=True, blank=True)
    
    # Maintenance
    last_service_date = models.DateField(null=True, blank=True)
    next_service_date = models.DateField(null=True, blank=True)
    service_interval_miles = models.IntegerField(default=5000, help_text='Service interval in miles')
    
    # Additional Information
    notes = models.TextField(blank=True)
    photo = models.URLField(blank=True, help_text='URL to vehicle photo')
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='vehicles_created')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = TenantManager()
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'status']),
            models.Index(fields=['tenant_id', 'is_available']),
            models.Index(fields=['tenant_id', 'registration_number']),
        ]
        
    def __str__(self):
        return f"{self.make} {self.model} ({self.registration_number})"
    
    def check_service_due(self):
        """Check if service is due based on date or mileage"""
        if self.next_service_date and timezone.now().date() >= self.next_service_date:
            return True
        # You could also check mileage-based service intervals here
        return False

class Job(TenantAwareModel):
    """Track individual jobs/projects with materials and labor costs"""
    
    STATUS_CHOICES = [
        ('quote', 'Quote'),
        ('scheduled', 'Scheduled'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('invoiced', 'Invoiced'),
        ('paid', 'Paid'),
        ('cancelled', 'Cancelled'),
    ]
    
    job_number = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='jobs')
    
    # Status and dates
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='quote')
    quote_date = models.DateField(default=timezone.now)
    scheduled_date = models.DateField(null=True, blank=True)
    start_date = models.DateField(null=True, blank=True)
    completion_date = models.DateField(null=True, blank=True)
    
    # Financial fields
    quoted_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    labor_rate = models.DecimalField(max_digits=6, decimal_places=2, default=0, 
                                    help_text="Hourly labor rate for this job")
    
    # Tracking
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='jobs_created')
    lead_employee = models.ForeignKey(Employee, on_delete=models.SET_NULL, null=True, blank=True, 
                                     related_name='lead_jobs', help_text='Primary employee responsible for this job')
    assigned_employees = models.ManyToManyField(Employee, blank=True, related_name='assigned_jobs',
                                              help_text='All employees assigned to this job')
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True, blank=True,
                              related_name='jobs', help_text='Vehicle assigned to this job')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = TenantManager()
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'status']),
            models.Index(fields=['tenant_id', 'customer']),
            models.Index(fields=['tenant_id', 'job_number']),
        ]
        
    def __str__(self):
        return f"{self.job_number} - {self.name}"
    
    def get_total_materials_cost(self):
        """Calculate total cost of materials used"""
        return self.materials.aggregate(
            total=models.Sum(models.F('quantity') * models.F('unit_cost'))
        )['total'] or Decimal('0')
    
    def get_total_materials_price(self):
        """Calculate total price to charge customer for materials"""
        return self.materials.aggregate(
            total=models.Sum(models.F('quantity') * models.F('unit_price'))
        )['total'] or Decimal('0')
    
    def get_total_labor_cost(self):
        """Calculate total labor cost"""
        return self.labor_entries.aggregate(
            total=models.Sum(models.F('hours') * models.F('hourly_rate'))
        )['total'] or Decimal('0')
    
    def get_total_cost(self):
        """Calculate total job cost (materials + labor)"""
        return self.get_total_materials_cost() + self.get_total_labor_cost()
    
    def get_total_billable_amount(self):
        """Calculate total amount to bill customer"""
        materials_total = self.materials.filter(is_billable=True).aggregate(
            total=models.Sum(models.F('quantity') * models.F('unit_price'))
        )['total'] or Decimal('0')
        
        labor_total = self.labor_entries.filter(is_billable=True).aggregate(
            total=models.Sum(models.F('hours') * models.F('hourly_rate'))
        )['total'] or Decimal('0')
        
        return materials_total + labor_total
    
    def get_profit_margin(self):
        """Calculate profit margin percentage"""
        total_cost = self.get_total_cost()
        total_billable = self.get_total_billable_amount()
        
        if total_billable == 0:
            return Decimal('0')
            
        profit = total_billable - total_cost
        return (profit / total_billable) * 100
    
    def create_calendar_event(self):
        """Create a calendar event for this job when scheduled"""
        if not self.scheduled_date:
            return None
            
        try:
            from events.models import Event
            
            # Avoid circular imports
            event_title = f"Job: {self.name} ({self.job_number})"
            event_description = f"Customer: {self.customer.name}\n"
            if self.description:
                event_description += f"Description: {self.description}\n"
            if self.lead_employee:
                event_description += f"Lead: {self.lead_employee.user.get_full_name()}\n"
            if self.vehicle:
                event_description += f"Vehicle: {self.vehicle}\n"
            event_description += f"Quoted Amount: ${self.quoted_amount}"
            
            # Set start time to 9 AM on scheduled date
            start_datetime = timezone.datetime.combine(
                self.scheduled_date, 
                timezone.datetime.min.time().replace(hour=9)
            )
            if timezone.is_naive(start_datetime):
                start_datetime = timezone.make_aware(start_datetime)
            
            # Set end time to 5 PM on same day (8-hour default)
            end_datetime = start_datetime.replace(hour=17)
            
            # Check if event already exists
            existing_event = self.calendar_events.first()
            if existing_event:
                # Update existing event
                existing_event.title = event_title
                existing_event.description = event_description
                existing_event.start_datetime = start_datetime
                existing_event.end_datetime = end_datetime
                existing_event.save()
                return existing_event
            else:
                # Create new event
                event = Event.objects.create(
                    title=event_title,
                    description=event_description,
                    start_datetime=start_datetime,
                    end_datetime=end_datetime,
                    event_type='job',
                    job=self,
                    created_by=self.created_by,
                    tenant_id=self.tenant_id,
                    all_day=True,
                    reminder_minutes=60  # 1 hour before
                )
                return event
                
        except Exception as e:
            # Log error but don't fail job creation
            print(f"Error creating calendar event for job {self.job_number}: {e}")
            return None
    
    def update_calendar_event(self):
        """Update calendar event when job details change"""
        if self.scheduled_date:
            return self.create_calendar_event()  # This handles both create and update
        else:
            # If scheduled_date is removed, delete calendar events
            self.delete_calendar_events()
    
    def delete_calendar_events(self):
        """Delete all calendar events for this job"""
        self.calendar_events.all().delete()


class JobMaterial(TenantAwareModel):
    """Track materials/supplies used in a job"""
    
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='materials')
    supply = models.ForeignKey(Product, on_delete=models.PROTECT, 
                             limit_choices_to={'inventory_type': 'supply'})
    
    quantity = models.DecimalField(max_digits=10, decimal_places=2, 
                                 validators=[MinValueValidator(Decimal('0.01'))])
    unit_cost = models.DecimalField(max_digits=10, decimal_places=2, 
                                  help_text="Cost per unit from supplier")
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, 
                                   help_text="Price per unit to charge customer")
    markup_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0,
                                          help_text="Markup % applied to this material")
    
    is_billable = models.BooleanField(default=True)
    notes = models.TextField(blank=True)
    
    # Track when material was used
    used_date = models.DateField(default=timezone.now)
    added_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = TenantManager()
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'job']),
            models.Index(fields=['tenant_id', 'supply']),
        ]
        
    def __str__(self):
        return f"{self.supply.name} - {self.quantity} units"
    
    def save(self, *args, **kwargs):
        # Auto-calculate unit_price based on markup if not set
        if self.unit_price == 0 and self.markup_percentage > 0:
            self.unit_price = self.unit_cost * (1 + self.markup_percentage / 100)
        
        # Track if this is a new material usage
        is_new = self.pk is None
        old_quantity = None
        
        if not is_new:
            # Get the old quantity to calculate the difference
            old_instance = JobMaterial.objects.get(pk=self.pk)
            old_quantity = old_instance.quantity
        
        super().save(*args, **kwargs)
        
        # After saving, update inventory for consumable materials
        if self.supply.material_type == 'consumable':
            if is_new:
                # New material usage - deplete inventory
                self.supply.quantity -= int(self.quantity)
                if self.supply.quantity < 0:
                    self.supply.quantity = 0
                self.supply.save(update_fields=['quantity'])
            elif old_quantity and old_quantity != self.quantity:
                # Quantity changed - adjust inventory
                quantity_diff = self.quantity - old_quantity
                self.supply.quantity -= int(quantity_diff)
                if self.supply.quantity < 0:
                    self.supply.quantity = 0
                self.supply.save(update_fields=['quantity'])
    
    def get_total_cost(self):
        return self.quantity * self.unit_cost
    
    def get_total_price(self):
        return self.quantity * self.unit_price


class JobAssignment(TenantAwareModel):
    """Track employee assignments to jobs"""
    
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='job_assignments')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    is_lead = models.BooleanField(default=False)
    
    # Assignment details
    assigned_date = models.DateTimeField(auto_now_add=True)
    assigned_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    # Status
    is_active = models.BooleanField(default=True)
    
    objects = TenantManager()
    
    class Meta:
        unique_together = ['tenant_id', 'job', 'employee']
        indexes = [
            models.Index(fields=['tenant_id', 'job']),
            models.Index(fields=['tenant_id', 'employee']),
        ]
        
    def __str__(self):
        lead_text = ' (Lead)' if self.is_lead else ''
        return f"{self.employee.user.get_full_name()}{lead_text} - {self.job.name}"


class JobLabor(TenantAwareModel):
    """Track labor hours and costs for a job"""
    
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='labor_entries')
    employee = models.ForeignKey(Employee, on_delete=models.PROTECT)
    
    work_date = models.DateField(default=timezone.now)
    hours = models.DecimalField(max_digits=5, decimal_places=2, 
                              validators=[MinValueValidator(Decimal('0.25'))])
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2,
                                    help_text="Hourly rate for this work")
    
    work_description = models.TextField(help_text="Description of work performed")
    is_billable = models.BooleanField(default=True)
    
    # For tracking overtime
    is_overtime = models.BooleanField(default=False)
    overtime_multiplier = models.DecimalField(max_digits=3, decimal_places=2, default=Decimal('1.5'))
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = TenantManager()
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'job']),
            models.Index(fields=['tenant_id', 'employee']),
            models.Index(fields=['tenant_id', 'work_date']),
        ]
        
    def __str__(self):
        return f"{self.employee.user.get_full_name()} - {self.hours}hrs on {self.work_date}"
    
    def get_total_cost(self):
        """Calculate total cost for this labor entry"""
        if self.is_overtime:
            return self.hours * self.hourly_rate * self.overtime_multiplier
        return self.hours * self.hourly_rate


class JobExpense(TenantAwareModel):
    """Track other job-related expenses (permits, subcontractors, etc)"""
    
    EXPENSE_TYPE_CHOICES = [
        ('permit', 'Permit/License'),
        ('subcontractor', 'Subcontractor'),
        ('equipment_rental', 'Equipment Rental'),
        ('travel', 'Travel'),
        ('other', 'Other'),
    ]
    
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='expenses')
    expense_type = models.CharField(max_length=20, choices=EXPENSE_TYPE_CHOICES)
    
    description = models.CharField(max_length=200)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    is_billable = models.BooleanField(default=True)
    markup_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    expense_date = models.DateField(default=timezone.now)
    vendor_name = models.CharField(max_length=200, blank=True)
    receipt_number = models.CharField(max_length=100, blank=True)
    
    added_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = TenantManager()
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'job']),
            models.Index(fields=['tenant_id', 'expense_type']),
        ]
        
    def __str__(self):
        return f"{self.description} - ${self.amount}"
    
    def get_billable_amount(self):
        """Calculate amount to bill customer including markup"""
        if not self.is_billable:
            return Decimal('0')
        return self.amount * (1 + self.markup_percentage / 100)


class JobInvoice(TenantAwareModel):
    """Link jobs to invoices for billing"""
    
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='job_invoices')
    invoice = models.ForeignKey('sales.Invoice', on_delete=models.CASCADE, related_name='job_links')
    
    # Track what was included in this invoice
    includes_materials = models.BooleanField(default=True)
    includes_labor = models.BooleanField(default=True)
    includes_expenses = models.BooleanField(default=True)
    
    # For partial billing
    materials_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=100,
                                             help_text="Percentage of materials to bill")
    labor_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=100,
                                         help_text="Percentage of labor to bill")
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    objects = TenantManager()
    
    class Meta:
        unique_together = ['tenant_id', 'job', 'invoice']
        indexes = [
            models.Index(fields=['tenant_id', 'job']),
            models.Index(fields=['tenant_id', 'invoice']),
        ]


# Django signals for automatic calendar integration
@receiver(post_save, sender=Job)
def job_saved_handler(sender, instance, created, **kwargs):
    """
    Automatically create/update calendar events when a job is saved
    """
    if instance.scheduled_date:
        # Job has a scheduled date, create/update calendar event
        instance.update_calendar_event()
    else:
        # Job doesn't have a scheduled date, remove any calendar events
        instance.delete_calendar_events()


@receiver(post_delete, sender=Job)
def job_deleted_handler(sender, instance, **kwargs):
    """
    Automatically delete calendar events when a job is deleted
    """
    instance.delete_calendar_events()


@receiver(pre_delete, sender=JobMaterial)
def job_material_delete_handler(sender, instance, **kwargs):
    """
    Restore inventory when a material usage is deleted (only for consumables)
    """
    if instance.supply.material_type == 'consumable':
        # Restore the quantity to inventory
        instance.supply.quantity += int(instance.quantity)
        instance.supply.save(update_fields=['quantity'])
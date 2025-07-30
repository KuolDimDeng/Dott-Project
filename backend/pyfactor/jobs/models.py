from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from django.db.models.signals import post_save, post_delete, pre_delete
from django.dispatch import receiver
from decimal import Decimal
import uuid
from datetime import timedelta
from dateutil.relativedelta import relativedelta
from custom_auth.models import TenantAwareModel, TenantManager
from crm.models import Customer
from hr.models import Employee
from inventory.models import Product
from inventory.models_materials import Material
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
        ('approved', 'Approved'),
        ('scheduled', 'Scheduled'),
        ('in_transit', 'In Transit'),
        ('in_progress', 'In Progress'),
        ('pending_review', 'Pending Review'),
        ('completed', 'Completed'),
        ('invoiced', 'Invoiced'),
        ('paid', 'Paid'),
        ('closed', 'Closed'),
        ('cancelled', 'Cancelled'),
        ('on_hold', 'On Hold'),
        ('requires_parts', 'Requires Parts'),
        ('callback_needed', 'Callback Needed'),
    ]
    
    RECURRENCE_PATTERN_CHOICES = [
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('biweekly', 'Bi-weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('semiannually', 'Semi-annually'),
        ('annually', 'Annually'),
    ]
    
    DAY_OF_WEEK_CHOICES = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
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
    
    # Location fields
    job_street = models.CharField(max_length=255, blank=True)
    job_city = models.CharField(max_length=100, blank=True)
    job_state = models.CharField(max_length=50, blank=True)
    job_zip = models.CharField(max_length=20, blank=True)
    job_country = models.CharField(max_length=100, default='USA', blank=True)
    
    # Financial fields
    quoted_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    labor_rate = models.DecimalField(max_digits=6, decimal_places=2, default=0, 
                                    help_text="Hourly labor rate for this job")
    deposit_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                                       help_text="Deposit amount required")
    deposit_paid = models.BooleanField(default=False)
    final_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0,
                                     help_text="Final invoiced amount (may differ from quote)")
    
    # Quote management
    quote_valid_until = models.DateField(null=True, blank=True,
                                       help_text="Quote expiration date")
    quote_sent_date = models.DateTimeField(null=True, blank=True)
    quote_sent_via = models.CharField(max_length=50, blank=True,
                                    help_text="How quote was sent (email, whatsapp, etc)")
    quote_version = models.IntegerField(default=1,
                                      help_text="Quote revision number")
    terms_conditions = models.TextField(blank=True,
                                      help_text="Job-specific terms and conditions")
    
    # Signatures and approvals
    customer_signature = models.TextField(blank=True,
                                        help_text="Base64 encoded customer signature")
    customer_signed_date = models.DateTimeField(null=True, blank=True)
    customer_signed_name = models.CharField(max_length=200, blank=True)
    
    supervisor_signature = models.TextField(blank=True,
                                          help_text="Base64 encoded supervisor signature")
    supervisor_signed_date = models.DateTimeField(null=True, blank=True)
    supervisor_signed_by = models.ForeignKey(User, on_delete=models.SET_NULL, 
                                           null=True, blank=True,
                                           related_name='supervised_jobs')
    
    # Communication tracking
    last_customer_contact = models.DateTimeField(null=True, blank=True)
    internal_notes = models.TextField(blank=True,
                                    help_text="Internal notes not visible to customer")
    
    # Invoice reference
    invoice_id = models.CharField(max_length=50, blank=True,
                                help_text="Reference to invoice if created")
    invoice_sent_date = models.DateTimeField(null=True, blank=True)
    payment_received_date = models.DateTimeField(null=True, blank=True)
    
    # Recurring job fields
    is_recurring = models.BooleanField(default=False, help_text='Is this a recurring job?')
    recurrence_pattern = models.CharField(max_length=20, choices=RECURRENCE_PATTERN_CHOICES, 
                                        blank=True, null=True, help_text='How often the job recurs')
    recurrence_end_date = models.DateField(null=True, blank=True, 
                                         help_text='Optional end date for recurring series')
    recurrence_day_of_week = models.IntegerField(choices=DAY_OF_WEEK_CHOICES, null=True, blank=True,
                                                help_text='For weekly jobs: which day of the week')
    recurrence_day_of_month = models.IntegerField(null=True, blank=True,
                                                 validators=[MinValueValidator(1), MaxValueValidator(31)],
                                                 help_text='For monthly jobs: which day of the month (1-31)')
    recurrence_skip_holidays = models.BooleanField(default=False, 
                                                  help_text='Skip scheduled jobs on holidays')
    
    # Recurring job relationships
    parent_job = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True,
                                  related_name='recurring_instances', 
                                  help_text='Original job this was created from')
    job_series_id = models.UUIDField(null=True, blank=True, db_index=True,
                                   help_text='Groups all jobs in a recurring series')
    is_exception = models.BooleanField(default=False, 
                                     help_text='This instance has been modified from the series')
    
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
    
    def calculate_next_occurrence_date(self, from_date=None):
        """Calculate the next occurrence date based on recurrence pattern"""
        if not self.is_recurring or not self.recurrence_pattern:
            return None
            
        base_date = from_date or self.scheduled_date or timezone.now().date()
        
        if self.recurrence_pattern == 'daily':
            next_date = base_date + timedelta(days=1)
        elif self.recurrence_pattern == 'weekly':
            next_date = base_date + timedelta(weeks=1)
        elif self.recurrence_pattern == 'biweekly':
            next_date = base_date + timedelta(weeks=2)
        elif self.recurrence_pattern == 'monthly':
            next_date = base_date + relativedelta(months=1)
        elif self.recurrence_pattern == 'quarterly':
            next_date = base_date + relativedelta(months=3)
        elif self.recurrence_pattern == 'semiannually':
            next_date = base_date + relativedelta(months=6)
        elif self.recurrence_pattern == 'annually':
            next_date = base_date + relativedelta(years=1)
        else:
            return None
            
        # Check if we've exceeded the end date
        if self.recurrence_end_date and next_date > self.recurrence_end_date:
            return None
            
        return next_date
    
    def create_recurring_instances(self, count=12):
        """Create future recurring job instances"""
        if not self.is_recurring or not self.recurrence_pattern:
            return []
            
        created_jobs = []
        current_date = self.scheduled_date or timezone.now().date()
        
        # Generate a series ID if this is the first in the series
        if not self.job_series_id:
            self.job_series_id = uuid.uuid4()
            self.save(update_fields=['job_series_id'])
        
        for i in range(count):
            next_date = self.calculate_next_occurrence_date(current_date)
            if not next_date:
                break
                
            # Create the recurring instance
            job_data = {
                'tenant_id': self.tenant_id,
                'job_number': f"{self.job_number}-R{i+1}",
                'name': self.name,
                'description': self.description,
                'customer': self.customer,
                'status': 'scheduled',
                'scheduled_date': next_date,
                'job_street': self.job_street,
                'job_city': self.job_city,
                'job_state': self.job_state,
                'job_zip': self.job_zip,
                'job_country': self.job_country,
                'quoted_amount': self.quoted_amount,
                'labor_rate': self.labor_rate,
                'is_recurring': True,
                'recurrence_pattern': self.recurrence_pattern,
                'recurrence_end_date': self.recurrence_end_date,
                'recurrence_day_of_week': self.recurrence_day_of_week,
                'recurrence_day_of_month': self.recurrence_day_of_month,
                'recurrence_skip_holidays': self.recurrence_skip_holidays,
                'parent_job': self,
                'job_series_id': self.job_series_id,
                'lead_employee': self.lead_employee,
                'vehicle': self.vehicle,
                'created_by': self.created_by,
            }
            
            new_job = Job.objects.create(**job_data)
            
            # Copy over the many-to-many relationships
            new_job.assigned_employees.set(self.assigned_employees.all())
            
            # Copy materials
            for material in self.materials.all():
                JobMaterial.objects.create(
                    tenant_id=self.tenant_id,
                    job=new_job,
                    material=material.material,
                    quantity=material.quantity,
                    unit_cost=material.unit_cost,
                    unit_price=material.unit_price,
                    markup_percentage=material.markup_percentage,
                    is_billable=material.is_billable,
                    added_by=self.created_by
                )
            
            created_jobs.append(new_job)
            current_date = next_date
            
        return created_jobs


class JobMaterial(TenantAwareModel):
    """Track materials/supplies used in a job"""
    
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='materials')
    material = models.ForeignKey('inventory.Material', on_delete=models.PROTECT)
    
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
            models.Index(fields=['tenant_id', 'material']),
        ]
        
    def __str__(self):
        return f"{self.material.name} - {self.quantity} units"
    
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
        if self.material.material_type == 'consumable':
            if is_new:
                # New material usage - deplete inventory
                self.material.quantity_in_stock -= self.quantity
                if self.material.quantity_in_stock < 0:
                    self.material.quantity_in_stock = 0
                self.material.save(update_fields=['quantity_in_stock'])
            elif old_quantity and old_quantity != self.quantity:
                # Quantity changed - adjust inventory
                quantity_diff = self.quantity - old_quantity
                self.material.quantity_in_stock -= quantity_diff
                if self.material.quantity_in_stock < 0:
                    self.material.quantity_in_stock = 0
                self.material.save(update_fields=['quantity_in_stock'])
    
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
    
    # Link to bill (optional)
    bill = models.ForeignKey('purchases.Bill', on_delete=models.SET_NULL, null=True, blank=True,
                            related_name='job_expenses', help_text='Link to bill/purchase record')
    
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


class JobDocument(TenantAwareModel):
    """Store documents related to a job"""
    
    DOCUMENT_TYPE_CHOICES = [
        ('contract', 'Contract'),
        ('receipt', 'Receipt'),
        ('invoice', 'Vendor Invoice'),
        ('photo_before', 'Before Photo'),
        ('photo_progress', 'Progress Photo'),
        ('photo_after', 'After Photo'),
        ('permit', 'Permit/License'),
        ('equipment_rental', 'Equipment Rental'),
        ('completion_cert', 'Completion Certificate'),
        ('signature', 'Signature Document'),
        ('quote', 'Quote Document'),
        ('change_order', 'Change Order'),
        ('other', 'Other'),
    ]
    
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='documents')
    document_type = models.CharField(max_length=20, choices=DOCUMENT_TYPE_CHOICES)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    
    # File storage
    file_url = models.URLField(help_text="URL to document in cloud storage")
    file_name = models.CharField(max_length=255)
    file_size = models.IntegerField(help_text="File size in bytes")
    file_type = models.CharField(max_length=50, help_text="MIME type")
    
    # For receipts/expenses
    amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True,
                               help_text="Amount for receipts/invoices")
    vendor_name = models.CharField(max_length=200, blank=True)
    expense_date = models.DateField(null=True, blank=True)
    is_billable = models.BooleanField(default=True,
                                    help_text="Can this expense be billed to customer")
    
    # Metadata
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    # OCR data (for future implementation)
    ocr_extracted_text = models.TextField(blank=True,
                                        help_text="Text extracted via OCR")
    ocr_confidence = models.FloatField(null=True, blank=True,
                                     help_text="OCR confidence score")
    
    objects = TenantManager()
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'job']),
            models.Index(fields=['tenant_id', 'document_type']),
            models.Index(fields=['tenant_id', 'uploaded_at']),
        ]
        ordering = ['-uploaded_at']
        
    def __str__(self):
        return f"{self.title} - {self.get_document_type_display()}"


class JobStatusHistory(TenantAwareModel):
    """Track job status changes for audit trail"""
    
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='status_history')
    from_status = models.CharField(max_length=20, choices=Job.STATUS_CHOICES, blank=True)
    to_status = models.CharField(max_length=20, choices=Job.STATUS_CHOICES)
    changed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    changed_at = models.DateTimeField(auto_now_add=True)
    reason = models.TextField(blank=True, help_text="Reason for status change")
    
    # Location data for mobile status changes
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    objects = TenantManager()
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'job']),
            models.Index(fields=['tenant_id', 'changed_at']),
        ]
        ordering = ['-changed_at']
        
    def __str__(self):
        return f"{self.job.job_number}: {self.from_status or 'New'} → {self.to_status}"


class JobCommunication(TenantAwareModel):
    """Track all communications related to a job"""
    
    COMMUNICATION_TYPE_CHOICES = [
        ('email', 'Email'),
        ('whatsapp', 'WhatsApp'),
        ('sms', 'SMS'),
        ('phone', 'Phone Call'),
        ('in_person', 'In Person'),
        ('internal', 'Internal Note'),
    ]
    
    DIRECTION_CHOICES = [
        ('outbound', 'Sent to Customer'),
        ('inbound', 'Received from Customer'),
        ('internal', 'Internal'),
    ]
    
    job = models.ForeignKey(Job, on_delete=models.CASCADE, related_name='communications')
    communication_type = models.CharField(max_length=20, choices=COMMUNICATION_TYPE_CHOICES)
    direction = models.CharField(max_length=20, choices=DIRECTION_CHOICES)
    
    subject = models.CharField(max_length=200, blank=True)
    content = models.TextField()
    
    # Contact details
    contact_name = models.CharField(max_length=200, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    
    # Tracking
    sent_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='job_communications_sent')
    sent_at = models.DateTimeField(auto_now_add=True)
    
    # Delivery status
    is_delivered = models.BooleanField(default=False)
    delivered_at = models.DateTimeField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Attachments
    has_attachments = models.BooleanField(default=False)
    attachment_urls = models.JSONField(default=list, blank=True)
    
    objects = TenantManager()
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'job']),
            models.Index(fields=['tenant_id', 'sent_at']),
        ]
        ordering = ['-sent_at']
        
    def __str__(self):
        return f"{self.get_communication_type_display()} - {self.subject or 'No subject'}"


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
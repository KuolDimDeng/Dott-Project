import uuid
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal
from datetime import datetime, time, timedelta
from django.db import models as django_models


class Timesheet(models.Model):
    """Weekly timesheet for employees"""
    STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('paid', 'Paid'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey('hr.Employee', on_delete=models.CASCADE, related_name='timesheet_records')
    supervisor = models.ForeignKey('hr.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='supervised_timesheet_records')
    business_id = models.UUIDField(db_index=True)
    
    # Week information
    week_starting = models.DateField(db_index=True)
    week_ending = models.DateField()
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey('hr.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_timesheet_records')
    
    # Totals (cached for performance)
    total_regular_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_overtime_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    total_hours = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    
    # Pay calculation
    hourly_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    overtime_rate = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_pay = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    # Notes
    employee_notes = models.TextField(blank=True)
    supervisor_notes = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'timesheets_timesheet'
        ordering = ['-week_starting']
        unique_together = [['employee', 'week_starting']]
        indexes = [
            models.Index(fields=['business_id', 'week_starting']),
            models.Index(fields=['employee', 'status']),
        ]
    
    def __str__(self):
        return f"Timesheet for {self.employee} - Week of {self.week_starting}"
    
    def calculate_totals(self):
        """Recalculate all totals from time entries"""
        entries = self.entries.all()
        
        self.total_regular_hours = sum(e.regular_hours or 0 for e in entries)
        self.total_overtime_hours = sum(e.overtime_hours or 0 for e in entries)
        self.total_hours = self.total_regular_hours + self.total_overtime_hours
        
        # Calculate pay if rates are set
        if self.hourly_rate:
            regular_pay = self.total_regular_hours * self.hourly_rate
            overtime_pay = self.total_overtime_hours * (self.overtime_rate or self.hourly_rate * Decimal('1.5'))
            self.total_pay = regular_pay + overtime_pay
        
        self.save()


class TimeEntry(models.Model):
    """Daily time entry within a timesheet"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timesheet = models.ForeignKey(Timesheet, on_delete=models.CASCADE, related_name='entries')
    date = models.DateField()
    
    # Hours worked
    regular_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0, validators=[MinValueValidator(0), MaxValueValidator(24)])
    overtime_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0, validators=[MinValueValidator(0), MaxValueValidator(24)])
    
    # Time off categories
    sick_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0, validators=[MinValueValidator(0), MaxValueValidator(24)])
    vacation_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0, validators=[MinValueValidator(0), MaxValueValidator(24)])
    holiday_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0, validators=[MinValueValidator(0), MaxValueValidator(24)])
    unpaid_leave_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0, validators=[MinValueValidator(0), MaxValueValidator(24)])
    other_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0, validators=[MinValueValidator(0), MaxValueValidator(24)])
    other_description = models.CharField(max_length=200, blank=True)
    
    # Total for the day
    total_hours = models.DecimalField(max_digits=4, decimal_places=2, default=0)
    
    # Notes
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'timesheets_time_entry'
        ordering = ['date']
        unique_together = [['timesheet', 'date']]
    
    def save(self, *args, **kwargs):
        # Calculate total hours
        self.total_hours = (
            self.regular_hours + self.overtime_hours + self.sick_hours +
            self.vacation_hours + self.holiday_hours + self.unpaid_leave_hours +
            self.other_hours
        )
        super().save(*args, **kwargs)
        
        # Update timesheet totals
        if self.timesheet_id:
            self.timesheet.calculate_totals()


class ClockEntry(models.Model):
    """Clock in/out entries for hourly employees"""
    ENTRY_TYPE_CHOICES = [
        ('clock_in', 'Clock In'),
        ('clock_out', 'Clock Out'),
        ('break_start', 'Break Start'),
        ('break_end', 'Break End'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey('hr.Employee', on_delete=models.CASCADE, related_name='clock_entries')
    business_id = models.UUIDField(db_index=True)
    
    entry_type = models.CharField(max_length=20, choices=ENTRY_TYPE_CHOICES)
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    
    # Location tracking
    location_enabled = models.BooleanField(default=False)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    location_accuracy = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)  # in meters
    is_within_geofence = models.BooleanField(null=True, blank=True)
    
    # Device info
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    device_type = models.CharField(max_length=50, blank=True)  # mobile, web, kiosk
    
    # Notes
    notes = models.TextField(blank=True)
    
    # For manual adjustments
    is_manual = models.BooleanField(default=False)
    adjusted_by = models.ForeignKey('hr.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='adjusted_clock_entries')
    adjustment_reason = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'timesheets_clock_entry'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['employee', 'timestamp']),
            models.Index(fields=['business_id', 'timestamp']),
        ]
    
    def __str__(self):
        return f"{self.employee} - {self.get_entry_type_display()} at {self.timestamp}"


class TimeOffRequest(models.Model):
    """Time off requests from employees"""
    REQUEST_TYPE_CHOICES = [
        ('vacation', 'Vacation'),
        ('sick', 'Sick Leave'),
        ('personal', 'Personal Leave'),
        ('bereavement', 'Bereavement'),
        ('jury_duty', 'Jury Duty'),
        ('unpaid', 'Unpaid Leave'),
        ('other', 'Other'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey('hr.Employee', on_delete=models.CASCADE, related_name='timeoff_requests')
    business_id = models.UUIDField(db_index=True)
    
    request_type = models.CharField(max_length=20, choices=REQUEST_TYPE_CHOICES)
    start_date = models.DateField()
    end_date = models.DateField()
    
    # Time details
    is_full_day = models.BooleanField(default=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    
    # Hours calculation
    total_hours = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    total_days = models.DecimalField(max_digits=5, decimal_places=1, default=0)
    
    # Request details
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    # Approval
    reviewed_by = models.ForeignKey('hr.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_timeoff_requests')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    review_notes = models.TextField(blank=True)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'timesheets_time_off_request'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['employee', 'status']),
            models.Index(fields=['business_id', 'start_date']),
        ]
    
    def __str__(self):
        return f"{self.employee} - {self.get_request_type_display()} from {self.start_date} to {self.end_date}"
    
    def calculate_duration(self):
        """Calculate total hours and days for the request"""
        if self.is_full_day:
            # Calculate business days between dates
            delta = self.end_date - self.start_date
            self.total_days = delta.days + 1
            self.total_hours = self.total_days * 8  # Assuming 8-hour workday
        else:
            # Calculate hours for partial day
            if self.start_time and self.end_time:
                start_datetime = datetime.combine(self.start_date, self.start_time)
                end_datetime = datetime.combine(self.end_date, self.end_time)
                duration = end_datetime - start_datetime
                self.total_hours = duration.total_seconds() / 3600
                self.total_days = self.total_hours / 8
        
        self.save()


class GeofenceZone(models.Model):
    """Geofencing zones for location-based clock in/out"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business = models.ForeignKey('users.Business', on_delete=models.CASCADE, related_name='geofence_zones')
    name = models.CharField(max_length=100)
    
    # Zone can be either circular or polygon
    zone_type = models.CharField(max_length=20, choices=[('circle', 'Circle'), ('polygon', 'Polygon')], default='circle')
    
    # For circular zones
    center_latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    center_longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    radius_meters = models.IntegerField(null=True, blank=True)  # Radius in meters
    
    # For polygon zones (store as JSON array of lat/lng points)
    polygon_points = models.JSONField(default=list, blank=True)
    
    # Settings
    is_active = models.BooleanField(default=True)
    require_location = models.BooleanField(default=True)
    allow_clock_outside = models.BooleanField(default=False)  # Allow clocking even if outside zone
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'timesheets_geofence_zone'
        ordering = ['name']
    
    def __str__(self):
        return f"{self.business} - {self.name}"
    
    def is_point_inside(self, latitude, longitude):
        """Check if a point is inside the geofence zone"""
        if self.zone_type == 'circle':
            # Simple distance calculation for circular zones
            from math import radians, sin, cos, sqrt, atan2
            
            R = 6371000  # Earth's radius in meters
            lat1 = radians(float(self.center_latitude))
            lat2 = radians(float(latitude))
            lon1 = radians(float(self.center_longitude))
            lon2 = radians(float(longitude))
            
            dlat = lat2 - lat1
            dlon = lon2 - lon1
            
            a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
            c = 2 * atan2(sqrt(a), sqrt(1-a))
            distance = R * c
            
            return distance <= self.radius_meters
        
        elif self.zone_type == 'polygon':
            # Point-in-polygon algorithm
            # Implementation would go here
            pass
        
        return False
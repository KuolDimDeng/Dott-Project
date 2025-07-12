#!/usr/bin/env python
"""
Script to add Timesheet Management models to the Django application
This script creates the necessary models for timesheets, time off requests, and holidays
"""

import os
import sys
import uuid
import datetime
from pathlib import Path

# Add the parent directory to sys.path
current_dir = Path(__file__).resolve().parent
parent_dir = current_dir.parent
sys.path.append(str(parent_dir))

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "pyfactor.settings")

import django
django.setup()

from django.db import models, transaction
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal

# Get the hr/models.py file path
hr_models_path = parent_dir / 'hr' / 'models.py'

# Models to add
TIMESHEET_MODELS = """
class TimesheetSetting(models.Model):
    \"\"\"Timesheet settings for a business\"\"\"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_id = models.UUIDField(null=True, blank=True)
    
    # Approval frequency
    APPROVAL_FREQUENCY_CHOICES = [
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
        ('BIWEEKLY', 'Bi-Weekly'),
        ('MONTHLY', 'Monthly'),
    ]
    approval_frequency = models.CharField(
        max_length=10,
        choices=APPROVAL_FREQUENCY_CHOICES,
        default='WEEKLY'
    )
    
    # Input frequency
    INPUT_FREQUENCY_CHOICES = [
        ('DAILY', 'Daily'),
        ('WEEKLY', 'Weekly'),
    ]
    input_frequency = models.CharField(
        max_length=10,
        choices=INPUT_FREQUENCY_CHOICES,
        default='DAILY'
    )
    
    # PTO configuration
    class_tiers = models.JSONField(default=dict, help_text='JSON containing PTO tiers by role')
    default_pto_days_per_year = models.PositiveIntegerField(default=10)
    default_sick_days_per_year = models.PositiveIntegerField(default=5)
    
    # Additional settings
    allow_overtime = models.BooleanField(default=True)
    overtime_rate = models.DecimalField(
        max_digits=4, 
        decimal_places=2, 
        validators=[MinValueValidator(Decimal('1.0'))],
        default=Decimal('1.5')
    )
    require_manager_approval = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Timesheet Settings for Business {self.business_id}"
    
    class Meta:
        verbose_name = "Timesheet Setting"
        verbose_name_plural = "Timesheet Settings"


class CompanyHoliday(models.Model):
    \"\"\"Company observed holidays\"\"\"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    business_id = models.UUIDField(null=True, blank=True)
    
    name = models.CharField(max_length=100)
    date = models.DateField()
    paid = models.BooleanField(default=True)
    recurring_yearly = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.name} - {self.date.strftime('%Y-%m-%d')}"
    
    class Meta:
        verbose_name = "Company Holiday"
        verbose_name_plural = "Company Holidays"
        unique_together = ('business_id', 'date', 'name')


class Timesheet(models.Model):
    \"\"\"Employee timesheet record\"\"\"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey('Employee', on_delete=models.CASCADE, related_name='timesheets')
    
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='DRAFT')
    
    # Timesheet period
    period_start = models.DateField()
    period_end = models.DateField()
    
    # Approval information
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        'Employee', 
        on_delete=models.SET_NULL, 
        null=True, blank=True, 
        related_name='approved_timesheets'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)
    
    # Totals
    total_regular_hours = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal('0.00')
    )
    total_overtime_hours = models.DecimalField(
        max_digits=6, decimal_places=2, default=Decimal('0.00')
    )
    
    notes = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Timesheet {self.employee.employee_number} - {self.period_start} to {self.period_end}"
    
    class Meta:
        verbose_name = "Timesheet"
        verbose_name_plural = "Timesheets"
        unique_together = ('employee', 'period_start', 'period_end')


class TimesheetEntry(models.Model):
    \"\"\"Individual timesheet entry for a day\"\"\"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timesheet = models.ForeignKey(Timesheet, on_delete=models.CASCADE, related_name='entries')
    
    date = models.DateField()
    
    # Hours
    regular_hours = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00')
    )
    overtime_hours = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00')
    )
    
    # Additional fields
    project = models.CharField(max_length=100, blank=True, null=True)
    task = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Entry for {self.date} - {self.regular_hours} hours"
    
    class Meta:
        verbose_name = "Timesheet Entry"
        verbose_name_plural = "Timesheet Entries"
        unique_together = ('timesheet', 'date')


class TimeOffRequest(models.Model):
    \"\"\"Base model for PTO and sick leave requests\"\"\"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey('Employee', on_delete=models.CASCADE, related_name='time_off_requests')
    
    REQUEST_TYPE_CHOICES = [
        ('PTO', 'Paid Time Off'),
        ('SICK', 'Sick Leave'),
    ]
    request_type = models.CharField(max_length=4, choices=REQUEST_TYPE_CHOICES)
    
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('APPROVED', 'Approved'),
        ('REJECTED', 'Rejected'),
        ('CANCELLED', 'Cancelled'),
    ]
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='PENDING')
    
    # Request details
    start_date = models.DateField()
    end_date = models.DateField()
    reason = models.TextField()
    
    # Approval information
    submitted_at = models.DateTimeField(auto_now_add=True)
    approved_by = models.ForeignKey(
        'Employee', 
        on_delete=models.SET_NULL, 
        null=True, blank=True, 
        related_name='approved_time_off'
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.request_type} Request - {self.employee.employee_number} ({self.start_date} to {self.end_date})"
    
    class Meta:
        verbose_name = "Time Off Request"
        verbose_name_plural = "Time Off Requests"


class TimeOffBalance(models.Model):
    \"\"\"Employee PTO and sick leave balance\"\"\"
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.OneToOneField('Employee', on_delete=models.CASCADE, related_name='time_off_balance')
    
    year = models.PositiveIntegerField(default=lambda: datetime.datetime.now().year)
    
    # Allowances
    pto_allowance = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00')
    )
    sick_leave_allowance = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00')
    )
    
    # Used amounts
    pto_used = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00')
    )
    sick_leave_used = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00')
    )
    
    # Carryover from previous year
    pto_carryover = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00')
    )
    sick_leave_carryover = models.DecimalField(
        max_digits=5, decimal_places=2, default=Decimal('0.00')
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Time Off Balance - {self.employee.employee_number} ({self.year})"
    
    class Meta:
        verbose_name = "Time Off Balance"
        verbose_name_plural = "Time Off Balances"
        unique_together = ('employee', 'year')
"""

def apply_model_changes():
    """Apply model changes to hr/models.py file"""
    print("Applying model changes...")
    
    with open(hr_models_path, 'r') as file:
        content = file.read()
    
    # Check if models already exist to avoid duplicates
    if "class TimesheetSetting" in content:
        print("Timesheet models already exist in hr/models.py")
        return
    
    # Add imports if not present
    if "from decimal import Decimal" not in content:
        content = content.replace("import uuid", "import uuid\nimport datetime")
    
    # Append models to the end of the file
    content += "\n\n# Timesheet Management Models\n" + TIMESHEET_MODELS
    
    # Write updated content back to file
    with open(hr_models_path, 'w') as file:
        file.write(content)
    
    print("Successfully added Timesheet Management models to hr/models.py")

def create_migration():
    """Create migration for the new models"""
    try:
        import subprocess
        print("Creating migration for timesheet models...")
        subprocess.run(["python", "manage.py", "makemigrations", "hr"], check=True)
        print("Migration created successfully")
    except Exception as e:
        print(f"Error creating migration: {str(e)}")
        print("You will need to run 'python manage.py makemigrations hr' manually")

def main():
    """Main execution function"""
    try:
        # Apply changes to models.py
        apply_model_changes()
        
        # Create migration
        create_migration()
        
        print("\nTimesheet Management models added successfully.")
        print("Next steps:")
        print("1. Apply migrations using 'python manage.py migrate'")
        print("2. Update the frontend to use the new timesheet management functionality")
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return 1
    
    return 0

if __name__ == "__main__":
    sys.exit(main()) 
#/Users/kuoldeng/projectx/backend/pyfactor/payroll/models.py
from datetime import timedelta, timezone
from django.db import models
from hr.models import Employee
import uuid


def get_current_datetime():
    return timezone.now()

def default_due_datetime():
    return get_current_datetime() + timedelta(days=30)


class Timesheet(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timesheet_number = models.CharField(max_length=20, unique=True, editable=False)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    start_date = models.DateField(default=get_current_datetime)
    end_date = models.DateField(default=get_current_datetime)
    total_hours = models.DecimalField(max_digits=5, decimal_places=2)
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('submitted', 'Submitted'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected')
    ], default='draft')
    created_at = models.DateTimeField(default=default_due_datetime)
    updated_at = models.DateTimeField(default=default_due_datetime)

    def save(self, *args, **kwargs):
        if not self.timesheet_number:
            self.timesheet_number = self.generate_timesheet_number()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_timesheet_number():
        last_timesheet = Timesheet.objects.order_by('-created_at').first()
        if last_timesheet:
            last_number = int(last_timesheet.timesheet_number[3:])
            new_number = last_number + 1
        else:
            new_number = 1
        return f"TMS{new_number:06d}"

    def __str__(self):
        return f"Timesheet {self.timesheet_number} - {self.employee.full_name}"

class TimesheetEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    timesheet = models.ForeignKey(Timesheet, related_name='entries', on_delete=models.CASCADE)
    date = models.DateField()
    hours_worked = models.DecimalField(max_digits=5, decimal_places=2)
    project = models.CharField(max_length=100, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Entry for {self.timesheet.timesheet_number} on {self.date}"

class PayrollRun(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payroll_number = models.CharField(max_length=20, unique=True, editable=False)
    start_date = models.DateField()
    end_date = models.DateField()
    pay_date = models.DateField()
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=[
        ('draft', 'Draft'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled')
    ], default='draft')

       # Add global support fields
    country_code = models.CharField(max_length=2, default='US')
    is_international = models.BooleanField(default=False)
    service_type = models.CharField(max_length=10, choices=[
        ('full', 'Full-Service'),
        ('self', 'Self-Service'),
    ], default='full')
    
    # For international self-service
    filing_instructions = models.TextField(blank=True, null=True)
    tax_authority_links = models.JSONField(default=dict, blank=True, null=True)
    
    created_at = models.DateTimeField(default=default_due_datetime)
    updated_at = models.DateTimeField(default=default_due_datetime)
    tax_filings_created = models.BooleanField(default=False)
    tax_filings_status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('not_applicable', 'Not Applicable'),  # For self-service

    ], default='pending')

    # Add currency fields
    currency_code = models.CharField(max_length=3, default='USD')  # ISO 4217 currency code
    currency_symbol = models.CharField(max_length=5, default='$')
    exchange_rate_to_usd = models.DecimalField(max_digits=10, decimal_places=6, default=1.0)
    show_usd_comparison = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.payroll_number:
            self.payroll_number = self.generate_payroll_number()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_payroll_number():
        last_payroll = PayrollRun.objects.order_by('-created_at').first()
        if last_payroll:
            last_number = int(last_payroll.payroll_number[3:])
            new_number = last_number + 1
        else:
            new_number = 1
        return f"PAY{new_number:06d}"

    def __str__(self):
        return f"Payroll {self.payroll_number}"

class PayrollTransaction(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE)
    gross_pay = models.DecimalField(max_digits=10, decimal_places=2)
    net_pay = models.DecimalField(max_digits=10, decimal_places=2)
    taxes = models.DecimalField(max_digits=10, decimal_places=2)
    federal_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    state_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    state_code = models.CharField(max_length=2, blank=True, null=True)
    medicare_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    social_security_tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    additional_withholdings = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    

class TaxForm(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    form_type = models.CharField(max_length=20)
    tax_year = models.IntegerField()
    file = models.FileField(upload_to='tax_forms/')


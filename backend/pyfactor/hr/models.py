import datetime
from django.db import models
from django.utils import timezone
# Create your models here.
from django.conf import settings
import uuid

def get_current_datetime():
    return timezone.now()

def default_due_datetime():
    return get_current_datetime() + datetime.timedelta(days=30)


class Employee(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee_number = models.CharField(max_length=20, unique=True, editable=False)
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    dob = models.DateField(default=get_current_datetime)
    street = models.CharField(max_length=200, null=True, blank=True)
    postcode = models.CharField(max_length=20, blank=True, null=True)
    city = models.CharField(max_length=100, blank=True, null=True)
    country = models.CharField(max_length=100, default='USA')
    date_joined = models.DateField(default=get_current_datetime)
    last_work_date = models.DateField(null=True, blank=True)
    active = models.BooleanField(default=True)
    role = models.CharField(max_length=100)
    site_access_privileges = models.TextField(blank=True, null=True)
    email = models.EmailField(unique=True, blank=True, null=True)
    phone_number = models.CharField(max_length=20, null=True)
    department = models.CharField(max_length=100, null=True, blank=True)
    salary = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    emergency_contact_name = models.CharField(max_length=100, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.employee_number:
            self.employee_number = self.generate_employee_number()
        super().save(*args, **kwargs)

    @staticmethod
    def generate_employee_number():
        last_employee = Employee.objects.order_by('-id').first()
        if last_employee:
            last_number = int(last_employee.employee_number[3:])
            new_number = last_number + 1
        else:
            new_number = 1
        return f"EMP-{new_number:06d}"

    def __str__(self):
        return f"{self.first_name} {self.last_name} ({self.employee_number})"

class Role(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField()

class EmployeeRole(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    role = models.ForeignKey(Role, on_delete=models.CASCADE)

class AccessPermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE)
    module = models.CharField(max_length=100)
    can_view = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)
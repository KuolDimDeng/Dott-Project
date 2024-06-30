from django.db import models

# Create your models here.
from django.db import models
from django.conf import settings

class Employee(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    employee_id = models.CharField(max_length=10, unique=True)
    department = models.CharField(max_length=100)
    position = models.CharField(max_length=100)
    hire_date = models.DateField()

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
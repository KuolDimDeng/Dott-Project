from django.db import models

# Create your models here.
from django.db import models
from hr.models import Employee

class Timesheet(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    date = models.DateField()
    hours_worked = models.DecimalField(max_digits=5, decimal_places=2)

class PayrollRun(models.Model):
    run_date = models.DateField()
    start_date = models.DateField()
    end_date = models.DateField()
    status = models.CharField(max_length=20)

class PayrollTransaction(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    payroll_run = models.ForeignKey(PayrollRun, on_delete=models.CASCADE)
    gross_pay = models.DecimalField(max_digits=10, decimal_places=2)
    net_pay = models.DecimalField(max_digits=10, decimal_places=2)
    taxes = models.DecimalField(max_digits=10, decimal_places=2)

class TaxForm(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    form_type = models.CharField(max_length=20)
    tax_year = models.IntegerField()
    file = models.FileField(upload_to='tax_forms/')
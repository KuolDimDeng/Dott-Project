#/Users/kuoldeng/projectx/backend/pyfactor/analysis/models.py
from django.db import models

# Create your models here.
from django.db import models

class FinancialData(models.Model):
    date = models.DateField()
    sales = models.DecimalField(max_digits=10, decimal_places=2)
    expenses = models.DecimalField(max_digits=10, decimal_places=2)
    profit = models.DecimalField(max_digits=10, decimal_places=2)
    # Add more fields as needed

class ChartConfiguration(models.Model):
    name = models.CharField(max_length=100)
    x_axis = models.CharField(max_length=50)
    y_axis = models.CharField(max_length=50)
    chart_type = models.CharField(max_length=50)
    time_granularity = models.CharField(max_length=20, default='month')
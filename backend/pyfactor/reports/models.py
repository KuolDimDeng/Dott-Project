#/Users/kuoldeng/projectx/backend/pyfactor/reports/models.py
# Create your models here.
from django.db import models
from finance.models import Account, Transaction
from users.models import UserProfile

class Report(models.Model):
    REPORT_TYPES = (
        ('BS', 'Balance Sheet'),
        ('CF', 'Cash Flow Statement'),
        ('IS', 'Income Statement'),
    )

    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    report_type = models.CharField(max_length=2, choices=REPORT_TYPES)
    date_generated = models.DateTimeField(auto_now_add=True)
    data = models.JSONField()

    def __str__(self):
        return f"{self.get_report_type_display()} - {self.date_generated}"
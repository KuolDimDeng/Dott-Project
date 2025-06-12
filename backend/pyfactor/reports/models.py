#/Users/kuoldeng/projectx/backend/pyfactor/reports/models.py
# Create your models here.
from django.db import models
from users.models import UserProfile
from custom_auth.tenant_base_model import TenantAwareModel

class Report(TenantAwareModel):
    REPORT_TYPES = (
        ('BS', 'Balance Sheet'),
        ('CF', 'Cash Flow'),
        ('IS', 'Income Statement'),
    )

    user_profile = models.ForeignKey(UserProfile, on_delete=models.CASCADE)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)  # Increased max_length
    date_generated = models.DateTimeField(auto_now_add=True)
    data = models.JSONField()

    def __str__(self):
        return f"{self.get_report_type_display()} - {self.date_generated}"
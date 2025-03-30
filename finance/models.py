from django.db import models
from banking.models import BankAccount
from django.utils import timezone
import uuid

class Account(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=50, unique=True)
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.name

class AccountReconciliation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    bank_account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, to_field="id", db_column="bank_account_id")
    account = models.ForeignKey(Account, on_delete=models.CASCADE, related_name="reconciliations")
    reconciliation_date = models.DateField()
    status = models.CharField(max_length=20, default="pending")
    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Reconciliation {self.id}" 
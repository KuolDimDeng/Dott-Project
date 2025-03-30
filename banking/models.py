from django.db import models
import uuid
from custom_auth.tenant_base_model import TenantAwareModel, TenantAwareManager
from custom_auth.models import User

class BankAccount(TenantAwareModel):
    """Bank account model with tenant isolation"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    account_number = models.CharField(max_length=100)
    account_type = models.CharField(max_length=100)
    balance = models.DecimalField(max_digits=19, decimal_places=4)
    currency = models.CharField(max_length=3)
    is_active = models.BooleanField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    
    # Add tenant-aware manager
    objects = TenantAwareManager()
    # Add all_objects manager for admin operations
    all_objects = models.Manager()
    
    def __str__(self):
        return f"{self.name} ({self.account_number})"
        
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'name']),
            models.Index(fields=['tenant_id', 'account_number']),
        ]

class BankTransaction(TenantAwareModel):
    """Bank transaction model with tenant isolation"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    account = models.ForeignKey(BankAccount, on_delete=models.CASCADE, related_name='transactions')
    amount = models.DecimalField(max_digits=19, decimal_places=4)
    description = models.TextField()
    transaction_date = models.DateTimeField()
    transaction_type = models.CharField(max_length=100)
    category = models.CharField(max_length=100, null=True, blank=True)
    reference = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Add tenant-aware manager
    objects = TenantAwareManager()
    # Add all_objects manager for admin operations
    all_objects = models.Manager()
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'account']),
            models.Index(fields=['tenant_id', 'transaction_date']),
        ]

class PlaidItem(TenantAwareModel):
    """Plaid integration item with tenant isolation"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item_id = models.CharField(max_length=100, unique=True)
    access_token = models.CharField(max_length=255)
    institution_id = models.CharField(max_length=100)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Add tenant-aware manager
    objects = TenantAwareManager()
    # Add all_objects manager for admin operations
    all_objects = models.Manager()
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'item_id']),
        ]

class TinkItem(TenantAwareModel):
    """Tink integration item with tenant isolation"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    item_id = models.CharField(max_length=100, unique=True)
    access_token = models.CharField(max_length=255)
    refresh_token = models.CharField(max_length=255)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Add tenant-aware manager
    objects = TenantAwareManager()
    # Add all_objects manager for admin operations
    all_objects = models.Manager()
    
    class Meta:
        indexes = [
            models.Index(fields=['tenant_id', 'item_id']),
        ] 
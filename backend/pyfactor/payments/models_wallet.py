"""
Mobile Money Wallet Models
Manages user wallet balances for MTN and M-Pesa mobile money
"""
import uuid
from decimal import Decimal
from django.db import models, transaction
from django.utils import timezone
from django.core.exceptions import ValidationError
from custom_auth.models import User, TenantAwareModel
from .models_mobile_money import MobileMoneyProvider  # Reuse existing provider model


class MobileMoneyWallet(TenantAwareModel):
    """User's mobile money wallet"""
    VERIFICATION_STATUS = [
        ('unverified', 'Unverified'),
        ('pending', 'Pending Verification'),
        ('verified', 'Verified'),
        ('suspended', 'Suspended'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wallets')  # Changed to ForeignKey to allow multiple providers per user
    provider = models.ForeignKey(MobileMoneyProvider, on_delete=models.PROTECT, to_field='name')
    phone_number = models.CharField(max_length=20, db_index=True)
    
    # Balance fields
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    available_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    pending_balance = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    
    # Verification and limits
    verification_status = models.CharField(max_length=20, choices=VERIFICATION_STATUS, default='unverified')
    verified_at = models.DateTimeField(null=True, blank=True)
    daily_limit = models.DecimalField(max_digits=15, decimal_places=2, default=1000.00)
    monthly_limit = models.DecimalField(max_digits=15, decimal_places=2, default=30000.00)
    daily_spent = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    monthly_spent = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    last_reset_date = models.DateField(null=True, blank=True)
    
    # Security
    pin_hash = models.CharField(max_length=255, null=True, blank=True)
    pin_attempts = models.IntegerField(default=0)
    pin_locked_until = models.DateTimeField(null=True, blank=True)
    
    # Metadata
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payments_mobilemoney_wallet'
        unique_together = ['user', 'provider']
        indexes = [
            models.Index(fields=['phone_number']),
            models.Index(fields=['user', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.user.email} - {self.provider.code} Wallet"
    
    def check_daily_limit(self, amount):
        """Check if transaction exceeds daily limit"""
        today = timezone.now().date()
        if self.last_reset_date != today:
            self.daily_spent = 0
            self.last_reset_date = today
            self.save(update_fields=['daily_spent', 'last_reset_date'])
        
        return (self.daily_spent + amount) <= self.daily_limit
    
    def check_monthly_limit(self, amount):
        """Check if transaction exceeds monthly limit"""
        current_month = timezone.now().date().replace(day=1)
        if not self.last_reset_date or self.last_reset_date < current_month:
            self.monthly_spent = 0
            self.save(update_fields=['monthly_spent'])
        
        return (self.monthly_spent + amount) <= self.monthly_limit
    
    @transaction.atomic
    def add_funds(self, amount, reference, description="Wallet top-up"):
        """Add funds to wallet"""
        if amount <= 0:
            raise ValidationError("Amount must be positive")
        
        self.balance += amount
        self.available_balance += amount
        self.save(update_fields=['balance', 'available_balance', 'updated_at'])
        
        # Create transaction record
        WalletTransaction.objects.create(
            wallet=self,
            transaction_type='credit',
            amount=amount,
            balance_after=self.balance,
            reference=reference,
            description=description,
            status='completed'
        )
        
        return self.balance
    
    @transaction.atomic
    def deduct_funds(self, amount, reference, description="Wallet debit"):
        """Deduct funds from wallet"""
        if amount <= 0:
            raise ValidationError("Amount must be positive")
        
        if self.available_balance < amount:
            raise ValidationError("Insufficient balance")
        
        if not self.check_daily_limit(amount):
            raise ValidationError("Daily limit exceeded")
        
        if not self.check_monthly_limit(amount):
            raise ValidationError("Monthly limit exceeded")
        
        self.balance -= amount
        self.available_balance -= amount
        self.daily_spent += amount
        self.monthly_spent += amount
        self.save(update_fields=['balance', 'available_balance', 'daily_spent', 'monthly_spent', 'updated_at'])
        
        # Create transaction record
        WalletTransaction.objects.create(
            wallet=self,
            transaction_type='debit',
            amount=amount,
            balance_after=self.balance,
            reference=reference,
            description=description,
            status='completed'
        )
        
        return self.balance


class WalletTransaction(TenantAwareModel):
    """Wallet transaction records"""
    TRANSACTION_TYPES = [
        ('credit', 'Credit'),
        ('debit', 'Debit'),
        ('transfer_in', 'Transfer In'),
        ('transfer_out', 'Transfer Out'),
        ('topup', 'Top Up'),
        ('withdrawal', 'Withdrawal'),
        ('fee', 'Transaction Fee'),
        ('refund', 'Refund'),
    ]
    
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
        ('reversed', 'Reversed'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(MobileMoneyWallet, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    balance_before = models.DecimalField(max_digits=15, decimal_places=2, default=0.00)
    balance_after = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Reference and description
    reference = models.CharField(max_length=100, unique=True, db_index=True)
    external_reference = models.CharField(max_length=100, null=True, blank=True)
    description = models.TextField()
    
    # Related transaction (for transfers)
    related_transaction = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL)
    
    # Recipient/Sender info
    recipient_phone = models.CharField(max_length=20, null=True, blank=True)
    recipient_name = models.CharField(max_length=100, null=True, blank=True)
    sender_phone = models.CharField(max_length=20, null=True, blank=True)
    sender_name = models.CharField(max_length=100, null=True, blank=True)
    
    # Status and metadata
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    failure_reason = models.TextField(null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'payments_wallet_transaction'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['wallet', '-created_at']),
            models.Index(fields=['reference']),
            models.Index(fields=['status']),
            models.Index(fields=['transaction_type']),
        ]
    
    def __str__(self):
        return f"{self.transaction_type} - {self.amount} - {self.status}"


class WalletTransferRequest(TenantAwareModel):
    """Money transfer requests between users"""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('expired', 'Expired'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requester = models.ForeignKey(User, on_delete=models.CASCADE, related_name='wallet_requests_sent')
    recipient_phone = models.CharField(max_length=20)
    recipient_user = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL, 
                                      related_name='wallet_requests_received')
    
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    description = models.TextField(blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    expires_at = models.DateTimeField()
    
    # Response
    responded_at = models.DateTimeField(null=True, blank=True)
    response_message = models.TextField(blank=True)
    transaction = models.ForeignKey(WalletTransaction, null=True, blank=True, on_delete=models.SET_NULL)
    
    # Metadata
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'payments_wallet_transfer_request'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['requester', 'status']),
            models.Index(fields=['recipient_user', 'status']),
            models.Index(fields=['recipient_phone']),
        ]
    
    def __str__(self):
        return f"Request from {self.requester.email} to {self.recipient_phone} - {self.amount}"
    
    def is_expired(self):
        """Check if request has expired"""
        return timezone.now() > self.expires_at and self.status == 'pending'


class WalletTopUp(TenantAwareModel):
    """Wallet top-up via Stripe"""
    STATUS_CHOICES = [
        ('initiated', 'Initiated'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    wallet = models.ForeignKey(MobileMoneyWallet, on_delete=models.CASCADE, related_name='topups')
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    
    # Stripe fields
    stripe_payment_intent_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    stripe_payment_method_id = models.CharField(max_length=255, null=True, blank=True)
    stripe_charge_id = models.CharField(max_length=255, null=True, blank=True)
    
    # Fees
    stripe_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    platform_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    total_fee = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='initiated')
    failure_reason = models.TextField(null=True, blank=True)
    
    # Transaction reference
    transaction = models.ForeignKey(WalletTransaction, null=True, blank=True, on_delete=models.SET_NULL)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'payments_wallet_topup'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['wallet', '-created_at']),
            models.Index(fields=['stripe_payment_intent_id']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"Top-up {self.amount} to {self.wallet.user.email} - {self.status}"
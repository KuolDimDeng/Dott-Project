from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from decimal import Decimal
import uuid

User = get_user_model()

class CreditPackage(models.Model):
    """Available credit packages for purchase"""
    tenant_id = models.UUIDField(null=True, blank=True, db_index=True, help_text='Tenant isolation field')
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    credits = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    stripe_price_id = models.CharField(max_length=255, blank=True)  # Stripe Price ID
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['price']
        
    def __str__(self):
        return f"{self.name} - {self.credits} credits for ${self.price}"
    
    @property
    def price_per_credit(self):
        return self.price / self.credits if self.credits > 0 else 0


class UserCredit(models.Model):
    """User's credit balance and usage"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='smart_insights_credits')
    balance = models.IntegerField(default=10)  # Start with 10 free credits
    total_purchased = models.IntegerField(default=0)
    total_used = models.IntegerField(default=0)
    monthly_spend_limit = models.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        default=Decimal('500.00')
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.email} - Balance: {self.balance} credits"
    
    def can_use_credits(self, amount=1):
        """Check if user has enough credits"""
        return self.balance >= amount
    
    def deduct_credits(self, amount=1):
        """Deduct credits from balance"""
        if self.can_use_credits(amount):
            self.balance -= amount
            self.total_used += amount
            self.save()
            return True
        return False
    
    def add_credits(self, amount):
        """Add credits to balance"""
        self.balance += amount
        self.total_purchased += amount
        self.save()


class CreditTransaction(models.Model):
    """Record of all credit transactions"""
    TRANSACTION_TYPES = (
        ('purchase', 'Purchase'),
        ('usage', 'Usage'),
        ('refund', 'Refund'),
        ('bonus', 'Bonus'),
        ('grant', 'Grant'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='credit_transactions')
    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES)
    amount = models.IntegerField()  # Positive for additions, negative for usage
    balance_before = models.IntegerField(default=0)
    balance_after = models.IntegerField()
    description = models.TextField(blank=True)
    stripe_payment_intent_id = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        
    def __str__(self):
        return f"{self.user.email} - {self.transaction_type} {self.amount} credits"


class QueryLog(models.Model):
    """Log of all AI queries for audit and analytics"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='query_logs')
    query = models.TextField()
    response = models.TextField()
    credits_used = models.IntegerField(default=1)
    input_tokens = models.IntegerField(default=0)
    output_tokens = models.IntegerField(default=0)
    model_used = models.CharField(max_length=100, default='claude-3-opus-20240229')
    processing_time_ms = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
        ]
        
    def __str__(self):
        return f"{self.user.email} - {self.created_at}"


class MonthlyUsage(models.Model):
    """Track monthly usage for cost control"""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='monthly_usage')
    year = models.IntegerField()
    month = models.IntegerField()
    total_credits_used = models.IntegerField(default=0)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    query_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'year', 'month']
        ordering = ['-year', '-month']
        
    def __str__(self):
        return f"{self.user.email} - {self.year}/{self.month}: ${self.total_cost}"
    
    @property
    def is_at_limit(self):
        """Check if user has reached monthly spending limit"""
        user_credit = UserCredit.objects.filter(user=self.user).first()
        if user_credit:
            return self.total_cost >= user_credit.monthly_spend_limit
        return False
"""
Stripe-specific models for payroll payment processing
"""
from django.db import models
from django.contrib.auth.models import User
from decimal import Decimal
import uuid
from custom_auth.tenant_base_model import TenantAwareModel
from users.models import Business
from hr.models import Employee
from .models import PayrollRun, PayrollTransaction


class EmployeeStripeAccount(TenantAwareModel):
    """
    Stores employee's Stripe Connect account for receiving payments
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.OneToOneField(Employee, on_delete=models.CASCADE, related_name='stripe_account')
    
    # Stripe Connect account ID
    stripe_account_id = models.CharField(max_length=100, unique=True)
    
    # Account status
    onboarding_complete = models.BooleanField(default=False)
    charges_enabled = models.BooleanField(default=False)
    payouts_enabled = models.BooleanField(default=False)
    
    # Bank account info (tokenized)
    stripe_bank_token = models.CharField(max_length=100, blank=True)
    bank_last4 = models.CharField(max_length=4, blank=True)
    bank_name = models.CharField(max_length=100, blank=True)
    
    # Verification status
    verification_status = models.CharField(max_length=20, choices=[
        ('unverified', 'Unverified'),
        ('pending', 'Pending Verification'),
        ('verified', 'Verified'),
        ('restricted', 'Restricted'),
    ], default='unverified')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Stripe Account for {self.employee.first_name} {self.employee.last_name}"
    
    class Meta:
        verbose_name = "Employee Stripe Account"
        verbose_name_plural = "Employee Stripe Accounts"


class PayrollStripePayment(TenantAwareModel):
    """
    Tracks Stripe payment processing for payroll
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payroll_run = models.OneToOneField(PayrollRun, on_delete=models.CASCADE, related_name='stripe_payment')
    
    # ACH debit from employer
    funding_payment_intent_id = models.CharField(max_length=100, blank=True)
    funding_status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('succeeded', 'Succeeded'),
        ('failed', 'Failed'),
    ], default='pending')
    funding_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Platform fee
    platform_fee_amount = models.DecimalField(max_digits=10, decimal_places=2)
    platform_fee_percentage = models.DecimalField(max_digits=4, decimal_places=3, default=Decimal('0.024'))  # 2.4%
    
    # ACH processing
    ach_mandate_id = models.CharField(max_length=100, blank=True)
    
    # Approval tracking
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approval_signature_name = models.CharField(max_length=200, blank=True)
    approval_signature_date = models.DateField(null=True, blank=True)
    approval_ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    # Bank account selection
    selected_bank_account_id = models.UUIDField(null=True, blank=True)  # References banking.BankAccount
    
    # Status timestamps
    funding_initiated_at = models.DateTimeField(null=True, blank=True)
    funding_completed_at = models.DateTimeField(null=True, blank=True)
    distribution_started_at = models.DateTimeField(null=True, blank=True)
    distribution_completed_at = models.DateTimeField(null=True, blank=True)
    
    # Error tracking
    error_message = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def calculate_total_with_fee(self):
        """Calculate total amount to collect including platform fee"""
        if self.payroll_run.total_amount:
            self.platform_fee_amount = self.payroll_run.total_amount * self.platform_fee_percentage
            self.funding_amount = self.payroll_run.total_amount + self.platform_fee_amount
            return self.funding_amount
        return Decimal('0.00')
    
    def __str__(self):
        return f"Stripe Payment for {self.payroll_run.payroll_number}"
    
    class Meta:
        verbose_name = "Payroll Stripe Payment"
        verbose_name_plural = "Payroll Stripe Payments"


class EmployeePayoutRecord(TenantAwareModel):
    """
    Individual employee payout tracking
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payroll_transaction = models.OneToOneField(PayrollTransaction, on_delete=models.CASCADE, related_name='payout_record')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE)
    
    # Stripe references
    stripe_transfer_id = models.CharField(max_length=100, blank=True)
    stripe_payout_id = models.CharField(max_length=100, blank=True)
    
    # Amount
    payout_amount = models.DecimalField(max_digits=10, decimal_places=2)
    
    # Status
    payout_status = models.CharField(max_length=20, choices=[
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('in_transit', 'In Transit'),
        ('paid', 'Paid'),
        ('failed', 'Failed'),
        ('canceled', 'Canceled'),
    ], default='pending')
    
    # Timing
    initiated_at = models.DateTimeField(null=True, blank=True)
    expected_arrival_date = models.DateField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    
    # Error handling
    failure_code = models.CharField(max_length=50, blank=True)
    failure_message = models.TextField(blank=True)
    retry_count = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Additional fields for multi-provider support
    payment_provider = models.CharField(
        max_length=20,
        choices=[
            ('stripe', 'Stripe'),
            ('wise', 'Wise'),
            ('mobile_money', 'Mobile Money'),
            ('paystack', 'Paystack'),
        ],
        default='stripe',
        blank=True
    )
    wise_batch_id = models.CharField(max_length=100, blank=True, help_text="Wise batch ID if using Wise")
    mobile_money_reference = models.CharField(max_length=100, blank=True, help_text="Mobile money transaction reference")
    
    def __str__(self):
        return f"Payout to {self.employee.first_name} {self.employee.last_name} - {self.payout_status}"
    
    class Meta:
        verbose_name = "Employee Payout Record"
        verbose_name_plural = "Employee Payout Records"


class EmployeePaymentSetup(models.Model):
    """
    Track employee payment method setup across different providers
    """
    tenant_id = models.UUIDField(blank=True, null=True, db_column='tenant_id')
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='payment_setups')
    
    payment_provider = models.CharField(
        max_length=20,
        choices=[
            ('stripe', 'Stripe Connect'),
            ('wise', 'Wise Transfer'),
            ('mobile_money', 'Mobile Money'),
        ]
    )
    
    setup_status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending Setup'),
            ('invitation_sent', 'Invitation Sent'),
            ('active', 'Active'),
            ('failed', 'Failed'),
            ('suspended', 'Suspended'),
        ],
        default='pending'
    )
    
    # Provider-specific identifiers
    provider_reference_id = models.CharField(max_length=100, blank=True, help_text="Provider's reference ID")
    
    # Mobile money specific
    mobile_money_provider = models.CharField(
        max_length=50,
        blank=True,
        help_text="Specific mobile money provider (mpesa, mtn_momo, etc)"
    )
    mobile_money_number = models.CharField(max_length=20, blank=True, help_text="Mobile money phone number")
    
    # Wise specific
    wise_recipient_id = models.CharField(max_length=100, blank=True)
    
    # Metadata
    invitation_sent_at = models.DateTimeField(null=True, blank=True)
    setup_completed_at = models.DateTimeField(null=True, blank=True)
    last_used_at = models.DateTimeField(null=True, blank=True)
    
    # Audit
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Employee Payment Setup'
        verbose_name_plural = 'Employee Payment Setups'
        unique_together = [['employee', 'payment_provider']]
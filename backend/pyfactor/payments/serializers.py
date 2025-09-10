# payments/serializers.py
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import (
    PaymentGateway, PaymentMethod, Transaction, WebhookEvent,
    PaymentAuditLog, PaymentReconciliation, PaymentConfiguration,
    QRPaymentTransaction
)

User = get_user_model()

class PaymentGatewaySerializer(serializers.ModelSerializer):
    """Serializer for PaymentGateway model"""
    
    # Read-only fields for security
    api_key_encrypted = serializers.CharField(write_only=True, required=False)
    secret_key_encrypted = serializers.CharField(write_only=True, required=False)
    webhook_secret_encrypted = serializers.CharField(write_only=True, required=False)
    config_encrypted = serializers.CharField(write_only=True, required=False)
    
    # Calculated fields
    fee_summary = serializers.SerializerMethodField()
    is_configured = serializers.SerializerMethodField()
    
    class Meta:
        model = PaymentGateway
        fields = [
            'id', 'name', 'display_name', 'status', 'api_base_url', 'webhook_url',
            'supports_payments', 'supports_payouts', 'supports_refunds', 'supports_webhooks',
            'supports_recurring', 'supported_countries', 'supported_currencies',
            'min_amount', 'max_amount', 'processing_fee_percentage', 'processing_fee_fixed',
            'priority', 'success_rate', 'average_processing_time', 'requires_3ds',
            'pci_compliant', 'created_at', 'updated_at', 'last_used',
            'api_key_encrypted', 'secret_key_encrypted', 'webhook_secret_encrypted',
            'config_encrypted', 'fee_summary', 'is_configured'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_used', 'fee_summary', 'is_configured']
    
    def get_fee_summary(self, obj):
        """Get fee summary for common amounts"""
        amounts = [100, 1000, 10000]  # Test amounts
        return {
            str(amount): obj.calculate_fees(amount) for amount in amounts
        }
    
    def get_is_configured(self, obj):
        """Check if gateway is properly configured"""
        return bool(obj.get_api_key() and obj.get_secret_key())

class PaymentMethodSerializer(serializers.ModelSerializer):
    """Serializer for PaymentMethod model"""
    
    # Related field displays
    gateway_name = serializers.CharField(source='gateway.display_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    # Sensitive data (write-only)
    sensitive_data = serializers.JSONField(write_only=True, required=False)
    
    # Display data (read-only)
    masked_details = serializers.SerializerMethodField()
    verification_status_display = serializers.CharField(source='get_verification_status_display', read_only=True)
    
    class Meta:
        model = PaymentMethod
        fields = [
            'id', 'user', 'employee', 'gateway', 'method_type', 'nickname', 'is_default',
            'currency', 'verification_status', 'verification_attempts', 'verification_expires_at',
            'bank_name', 'account_last_four', 'routing_number_last_four', 'phone_number',
            'mobile_provider', 'email', 'wallet_id', 'provider_account_id', 'external_id',
            'is_verified', 'is_active', 'created_at', 'updated_at', 'last_used',
            'gateway_name', 'user_email', 'sensitive_data', 'masked_details',
            'verification_status_display'
        ]
        read_only_fields = [
            'id', 'verification_attempts', 'created_at', 'updated_at', 'last_used',
            'gateway_name', 'user_email', 'masked_details', 'verification_status_display'
        ]
    
    def get_masked_details(self, obj):
        """Get masked/safe display of payment method details"""
        details = {}
        
        if obj.method_type == 'bank_account':
            details.update({
                'bank_name': obj.bank_name,
                'account_last_four': obj.account_last_four,
                'routing_last_four': obj.routing_number_last_four
            })
        elif obj.method_type == 'mobile_money':
            details.update({
                'provider': obj.mobile_provider,
                'phone_masked': f"***-***-{obj.phone_number[-4:]}" if obj.phone_number else None
            })
        elif obj.method_type == 'digital_wallet':
            details.update({
                'email_masked': f"***@{obj.email.split('@')[1]}" if obj.email else None,
                'wallet_id': obj.wallet_id
            })
        
        return details
    
    def create(self, validated_data):
        """Create payment method with encrypted sensitive data"""
        sensitive_data = validated_data.pop('sensitive_data', {})
        payment_method = super().create(validated_data)
        
        if sensitive_data:
            payment_method.encrypt_sensitive_data(sensitive_data)
            payment_method.save()
        
        return payment_method

class TransactionSerializer(serializers.ModelSerializer):
    """Serializer for Transaction model"""
    
    # Related field displays
    user_email = serializers.CharField(source='user.email', read_only=True)
    gateway_name = serializers.CharField(source='gateway.display_name', read_only=True)
    payment_method_nickname = serializers.CharField(source='payment_method.nickname', read_only=True)
    reconciled_by_email = serializers.CharField(source='reconciled_by.email', read_only=True)
    
    # Status displays
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    transaction_type_display = serializers.CharField(source='get_transaction_type_display', read_only=True)
    
    # Calculated fields
    is_expired = serializers.SerializerMethodField()
    can_be_retried = serializers.SerializerMethodField()
    fee_breakdown = serializers.SerializerMethodField()
    
    class Meta:
        model = Transaction
        fields = [
            'id', 'user', 'reference_number', 'external_reference', 'transaction_type',
            'amount', 'currency', 'description', 'priority', 'gross_amount', 'fee_amount',
            'net_amount', 'tax_amount', 'recipient_type', 'recipient_id', 'recipient_name',
            'recipient_email', 'recipient_phone', 'payment_method', 'gateway', 'status',
            'status_reason', 'error_message', 'error_code', 'retry_count', 'max_retries',
            'next_retry_at', 'gateway_transaction_id', 'gateway_reference', 'gateway_response',
            'webhook_received', 'webhook_processed_at', 'source_currency', 'target_currency',
            'exchange_rate', 'exchange_rate_source', 'converted_amount', 'created_at',
            'updated_at', 'initiated_at', 'processed_at', 'completed_at', 'expires_at',
            'client_ip', 'user_agent', 'fraud_score', 'metadata', 'tags', 'reconciled',
            'reconciled_at', 'reconciled_by', 'user_email', 'gateway_name',
            'payment_method_nickname', 'reconciled_by_email', 'status_display',
            'transaction_type_display', 'is_expired', 'can_be_retried', 'fee_breakdown'
        ]
        read_only_fields = [
            'id', 'reference_number', 'net_amount', 'created_at', 'updated_at',
            'initiated_at', 'processed_at', 'completed_at', 'webhook_received',
            'webhook_processed_at', 'user_email', 'gateway_name', 'payment_method_nickname',
            'reconciled_by_email', 'status_display', 'transaction_type_display',
            'is_expired', 'can_be_retried', 'fee_breakdown'
        ]
    
    def get_is_expired(self, obj):
        """Check if transaction has expired"""
        return obj.is_expired()
    
    def get_can_be_retried(self, obj):
        """Check if transaction can be retried"""
        return obj.can_be_retried()
    
    def get_fee_breakdown(self, obj):
        """Get detailed fee breakdown"""
        if obj.gateway:
            return obj.calculate_fees()
        return None

class WebhookEventSerializer(serializers.ModelSerializer):
    """Serializer for WebhookEvent model"""
    
    gateway_name = serializers.CharField(source='gateway.display_name', read_only=True)
    transaction_reference = serializers.CharField(source='transaction.reference_number', read_only=True)
    
    class Meta:
        model = WebhookEvent
        fields = [
            'id', 'gateway', 'event_type', 'event_id', 'payload', 'headers', 'signature',
            'processed', 'processing_attempts', 'transaction', 'verified', 'verification_error',
            'source_ip', 'created_at', 'processed_at', 'processing_error', 'gateway_name',
            'transaction_reference'
        ]
        read_only_fields = [
            'id', 'created_at', 'processed_at', 'gateway_name', 'transaction_reference'
        ]

class PaymentAuditLogSerializer(serializers.ModelSerializer):
    """Serializer for PaymentAuditLog model"""
    
    user_email = serializers.CharField(source='user.email', read_only=True)
    gateway_name = serializers.CharField(source='gateway.display_name', read_only=True)
    transaction_reference = serializers.CharField(source='transaction.reference_number', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    risk_level_display = serializers.CharField(source='get_risk_level_display', read_only=True)
    
    class Meta:
        model = PaymentAuditLog
        fields = [
            'id', 'user', 'action', 'description', 'risk_level', 'gateway', 'transaction',
            'payment_method', 'ip_address', 'user_agent', 'request_id', 'metadata',
            'created_at', 'user_email', 'gateway_name', 'transaction_reference',
            'action_display', 'risk_level_display'
        ]
        read_only_fields = [
            'id', 'created_at', 'user_email', 'gateway_name', 'transaction_reference',
            'action_display', 'risk_level_display'
        ]

class PaymentReconciliationSerializer(serializers.ModelSerializer):
    """Serializer for PaymentReconciliation model"""
    
    transaction_reference = serializers.CharField(source='transaction.reference_number', read_only=True)
    reconciled_by_email = serializers.CharField(source='reconciled_by.email', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = PaymentReconciliation
        fields = [
            'id', 'period_start', 'period_end', 'transaction', 'bank_reference', 'status',
            'matched_amount', 'variance_amount', 'variance_reason', 'reconciled_by',
            'reconciled_at', 'notes', 'created_at', 'updated_at', 'transaction_reference',
            'reconciled_by_email', 'status_display'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'transaction_reference',
            'reconciled_by_email', 'status_display'
        ]

class PaymentConfigurationSerializer(serializers.ModelSerializer):
    """Serializer for PaymentConfiguration model"""
    
    default_gateway_name = serializers.CharField(source='default_gateway.display_name', read_only=True)
    fallback_gateway_name = serializers.CharField(source='fallback_gateway.display_name', read_only=True)
    
    class Meta:
        model = PaymentConfiguration
        fields = [
            'id', 'default_gateway', 'fallback_gateway', 'auto_retry_failed',
            'max_retry_attempts', 'retry_delay_minutes', 'require_3ds',
            'fraud_detection_enabled', 'webhook_verification_required',
            'notify_on_success', 'notify_on_failure', 'notification_email',
            'daily_transaction_limit', 'monthly_transaction_limit',
            'single_transaction_limit', 'custom_settings', 'created_at',
            'updated_at', 'default_gateway_name', 'fallback_gateway_name'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'default_gateway_name',
            'fallback_gateway_name'
        ]

# Summary serializers for dashboard/reporting
class TransactionSummarySerializer(serializers.Serializer):
    """Summary statistics for transactions"""
    
    total_count = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    successful_count = serializers.IntegerField()
    successful_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    failed_count = serializers.IntegerField()
    failed_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    pending_count = serializers.IntegerField()
    pending_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_fees = serializers.DecimalField(max_digits=15, decimal_places=2)
    average_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    success_rate = serializers.DecimalField(max_digits=5, decimal_places=2)

class GatewaySummarySerializer(serializers.Serializer):
    """Summary statistics for payment gateways"""
    
    gateway_id = serializers.UUIDField()
    gateway_name = serializers.CharField()
    transaction_count = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    success_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    average_processing_time = serializers.IntegerField()
    total_fees = serializers.DecimalField(max_digits=15, decimal_places=2)

# Request/Response serializers for API endpoints
class ProcessPaymentRequestSerializer(serializers.Serializer):
    """Request serializer for processing payments"""
    
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=0.01)
    currency = serializers.CharField(max_length=3)
    description = serializers.CharField(max_length=255, required=False)
    payment_method_id = serializers.UUIDField(required=False)
    gateway_id = serializers.UUIDField(required=False)
    recipient_email = serializers.EmailField(required=False)
    recipient_phone = serializers.CharField(max_length=20, required=False)
    metadata = serializers.JSONField(required=False, default=dict)
    priority = serializers.ChoiceField(
        choices=['low', 'normal', 'high', 'urgent'],
        default='normal'
    )

class ProcessPaymentResponseSerializer(serializers.Serializer):
    """Response serializer for payment processing"""
    
    success = serializers.BooleanField()
    transaction_id = serializers.UUIDField()
    gateway_transaction_id = serializers.CharField(required=False)
    status = serializers.CharField()
    message = serializers.CharField()
    requires_action = serializers.BooleanField(default=False)
    action_data = serializers.JSONField(required=False, default=dict)
    fee_breakdown = serializers.JSONField(required=False)
    estimated_completion = serializers.DateTimeField(required=False)

class AddPaymentMethodRequestSerializer(serializers.Serializer):
    """Request serializer for adding payment methods"""
    
    gateway_id = serializers.UUIDField()
    method_type = serializers.ChoiceField(choices=[
        'bank_account', 'mobile_money', 'card', 'digital_wallet', 'ach', 'wire', 'check'
    ])
    nickname = serializers.CharField(max_length=100, required=False)
    currency = serializers.CharField(max_length=3, default='USD')
    method_data = serializers.JSONField()
    is_default = serializers.BooleanField(default=False)

class WebhookProcessingResponseSerializer(serializers.Serializer):
    """Response serializer for webhook processing"""
    
    success = serializers.BooleanField()
    event_id = serializers.CharField()
    processed = serializers.BooleanField()
    message = serializers.CharField()
    transaction_updated = serializers.BooleanField(default=False)
    transaction_id = serializers.UUIDField(required=False)

# QR Payment Transaction Serializers
class QRPaymentTransactionSerializer(serializers.ModelSerializer):
    """Serializer for QRPaymentTransaction model"""
    
    # Related field displays
    user_email = serializers.CharField(source='user.email', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    # Calculated fields
    is_expired = serializers.SerializerMethodField()
    time_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = QRPaymentTransaction
        fields = [
            'id', 'transaction_id', 'business_id', 'business_name', 'user', 'amount',
            'currency', 'tax', 'subtotal', 'status', 'items', 'created_at',
            'updated_at', 'expires_at', 'completed_at', 'stripe_payment_intent_id',
            'gateway_transaction_id', 'gateway_response', 'customer_name',
            'customer_email', 'customer_phone', 'metadata', 'user_email',
            'status_display', 'is_expired', 'time_remaining'
        ]
        read_only_fields = [
            'id', 'transaction_id', 'created_at', 'updated_at', 'completed_at',
            'gateway_transaction_id', 'gateway_response', 'user_email',
            'status_display', 'is_expired', 'time_remaining'
        ]
    
    def get_is_expired(self, obj):
        """Check if transaction has expired"""
        return obj.is_expired()
    
    def get_time_remaining(self, obj):
        """Get remaining time in seconds until expiry"""
        from django.utils import timezone
        if obj.is_expired():
            return 0
        remaining = obj.expires_at - timezone.now()
        return int(remaining.total_seconds()) if remaining.total_seconds() > 0 else 0

class CreateQRPaymentRequestSerializer(serializers.Serializer):
    """Request serializer for creating QR payment transactions"""
    
    business_id = serializers.UUIDField()
    business_name = serializers.CharField(max_length=255)
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=0.01)
    currency = serializers.CharField(max_length=3, default='USD')
    tax = serializers.DecimalField(max_digits=15, decimal_places=2, default=0, min_value=0)
    subtotal = serializers.DecimalField(max_digits=15, decimal_places=2, min_value=0)
    items = serializers.ListField(
        child=serializers.DictField(),
        help_text="List of items with name, quantity, price"
    )
    metadata = serializers.JSONField(required=False, default=dict)

class CreateQRPaymentResponseSerializer(serializers.Serializer):
    """Response serializer for QR payment creation"""
    
    success = serializers.BooleanField()
    transaction_id = serializers.CharField()
    qr_transaction_id = serializers.UUIDField()
    expires_at = serializers.DateTimeField()
    time_remaining = serializers.IntegerField(help_text="Seconds until expiry")
    message = serializers.CharField()

class QRPaymentStatusSerializer(serializers.Serializer):
    """Serializer for QR payment status response"""
    
    success = serializers.BooleanField()
    transaction_id = serializers.CharField()
    status = serializers.CharField()
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    currency = serializers.CharField(max_length=3)
    business_name = serializers.CharField(max_length=255)
    is_expired = serializers.BooleanField()
    time_remaining = serializers.IntegerField(help_text="Seconds until expiry")
    completed_at = serializers.DateTimeField(required=False, allow_null=True)
    customer_name = serializers.CharField(required=False, allow_null=True)
    items = serializers.ListField(child=serializers.DictField())
    message = serializers.CharField()

class CompleteQRPaymentRequestSerializer(serializers.Serializer):
    """Request serializer for completing QR payment"""
    
    transaction_id = serializers.CharField(max_length=100)
    customer_name = serializers.CharField(max_length=255, required=False)
    customer_email = serializers.EmailField(required=False)
    customer_phone = serializers.CharField(max_length=20, required=False)
    payment_method = serializers.CharField(max_length=50, default='mobile_app')
    metadata = serializers.JSONField(required=False, default=dict)

class CompleteQRPaymentResponseSerializer(serializers.Serializer):
    """Response serializer for QR payment completion"""
    
    success = serializers.BooleanField()
    transaction_id = serializers.CharField()
    status = serializers.CharField()
    amount = serializers.DecimalField(max_digits=15, decimal_places=2)
    currency = serializers.CharField(max_length=3)
    business_name = serializers.CharField(max_length=255)
    completed_at = serializers.DateTimeField()
    receipt_url = serializers.URLField(required=False)
    message = serializers.CharField()
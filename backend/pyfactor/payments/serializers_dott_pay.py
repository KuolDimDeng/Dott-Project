"""
Dott Pay QR Payment System Serializers
"""
from rest_framework import serializers
from .models_dott_pay import DottPayProfile, DottPayTransaction, DottPaySecurityLog
from .models import PaymentMethod
from .serializers import PaymentMethodSerializer

class DottPayProfileSerializer(serializers.ModelSerializer):
    """Serializer for Dott Pay Profile"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    default_payment_method_details = PaymentMethodSerializer(
        source='default_payment_method', 
        read_only=True
    )
    available_payment_methods = serializers.SerializerMethodField()
    qr_code = serializers.CharField(source='qr_code_encrypted', read_only=True)
    daily_remaining = serializers.SerializerMethodField()
    
    class Meta:
        model = DottPayProfile
        fields = [
            'id',
            'user_email',
            'qr_code_id',
            'qr_code',
            'qr_code_version',
            'is_active',
            'is_suspended',
            'daily_limit',
            'single_transaction_limit',
            'daily_spent',
            'daily_remaining',
            'auto_approve_under',
            'default_payment_method',
            'default_payment_method_details',
            'available_payment_methods',
            'total_transactions',
            'total_amount_spent',
            'last_transaction_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'qr_code_id',
            'qr_code_encrypted',
            'daily_spent',
            'total_transactions',
            'total_amount_spent',
            'last_transaction_at',
            'created_at',
            'updated_at',
        ]
    
    def get_available_payment_methods(self, obj):
        """Get all payment methods available for the user"""
        payment_methods = PaymentMethod.objects.filter(
            user=obj.user,
            tenant_id=obj.tenant_id,
            verification_status='verified'
        )
        return PaymentMethodSerializer(payment_methods, many=True).data
    
    def get_daily_remaining(self, obj):
        """Calculate remaining daily limit"""
        obj.reset_daily_limit()
        return str(obj.daily_limit - obj.daily_spent)


class DottPayQRCodeSerializer(serializers.Serializer):
    """Serializer for QR code generation response"""
    qr_code = serializers.CharField()
    qr_code_id = serializers.UUIDField()
    version = serializers.CharField()
    limits = serializers.DictField()


class DottPayTransactionSerializer(serializers.ModelSerializer):
    """Serializer for Dott Pay Transaction"""
    consumer_email = serializers.EmailField(source='consumer_profile.user.email', read_only=True)
    merchant_email = serializers.EmailField(source='merchant_user.email', read_only=True)
    payment_method_type = serializers.CharField(source='payment_method.method_type', read_only=True)
    payment_method_nickname = serializers.CharField(source='payment_method.nickname', read_only=True)
    
    class Meta:
        model = DottPayTransaction
        fields = [
            'id',
            'transaction_id',
            'consumer_email',
            'merchant_email',
            'amount',
            'currency',
            'status',
            'payment_method_type',
            'payment_method_nickname',
            'platform_fee',
            'gateway_fee',
            'net_amount',
            'approval_required',
            'notes',
            'created_at',
            'completed_at',
        ]
        read_only_fields = [
            'id',
            'transaction_id',
            'platform_fee',
            'gateway_fee',
            'net_amount',
            'created_at',
            'completed_at',
        ]


class DottPayProcessPaymentSerializer(serializers.Serializer):
    """Serializer for processing Dott Pay payment"""
    qr_data = serializers.CharField(required=True)
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, required=True)
    currency = serializers.CharField(default='USD', max_length=3)
    pos_transaction_id = serializers.UUIDField(required=False, allow_null=True)
    notes = serializers.CharField(required=False, allow_blank=True)
    location = serializers.DictField(required=False, default=dict)
    
    def validate_amount(self, value):
        """Validate amount is positive"""
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive")
        return value


class DottPaySecurityLogSerializer(serializers.ModelSerializer):
    """Serializer for security logs"""
    profile_email = serializers.EmailField(source='profile.user.email', read_only=True)
    
    class Meta:
        model = DottPaySecurityLog
        fields = [
            'id',
            'profile_email',
            'event_type',
            'transaction',
            'ip_address',
            'location',
            'risk_score',
            'is_flagged',
            'event_data',
            'created_at',
        ]
        read_only_fields = '__all__'


class DottPayLimitsUpdateSerializer(serializers.Serializer):
    """Serializer for updating Dott Pay limits"""
    daily_limit = serializers.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        required=False,
        min_value=0
    )
    single_transaction_limit = serializers.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        required=False,
        min_value=0
    )
    auto_approve_under = serializers.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        required=False,
        min_value=0
    )
    
    def validate(self, data):
        """Ensure single transaction limit doesn't exceed daily limit"""
        if 'single_transaction_limit' in data and 'daily_limit' in data:
            if data['single_transaction_limit'] > data['daily_limit']:
                raise serializers.ValidationError(
                    "Single transaction limit cannot exceed daily limit"
                )
        return data
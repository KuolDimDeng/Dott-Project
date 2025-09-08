"""
Dual QR System Serializers
"""
from rest_framework import serializers
from .models_dual_qr import (
    MerchantProfile, DynamicQR, UniversalQR,
    P2PTransaction, QRSafetyLog
)
from django.contrib.auth import get_user_model

User = get_user_model()

class MerchantProfileSerializer(serializers.ModelSerializer):
    """Serializer for Merchant Profile (Receive QR)"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    static_qr = serializers.CharField(source='static_qr_code', read_only=True)
    daily_remaining = serializers.SerializerMethodField()
    is_premium_active = serializers.SerializerMethodField()
    
    class Meta:
        model = MerchantProfile
        fields = [
            'id',
            'merchant_id',
            'merchant_name',
            'merchant_type',
            'business_category',
            'user_email',
            'receive_qr_id',
            'static_qr',
            'static_qr_color',
            'qr_display_mode',
            'settlement_method',
            'is_premium',
            'is_premium_active',
            'daily_receive_limit',
            'single_receive_limit',
            'daily_received',
            'daily_remaining',
            'total_received',
            'total_transactions_received',
            'average_transaction_value',
            'is_active',
            'is_verified',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'merchant_id',
            'receive_qr_id',
            'static_qr_code',
            'daily_received',
            'total_received',
            'total_transactions_received',
            'average_transaction_value',
            'created_at',
            'updated_at',
        ]
    
    def get_daily_remaining(self, obj):
        """Calculate remaining daily receive limit"""
        obj.reset_daily_limit()
        return str(obj.daily_receive_limit - obj.daily_received)
    
    def get_is_premium_active(self, obj):
        """Check if premium is currently active"""
        if not obj.is_premium:
            return False
        if obj.premium_expires_at:
            from django.utils import timezone
            return obj.premium_expires_at > timezone.now()
        return True


class DynamicQRSerializer(serializers.ModelSerializer):
    """Serializer for Dynamic QR codes"""
    merchant_name = serializers.CharField(source='merchant_profile.merchant_name', read_only=True)
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = DynamicQR
        fields = [
            'id',
            'merchant_name',
            'qr_data',
            'amount',
            'currency',
            'reference',
            'is_used',
            'is_expired',
            'expires_at',
            'created_at',
        ]
        read_only_fields = ['id', 'qr_data', 'is_used', 'created_at']
    
    def get_is_expired(self, obj):
        """Check if QR has expired"""
        from django.utils import timezone
        return timezone.now() > obj.expires_at


class UniversalQRSerializer(serializers.ModelSerializer):
    """Serializer for Universal QR codes"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    color_hex = serializers.CharField(source='qr_color', read_only=True)
    type_display = serializers.CharField(source='get_qr_type_display', read_only=True)
    
    class Meta:
        model = UniversalQR
        fields = [
            'id',
            'user_email',
            'qr_type',
            'type_display',
            'qr_data',
            'qr_color',
            'color_hex',
            'is_active',
            'scan_count',
            'last_scanned_at',
            'amount',
            'reference',
            'expires_at',
            'created_at',
        ]
        read_only_fields = [
            'id',
            'qr_color',
            'scan_count',
            'last_scanned_at',
            'created_at',
        ]


class P2PTransactionSerializer(serializers.ModelSerializer):
    """Serializer for P2P Transactions"""
    sender_email = serializers.EmailField(source='sender.email', read_only=True)
    receiver_email = serializers.EmailField(source='receiver.email', read_only=True)
    sender_name = serializers.SerializerMethodField()
    receiver_name = serializers.SerializerMethodField()
    
    class Meta:
        model = P2PTransaction
        fields = [
            'id',
            'transaction_id',
            'sender_email',
            'sender_name',
            'receiver_email',
            'receiver_name',
            'sender_qr_type',
            'receiver_qr_type',
            'amount',
            'currency',
            'description',
            'status',
            'platform_fee',
            'net_amount',
            'created_at',
            'completed_at',
        ]
        read_only_fields = [
            'id',
            'transaction_id',
            'platform_fee',
            'net_amount',
            'created_at',
            'completed_at',
        ]
    
    def get_sender_name(self, obj):
        """Get sender's display name"""
        if obj.sender.first_name:
            return f"{obj.sender.first_name} {obj.sender.last_name}".strip()
        return obj.sender.email
    
    def get_receiver_name(self, obj):
        """Get receiver's display name"""
        # Try to get merchant name first
        try:
            merchant = MerchantProfile.objects.get(user=obj.receiver)
            return merchant.merchant_name
        except MerchantProfile.DoesNotExist:
            if obj.receiver.first_name:
                return f"{obj.receiver.first_name} {obj.receiver.last_name}".strip()
            return obj.receiver.email


class QRSafetyLogSerializer(serializers.ModelSerializer):
    """Serializer for QR Safety Logs"""
    scanner_email = serializers.EmailField(source='scanner_user.email', read_only=True)
    scanned_email = serializers.EmailField(source='scanned_user.email', read_only=True, allow_null=True)
    error_display = serializers.CharField(source='get_error_type_display', read_only=True)
    
    class Meta:
        model = QRSafetyLog
        fields = [
            'id',
            'scanner_email',
            'scanned_email',
            'error_type',
            'error_display',
            'scanner_qr_type',
            'scanned_qr_type',
            'error_message',
            'was_corrected',
            'correction_action',
            'created_at',
        ]
        read_only_fields = '__all__'


class QRScanRequestSerializer(serializers.Serializer):
    """Serializer for QR scan requests"""
    my_qr_type = serializers.CharField(required=True)
    scanned_qr_data = serializers.CharField(required=True)
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, required=False)
    currency = serializers.CharField(default='USD', max_length=3)
    description = serializers.CharField(required=False, allow_blank=True)
    device_info = serializers.DictField(required=False, default=dict)
    location = serializers.DictField(required=False, default=dict)
    
    def validate_my_qr_type(self, value):
        """Validate QR type"""
        valid_types = [
            'DOTT_PAY', 'DOTT_RECEIVE_STATIC', 'DOTT_RECEIVE_DYNAMIC',
            'DOTT_REQUEST', 'DOTT_SPLIT', 'DOTT_REFUND'
        ]
        if value not in valid_types:
            raise serializers.ValidationError(f"Invalid QR type. Must be one of {valid_types}")
        return value
    
    def validate_amount(self, value):
        """Validate amount if provided"""
        if value is not None and value <= 0:
            raise serializers.ValidationError("Amount must be positive")
        return value


class GenerateDynamicQRSerializer(serializers.Serializer):
    """Serializer for generating dynamic QR"""
    amount = serializers.DecimalField(max_digits=15, decimal_places=2, required=True)
    reference = serializers.CharField(max_length=100, required=False, allow_blank=True)
    expires_minutes = serializers.IntegerField(default=5, min_value=1, max_value=60)
    currency = serializers.CharField(default='USD', max_length=3)
    
    def validate_amount(self, value):
        """Validate amount"""
        if value <= 0:
            raise serializers.ValidationError("Amount must be positive")
        return value


class QRColorRuleSerializer(serializers.Serializer):
    """Serializer for QR color rules education"""
    rule = serializers.CharField()
    color = serializers.CharField()
    color_name = serializers.CharField()
    purpose = serializers.CharField()
    icon = serializers.CharField()
    remember = serializers.CharField()


class SettlementConfigSerializer(serializers.Serializer):
    """Serializer for settlement configuration"""
    settlement_method = serializers.ChoiceField(
        choices=['instant', 'daily', 'weekly', 'manual']
    )
    bank_account_id = serializers.UUIDField(required=False, allow_null=True)
    mpesa_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    mtn_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    minimum_settlement_amount = serializers.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        default=10.00,
        min_value=1.00
    )
    
    def validate(self, data):
        """Ensure at least one settlement method is configured"""
        if not any([
            data.get('bank_account_id'),
            data.get('mpesa_number'),
            data.get('mtn_number')
        ]):
            raise serializers.ValidationError(
                "At least one settlement destination must be configured"
            )
        return data
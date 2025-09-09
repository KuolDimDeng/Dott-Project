"""
Mobile Money Wallet Serializers
"""
from rest_framework import serializers
from .models_mobile_money import MobileMoneyProvider
from .models_wallet import (
    MobileMoneyWallet,
    WalletTransaction,
    WalletTransferRequest,
    WalletTopUp
)


class MobileMoneyProviderSerializer(serializers.ModelSerializer):
    class Meta:
        model = MobileMoneyProvider
        fields = [
            'id', 'name', 'is_active', 'supported_countries', 'supported_currencies',
            'min_amount', 'max_amount', 'transaction_fee_percentage', 'transaction_fee_fixed'
        ]


class MobileMoneyWalletSerializer(serializers.ModelSerializer):
    provider_name = serializers.CharField(source='provider.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = MobileMoneyWallet
        fields = [
            'id', 'user_email', 'provider', 'provider_name',
            'phone_number', 'balance', 'available_balance', 'pending_balance',
            'verification_status', 'verified_at',
            'daily_limit', 'monthly_limit', 'daily_spent', 'monthly_spent',
            'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'balance', 'available_balance', 'pending_balance',
            'daily_spent', 'monthly_spent', 'created_at', 'updated_at'
        ]


class WalletTransactionSerializer(serializers.ModelSerializer):
    wallet_owner = serializers.CharField(source='wallet.user.email', read_only=True)
    
    class Meta:
        model = WalletTransaction
        fields = [
            'id', 'wallet_owner', 'transaction_type', 'amount', 'fee',
            'balance_before', 'balance_after', 'reference', 'external_reference',
            'description', 'recipient_phone', 'recipient_name',
            'sender_phone', 'sender_name', 'status', 'failure_reason',
            'metadata', 'created_at', 'completed_at'
        ]


class WalletTransferRequestSerializer(serializers.ModelSerializer):
    requester_email = serializers.CharField(source='requester.email', read_only=True)
    requester_phone = serializers.CharField(source='requester.profile.phone_number', read_only=True)
    recipient_email = serializers.CharField(source='recipient_user.email', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = WalletTransferRequest
        fields = [
            'id', 'requester', 'requester_email', 'requester_phone',
            'recipient_phone', 'recipient_user', 'recipient_email',
            'amount', 'currency', 'description', 'status',
            'expires_at', 'is_expired', 'responded_at', 'response_message',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'requester', 'status', 'responded_at',
            'created_at', 'updated_at'
        ]


class WalletTopUpSerializer(serializers.ModelSerializer):
    wallet_owner = serializers.CharField(source='wallet.user.email', read_only=True)
    provider_name = serializers.CharField(source='wallet.provider.name', read_only=True)
    
    class Meta:
        model = WalletTopUp
        fields = [
            'id', 'wallet', 'wallet_owner', 'provider_name',
            'amount', 'currency', 'stripe_payment_intent_id',
            'stripe_fee', 'platform_fee', 'total_fee',
            'status', 'failure_reason', 'created_at', 'completed_at'
        ]
        read_only_fields = [
            'id', 'stripe_payment_intent_id', 'stripe_fee',
            'platform_fee', 'total_fee', 'created_at', 'completed_at'
        ]

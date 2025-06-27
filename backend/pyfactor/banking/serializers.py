#/Users/kuoldeng/projectx/backend/pyfactor/banking/serializers.py
from rest_framework import serializers
from .models import BankAccount, BankTransaction, BankingRule, BankingAuditLog

class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = ['id', 'bank_name', 'account_number', 'balance', 'account_type', 'last_synced']
        read_only_fields = ['id', 'last_synced']

class BankTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankTransaction
        fields = [
            'id', 'account', 'amount', 'transaction_type', 'description',
            'date', 'is_reconciled', 'reference_number', 'merchant_name',
            'category', 'import_id', 'import_batch', 'imported_at'
        ]
        read_only_fields = ['id', 'import_id', 'import_batch', 'imported_at']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['amount'] = float(representation['amount'])
        return representation

class BankingRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankingRule
        fields = [
            'id', 'name', 'is_active', 'condition_type', 'condition_field',
            'condition_value', 'category', 'tags', 'times_used', 'last_used',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'times_used', 'last_used', 'created_at', 'updated_at']

class BankingAuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankingAuditLog
        fields = [
            'id', 'user', 'action', 'ip_address', 'user_agent',
            'affected_records', 'details', 'status', 'error_message',
            'started_at', 'completed_at', 'duration_ms'
        ]
        read_only_fields = ['id', 'started_at']
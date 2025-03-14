#/Users/kuoldeng/projectx/backend/pyfactor/banking/serializers.py
from rest_framework import serializers
# Temporarily commented out to break circular dependency
# from .models import BankAccount, BankTransaction

# Placeholder serializers
class BankAccountSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    account_number = serializers.CharField(max_length=255)
    bank_name = serializers.CharField(max_length=255)
    balance = serializers.DecimalField(max_digits=10, decimal_places=2)
    last_synced = serializers.DateTimeField()

class BankTransactionSerializer(serializers.Serializer):
    id = serializers.UUIDField(read_only=True)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    transaction_type = serializers.CharField(max_length=6)
    description = serializers.CharField(max_length=255)
    date = serializers.DateTimeField()
    is_reconciled = serializers.BooleanField()

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['amount'] = float(representation['amount'])
        return representation
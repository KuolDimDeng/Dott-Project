#/Users/kuoldeng/projectx/backend/pyfactor/banking/serializers.py
from rest_framework import serializers
from .models import BankAccount, BankTransaction

class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = ['id', 'account_number', 'bank_name', 'balance', 'last_synced']

class BankTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankTransaction
        fields = ['id', 'amount', 'transaction_type', 'description', 'date', 'is_reconciled']

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['amount'] = float(representation['amount'])
        return representation
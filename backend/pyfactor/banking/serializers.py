from rest_framework import serializers
from .models import BankAccount, BankTransaction

class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = ['id', 'account_number', 'bank_name', 'balance', 'last_synced']

class BankTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankTransaction
        fields = ['id', 'account', 'amount', 'transaction_type', 'description', 'date', 'is_reconciled']
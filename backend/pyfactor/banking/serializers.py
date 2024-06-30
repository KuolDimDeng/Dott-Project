from rest_framework import serializers
from .models import BankAccount, Transaction

class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = ['id', 'account_number', 'bank_name', 'balance', 'last_synced']

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'account', 'amount', 'transaction_type', 'description', 'date', 'is_reconciled']
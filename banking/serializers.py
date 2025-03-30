from rest_framework import serializers
from .models import BankAccount, BankTransaction, PlaidItem, TinkItem

class BankAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankAccount
        fields = [
            'id', 'name', 'account_number', 'account_type', 
            'balance', 'currency', 'is_active', 'created_at', 
            'updated_at', 'user'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class BankTransactionSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    
    class Meta:
        model = BankTransaction
        fields = [
            'id', 'account', 'account_name', 'amount', 'description',
            'transaction_date', 'transaction_type', 'category',
            'reference', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'account_name']

class PlaidItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlaidItem
        fields = [
            'id', 'item_id', 'institution_id', 'user',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'access_token': {'write_only': True}  # Don't expose tokens in API
        }

class TinkItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = TinkItem
        fields = [
            'id', 'item_id', 'user', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
        extra_kwargs = {
            'access_token': {'write_only': True},  # Don't expose tokens in API
            'refresh_token': {'write_only': True}  # Don't expose tokens in API
        } 
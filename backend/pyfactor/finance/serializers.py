#/Users/kuoldeng/projectx/backend/pyfactor/finance/serializers.py
from rest_framework import serializers
from .models import AccountType, Account, Transaction, Income, RevenueAccount, CashAccount
from dateutil import parser
from rest_framework.exceptions import ValidationError
import re
import logging

logger = logging.getLogger(__name__)

class AccountTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountType
        fields = ['id', 'name']

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ['id', 'account_number', 'name', 'account_type']

class TransactionSerializer(serializers.ModelSerializer):
    account = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all())

    class Meta:
        model = Transaction
        fields = ['id', 'date', 'description', 'account', 'type', 'amount', 'notes', 'receipt']

    def create(self, validated_data):
        logger.debug('TransactionSerializer - Create')
        logger.debug('Validated Data: %s', validated_data)
        try:
            transaction = Transaction.objects.create(**validated_data)
            logger.debug('Transaction created: %s', transaction)
            return transaction
        except Exception as e:
            logger.error('Error creating transaction: %s', str(e))
            raise

    def to_internal_value(self, data):
        logger.debug('TransactionSerializer - to_internal_value')
        logger.debug('Data: %s', data)

        date_str = data.get('date')
        if date_str:
            try:
                data['date'] = parser.parse(date_str).date()
            except (ValueError, TypeError) as e:
                raise ValidationError({'date': 'Invalid date format'}) from e

        return super().to_internal_value(data)

    def to_representation(self, instance):
        logger.debug('TransactionSerializer - to_representation')
        logger.debug('Instance: %s', instance)
        return super().to_representation(instance)

    def validate(self, data):
        logger.debug('TransactionSerializer - Validate')
        logger.debug('Data: %s', data)
        validated_data = super().validate(data)
        logger.debug('Validated data: %s', validated_data)
        return validated_data

class IncomeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Income
        fields = ['id', 'transaction']

class RevenueAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = RevenueAccount
        fields = ['id', 'date', 'credit', 'debit', 'amount', 'type', 'description', 'note', 'account_type', 'transaction']

class CashAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashAccount
        fields = '__all__'


class TransactionListSerializer(serializers.ModelSerializer):
    account = AccountSerializer()

    class Meta:
        model = Transaction
        fields = ['id', 'date', 'description', 'account', 'type', 'amount', 'notes', 'receipt']

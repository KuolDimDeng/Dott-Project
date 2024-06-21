from rest_framework import serializers
from .models import AccountType, Account, SalesTaxAccount, Transaction, Income, RevenueAccount, CashAccount
from dateutil import parser
from rest_framework.exceptions import ValidationError
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
    class Meta:
        model = Transaction
        fields = ['id', 'date', 'description', 'account', 'type', 'amount', 'notes', 'receipt']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"TransactionSerializer initialized with database_name: {self.database_name}")
        if self.database_name:
            self.fields['account'].queryset = Account.objects.using(self.database_name).all()
        else:
            logger.warning("TransactionSerializer initialized without a database_name")

    def validate_account(self, value):
        logger.debug(f"Validating account: {value} in database: {self.database_name or 'default'}")
        if self.database_name:
            account_exists = Account.objects.using(self.database_name).filter(pk=value).exists()
        else:
            account_exists = Account.objects.filter(pk=value).exists()
        
        logger.debug(f"Account exists: {account_exists}")
        
        if not account_exists:
            logger.error(f"Invalid account ID {value} - object does not exist in database {self.database_name or 'default'}.")
            raise serializers.ValidationError(f"Invalid account ID {value} - object does not exist in database {self.database_name or 'default'}.")
        
        return value

    def create(self, validated_data):
        logger.debug(f"Creating transaction in database: {self.database_name}")
        return Transaction.objects.using(self.database_name).create(**validated_data)
    
    def to_representation(self, instance):
        database_name = self.context.get('database_name')
        if database_name:
            instance.account = Account.objects.using(database_name).get(pk=instance.account.pk)
        return super().to_representation(instance)
        
class IncomeSerializer(serializers.ModelSerializer):
    transaction = TransactionSerializer()

    class Meta:
        model = Income
        fields = ['id', 'transaction']
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"{self.__class__.__name__} initialized with database_name: {self.database_name}")


    def create(self, validated_data):
        logger.debug(f"TransactionSerializer create method called with validated_data: {validated_data}")
        database_name = self.context.get('database_name') or 'default'
        return Transaction.objects.using(database_name).create(**validated_data)

class RevenueAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = RevenueAccount
        fields = ['id', 'date', 'credit', 'debit', 'amount', 'type', 'description', 'note', 'account_type', 'transaction']
    
        def __init__(self, *args, **kwargs):
            super().__init__(*args, **kwargs)
            self.database_name = self.context.get('database_name')
            logger.debug(f"{self.__class__.__name__} initialized with database_name: {self.database_name}")

    def create(self, validated_data):
        if self.context.get('database_name'):
            return RevenueAccount.objects.using(self.context['database_name']).create(**validated_data)
        return RevenueAccount.objects.create(**validated_data)

class CashAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = CashAccount
        fields = '__all__'
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"{self.__class__.__name__} initialized with database_name: {self.database_name}")

    def create(self, validated_data):
        if self.context.get('database_name'):
            return CashAccount.objects.using(self.context['database_name']).create(**validated_data)
        return CashAccount.objects.create(**validated_data)

class TransactionListSerializer(serializers.ModelSerializer):
    account = AccountSerializer()

    class Meta:
        model = Transaction
        fields = ['id', 'date', 'description', 'account', 'type', 'amount', 'notes', 'receipt']
        
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"{self.__class__.__name__} initialized with database_name: {self.database_name}")
        
class SalesTaxAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesTaxAccount
        fields = '__all__'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"{self.__class__.__name__} initialized with database_name: {self.database_name}")

    def create(self, validated_data):
        if self.context.get('database_name'):
            return SalesTaxAccount.objects.using(self.context['database_name']).create(**validated_data)
        return SalesTaxAccount.objects.create(**validated_data)
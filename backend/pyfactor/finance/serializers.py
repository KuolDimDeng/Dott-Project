from rest_framework import serializers
from .models import AccountType, Account, SalesTaxAccount, Transaction, Income, RevenueAccount, CashAccount
from dateutil import parser
from sales.serializers import TransactionSerializer
from rest_framework.exceptions import ValidationError
from pyfactor.logging_config import get_logger  # Change this line


logger = get_logger()

class AccountTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountType
        fields = ['id', 'name']

class AccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = Account
        fields = ['id', 'account_number', 'name', 'account_type']


            
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
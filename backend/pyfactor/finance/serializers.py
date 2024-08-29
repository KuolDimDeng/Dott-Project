#/Users/kuoldeng/projectx/backend/pyfactor/finance/serializers.py
from rest_framework import serializers
from .models import AccountCategory, AccountType, Account, ChartOfAccount, SalesTaxAccount, FinanceTransaction, Income, RevenueAccount, CashAccount
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
    category_name = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = ['id', 'account_number', 'name', 'description', 'category', 'category_name', 'balance', 'is_active']

    def get_category_name(self, obj):
        return obj.account_type.name if obj.account_type else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['description'] = ''  # Add an empty description field
        data['is_active'] = True  # Set is_active to True for all Account instances
        return data
            
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
        return FinanceTransaction.objects.using(database_name).create(**validated_data)

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
        model = FinanceTransaction
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
    
    

class AccountCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = AccountCategory
        fields = ['id', 'name', 'code']

class ChartOfAccountSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)

    class Meta:
        model = ChartOfAccount
        fields = ['id', 'account_number', 'name', 'description', 'category', 'category_name', 'balance', 'is_active', 'parent']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"{self.__class__.__name__} initialized with database_name: {self.database_name}")

    def to_representation(self, instance):
        data = super().to_representation(instance)
        # Add any additional fields or modifications here if needed
        return data
    
    
    def create(self, validated_data):
        database_name = self.context.get('database_name')
        return ChartOfAccount.objects.using(database_name).create(**validated_data)

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save(using=self.context.get('database_name'))
        return instance
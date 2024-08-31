#/Users/kuoldeng/projectx/backend/pyfactor/finance/serializers.py
from rest_framework import serializers
from .models import AccountCategory, AccountReconciliation, AccountType, Account, ChartOfAccount, FinancialStatement, GeneralLedgerEntry, JournalEntry, JournalEntryLine, MonthEndClosing, MonthEndTask, ReconciliationItem, SalesTaxAccount, FinanceTransaction, Income, RevenueAccount, CashAccount
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
    account_type_name = serializers.SerializerMethodField()

    class Meta:
        model = Account
        fields = ['id', 'account_number', 'name', 'description', 'account_type', 'account_type_name', 'balance', 'is_active']

    def get_account_type_name(self, obj):
        return obj.account_type.name if obj.account_type else None

    def to_representation(self, instance):
        data = super().to_representation(instance)
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
    
    def create(self, validated_data):
        return ChartOfAccount.objects.using(self.database_name).create(**validated_data)

    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save(using=self.database_name)
        return instance
    
class JournalEntryLineSerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)

    class Meta:
        model = JournalEntryLine
        fields = ['id', 'account', 'account_name', 'description', 'debit_amount', 'credit_amount']

class JournalEntrySerializer(serializers.ModelSerializer):
    lines = JournalEntryLineSerializer(many=True)

    class Meta:
        model = JournalEntry
        fields = ['id', 'date', 'description', 'is_posted', 'lines']

    def create(self, validated_data):
        lines_data = validated_data.pop('lines')
        journal_entry = JournalEntry.objects.create(**validated_data)
        for line_data in lines_data:
            JournalEntryLine.objects.create(journal_entry=journal_entry, **line_data)
        return journal_entry

    def update(self, instance, validated_data):
        lines_data = validated_data.pop('lines', [])
        instance = super().update(instance, validated_data)
        
        # Update or create lines
        existing_lines = {line.id: line for line in instance.lines.all()}
        for line_data in lines_data:
            line_id = line_data.get('id')
            if line_id:
                line = existing_lines.pop(line_id)
                for attr, value in line_data.items():
                    setattr(line, attr, value)
                line.save()
            else:
                JournalEntryLine.objects.create(journal_entry=instance, **line_data)
        
        # Delete any lines not included in the update
        for line in existing_lines.values():
            line.delete()
        
        return instance
    

class GeneralLedgerEntrySerializer(serializers.ModelSerializer):
    account_name = serializers.CharField(source='account.name', read_only=True)
    account_number = serializers.CharField(source='account.account_number', read_only=True)

    class Meta:
        model = GeneralLedgerEntry
        fields = ['id', 'account', 'account_name', 'account_number', 'date', 'description', 'debit_amount', 'credit_amount', 'balance']

class ReconciliationItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReconciliationItem
        fields = ['id', 'bank_transaction', 'finance_transaction', 'amount', 'is_matched', 'notes']

class AccountReconciliationSerializer(serializers.ModelSerializer):
    items = ReconciliationItemSerializer(many=True, read_only=True)

    class Meta:
        model = AccountReconciliation
        fields = ['id', 'bank_account', 'reconciliation_date', 'statement_balance', 'book_balance', 'is_reconciled', 'notes', 'items']

class MonthEndTaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthEndTask
        fields = ['id', 'name', 'description', 'is_completed', 'completed_at']

class MonthEndClosingSerializer(serializers.ModelSerializer):
    tasks = MonthEndTaskSerializer(many=True, read_only=True)

    class Meta:
        model = MonthEndClosing
        fields = ['id', 'month', 'year', 'status', 'started_at', 'completed_at', 'notes', 'tasks']
        
        
class FinancialStatementSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialStatement
        fields = ['id', 'statement_type', 'date', 'data']
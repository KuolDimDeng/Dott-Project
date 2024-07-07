from django.db import connections, transaction as db_transaction
from rest_framework import serializers
from .utils import get_or_create_account, calculate_due_date
from finance.models import Account, Transaction
from .models import Product, Service, Customer, Bill, Invoice, Vendor, Estimate, SalesOrder, Department, default_due_datetime, EstimateItem, EstimateAttachment
from pyfactor.logging_config import get_logger
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timedelta, date
from dateutil import parser

logger = get_logger()

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'sellEnabled', 'buyEnabled', 'salesTax', 'product_code', 'stock_quantity', 'reorder_level']

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'name', 'description', 'price', 'sellEnabled', 'buyEnabled', 'salesTax', 'service_code', 'duration', 'is_recurring']

class CustomerSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()
    accountNumber = serializers.CharField(read_only=True)

    class Meta:
        model = Customer
        fields = [
            'id', 'customerName', 'first_name', 'last_name', 'email', 'phone',
            'accountNumber', 'website', 'notes', 'currency', 'billingCountry',
            'billingState', 'shipToName', 'shippingCountry', 'shippingState',
            'shippingPhone', 'deliveryInstructions', 'street', 'postcode', 'city', 'display_name'
        ]
        read_only_fields = ['id', 'accountNumber']

    def create(self, validated_data):
        database_name = self.context.get('database_name')
        with db_transaction.atomic(using=database_name):
            customer = Customer.objects.using(database_name).create(**validated_data)
        return customer
    
    def get_display_name(self, obj):
        return f"{obj.customerName} - {obj.accountNumber}"

class BillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bill
        fields = ['id', 'bill_num', 'customer', 'amount', 'created_at']

class TransactionSerializer(serializers.ModelSerializer):
    account = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all())

    class Meta:
        model = Transaction
        fields = ['id', 'date', 'description', 'account', 'type', 'amount', 'notes', 'receipt']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"TransactionSerializer initialized with database_name: {self.database_name}")
        if self.database_name:
            self.fields['account'].queryset = Account.objects.using(self.database_name).all()
            logger.debug(f"Account queryset updated for database: {self.database_name}")

    def create(self, validated_data):
        logger.debug(f"Creating transaction with validated_data: {validated_data}")
        transaction = Transaction.objects.using(self.context['database_name']).create(**validated_data)
        transaction.update_account_balance()
        logger.debug(f"Created transaction: {transaction}")
        return transaction

class DateTimeToDateField(serializers.DateTimeField):
    def to_representation(self, value):
        if value:
            return timezone.localtime(value).date()
        return None

    def to_internal_value(self, value):
        if isinstance(value, date):
            return timezone.make_aware(datetime.combine(value, datetime.min.time()))
        return super().to_internal_value(value)

class InvoiceSerializer(serializers.ModelSerializer):
    transaction = TransactionSerializer(required=False)
    accounts_receivable = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all(), required=False)
    sales_revenue = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all(), required=False)
    sales_tax_payable = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all(), required=False)
    cost_of_goods_sold = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all(), required=False)
    inventory = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all(), required=False)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))
    date = DateTimeToDateField()
    due_date = DateTimeToDateField(required=False)
    created_at = DateTimeToDateField(read_only=True)
    updated_at = DateTimeToDateField(read_only=True)
    customer = serializers.UUIDField()

    class Meta:
        model = Invoice
        fields = ['id', 'invoice_num', 'customer', 'amount', 'date', 'created_at', 'updated_at', 'due_date', 'status', 'transaction', 
                  'accounts_receivable', 'sales_revenue', 'sales_tax_payable', 'cost_of_goods_sold', 'inventory']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"InvoiceSerializer initialized with database_name: {self.database_name}")
        if self.database_name:
            self.fields['transaction'] = TransactionSerializer(required=False, context={'database_name': self.database_name})
            self.fields['accounts_receivable'].queryset = Account.objects.using(self.database_name).all()
            self.fields['sales_revenue'].queryset = Account.objects.using(self.database_name).all()
            self.fields['sales_tax_payable'].queryset = Account.objects.using(self.database_name).all()
            self.fields['cost_of_goods_sold'].queryset = Account.objects.using(self.database_name).all()
            self.fields['inventory'].queryset = Account.objects.using(self.database_name).all()
            logger.debug("Account querysets updated for database")

    def to_internal_value(self, data):
        logger.debug(f"to_internal_value called with data: {data}")
        converted_data = super().to_internal_value(data)
        logger.debug(f"Converted data: {converted_data}")
        return converted_data

    def validate_customer(self, value):
        database_name = self.context.get('database_name')
        try:
            customer = Customer.objects.using(database_name).get(id=value)
            return customer
        except Customer.DoesNotExist:
            raise serializers.ValidationError(f"Customer with id {value} does not exist.")

    def create(self, validated_data):
        logger.debug(f"Creating invoice with validated data: {validated_data}")
        transaction_data = validated_data.pop('transaction', None)
        
        invoice = Invoice(**validated_data)
        invoice.invoice_num = Invoice.generate_invoice_number(invoice.id)
        
        if 'date' in validated_data and 'due_date' not in validated_data:
            validated_data['due_date'] = calculate_due_date(validated_data['date'])

        accounts = {
            'accounts_receivable': get_or_create_account(self.context['database_name'], 'Accounts Receivable', 'Accounts Receivable'),
            'sales_revenue': get_or_create_account(self.context['database_name'], 'Sales Revenue', 'Sales Revenue'),
            'sales_tax_payable': get_or_create_account(self.context['database_name'], 'Sales Tax Payable', 'Sales Tax Payable'),
            'cost_of_goods_sold': get_or_create_account(self.context['database_name'], 'Cost of Goods Sold', 'Cost of Goods Sold'),
            'inventory': get_or_create_account(self.context['database_name'], 'Inventory', 'Inventory')
        }

        for account_field, account in accounts.items():
            setattr(invoice, account_field, account)

        transaction_instance = None
        if transaction_data:
            transaction_serializer = TransactionSerializer(data=transaction_data, context=self.context)
            if transaction_serializer.is_valid():
                transaction_instance = transaction_serializer.save()
                logger.debug(f"Transaction created: {transaction_instance}")
            else:
                logger.error(f"Transaction validation failed: {transaction_serializer.errors}")
                raise serializers.ValidationError(transaction_serializer.errors)

        with db_transaction.atomic(using=self.context['database_name']):
            invoice.transaction = transaction_instance
            invoice.save(using=self.context['database_name'])
            logger.debug(f"Invoice saved: {invoice}")

        return invoice

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ['id', 'vendor_name', 'street', 'postcode', 'city', 'state', 'phone']

class EstimateItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstimateItem
        fields = ['id', 'product', 'service', 'description', 'quantity', 'unit_price']

class EstimateAttachmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstimateAttachment
        fields = ['id', 'file']

class EstimateSerializer(serializers.ModelSerializer):
    items = EstimateItemSerializer(many=True)
    attachments = EstimateAttachmentSerializer(many=True, read_only=True)

    class Meta:
        model = Estimate
        fields = ['id', 'title', 'summary', 'logo', 'customer', 'customer_ref', 'date', 'valid_until',
                  'discount', 'currency', 'footer', 'items', 'attachments']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        estimate = Estimate.objects.create(**validated_data)
        for item_data in items_data:
            EstimateItem.objects.create(estimate=estimate, **item_data)
        return estimate

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        instance = super().update(instance, validated_data)
        
        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                EstimateItem.objects.create(estimate=instance, **item_data)
        
        return instance

class SalesOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesOrder
        fields = ['id', 'order_num', 'customer', 'amount', 'created_at']

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'dept_code', 'dept_name', 'created_at']

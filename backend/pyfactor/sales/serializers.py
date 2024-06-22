from django.db import connections
from rest_framework import serializers
from finance.models import Account, Transaction
from .models import Product, Service, Customer, Bill, Invoice, Vendor, Estimate, SalesOrder, Department
from pyfactor.logging_config import get_logger

logger = get_logger()
class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['id', 'name', 'description', 'price', 'sellEnabled', 'buyEnabled', 'salesTax']

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['id', 'name', 'description', 'price', 'sellEnabled', 'buyEnabled', 'salesTax']

class CustomerSerializer(serializers.ModelSerializer):
    display_name = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id', 'customerName', 'first_name', 'last_name', 'email', 'phone',
            'accountNumber', 'website', 'notes', 'currency', 'billingCountry',
            'billingState', 'shipToName', 'shippingCountry', 'shippingState',
            'shippingPhone', 'deliveryInstructions', 'street', 'postcode', 'city', 'display_name'
        ]
    def create(self, validated_data):
        # Ensure the 'user' field is removed if it somehow gets into validated_data
        validated_data.pop('user', None)
        return super().create(validated_data)
    
    def get_display_name(self, obj):
        return f"{obj.customerName} - {obj.accountNumber}"

class BillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Bill
        fields = ['id', 'bill_num', 'customer', 'amount', 'date_created']

class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Transaction
        fields = ['id', 'date', 'description', 'account', 'type', 'amount', 'notes', 'receipt']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        if self.database_name:
            self.fields['account'].queryset = Account.objects.using(self.database_name).all()

    def create(self, validated_data):
        if self.database_name:
            transaction = Transaction.objects.using(self.database_name).create(**validated_data)
        else:
            transaction = Transaction.objects.create(**validated_data)
        transaction.update_account_balance()
        return transaction

class InvoiceSerializer(serializers.ModelSerializer):
    transaction = TransactionSerializer(required=False)
    accounts_receivable = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all(), required=False)
    sales_revenue = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all(), required=False)
    sales_tax_payable = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all(), required=False)
    cost_of_goods_sold = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all(), required=False)
    inventory = serializers.PrimaryKeyRelatedField(queryset=Account.objects.all(), required=False)

    class Meta:
        model = Invoice
        fields = ['id', 'invoice_num', 'customer', 'amount', 'created_at', 'due_date', 'status', 'transaction', 
                  'accounts_receivable', 'sales_revenue', 'sales_tax_payable', 'cost_of_goods_sold', 'inventory']
        read_only_fields = ['created_at']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        if self.database_name:
            self.fields['transaction'] = TransactionSerializer(required=False, context={'database_name': self.database_name})
            self.fields['accounts_receivable'].queryset = Account.objects.using(self.database_name).all()
            self.fields['sales_revenue'].queryset = Account.objects.using(self.database_name).all()
            self.fields['sales_tax_payable'].queryset = Account.objects.using(self.database_name).all()
            self.fields['cost_of_goods_sold'].queryset = Account.objects.using(self.database_name).all()
            self.fields['inventory'].queryset = Account.objects.using(self.database_name).all()

    def create(self, validated_data):
        transaction_data = validated_data.pop('transaction', None)
        accounts_data = {
            'accounts_receivable': validated_data.pop('accounts_receivable', None),
            'sales_revenue': validated_data.pop('sales_revenue', None),
            'sales_tax_payable': validated_data.pop('sales_tax_payable', None),
            'cost_of_goods_sold': validated_data.pop('cost_of_goods_sold', None),
            'inventory': validated_data.pop('inventory', None),
        }
        
        invoice = Invoice.objects.using(self.database_name).create(**validated_data, **accounts_data)
        
        if transaction_data:
            transaction_serializer = TransactionSerializer(data=transaction_data, context={'database_name': self.database_name})
            if transaction_serializer.is_valid():
                transaction = transaction_serializer.save()
                invoice.transaction = transaction
                invoice.save()
        
        return invoice
    
class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ['id', 'vendor_name', 'street', 'postcode', 'city', 'state', 'phone']

class EstimateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Estimate
        fields = ['id', 'estimate_num', 'customer', 'amount', 'date_created']

class SalesOrderSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalesOrder
        fields = ['id', 'order_num', 'customer', 'amount', 'date_created']

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ['id', 'dept_code', 'product_num', 'date_created', 'dept_name']
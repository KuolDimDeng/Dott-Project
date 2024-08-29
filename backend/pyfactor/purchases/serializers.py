import uuid
from django.db import connections, transaction as db_transaction
from rest_framework import serializers
from sales.models import Product
from sales.serializers import DateTimeToDateField
from sales.utils import get_or_create_account, calculate_due_date
from finance.models import Account, FinanceTransaction
from .models import Bill, BillItem, Expense, Procurement, ProcurementItem, Vendor, PurchaseOrder, PurchaseOrderItem
from pyfactor.logging_config import get_logger
from django.utils import timezone
from decimal import Decimal
from datetime import datetime, timedelta, date
from django.utils.dateparse import parse_date

logger = get_logger()

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ['id', 'vendor_number', 'vendor_name', 'street', 'postcode', 'city', 'state', 'phone']
        read_only_fields = ['id', 'vendor_number']

    def create(self, validated_data):
        database_name = self.context.get('database_name')
        return Vendor.objects.using(database_name).create(**validated_data)

class BillItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = BillItem
        fields = ['category', 'description', 'quantity', 'price', 'tax', 'amount']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"BillItemSerializer initialized with database_name: {self.database_name}")


class BillSerializer(serializers.ModelSerializer):
    items = BillItemSerializer(many=True, read_only=True)
    vendor = serializers.CharField(read_only=True)
    vendor_name = serializers.CharField(source='vendor.vendor_name', read_only=True)
    vendor_id = serializers.UUIDField(write_only=True)
    bill_date = DateTimeToDateField()
    due_date = DateTimeToDateField(required=False)
    totalAmount = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    class Meta:
        model = Bill
        fields = ['id', 'bill_number', 'vendor', 'vendor_id', 'vendor_name', 'currency', 'bill_date', 'due_date', 'poso_number', 'totalAmount', 'notes', 'items']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"BillSerializer initialized with database: {self.database_name}")
    
    def validate(self, data):
        if 'totalAmount' not in data:
            # Calculate totalAmount based on items
            total = sum(item['quantity'] * item['unit_price'] for item in data['items'])
            data['totalAmount'] = total 
        return data
    
    def validate_vendor_id(self, value):
        database_name = self.context.get('database_name')
        logger.debug(f"Validating vendor_id: {value} in database: {self.database_name}")

        try:
            vendor = Vendor.objects.using(database_name).get(pk=value)
            logger.debug(f"Vendor retrieved: {vendor.id}: {vendor.vendor_name}")
            return vendor
        except Vendor.DoesNotExist:
            logger.error(f"Vendor with id {value} does not exist in database {database_name}.")
            raise serializers.ValidationError(f"Vendor with id {value} does not exist in database {database_name}.")

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        vendor = validated_data.pop('vendor_id')
        database_name = self.context.get('database_name')
        logger.debug(f"BillSerializer create called with data: {validated_data}")

        with db_transaction.atomic(using=database_name):
            bill = Bill.objects.using(database_name).create(vendor=vendor, **validated_data)

            for item_data in items_data:
                BillItem.objects.using(database_name).create(bill=bill, **item_data)

            # Create transactions
            accounts_payable = Account.objects.using(database_name).get(name='Accounts Payable')
            
            # Credit Accounts Payable
            FinanceTransaction.objects.using(database_name).create(
                account=accounts_payable,
                amount=bill.totalAmount,
                type='credit',
                description=f"Bill {bill.bill_number} - Accounts Payable"
            )

            # Debit appropriate accounts based on bill items
            for item in bill.items.all():
                if item.category == 'Inventory':
                    inventory_account = Account.objects.using(database_name).get(name='Inventory')
                    FinanceTransaction.objects.using(database_name).create(
                        account=inventory_account,
                        amount=item.amount,
                        type='debit',
                        description=f"Bill {bill.bill_number} - Inventory Purchase"
                    )
                elif item.category == 'Prepaid Expense':
                    prepaid_expense_account = Account.objects.using(database_name).get(name='Prepaid Expenses')
                    FinanceTransaction.objects.using(database_name).create(
                        account=prepaid_expense_account,
                        amount=item.amount,
                        type='debit',
                        description=f"Bill {bill.bill_number} - Prepaid Expense"
                    )
                elif item.category == 'Fixed Asset':
                    fixed_asset_account = Account.objects.using(database_name).get(name='Fixed Assets')
                    FinanceTransaction.objects.using(database_name).create(
                        account=fixed_asset_account,
                        amount=item.amount,
                        type='debit',
                        description=f"Bill {bill.bill_number} - Fixed Asset Purchase"
                    )
                else:
                    # Assume it's a regular expense
                    expense_account, _ = Account.objects.using(database_name).get_or_create(
                        name=item.category,
                        defaults={'account_type': 'Expense'}
                    )
                    FinanceTransaction.objects.using(database_name).create(
                        account=expense_account,
                        amount=item.amount,
                        type='debit',
                        description=f"Bill {bill.bill_number} - {item.category} Expense"
                    )
                
                bill.save(using=database_name)

        return bill
    
    def to_representation(self, instance):
        representation = super().to_representation(instance)
        representation['vendor'] = instance.vendor.vendor_name
        return representation
  

class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product = serializers.PrimaryKeyRelatedField(queryset=Product.objects.all(), allow_null=True, required=False)

    class Meta:
        model = PurchaseOrderItem
        fields = ['id', 'product', 'description', 'quantity', 'unit_price', 'total']

    def validate(self, data):
        if not data.get('product') and not data.get('description'):
            raise serializers.ValidationError("Either product or description must be provided.")
        return data

class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True)
    vendor_name = serializers.CharField(source='vendor.vendor_name', read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = ['id', 'order_number', 'vendor', 'vendor_name', 'discount', 'currency', 'date', 'expected_delivery_date', 'totalAmount', 'status', 'items']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"PurchaseOrderSerializer initialized with database: {self.database_name}")

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        purchase_order = PurchaseOrder.objects.using(self.database_name).create(**validated_data)
        for item_data in items_data:
            PurchaseOrderItem.objects.using(self.database_name).create(purchase_order=purchase_order, **item_data)
        purchase_order.calculate_total_amount()
        return purchase_order

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', [])
        instance = super().update(instance, validated_data)
        instance.items.all().delete()
        for item_data in items_data:
            PurchaseOrderItem.objects.using(self.database_name).create(purchase_order=instance, **item_data)
        instance.calculate_total_amount()
        return instance
    
class ExpenseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Expense
        fields = '__all__'


from rest_framework import serializers
from .models import PurchaseReturn, PurchaseReturnItem

class PurchaseReturnItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = PurchaseReturnItem
        fields = ['id', 'product', 'quantity', 'unit_price', 'total_price']

class PurchaseReturnSerializer(serializers.ModelSerializer):
    items = PurchaseReturnItemSerializer(many=True)

    class Meta:
        model = PurchaseReturn
        fields = ['id', 'return_number', 'purchase_order', 'date', 'reason', 'total_amount', 'status', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        purchase_return = PurchaseReturn.objects.create(**validated_data)
        for item_data in items_data:
            PurchaseReturnItem.objects.create(purchase_return=purchase_return, **item_data)
        return purchase_return
    
class ProcurementItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProcurementItem
        fields = ['id', 'product', 'description', 'quantity', 'unit_price', 'total_price']

class ProcurementSerializer(serializers.ModelSerializer):
    items = ProcurementItemSerializer(many=True)

    class Meta:
        model = Procurement
        fields = ['id', 'procurement_number', 'vendor', 'date', 'description', 'total_amount', 'status', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items')
        procurement = Procurement.objects.create(**validated_data)
        for item_data in items_data:
            ProcurementItem.objects.create(procurement=procurement, **item_data)
        return procurement
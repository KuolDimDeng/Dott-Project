from rest_framework import serializers
from .models import Product, Service, Customer, Bill, Invoice, Vendor, Estimate, SalesOrder, Department
from finance.models import Income, Transaction
from users.models import User
import logging
from finance.serializers import TransactionSerializer

logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

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

class InvoiceSerializer(serializers.ModelSerializer):
    transaction = TransactionSerializer()

    class Meta:
        model = Invoice
        fields = ['id', 'invoice_num', 'customer', 'amount', 'due_date', 'status', 'transaction']

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.database_name = self.context.get('database_name')
        logger.debug(f"InvoiceSerializer initialized with database_name: {self.database_name}")

    def to_internal_value(self, data):
        logger.debug(f"InvoiceSerializer to_internal_value called with data: {data}")
        internal_value = super().to_internal_value(data)
        
        transaction_data = data.get('transaction')
        if transaction_data:
            transaction_serializer = TransactionSerializer(
                data=transaction_data, 
                context={'database_name': self.database_name}
            )
            if transaction_serializer.is_valid():
                internal_value['transaction'] = transaction_serializer.validated_data
            else:
                raise serializers.ValidationError({'transaction': transaction_serializer.errors})
        
        return internal_value

    def create(self, validated_data):
        logger.debug(f"IncomeSerializer create method called with validated_data: {validated_data}")
        transaction_data = validated_data.pop('transaction')
        database_name = self.context.get('database_name') or 'default'
        transaction_serializer = TransactionSerializer(data=transaction_data, context={'database_name': database_name})
        if transaction_serializer.is_valid():
            transaction = transaction_serializer.save()
            return Income.objects.using(database_name).create(transaction=transaction, **validated_data)
        else:
            raise serializers.ValidationError(transaction_serializer.errors)
    
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

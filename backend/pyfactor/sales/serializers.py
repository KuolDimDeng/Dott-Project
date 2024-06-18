from rest_framework import serializers
from .models import Product, Service, Customer, Bill, Invoice, Vendor, Estimate, SalesOrder, Department
from users.models import User

class ProductSerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ['name', 'description', 'price', 'sellEnabled', 'buyEnabled', 'salesTax']
        
class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ['name', 'description', 'price', 'sellEnabled', 'buyEnabled', 'salesTax']

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
    class Meta:
        model = Invoice
        fields = ['id', 'invoice_num', 'customer', 'amount', 'date_created', 'due_date', 'status', 'transaction']

class VendorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vendor
        fields = ['id', 'vendor_name', 'street', 'postcode']

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

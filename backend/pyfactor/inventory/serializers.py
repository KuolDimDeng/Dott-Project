from rest_framework import serializers
from .models import (
    InventoryItem, Category, Supplier, Location, InventoryTransaction,
    Product, Service, ProductTypeFields, ServiceTypeFields, Department,
    CustomChargePlan
)

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = '__all__'

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

class LocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Location
        fields = '__all__'

class InventoryItemSerializer(serializers.ModelSerializer):
    category_name = serializers.ReadOnlyField(source='category.name')
    supplier_name = serializers.ReadOnlyField(source='supplier.name')
    location_name = serializers.ReadOnlyField(source='location.name')

    class Meta:
        model = InventoryItem
        fields = '__all__'

class InventoryTransactionSerializer(serializers.ModelSerializer):
    item_name = serializers.ReadOnlyField(source='item.name')

    class Meta:
        model = InventoryTransaction
        fields = '__all__'

class DepartmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = '__all__'

class CustomChargePlanSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomChargePlan
        fields = '__all__'

class ProductTypeFieldsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductTypeFields
        fields = '__all__'

class ServiceTypeFieldsSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceTypeFields
        fields = '__all__'

class ProductSerializer(serializers.ModelSerializer):
    department_name = serializers.ReadOnlyField(source='department.dept_name', allow_null=True)
    type_fields = ProductTypeFieldsSerializer(read_only=True)
    # Add supplier and location names for display
    supplier_name = serializers.ReadOnlyField(source='supplier.name', allow_null=True)
    location_name = serializers.ReadOnlyField(source='location.name', allow_null=True)

    class Meta:
        model = Product
        fields = '__all__'
        # SKU is auto-generated if not provided, but can be overridden
        read_only_fields = ('id', 'created_at', 'updated_at')

class ServiceSerializer(serializers.ModelSerializer):
    type_fields = ServiceTypeFieldsSerializer(read_only=True)

    class Meta:
        model = Service
        fields = '__all__'
        read_only_fields = ('service_code',)
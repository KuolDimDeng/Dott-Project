from rest_framework import serializers
from .models import (
    InventoryItem, Category, Supplier, Location, InventoryTransaction,
    Product, Service, ProductTypeFields, ServiceTypeFields, Department,
    CustomChargePlan, BillOfMaterials, ServiceMaterials
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
    # Display material type label
    material_type_display = serializers.CharField(source='get_material_type_display', read_only=True)
    # Display pricing model label
    pricing_model_display = serializers.CharField(source='get_pricing_model_display', read_only=True)
    # Calculate current price based on pricing model
    calculated_price = serializers.SerializerMethodField()
    price_breakdown = serializers.SerializerMethodField()
    # Add stock_quantity as an alias for quantity field
    stock_quantity = serializers.IntegerField(source='quantity', required=False)

    class Meta:
        model = Product
        fields = '__all__'
        # SKU is auto-generated if not provided, but can be overridden
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_calculated_price(self, obj):
        """Calculate the current price based on pricing model"""
        return obj.calculate_price()
    
    def get_price_breakdown(self, obj):
        """Get price calculation breakdown"""
        return obj.get_price_breakdown()

class ServiceSerializer(serializers.ModelSerializer):
    type_fields = ServiceTypeFieldsSerializer(read_only=True)

    class Meta:
        model = Service
        fields = '__all__'
        read_only_fields = ('service_code',)


class BillOfMaterialsSerializer(serializers.ModelSerializer):
    product_name = serializers.ReadOnlyField(source='product.name')
    material_name = serializers.ReadOnlyField(source='material.name')
    material_unit = serializers.ReadOnlyField(source='material.unit')
    material_type = serializers.ReadOnlyField(source='material.material_type')
    material_sku = serializers.ReadOnlyField(source='material.sku')
    
    class Meta:
        model = BillOfMaterials
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')


class ServiceMaterialsSerializer(serializers.ModelSerializer):
    service_name = serializers.ReadOnlyField(source='service.name')
    material_name = serializers.ReadOnlyField(source='material.name')
    material_unit = serializers.ReadOnlyField(source='material.unit')
    material_type = serializers.ReadOnlyField(source='material.material_type')
    material_sku = serializers.ReadOnlyField(source='material.sku')
    
    class Meta:
        model = ServiceMaterials
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
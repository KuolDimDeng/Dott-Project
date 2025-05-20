"""
Optimized serializers for inventory module.
These serializers are designed to be lightweight and fast.
"""
from rest_framework import serializers
from .models import Product, Department

class LightweightProductSerializer(serializers.ModelSerializer):
    """
    A lightweight serializer for Product model that only includes essential fields.
    This is optimized for list views where full details are not needed.
    """
    department_name = serializers.ReadOnlyField(source='department.dept_name', allow_null=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 
            'name', 
            'price', 
            'is_for_sale', 
            'is_for_rent',
            'product_code', 
            'stock_quantity', 
            'department_name',
            'created_at'
        ]
        read_only_fields = ('product_code',)

class ProductSummarySerializer(serializers.ModelSerializer):
    """
    An even more lightweight serializer for Product model.
    This is optimized for dashboard views or quick lists.
    """
    class Meta:
        model = Product
        fields = [
            'id', 
            'name', 
            'price', 
            'product_code', 
            'stock_quantity'
        ]
        read_only_fields = ('product_code',)
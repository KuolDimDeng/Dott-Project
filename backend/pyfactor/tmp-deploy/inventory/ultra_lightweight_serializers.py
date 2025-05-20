"""
Ultra-lightweight serializers for inventory module.
These serializers are designed to be extremely fast and minimal.
"""
from rest_framework import serializers
from .models import Product, Department

class UltraLightweightProductSerializer(serializers.ModelSerializer):
    """
    An ultra-lightweight serializer for Product model that includes only the bare minimum fields.
    This is optimized for list views where minimal data is needed for initial rendering.
    Additional data can be loaded on demand.
    """
    class Meta:
        model = Product
        fields = [
            'id', 
            'name', 
            'product_code', 
            'stock_quantity',
            'price'
        ]
        read_only_fields = ('product_code',)

class ProductListSerializer(serializers.ModelSerializer):
    """
    A serializer for product lists with minimal fields but includes department name.
    This is a good balance between performance and usability.
    """
    department_name = serializers.ReadOnlyField(source='department.dept_name', allow_null=True)
    
    class Meta:
        model = Product
        fields = [
            'id', 
            'name', 
            'product_code', 
            'stock_quantity',
            'price',
            'is_for_sale',
            'department_name'
        ]
        read_only_fields = ('product_code',)

class ProductStatsSerializer(serializers.Serializer):
    """
    A serializer for product statistics.
    This is used for dashboard widgets and summary views.
    """
    total_products = serializers.IntegerField()
    low_stock_count = serializers.IntegerField()
    total_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    avg_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    newest_product = UltraLightweightProductSerializer(allow_null=True)
from rest_framework import serializers
from django.db import transaction
from django.core.exceptions import ValidationError
from .models import ProductSupplier, ProductSupplierItem
from inventory.models import Product
from decimal import Decimal


class ProductSupplierItemSerializer(serializers.ModelSerializer):
    """Serializer for product supplier items with security"""
    
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_sku = serializers.CharField(source='product.sku', read_only=True)
    effective_price = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductSupplierItem
        fields = [
            'id', 'product', 'product_name', 'product_sku',
            'supplier_sku', 'supplier_product_name',
            'cost_price', 'currency', 'moq', 'order_increment',
            'max_order_quantity', 'lead_time_override',
            'bulk_pricing', 'is_active', 'is_preferred',
            'effective_price', 'last_order_date', 'last_order_price'
        ]
        read_only_fields = ['id', 'last_order_date', 'last_order_price']
    
    def get_effective_price(self, obj):
        """Get current effective price"""
        return str(obj.cost_price)
    
    def validate(self, attrs):
        """Security validation"""
        request = self.context.get('request')
        if request and hasattr(request, 'user') and hasattr(request.user, 'tenant_id'):
            # Ensure product belongs to user's tenant
            product = attrs.get('product')
            if product and hasattr(product, 'tenant_id') and product.tenant_id != request.user.tenant_id:
                raise serializers.ValidationError("Invalid product selection")
        
        return attrs


class ProductSupplierSerializer(serializers.ModelSerializer):
    """Main serializer for product suppliers with full security"""
    
    supplier_items = ProductSupplierItemSerializer(many=True, read_only=True)
    total_products = serializers.SerializerMethodField()
    credit_available = serializers.SerializerMethodField()
    can_order = serializers.SerializerMethodField()
    
    class Meta:
        model = ProductSupplier
        fields = [
            'id', 'name', 'code', 'email', 'phone', 'website',
            'address_line1', 'address_line2', 'city', 'state_province',
            'postal_code', 'country', 'supplier_type',
            'tax_id', 'payment_terms', 'custom_payment_terms',
            'credit_limit', 'currency', 'lead_time_days',
            'minimum_order_value', 'delivers_to_warehouse',
            'dropship_capable', 'on_time_delivery_rate',
            'quality_rating', 'total_orders', 'total_spend',
            'auto_reorder_enabled', 'catalog_enabled',
            'volume_discount_enabled', 'pricing_tiers',
            'primary_contact_name', 'primary_contact_email',
            'primary_contact_phone', 'is_active', 'is_preferred',
            'is_verified', 'created_at', 'updated_at',
            'supplier_items', 'total_products', 'credit_available',
            'can_order'
        ]
        read_only_fields = [
            'id', 'code', 'total_orders', 'total_spend',
            'on_time_delivery_rate', 'quality_rating',
            'created_at', 'updated_at', 'is_verified'
        ]
    
    def get_total_products(self, obj):
        """Get count of active products from this supplier"""
        return obj.supplier_items.filter(is_active=True).count()
    
    def get_credit_available(self, obj):
        """Calculate available credit"""
        if not obj.credit_limit:
            return None
        used = obj.get_current_credit_usage()
        return str(obj.credit_limit - used)
    
    def get_can_order(self, obj):
        """Check if orders can be placed"""
        return obj.is_active and obj.is_verified
    
    def create(self, validated_data):
        """Create with tenant security"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            if hasattr(request.user, 'tenant_id'):
                validated_data['tenant_id'] = request.user.tenant_id
            if hasattr(request.user, 'business'):
                validated_data['business'] = request.user.business
            validated_data['created_by'] = request.user
        
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        """Update with audit trail"""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['updated_by'] = request.user
        
        return super().update(instance, validated_data)


class ProductSupplierBulkImportSerializer(serializers.Serializer):
    """Serializer for bulk importing suppliers with security"""
    
    suppliers = serializers.ListField(
        child=serializers.DictField(),
        max_length=100,  # Limit bulk import size
        help_text="List of supplier data to import"
    )
    update_existing = serializers.BooleanField(
        default=False,
        help_text="Update existing suppliers with same name"
    )
    
    def validate_suppliers(self, value):
        """Validate each supplier in the list"""
        required_fields = ['name', 'supplier_type']
        
        for idx, supplier in enumerate(value):
            for field in required_fields:
                if field not in supplier:
                    raise serializers.ValidationError(
                        f"Supplier {idx}: Missing required field '{field}'"
                    )
            
            # Validate supplier type
            valid_types = ['manufacturer', 'wholesaler', 'distributor', 
                          'dropshipper', 'local_supplier', 'international']
            if supplier.get('supplier_type') not in valid_types:
                raise serializers.ValidationError(
                    f"Supplier {idx}: Invalid supplier_type"
                )
        
        return value
    
    def create_suppliers(self):
        """Create suppliers with transaction safety"""
        request = self.context.get('request')
        if not request or not hasattr(request, 'user'):
            raise ValidationError("Authentication required")
        
        created = []
        updated = []
        errors = []
        
        with transaction.atomic():
            for supplier_data in self.validated_data['suppliers']:
                try:
                    # Add tenant_id and business
                    supplier_data['tenant_id'] = request.user.tenant_id
                    if hasattr(request.user, 'business'):
                        supplier_data['business'] = request.user.business
                    supplier_data['created_by'] = request.user
                    
                    # Check if exists
                    existing = ProductSupplier.objects.filter(
                        tenant_id=request.user.tenant_id,
                        name=supplier_data['name']
                    ).first()
                    
                    if existing and self.validated_data['update_existing']:
                        # Update existing
                        for key, value in supplier_data.items():
                            if key not in ['tenant', 'business', 'created_by']:
                                setattr(existing, key, value)
                        existing.updated_by = request.user
                        existing.save()
                        updated.append(existing)
                    elif not existing:
                        # Create new
                        supplier = ProductSupplier.objects.create(**supplier_data)
                        created.append(supplier)
                    else:
                        errors.append(f"Supplier '{supplier_data['name']}' already exists")
                        
                except Exception as e:
                    errors.append(f"Error with '{supplier_data.get('name', 'Unknown')}': {str(e)}")
        
        return {
            'created': ProductSupplierSerializer(created, many=True).data,
            'updated': ProductSupplierSerializer(updated, many=True).data,
            'errors': errors
        }


class SupplierCatalogSerializer(serializers.Serializer):
    """Serializer for viewing supplier catalog with pricing"""
    
    supplier_id = serializers.UUIDField()
    products = serializers.SerializerMethodField()
    total_products = serializers.IntegerField(read_only=True)
    
    def get_products(self, obj):
        """Get all products from this supplier with pricing"""
        items = ProductSupplierItem.objects.filter(
            product_supplier_id=obj['supplier_id'],
            is_active=True
        ).select_related('product')
        
        return [{
            'product_id': item.product.id,
            'product_name': item.product.name,
            'product_sku': item.product.sku,
            'supplier_sku': item.supplier_sku,
            'cost_price': str(item.cost_price),
            'moq': item.moq,
            'bulk_pricing': item.bulk_pricing,
            'lead_time': item.lead_time_override or item.product_supplier.lead_time_days,
            'in_stock': item.product.current_stock if hasattr(item.product, 'current_stock') else 0
        } for item in items]
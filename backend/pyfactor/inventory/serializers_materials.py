"""
Serializers for Material models
"""
from rest_framework import serializers
from .models_materials import Material, MaterialTransaction
from .serializers import SupplierSerializer, LocationSerializer
from jobs.serializers import JobSerializer


class MaterialSerializer(serializers.ModelSerializer):
    """
    Serializer for Material model with nested relationships
    """
    supplier_details = SupplierSerializer(source='supplier', read_only=True)
    location_details = LocationSerializer(source='location', read_only=True)
    display_unit = serializers.ReadOnlyField()
    stock_value = serializers.ReadOnlyField()
    is_low_stock = serializers.ReadOnlyField()
    
    class Meta:
        model = Material
        fields = [
            'id', 'tenant_id', 'name', 'sku', 'description', 'material_type',
            'quantity_in_stock', 'unit', 'custom_unit', 'display_unit',
            'reorder_level', 'reorder_quantity',
            'unit_cost', 'last_purchase_price', 'average_cost',
            'is_billable', 'markup_percentage', 'billing_price',
            'supplier', 'supplier_details', 'supplier_sku', 'lead_time_days',
            'location', 'location_details', 'storage_requirements',
            'is_active', 'created_at', 'updated_at', 
            'last_used_date', 'last_purchase_date',
            'notes', 'stock_value', 'is_low_stock'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'stock_value', 'is_low_stock']
    
    def validate_sku(self, value):
        """Ensure SKU is unique within tenant"""
        if value:
            # Get the tenant from the request context
            request = self.context.get('request')
            if request and hasattr(request, 'user'):
                tenant_id = getattr(request.user, 'business_id', None)
                if tenant_id:
                    # Check if SKU already exists for this tenant
                    existing = Material.objects.filter(
                        tenant_id=tenant_id, 
                        sku=value
                    ).exclude(pk=self.instance.pk if self.instance else None)
                    
                    if existing.exists():
                        raise serializers.ValidationError(
                            f"A material with SKU '{value}' already exists."
                        )
        return value
    
    def validate(self, data):
        """Validate material data"""
        # Ensure custom_unit is provided if unit is 'custom'
        if data.get('unit') == 'custom' and not data.get('custom_unit'):
            raise serializers.ValidationError({
                'custom_unit': 'Custom unit name is required when unit is set to "custom".'
            })
        
        # Validate markup percentage is reasonable
        markup = data.get('markup_percentage', 0)
        if markup < 0:
            raise serializers.ValidationError({
                'markup_percentage': 'Markup percentage cannot be negative.'
            })
        elif markup > 1000:
            raise serializers.ValidationError({
                'markup_percentage': 'Markup percentage cannot exceed 1000%.'
            })
        
        return data
    
    def create(self, validated_data):
        """Create material with explicit tenant assignment"""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"🏗️ [MaterialSerializer.create] === SERIALIZER CREATE START ===")
        logger.info(f"🏗️ [MaterialSerializer.create] Validated data: {validated_data}")
        
        # Get tenant from RLS context first (preferred)
        from custom_auth.rls import get_current_tenant_id, set_current_tenant_id
        tenant_id = get_current_tenant_id()
        logger.info(f"🏗️ [MaterialSerializer.create] Tenant from RLS: {tenant_id}")
        
        # If no tenant from RLS, try to get from user
        if not tenant_id:
            request = self.context.get('request')
            if request and hasattr(request, 'user') and request.user.is_authenticated:
                tenant_id = getattr(request.user, 'business_id', None)
                logger.info(f"🏗️ [MaterialSerializer.create] Tenant from user.business_id: {tenant_id}")
                
                # Set the RLS context if we have a tenant from user
                if tenant_id:
                    set_current_tenant_id(tenant_id)
                    logger.info(f"🏗️ [MaterialSerializer.create] Set RLS context to: {tenant_id}")
        
        # Ensure we have a tenant_id
        if not tenant_id:
            logger.error(f"❌ [MaterialSerializer.create] No tenant_id found!")
            raise serializers.ValidationError("Unable to determine tenant context for material creation")
        
        # The TenantAwareModel should automatically set tenant_id from RLS context
        # But we'll also explicitly set it to be sure
        if hasattr(tenant_id, 'hex'):
            tenant_id = str(tenant_id)
        validated_data['tenant_id'] = tenant_id
        logger.info(f"🏗️ [MaterialSerializer.create] Set tenant_id in validated_data: {tenant_id}")
        
        # Create the material
        logger.info(f"🏗️ [MaterialSerializer.create] Creating material with data: {validated_data}")
        material = super().create(validated_data)
        
        logger.info(f"🏗️ [MaterialSerializer.create] Material created with ID: {material.id}")
        logger.info(f"🏗️ [MaterialSerializer.create] Material tenant_id: {material.tenant_id}")
        
        # Verify the material can be found
        verify_qs = Material.objects.filter(id=material.id)
        logger.info(f"🏗️ [MaterialSerializer.create] Verification - Material found in tenant-aware queryset: {verify_qs.exists()}")
        
        logger.info(f"🏗️ [MaterialSerializer.create] === SERIALIZER CREATE END ===")
        
        return material


class MaterialListSerializer(serializers.ModelSerializer):
    """
    Lightweight serializer for material lists
    """
    display_unit = serializers.ReadOnlyField()
    is_low_stock = serializers.ReadOnlyField()
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    
    class Meta:
        model = Material
        fields = [
            'id', 'name', 'sku', 'material_type',
            'quantity_in_stock', 'display_unit', 
            'reorder_level', 'is_low_stock',
            'unit_cost', 'is_billable', 'billing_price',
            'supplier_name', 'is_active'
        ]


class MaterialTransactionSerializer(serializers.ModelSerializer):
    """
    Serializer for MaterialTransaction model
    """
    material_name = serializers.CharField(source='material.name', read_only=True)
    material_sku = serializers.CharField(source='material.sku', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    job_number = serializers.CharField(source='job.job_number', read_only=True)
    
    class Meta:
        model = MaterialTransaction
        fields = [
            'id', 'material', 'material_name', 'material_sku',
            'transaction_type', 'quantity', 'unit_cost', 'total_cost',
            'balance_after', 'job', 'job_number', 'purchase_order',
            'created_at', 'created_by', 'created_by_name', 'notes'
        ]
        read_only_fields = ['id', 'created_at', 'total_cost']
    
    def validate_quantity(self, value):
        """Validate quantity based on transaction type"""
        if value <= 0:
            raise serializers.ValidationError("Quantity must be greater than zero.")
        return value
    
    def create(self, validated_data):
        """Create transaction and update material stock"""
        material = validated_data['material']
        transaction_type = validated_data['transaction_type']
        quantity = validated_data['quantity']
        
        # Handle different transaction types
        if transaction_type == 'use':
            # Check if sufficient stock
            if quantity > material.quantity_in_stock:
                raise serializers.ValidationError({
                    'quantity': f'Insufficient stock. Available: {material.quantity_in_stock}'
                })
            material.use_material(quantity, validated_data.get('notes'))
        
        elif transaction_type == 'purchase':
            material.add_stock(
                quantity, 
                validated_data.get('unit_cost'),
                validated_data.get('notes')
            )
        
        elif transaction_type in ['adjustment', 'waste', 'return']:
            # For other types, directly adjust stock
            if transaction_type in ['waste', 'return']:
                material.quantity_in_stock -= quantity
            else:  # adjustment can be positive or negative
                material.quantity_in_stock += quantity
            
            material.save()
            
            # Create transaction record
            validated_data['balance_after'] = material.quantity_in_stock
            transaction = super().create(validated_data)
            return transaction
        
        # For 'use' and 'purchase', the transaction is already created by the model methods
        # So we need to return the latest transaction
        return material.transactions.latest('created_at')


class MaterialStockUpdateSerializer(serializers.Serializer):
    """
    Serializer for bulk stock updates
    """
    quantity = serializers.DecimalField(max_digits=12, decimal_places=3)
    unit_cost = serializers.DecimalField(
        max_digits=10, 
        decimal_places=2, 
        required=False,
        allow_null=True
    )
    notes = serializers.CharField(required=False, allow_blank=True)
    transaction_type = serializers.ChoiceField(
        choices=['purchase', 'adjustment', 'return'],
        default='purchase'
    )
"""
Serializers for StoreItems and related models
"""
from rest_framework import serializers

# Conditional imports to prevent build failures
try:
    from .models_storeitems import StoreItem, MerchantStoreItem, StoreItemVerification
    STOREITEMS_AVAILABLE = True
except ImportError:
    STOREITEMS_AVAILABLE = False
    StoreItem = None
    MerchantStoreItem = None
    StoreItemVerification = None


if STOREITEMS_AVAILABLE:
    class StoreItemSerializer(serializers.ModelSerializer):
        """Serializer for global store items"""
        verification_status = serializers.SerializerMethodField()

        class Meta:
            model = StoreItem
            fields = [
                'id', 'barcode', 'name', 'brand', 'category', 'subcategory',
                'description', 'image_url', 'image_public_id', 'thumbnail_url',
                'unit', 'size', 'region_code', 'verified', 'verification_count',
                'verification_status', 'created_at', 'updated_at'
            ]
            read_only_fields = ['id', 'verified', 'verification_count', 'created_at', 'updated_at']

        def get_verification_status(self, obj):
            """Get verification status text"""
            if obj.verified:
                return 'Verified'
            elif obj.verification_count > 0:
                return f'Pending ({obj.verification_count}/3)'
            return 'Unverified'


    class MerchantStoreItemSerializer(serializers.ModelSerializer):
        """Serializer for merchant-specific store items"""
        store_item = StoreItemSerializer(read_only=True)
        store_item_id = serializers.UUIDField(write_only=True)
        profit_margin = serializers.ReadOnlyField()
        markup = serializers.ReadOnlyField()

        class Meta:
            model = MerchantStoreItem
            fields = [
                'id', 'store_item', 'store_item_id', 'sell_price', 'cost_price',
                'currency', 'stock_quantity', 'min_stock', 'max_stock',
                'is_active', 'out_of_stock', 'profit_margin', 'markup',
                'last_sold_at', 'created_at', 'updated_at'
            ]
            read_only_fields = ['id', 'profit_margin', 'markup', 'last_sold_at', 'created_at', 'updated_at']

        def create(self, validated_data):
            """Create with merchant from request"""
            validated_data['merchant_id'] = self.context['request'].user.id
            return super().create(validated_data)


    class StoreItemSearchSerializer(serializers.Serializer):
        """Serializer for search results"""
        query = serializers.CharField(required=True, min_length=2)
        category = serializers.CharField(required=False)
        verified_only = serializers.BooleanField(default=False)
        limit = serializers.IntegerField(default=20, max_value=100)


    class BulkPriceUpdateSerializer(serializers.Serializer):
        """Serializer for bulk price updates"""
        update_type = serializers.ChoiceField(choices=[
            ('percentage_increase', 'Percentage Increase'),
            ('percentage_decrease', 'Percentage Decrease'),
            ('fixed_increase', 'Fixed Amount Increase'),
            ('fixed_decrease', 'Fixed Amount Decrease'),
            ('set_markup', 'Set Markup from Cost'),
        ])
        value = serializers.DecimalField(max_digits=10, decimal_places=2)
        category = serializers.CharField(required=False)
        brand = serializers.CharField(required=False)
        apply_to_all = serializers.BooleanField(default=False)


    class AIProductDetectionSerializer(serializers.Serializer):
        """Serializer for AI product detection"""
        image = serializers.ImageField(required=True)
        detect_prices = serializers.BooleanField(default=False)
        language = serializers.CharField(default='en', max_length=5)


    class QuickAddProductSerializer(serializers.Serializer):
        """Serializer for quick product addition"""
        barcode = serializers.CharField(required=True)
        name = serializers.CharField(required=True)
        sell_price = serializers.DecimalField(max_digits=10, decimal_places=2)
        cost_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
        stock_quantity = serializers.IntegerField(default=0)
        category = serializers.CharField(default='General')
        brand = serializers.CharField(required=False, allow_blank=True)
        size = serializers.CharField(required=False, allow_blank=True)


    class PriceSuggestionSerializer(serializers.Serializer):
        """Serializer for price suggestions"""
        store_item_id = serializers.UUIDField(required=True)
        cost_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
        location = serializers.CharField(required=False)


    class StoreItemVerificationSerializer(serializers.ModelSerializer):
        """Serializer for store item verifications"""
        class Meta:
            model = StoreItemVerification
            fields = ['store_item', 'is_correct', 'notes', 'verified_at']
            read_only_fields = ['verified_at']

else:
    # Placeholder serializers when models not available
    class StoreItemSerializer(serializers.Serializer):
        pass

    class MerchantStoreItemSerializer(serializers.Serializer):
        pass

    class StoreItemSearchSerializer(serializers.Serializer):
        pass

    class BulkPriceUpdateSerializer(serializers.Serializer):
        pass

    class AIProductDetectionSerializer(serializers.Serializer):
        pass

    class QuickAddProductSerializer(serializers.Serializer):
        pass

    class PriceSuggestionSerializer(serializers.Serializer):
        pass

    class StoreItemVerificationSerializer(serializers.Serializer):
        pass
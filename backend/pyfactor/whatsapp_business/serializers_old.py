from rest_framework import serializers
from .models import (
    WhatsAppBusinessSettings,
    WhatsAppCatalog,
    WhatsAppProduct,
    WhatsAppOrder,
    WhatsAppOrderItem,
    WhatsAppMessage,
    WhatsAppAnalytics
)
from inventory.models import Product


class WhatsAppBusinessSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppBusinessSettings
        fields = [
            'id', 'is_enabled', 'business_name', 'business_description',
            'whatsapp_number', 'welcome_message', 'auto_reply_enabled',
            'catalog_enabled', 'payment_enabled', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WhatsAppProductSerializer(serializers.ModelSerializer):
    linked_product_name = serializers.CharField(source='linked_product.name', read_only=True)
    
    class Meta:
        model = WhatsAppProduct
        fields = [
            'id', 'catalog', 'name', 'description', 'item_type', 'price', 'price_type',
            'currency', 'image_url', 'sku', 'stock_quantity', 'is_available', 
            'category', 'duration_minutes', 'service_location', 'linked_product',
            'linked_product_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WhatsAppCatalogSerializer(serializers.ModelSerializer):
    products = WhatsAppProductSerializer(many=True, read_only=True)
    product_count = serializers.SerializerMethodField()
    
    class Meta:
        model = WhatsAppCatalog
        fields = [
            'id', 'name', 'description', 'is_active', 'catalog_url',
            'products', 'product_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'catalog_url', 'created_at', 'updated_at']
    
    def get_product_count(self, obj):
        return obj.products.count()


class WhatsAppOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_image = serializers.CharField(source='product.image_url', read_only=True)
    
    class Meta:
        model = WhatsAppOrderItem
        fields = [
            'id', 'product', 'product_name', 'product_image',
            'quantity', 'unit_price', 'total_price'
        ]
        read_only_fields = ['id', 'total_price']


class WhatsAppOrderSerializer(serializers.ModelSerializer):
    items = WhatsAppOrderItemSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()
    
    class Meta:
        model = WhatsAppOrder
        fields = [
            'id', 'customer_phone', 'customer_name', 'customer_address',
            'total_amount', 'currency', 'order_status', 'payment_status',
            'payment_method', 'payment_reference', 'payment_link',
            'dott_fee_amount', 'dott_fee_currency', 'notes',
            'items', 'item_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'dott_fee_amount', 'dott_fee_currency', 'created_at', 'updated_at']
    
    def get_item_count(self, obj):
        return obj.items.count()


class WhatsAppMessageSerializer(serializers.ModelSerializer):
    order_id = serializers.CharField(source='related_order.id', read_only=True)
    
    class Meta:
        model = WhatsAppMessage
        fields = [
            'id', 'recipient_phone', 'message_type', 'message_content',
            'whatsapp_message_id', 'status', 'related_order', 'order_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class WhatsAppAnalyticsSerializer(serializers.ModelSerializer):
    class Meta:
        model = WhatsAppAnalytics
        fields = [
            'id', 'date', 'messages_sent', 'messages_delivered', 'messages_read',
            'catalog_shares', 'catalog_views', 'orders_initiated', 'orders_completed',
            'orders_cancelled', 'total_revenue', 'dott_fees_collected',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
from django.contrib import admin
from .models import (
    WhatsAppBusinessSettings,
    WhatsAppCatalog,
    WhatsAppProduct,
    WhatsAppOrder,
    WhatsAppOrderItem,
    WhatsAppMessage,
    WhatsAppAnalytics
)

@admin.register(WhatsAppBusinessSettings)
class WhatsAppBusinessSettingsAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'is_enabled', 'business_name', 'whatsapp_number', 'created_at']
    list_filter = ['is_enabled', 'catalog_enabled', 'payment_enabled']
    search_fields = ['tenant__name', 'business_name', 'whatsapp_number']

@admin.register(WhatsAppCatalog)
class WhatsAppCatalogAdmin(admin.ModelAdmin):
    list_display = ['name', 'tenant', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'tenant__name']

@admin.register(WhatsAppProduct)
class WhatsAppProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'catalog', 'price', 'currency', 'stock_quantity', 'is_available']
    list_filter = ['currency', 'is_available', 'category']
    search_fields = ['name', 'sku', 'catalog__name']

@admin.register(WhatsAppOrder)
class WhatsAppOrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer_phone', 'total_amount', 'currency', 'order_status', 'payment_status', 'created_at']
    list_filter = ['order_status', 'payment_status', 'currency', 'payment_method']
    search_fields = ['customer_phone', 'customer_name', 'payment_reference']
    readonly_fields = ['id', 'dott_fee_amount', 'created_at', 'updated_at']

@admin.register(WhatsAppOrderItem)
class WhatsAppOrderItemAdmin(admin.ModelAdmin):
    list_display = ['product', 'order', 'quantity', 'unit_price', 'total_price']
    readonly_fields = ['total_price']

@admin.register(WhatsAppMessage)
class WhatsAppMessageAdmin(admin.ModelAdmin):
    list_display = ['recipient_phone', 'message_type', 'status', 'tenant', 'created_at']
    list_filter = ['message_type', 'status']
    search_fields = ['recipient_phone', 'whatsapp_message_id']

@admin.register(WhatsAppAnalytics)
class WhatsAppAnalyticsAdmin(admin.ModelAdmin):
    list_display = ['tenant', 'date', 'messages_sent', 'orders_completed', 'total_revenue']
    list_filter = ['date']
    search_fields = ['tenant__name']
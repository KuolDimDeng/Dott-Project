from django.contrib import admin
from .models import ProductSupplier, ProductSupplierItem


@admin.register(ProductSupplier)
class ProductSupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'supplier_type', 'tenant', 'is_active', 'is_verified', 'created_at']
    list_filter = ['supplier_type', 'is_active', 'is_verified', 'tenant']
    search_fields = ['name', 'code', 'email']
    readonly_fields = ['id', 'created_at', 'updated_at', 'created_by', 'updated_by']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'code', 'email', 'phone', 'website')
        }),
        ('Address', {
            'fields': ('address_line1', 'address_line2', 'city', 'state_province', 'postal_code', 'country')
        }),
        ('Classification', {
            'fields': ('supplier_type', 'tenant', 'business')
        }),
        ('Financial', {
            'fields': ('payment_terms', 'custom_payment_terms', 'credit_limit', 'currency', 'tax_id')
        }),
        ('Operations', {
            'fields': ('lead_time_days', 'minimum_order_value', 'delivers_to_warehouse', 'dropship_capable')
        }),
        ('Performance', {
            'fields': ('on_time_delivery_rate', 'quality_rating', 'total_orders', 'total_spend')
        }),
        ('Status', {
            'fields': ('is_active', 'is_preferred', 'is_verified')
        }),
        ('Audit', {
            'fields': ('id', 'created_at', 'created_by', 'updated_at', 'updated_by')
        })
    )


@admin.register(ProductSupplierItem)
class ProductSupplierItemAdmin(admin.ModelAdmin):
    list_display = ['product_supplier', 'product', 'supplier_sku', 'cost_price', 'moq', 'is_active']
    list_filter = ['is_active', 'is_preferred', 'tenant']
    search_fields = ['supplier_sku', 'product__name', 'product_supplier__name']
    readonly_fields = ['created_at', 'updated_at']
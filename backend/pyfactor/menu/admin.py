"""
Admin configuration for Menu Management
"""
from django.contrib import admin
from .models import MenuCategory, MenuItem, MenuItemReview, MenuSpecial


@admin.register(MenuCategory)
class MenuCategoryAdmin(admin.ModelAdmin):
    list_display = ['name', 'category_type', 'display_order', 'is_active', 'tenant_id']
    list_filter = ['category_type', 'is_active', 'tenant_id']
    search_fields = ['name', 'description']
    ordering = ['tenant_id', 'display_order', 'name']


@admin.register(MenuItem)
class MenuItemAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'price', 'is_available', 'is_featured', 'rating', 'tenant_id']
    list_filter = [
        'category', 'is_available', 'is_featured', 'is_vegetarian', 
        'is_vegan', 'is_gluten_free', 'tenant_id'
    ]
    search_fields = ['name', 'description', 'tags']
    readonly_fields = ['rating', 'review_count', 'order_count', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('tenant_id', 'name', 'description', 'category', 'business')
        }),
        ('Pricing', {
            'fields': ('price', 'discounted_price', 'cost')
        }),
        ('Images', {
            'fields': ('image_url', 'thumbnail_url', 'additional_images')
        }),
        ('Availability & Display', {
            'fields': ('is_available', 'is_featured', 'is_new', 'is_popular', 'display_order')
        }),
        ('Preparation & Nutrition', {
            'fields': ('preparation_time', 'serving_size', 'calories')
        }),
        ('Dietary Information', {
            'fields': (
                'is_vegetarian', 'is_vegan', 'is_gluten_free', 'is_dairy_free',
                'is_halal', 'is_kosher', 'is_spicy', 'spice_level'
            )
        }),
        ('Allergens & Ingredients', {
            'fields': ('allergens', 'ingredients', 'inventory_items')
        }),
        ('Stock Management', {
            'fields': ('stock_quantity', 'unlimited_stock')
        }),
        ('Analytics', {
            'fields': ('rating', 'review_count', 'order_count', 'created_at', 'updated_at')
        }),
    )


@admin.register(MenuItemReview)
class MenuItemReviewAdmin(admin.ModelAdmin):
    list_display = ['menu_item', 'customer_name', 'rating', 'is_verified_purchase', 'created_at']
    list_filter = ['rating', 'is_verified_purchase', 'created_at']
    search_fields = ['customer_name', 'customer_email', 'comment']
    readonly_fields = ['created_at']


@admin.register(MenuSpecial)
class MenuSpecialAdmin(admin.ModelAdmin):
    list_display = ['name', 'special_type', 'is_active', 'start_date', 'end_date']
    list_filter = ['special_type', 'is_active']
    search_fields = ['name', 'description']
    filter_horizontal = ['menu_items']
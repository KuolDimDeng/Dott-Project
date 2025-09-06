"""
Serializers for Menu Management
"""
from rest_framework import serializers
from .models import MenuCategory, MenuItem, MenuItemReview, MenuSpecial


class MenuCategorySerializer(serializers.ModelSerializer):
    item_count = serializers.SerializerMethodField()
    
    class Meta:
        model = MenuCategory
        fields = [
            'id', 'name', 'description', 'category_type', 
            'display_order', 'is_active', 'icon', 'item_count'
        ]
        read_only_fields = ['id', 'item_count']
    
    def get_item_count(self, obj):
        return obj.menu_items.filter(is_available=True).count()


class MenuItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    profit_margin = serializers.ReadOnlyField()
    effective_price = serializers.ReadOnlyField()
    
    class Meta:
        model = MenuItem
        fields = [
            'id', 'name', 'description', 'category', 'category_name',
            'price', 'discounted_price', 'cost', 'effective_price', 'profit_margin',
            'image_url', 'thumbnail_url', 'additional_images',
            'is_available', 'is_featured', 'is_new', 'is_popular',
            'preparation_time', 'serving_size', 'calories',
            'is_vegetarian', 'is_vegan', 'is_gluten_free', 'is_dairy_free',
            'is_halal', 'is_kosher', 'is_spicy', 'spice_level',
            'allergens', 'ingredients', 'customization_options',
            'display_order', 'tags', 'stock_quantity', 'unlimited_stock',
            'rating', 'review_count', 'order_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'rating', 'review_count', 'order_count', 'created_at', 'updated_at']
    
    def validate_discounted_price(self, value):
        if value and self.initial_data.get('price'):
            if value >= self.initial_data['price']:
                raise serializers.ValidationError("Discounted price must be less than regular price")
        return value


class MenuItemListSerializer(serializers.ModelSerializer):
    """Simplified serializer for list views"""
    category_name = serializers.CharField(source='category.name', read_only=True)
    effective_price = serializers.ReadOnlyField()
    
    class Meta:
        model = MenuItem
        fields = [
            'id', 'name', 'description', 'category_name',
            'price', 'discounted_price', 'effective_price',
            'image_url', 'is_available', 'is_featured',
            'is_vegetarian', 'is_vegan', 'is_gluten_free',
            'preparation_time', 'rating', 'order_count'
        ]


class MenuItemCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating menu items with minimal required fields"""
    class Meta:
        model = MenuItem
        fields = [
            'name', 'description', 'category', 'price', 'image_url',
            'is_available', 'preparation_time', 'serving_size'
        ]
    
    def create(self, validated_data):
        # Set tenant_id from request context
        request = self.context.get('request')
        if request and hasattr(request, 'user') and hasattr(request.user, 'tenant'):
            validated_data['tenant_id'] = request.user.tenant.id
        return super().create(validated_data)


class MenuItemReviewSerializer(serializers.ModelSerializer):
    menu_item_name = serializers.CharField(source='menu_item.name', read_only=True)
    
    class Meta:
        model = MenuItemReview
        fields = [
            'id', 'menu_item', 'menu_item_name', 'customer_name',
            'customer_email', 'rating', 'comment', 
            'is_verified_purchase', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'is_verified_purchase']


class MenuSpecialSerializer(serializers.ModelSerializer):
    menu_items_details = MenuItemListSerializer(source='menu_items', many=True, read_only=True)
    
    class Meta:
        model = MenuSpecial
        fields = [
            'id', 'name', 'description', 'special_type',
            'menu_items', 'menu_items_details',
            'start_date', 'end_date', 'start_time', 'end_time',
            'monday', 'tuesday', 'wednesday', 'thursday',
            'friday', 'saturday', 'sunday',
            'discount_percentage', 'fixed_price',
            'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
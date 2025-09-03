from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import BusinessListing, ConsumerProfile, BusinessSearch
from inventory.models import Product, Service

User = get_user_model()

class BusinessListingSerializer(serializers.ModelSerializer):
    """Serializer for business marketplace listings"""
    business_name = serializers.CharField(source='business.business_name', read_only=True)
    business_email = serializers.EmailField(source='business.email', read_only=True)
    total_products = serializers.SerializerMethodField()
    is_open_now = serializers.SerializerMethodField()
    distance_km = serializers.FloatField(read_only=True, required=False)
    business_type_display = serializers.CharField(source='get_business_type_display', read_only=True)
    
    class Meta:
        model = BusinessListing
        fields = [
            'id', 'business', 'business_name', 'business_email',
            'business_type', 'business_type_display', 'secondary_categories',
            'delivery_scope', 'delivery_radius_km', 'ships_to_countries',
            'is_digital_only', 'country', 'city', 'latitude', 'longitude',
            'is_visible_in_marketplace', 'is_verified', 'is_featured',
            'business_hours', 'is_open_now', 'search_tags', 'description',
            'average_rating', 'total_reviews', 'total_orders', 'total_products',
            'average_response_time', 'response_rate', 'distance_km',
            'created_at', 'updated_at', 'last_active'
        ]
        read_only_fields = ['id', 'average_rating', 'total_reviews', 'total_orders']
    
    def get_total_products(self, obj):
        """Get total number of active products"""
        return Product.objects.filter(
            tenant_id=obj.business.tenant_id,
            is_active=True
        ).count()
    
    def get_is_open_now(self, obj):
        """Check if business is currently open"""
        from datetime import datetime
        import pytz
        
        if not obj.business_hours:
            return True  # Default to open if no hours set
        
        # Get current day and time
        tz = pytz.timezone('Africa/Nairobi')  # Use business timezone
        now = datetime.now(tz)
        day = now.strftime('%A').lower()
        current_time = now.strftime('%H:%M')
        
        # Check if open today
        if day in obj.business_hours:
            hours = obj.business_hours[day]
            if hours.get('closed'):
                return False
            
            open_time = hours.get('open', '00:00')
            close_time = hours.get('close', '23:59')
            
            return open_time <= current_time <= close_time
        
        return False


class ConsumerProfileSerializer(serializers.ModelSerializer):
    """Serializer for consumer profiles"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = ConsumerProfile
        fields = [
            'id', 'user', 'user_email', 'user_name',
            'default_delivery_address', 'delivery_addresses',
            'current_latitude', 'current_longitude', 'current_city', 'current_country',
            'preferred_categories', 'favorite_businesses', 'recent_searches',
            'total_orders', 'total_spent', 'average_order_value',
            'consumer_rating', 'total_ratings_received',
            'preferred_payment_method', 'notification_preferences',
            'created_at', 'updated_at', 'last_order_at'
        ]
        read_only_fields = [
            'id', 'total_orders', 'total_spent', 'average_order_value',
            'consumer_rating', 'total_ratings_received'
        ]


class BusinessSearchSerializer(serializers.ModelSerializer):
    """Serializer for business search tracking"""
    
    class Meta:
        model = BusinessSearch
        fields = [
            'id', 'consumer', 'search_query', 'category_filter',
            'location_filter', 'consumer_country', 'consumer_city',
            'consumer_latitude', 'consumer_longitude', 'results_count',
            'clicked_results', 'resulted_in_order', 'order_id',
            'searched_at', 'device_type'
        ]
        read_only_fields = ['id', 'searched_at']


class LocationUpdateSerializer(serializers.Serializer):
    """Serializer for updating consumer location"""
    latitude = serializers.FloatField(required=True)
    longitude = serializers.FloatField(required=True)
    city = serializers.CharField(required=False, max_length=100)
    country = serializers.CharField(required=False, max_length=2)


class ProductSerializer(serializers.ModelSerializer):
    """Serializer for products in marketplace"""
    business_name = serializers.SerializerMethodField()
    in_stock = serializers.SerializerMethodField()
    
    class Meta:
        model = Product
        fields = [
            'id', 'name', 'description', 'sku', 'price', 'cost',
            'quantity', 'in_stock', 'unit', 'category', 'image_url',
            'is_active', 'business_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_business_name(self, obj):
        """Get business name from tenant"""
        try:
            from users.models import UserProfile
            profile = UserProfile.objects.filter(tenant_id=obj.tenant_id).first()
            return profile.business_name if profile else None
        except:
            return None
    
    def get_in_stock(self, obj):
        """Check if product is in stock"""
        return obj.quantity > 0


class ServiceSerializer(serializers.ModelSerializer):
    """Serializer for services in marketplace"""
    business_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Service
        fields = [
            'id', 'name', 'description', 'price', 'duration_minutes',
            'category', 'is_active', 'business_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_business_name(self, obj):
        """Get business name from tenant"""
        try:
            from users.models import UserProfile
            profile = UserProfile.objects.filter(tenant_id=obj.tenant_id).first()
            return profile.business_name if profile else None
        except:
            return None
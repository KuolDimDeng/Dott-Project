from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import BusinessListing, ConsumerProfile, BusinessSearch
from .order_models import ConsumerOrder, OrderReview
from inventory.models import Product, Service

User = get_user_model()

class BusinessListingSerializer(serializers.ModelSerializer):
    """Serializer for business marketplace listings"""
    business_name = serializers.SerializerMethodField()
    business_email = serializers.EmailField(source='business.email', read_only=True)
    total_products = serializers.SerializerMethodField()
    is_open_now = serializers.SerializerMethodField()
    distance_km = serializers.FloatField(read_only=True, required=False)
    business_type_display = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    total_reviews = serializers.SerializerMethodField()
    
    class Meta:
        model = BusinessListing
        fields = [
            'id', 'business', 'business_name', 'business_email',
            'business_type', 'business_type_display', 'secondary_categories',
            'delivery_scope', 'delivery_radius_km', 'ships_to_countries',
            'is_digital_only', 'country', 'city', 'latitude', 'longitude',
            'is_visible_in_marketplace', 'is_verified', 'is_featured',
            'business_hours', 'is_open_now', 'search_tags', 'description',
            'logo_url', 'logo_public_id', 'cover_image_url', 'cover_image_public_id',
            'gallery_images', 'average_rating', 'total_reviews', 'total_orders', 'total_products',
            'average_response_time', 'response_rate', 'distance_km',
            'created_at', 'updated_at', 'last_active'
        ]
        read_only_fields = ['id', 'total_orders']
    
    def get_business_name(self, obj):
        """Get business name from multiple sources in priority order"""
        try:
            # Priority 1: Tenant name (most authoritative)
            if hasattr(obj.business, 'tenant') and obj.business.tenant:
                tenant_name = obj.business.tenant.name
                if tenant_name and tenant_name != '' and '@' not in tenant_name:
                    return tenant_name
            
            # Priority 2: UserProfile business_name
            if hasattr(obj.business, 'profile'):
                profile = obj.business.profile
                if profile.business_name and profile.business_name != '' and '@' not in profile.business_name:
                    return profile.business_name
                if profile.name and profile.name != '' and '@' not in profile.name:
                    return profile.name
            
            # Priority 3: User's name field
            if hasattr(obj.business, 'name') and obj.business.name:
                if obj.business.name != '' and '@' not in obj.business.name:
                    return obj.business.name
            
            # Last resort: Format email
            if obj.business.email:
                name_part = obj.business.email.split('@')[0]
                return name_part.replace('.', ' ').replace('_', ' ').title() + ' Business'
            
            return 'Unnamed Business'
        except Exception as e:
            # Log error for debugging
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error getting business name: {e}")
            return 'Unnamed Business'
    
    def get_total_products(self, obj):
        """Get total number of active products"""
        return Product.objects.filter(
            tenant_id=obj.business.tenant_id,
            is_active=True
        ).count()
    
    def get_is_open_now(self, obj):
        """Return business open/closed status from model field (linked to business menu status)"""
        # Use the is_open_now field from the model which is controlled by the business owner
        # This links to the business's actual status from their business menu screen
        return obj.is_open_now
    
    def get_business_type_display(self, obj):
        """Get clean business type display name"""
        # Clean up the business type display
        if obj.business_type == 'RESTAURANT_CAFE':
            return 'Restaurant'
        elif obj.business_type == 'GROCERY_MARKET':
            return 'Grocery Store'
        elif obj.business_type == 'MEDICAL_DENTAL':
            return 'Medical Practice'
        elif obj.business_type == 'AUTO_PARTS_REPAIR':
            return 'Auto Repair'
        elif obj.business_type == 'FASHION_CLOTHING':
            return 'Fashion & Clothing'
        elif obj.business_type == 'ELECTRONICS_TECH':
            return 'Electronics'
        elif obj.business_type == 'HARDWARE_BUILDING':
            return 'Hardware Store'
        elif obj.business_type == 'BOOKSTORE_STATIONERY':
            return 'Bookstore'
        elif obj.business_type == 'FUEL_STATION':
            return 'Fuel Station'
        elif obj.business_type == 'SALON_SPA':
            return 'Salon & Spa'
        elif obj.business_type == 'FITNESS_CENTER':
            return 'Fitness Center'
        elif obj.business_type == 'HOTEL_HOSPITALITY':
            return 'Hotel'
        elif obj.business_type == 'TRANSPORT_SERVICE':
            return 'Transport'
        elif obj.business_type == 'FINANCIAL_SERVICES':
            return 'Financial Services'
        else:
            # For other types, capitalize properly
            return obj.business_type.replace('_', ' ').title()
    
    def get_average_rating(self, obj):
        """Get average rating with threshold logic"""
        # Only show rating if there are 10+ reviews to avoid bias
        if obj.total_reviews < 10:
            return None  # Will show "Be the first to rate" in frontend
        return float(obj.average_rating) if obj.average_rating else 0.0
    
    def get_total_reviews(self, obj):
        """Get total reviews with threshold logic"""
        # Only show review count if there are 10+ reviews
        if obj.total_reviews < 10:
            return 0  # Frontend will show "Be the first to rate"
        return obj.total_reviews


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


class ConsumerOrderSerializer(serializers.ModelSerializer):
    """Serializer for consumer orders"""
    consumer_name = serializers.CharField(source='consumer.full_name', read_only=True)
    consumer_email = serializers.EmailField(source='consumer.email', read_only=True)
    business_name = serializers.CharField(source='business.business_name', read_only=True)
    courier_name = serializers.CharField(source='courier.user.full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = ConsumerOrder
        fields = [
            'id', 'order_number', 'consumer', 'consumer_name', 'consumer_email',
            'business', 'business_name', 'courier', 'courier_name',
            'items', 'subtotal', 'tax_amount', 'delivery_fee', 'discount_amount',
            'total_amount', 'order_status', 'payment_status', 'payment_method',
            'delivery_address', 'delivery_notes', 'estimated_delivery_time',
            'actual_delivery_time', 'courier_assigned_at', 'courier_accepted_at',
            'courier_earnings', 'delivery_pin', 'pin_generated_at', 'pin_verified',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'order_number', 'consumer_name', 'consumer_email',
            'business_name', 'courier_name', 'created_at', 'updated_at'
        ]


class OrderReviewSerializer(serializers.ModelSerializer):
    """Serializer for order reviews"""
    order_number = serializers.CharField(source='order.order_number', read_only=True)
    
    class Meta:
        model = OrderReview
        fields = '__all__'
        read_only_fields = ['id', 'created_at']

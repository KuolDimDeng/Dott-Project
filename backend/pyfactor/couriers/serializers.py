"""
Courier API Serializers
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import CourierProfile, DeliveryOrder, CourierEarnings, CourierNotification, DeliveryTracking
from marketplace.models import BusinessListing
from marketplace.order_models import ConsumerOrder
from users.models import Business

User = get_user_model()


class CourierRegistrationSerializer(serializers.Serializer):
    """Serializer for courier registration through business creation"""
    # Business info
    business_name = serializers.CharField(max_length=255)
    business_type = serializers.CharField(default='Transport/Delivery')
    legal_structure = serializers.CharField()
    city = serializers.CharField()
    country = serializers.CharField(max_length=2)
    phone_number = serializers.CharField()
    
    # Vehicle info
    vehicle_type = serializers.ChoiceField(choices=CourierProfile.VEHICLE_TYPES)
    vehicle_make = serializers.CharField(required=False)
    vehicle_model = serializers.CharField(required=False)
    vehicle_year = serializers.IntegerField(required=False)
    vehicle_color = serializers.CharField(required=False)
    vehicle_registration = serializers.CharField()
    
    # License info
    license_number = serializers.CharField()
    license_expiry = serializers.DateField()
    license_front_photo = serializers.CharField()  # Base64
    license_back_photo = serializers.CharField()  # Base64
    
    # ID verification
    id_type = serializers.ChoiceField(choices=[
        ('national_id', 'National ID'),
        ('passport', 'Passport'),
        ('voter_id', 'Voter ID'),
    ])
    id_number = serializers.CharField()
    id_front_photo = serializers.CharField()  # Base64
    id_back_photo = serializers.CharField(required=False)  # Base64
    selfie_with_id = serializers.CharField()  # Base64
    
    # Service configuration
    service_radius_km = serializers.IntegerField(default=10)
    accepts_cash = serializers.BooleanField(default=True)
    accepts_food_delivery = serializers.BooleanField(default=True)
    
    # Banking info
    bank_account_number = serializers.CharField(required=False)
    bank_name = serializers.CharField(required=False)
    mpesa_number = serializers.CharField(required=False)
    preferred_payout_method = serializers.CharField(default='mpesa')
    
    # Emergency contact
    emergency_contact_name = serializers.CharField(required=False)
    emergency_contact_phone = serializers.CharField(required=False)


class CourierProfileSerializer(serializers.ModelSerializer):
    """Full courier profile serializer"""
    user_email = serializers.EmailField(source='user.email', read_only=True)
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    business_name = serializers.CharField(source='business.name', read_only=True)
    
    class Meta:
        model = CourierProfile
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_deliveries', 
                          'successful_deliveries', 'average_rating', 'total_earnings']


class CourierStatusSerializer(serializers.ModelSerializer):
    """Serializer for courier status updates"""
    class Meta:
        model = CourierProfile
        fields = ['availability_status', 'current_latitude', 'current_longitude']


class DeliveryOrderSerializer(serializers.ModelSerializer):
    """Full delivery order serializer"""
    consumer_name = serializers.CharField(source='consumer.get_full_name', read_only=True)
    business_name = serializers.CharField(source='business.business.name', read_only=True)
    courier_name = serializers.CharField(source='courier.user.get_full_name', read_only=True)
    
    class Meta:
        model = DeliveryOrder
        fields = '__all__'
        read_only_fields = ['id', 'order_number', 'created_at', 'updated_at', 
                          'platform_fee', 'courier_earnings']


class DeliveryOrderListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing orders"""
    consumer_name = serializers.CharField(source='consumer.get_full_name', read_only=True)
    business_name = serializers.CharField(source='business.business.name', read_only=True)
    
    class Meta:
        model = DeliveryOrder
        fields = ['id', 'order_number', 'consumer_name', 'business_name', 'status', 
                 'pickup_address', 'delivery_address', 'delivery_fee', 'created_at']


class AcceptDeliverySerializer(serializers.Serializer):
    """Serializer for accepting a delivery"""
    estimated_pickup_time = serializers.DateTimeField(required=False)
    estimated_delivery_time = serializers.DateTimeField(required=False)
    notes = serializers.CharField(required=False)


class UpdateDeliveryStatusSerializer(serializers.Serializer):
    """Serializer for updating delivery status"""
    status = serializers.ChoiceField(choices=DeliveryOrder.ORDER_STATUS)
    notes = serializers.CharField(required=False)
    photo = serializers.CharField(required=False)  # Base64 for proof of delivery
    signature = serializers.CharField(required=False)  # Base64 signature
    delivered_to_name = serializers.CharField(required=False)


class DeliveryTrackingSerializer(serializers.ModelSerializer):
    """Serializer for delivery tracking points"""
    class Meta:
        model = DeliveryTracking
        fields = '__all__'
        read_only_fields = ['id', 'recorded_at']


class CourierEarningsSerializer(serializers.ModelSerializer):
    """Serializer for courier earnings"""
    courier_name = serializers.CharField(source='courier.user.get_full_name', read_only=True)
    
    class Meta:
        model = CourierEarnings
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'net_earnings']


class CourierNotificationSerializer(serializers.ModelSerializer):
    """Serializer for courier notifications"""
    delivery_order_number = serializers.CharField(source='delivery_order.order_number', read_only=True)
    
    class Meta:
        model = CourierNotification
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class CourierDashboardSerializer(serializers.Serializer):
    """Dashboard summary for couriers"""
    today_deliveries = serializers.IntegerField()
    today_earnings = serializers.DecimalField(max_digits=10, decimal_places=2)
    pending_earnings = serializers.DecimalField(max_digits=10, decimal_places=2)
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    acceptance_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    on_time_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    active_order = DeliveryOrderSerializer(required=False)
    nearby_orders = serializers.ListField(child=DeliveryOrderListSerializer())
    recent_notifications = serializers.ListField(child=CourierNotificationSerializer())


class NearbyCourierSerializer(serializers.Serializer):
    """Serializer for nearby couriers (for consumers)"""
    courier_id = serializers.UUIDField()
    name = serializers.CharField()
    vehicle_type = serializers.CharField()
    rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    distance_km = serializers.DecimalField(max_digits=5, decimal_places=2)
    estimated_arrival_minutes = serializers.IntegerField()
    latitude = serializers.DecimalField(max_digits=10, decimal_places=7)
    longitude = serializers.DecimalField(max_digits=10, decimal_places=7)
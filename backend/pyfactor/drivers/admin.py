from django.contrib import admin
from .models import DriverProfile, DeliveryOrder, DriverEarnings, DriverNotification, DeliveryTracking


@admin.register(DriverProfile)
class DriverProfileAdmin(admin.ModelAdmin):
    list_display = ['user', 'vehicle_type', 'availability_status', 'is_verified', 'trust_level', 'average_rating']
    list_filter = ['availability_status', 'is_verified', 'trust_level', 'vehicle_type']
    search_fields = ['user__email', 'license_number', 'vehicle_registration']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(DeliveryOrder)
class DeliveryOrderAdmin(admin.ModelAdmin):
    list_display = ['order_number', 'consumer', 'driver', 'status', 'delivery_fee', 'created_at']
    list_filter = ['status', 'payment_method', 'is_paid', 'created_at']
    search_fields = ['order_number', 'consumer__email', 'driver__user__email']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(DriverEarnings)
class DriverEarningsAdmin(admin.ModelAdmin):
    list_display = ['driver', 'period_start', 'period_end', 'net_earnings', 'payout_status']
    list_filter = ['payout_status', 'period_start']
    search_fields = ['driver__user__email']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(DriverNotification)
class DriverNotificationAdmin(admin.ModelAdmin):
    list_display = ['driver', 'notification_type', 'title', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'is_pushed']
    search_fields = ['driver__user__email', 'title']
    readonly_fields = ['id', 'created_at']


@admin.register(DeliveryTracking)
class DeliveryTrackingAdmin(admin.ModelAdmin):
    list_display = ['delivery_order', 'latitude', 'longitude', 'recorded_at']
    list_filter = ['recorded_at']
    search_fields = ['delivery_order__order_number']
    readonly_fields = ['id']
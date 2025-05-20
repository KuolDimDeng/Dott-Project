"""
Ultra-lightweight serializers for service module.
These serializers are designed to be extremely fast and minimal.
"""
from rest_framework import serializers
from .models import Service

class UltraLightweightServiceSerializer(serializers.ModelSerializer):
    """
    An ultra-lightweight serializer for Service model that includes only the bare minimum fields.
    This is optimized for list views where minimal data is needed for initial rendering.
    Additional data can be loaded on demand.
    """
    class Meta:
        model = Service
        fields = [
            'id', 
            'name', 
            'service_code', 
            'price',
            'is_recurring'
        ]
        read_only_fields = ('service_code',)

class ServiceListSerializer(serializers.ModelSerializer):
    """
    A serializer for service lists with minimal fields.
    This is a good balance between performance and usability.
    """
    class Meta:
        model = Service
        fields = [
            'id', 
            'name', 
            'service_code', 
            'price',
            'is_for_sale',
            'is_recurring',
            'duration'
        ]
        read_only_fields = ('service_code',)

class ServiceStatsSerializer(serializers.Serializer):
    """
    A serializer for service statistics.
    This is used for dashboard widgets and summary views.
    """
    total_services = serializers.IntegerField()
    total_recurring = serializers.IntegerField()
    avg_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    newest_service = UltraLightweightServiceSerializer(allow_null=True)
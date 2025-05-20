from rest_framework import serializers
from .models import (
    Equipment, Driver, Route, Load, 
    Expense, Maintenance, Compliance
)

class EquipmentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Equipment
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')

class DriverSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Driver
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_user_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}" if obj.user else None

class RouteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Route
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')

class LoadSerializer(serializers.ModelSerializer):
    customer_name = serializers.SerializerMethodField()
    driver_name = serializers.SerializerMethodField()
    equipment_name = serializers.SerializerMethodField()
    route_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Load
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_customer_name(self, obj):
        return obj.customer.customerName if obj.customer else None
    
    def get_driver_name(self, obj):
        return f"{obj.driver.first_name} {obj.driver.last_name}" if obj.driver else None
    
    def get_equipment_name(self, obj):
        return obj.equipment.name if obj.equipment else None
    
    def get_route_name(self, obj):
        return obj.route.name if obj.route else None

class ExpenseSerializer(serializers.ModelSerializer):
    load_reference = serializers.SerializerMethodField()
    equipment_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_load_reference(self, obj):
        return obj.load.reference_number if obj.load else None
    
    def get_equipment_name(self, obj):
        return obj.equipment.name if obj.equipment else None
    
    def get_created_by_name(self, obj):
        return f"{obj.created_by.first_name} {obj.created_by.last_name}" if obj.created_by else None

class MaintenanceSerializer(serializers.ModelSerializer):
    equipment_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Maintenance
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_equipment_name(self, obj):
        return obj.equipment.name if obj.equipment else None

class ComplianceSerializer(serializers.ModelSerializer):
    equipment_name = serializers.SerializerMethodField()
    driver_name = serializers.SerializerMethodField()
    is_expired = serializers.BooleanField(read_only=True)
    days_until_expiration = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Compliance
        fields = '__all__'
        read_only_fields = ('id', 'created_at', 'updated_at', 'is_expired', 'days_until_expiration')
    
    def get_equipment_name(self, obj):
        return obj.equipment.name if obj.equipment else None
    
    def get_driver_name(self, obj):
        return f"{obj.driver.first_name} {obj.driver.last_name}" if obj.driver else None

# Nested serializers for detailed views
class EquipmentDetailSerializer(EquipmentSerializer):
    maintenance_records = MaintenanceSerializer(many=True, read_only=True)
    compliance_records = ComplianceSerializer(many=True, read_only=True)
    expenses = ExpenseSerializer(many=True, read_only=True)
    loads = LoadSerializer(many=True, read_only=True)
    
    class Meta(EquipmentSerializer.Meta):
        fields = EquipmentSerializer.Meta.fields

class DriverDetailSerializer(DriverSerializer):
    compliance_records = ComplianceSerializer(many=True, read_only=True)
    loads = LoadSerializer(many=True, read_only=True)
    
    class Meta(DriverSerializer.Meta):
        fields = DriverSerializer.Meta.fields

class RouteDetailSerializer(RouteSerializer):
    loads = LoadSerializer(many=True, read_only=True)
    
    class Meta(RouteSerializer.Meta):
        fields = RouteSerializer.Meta.fields

class LoadDetailSerializer(LoadSerializer):
    expenses = ExpenseSerializer(many=True, read_only=True)
    
    class Meta(LoadSerializer.Meta):
        fields = LoadSerializer.Meta.fields
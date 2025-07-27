from rest_framework import serializers
from decimal import Decimal
from .models import Job, JobMaterial, JobLabor, JobExpense, Vehicle, JobAssignment
from crm.serializers import CustomerSerializer
from hr.serializers import EmployeeSerializer
from inventory.serializers import ProductSerializer

class VehicleSerializer(serializers.ModelSerializer):
    """Serializer for Vehicle model"""
    assigned_to_name = serializers.CharField(source='assigned_to.user.get_full_name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    vehicle_type_display = serializers.CharField(source='get_vehicle_type_display', read_only=True)
    fuel_type_display = serializers.CharField(source='get_fuel_type_display', read_only=True)
    service_due = serializers.SerializerMethodField()
    
    class Meta:
        model = Vehicle
        fields = [
            'id', 'registration_number', 'vehicle_type', 'vehicle_type_display',
            'make', 'model', 'year', 'color', 'vin', 'fuel_type', 'fuel_type_display',
            'mileage', 'license_plate', 'status', 'status_display', 'is_available',
            'assigned_to', 'assigned_to_name', 'purchase_date', 'purchase_price',
            'insurance_policy', 'insurance_expiry', 'last_service_date',
            'next_service_date', 'service_interval_miles', 'service_due',
            'notes', 'photo', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'service_due']
    
    def get_service_due(self, obj):
        """Check if service is due"""
        return obj.check_service_due()


class JobSerializer(serializers.ModelSerializer):
    """Serializer for Job model with basic fields"""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    lead_employee_name = serializers.CharField(source='lead_employee.user.get_full_name', read_only=True)
    assigned_employees = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    vehicle_info = serializers.SerializerMethodField()
    total_cost = serializers.SerializerMethodField()
    profit_margin = serializers.SerializerMethodField()
    
    class Meta:
        model = Job
        fields = [
            'id', 'job_number', 'name', 'description', 'customer', 'customer_name',
            'status', 'quote_date', 'scheduled_date', 'start_date', 'completion_date',
            'quoted_amount', 'labor_rate', 'lead_employee', 'lead_employee_name',
            'assigned_employees', 'vehicle', 'vehicle_info',
            'total_cost', 'profit_margin', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_cost', 'profit_margin']
    
    def get_total_cost(self, obj):
        """Calculate total cost for the job"""
        return obj.get_total_cost()
    
    def get_profit_margin(self, obj):
        """Calculate profit margin percentage"""
        return obj.get_profit_margin()
    
    def get_vehicle_info(self, obj):
        """Get vehicle info if assigned"""
        if obj.vehicle:
            return {
                'id': obj.vehicle.id,
                'name': str(obj.vehicle),
                'registration': obj.vehicle.registration_number
            }
        return None

class JobDetailSerializer(JobSerializer):
    """Detailed serializer for Job with related objects"""
    customer = CustomerSerializer(read_only=True)
    lead_employee = EmployeeSerializer(read_only=True)
    assigned_employees = EmployeeSerializer(many=True, read_only=True)
    vehicle = VehicleSerializer(read_only=True)
    materials_count = serializers.SerializerMethodField()
    labor_entries_count = serializers.SerializerMethodField()
    expenses_count = serializers.SerializerMethodField()
    
    class Meta(JobSerializer.Meta):
        fields = JobSerializer.Meta.fields + [
            'materials_count', 'labor_entries_count', 'expenses_count'
        ]
    
    def get_materials_count(self, obj):
        return obj.materials.count()
    
    def get_labor_entries_count(self, obj):
        return obj.labor_entries.count()
    
    def get_expenses_count(self, obj):
        return obj.expenses.count()

class JobMaterialSerializer(serializers.ModelSerializer):
    """Serializer for JobMaterial model"""
    supply_name = serializers.CharField(source='supply.name', read_only=True)
    supply_unit = serializers.CharField(source='supply.unit', read_only=True)
    total_cost = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()
    
    class Meta:
        model = JobMaterial
        fields = [
            'id', 'supply', 'supply_name', 'supply_unit', 'quantity',
            'unit_cost', 'unit_price', 'markup_percentage', 'is_billable',
            'notes', 'used_date', 'total_cost', 'total_price',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_cost', 'total_price', 'created_at', 'updated_at']
    
    def get_total_cost(self, obj):
        return obj.get_total_cost()
    
    def get_total_price(self, obj):
        return obj.get_total_price()

class JobLaborSerializer(serializers.ModelSerializer):
    """Serializer for JobLabor model"""
    employee_name = serializers.CharField(source='employee.user.get_full_name', read_only=True)
    total_cost = serializers.SerializerMethodField()
    
    class Meta:
        model = JobLabor
        fields = [
            'id', 'employee', 'employee_name', 'work_date', 'hours',
            'hourly_rate', 'work_description', 'is_billable', 'is_overtime',
            'overtime_multiplier', 'total_cost', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_cost', 'created_at', 'updated_at']
    
    def get_total_cost(self, obj):
        return obj.get_total_cost()

class JobExpenseSerializer(serializers.ModelSerializer):
    """Serializer for JobExpense model"""
    billable_amount = serializers.SerializerMethodField()
    
    class Meta:
        model = JobExpense
        fields = [
            'id', 'expense_type', 'description', 'amount', 'is_billable',
            'markup_percentage', 'expense_date', 'vendor_name', 'receipt_number',
            'billable_amount', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'billable_amount', 'created_at', 'updated_at']
    
    def get_billable_amount(self, obj):
        return obj.get_billable_amount()

class JobCostingSerializer(serializers.Serializer):
    """Serializer for job costing analysis"""
    job_id = serializers.IntegerField()
    job_number = serializers.CharField()
    quoted_amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    material_cost = serializers.DecimalField(max_digits=10, decimal_places=2)
    labor_cost = serializers.DecimalField(max_digits=10, decimal_places=2)
    expense_cost = serializers.DecimalField(max_digits=10, decimal_places=2)
    total_cost = serializers.DecimalField(max_digits=10, decimal_places=2)
    profit = serializers.DecimalField(max_digits=10, decimal_places=2)
    profit_margin = serializers.DecimalField(max_digits=5, decimal_places=2)
    material_count = serializers.IntegerField()
    labor_entries_count = serializers.IntegerField()
    expense_count = serializers.IntegerField()
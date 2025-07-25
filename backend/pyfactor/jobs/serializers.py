from rest_framework import serializers
from decimal import Decimal
from .models import Job, JobMaterial, JobLabor, JobExpense
from crm.serializers import CustomerSerializer
from hr.serializers import EmployeeSerializer
from inventory.serializers import ProductSerializer

class JobSerializer(serializers.ModelSerializer):
    """Serializer for Job model with basic fields"""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    assigned_to_name = serializers.CharField(source='assigned_to.user.get_full_name', read_only=True)
    total_cost = serializers.SerializerMethodField()
    profit_margin = serializers.SerializerMethodField()
    
    class Meta:
        model = Job
        fields = [
            'id', 'job_number', 'name', 'description', 'customer', 'customer_name',
            'status', 'quote_date', 'scheduled_date', 'start_date', 'completion_date',
            'quoted_amount', 'labor_rate', 'assigned_to', 'assigned_to_name',
            'total_cost', 'profit_margin', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_cost', 'profit_margin']
    
    def get_total_cost(self, obj):
        """Calculate total cost for the job"""
        return obj.get_total_cost()
    
    def get_profit_margin(self, obj):
        """Calculate profit margin percentage"""
        return obj.get_profit_margin()

class JobDetailSerializer(JobSerializer):
    """Detailed serializer for Job with related objects"""
    customer = CustomerSerializer(read_only=True)
    assigned_to = EmployeeSerializer(read_only=True)
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
from rest_framework import serializers
from decimal import Decimal
from .models import (
    Job, JobMaterial, JobLabor, JobExpense, Vehicle, JobAssignment,
    JobDocument, JobStatusHistory, JobCommunication, JobInvoice
)

# Import related serializers with error handling
try:
    from crm.serializers import CustomerSerializer
except ImportError:
    CustomerSerializer = None

try:
    from hr.serializers import EmployeeSerializer
except ImportError:
    EmployeeSerializer = None

try:
    from inventory.serializers import ProductSerializer
except ImportError:
    ProductSerializer = None

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
    recurrence_pattern_display = serializers.CharField(source='get_recurrence_pattern_display', read_only=True)
    recurrence_day_of_week_display = serializers.CharField(source='get_recurrence_day_of_week_display', read_only=True)
    recurring_instances_count = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Job
        fields = [
            'id', 'job_number', 'name', 'description', 'customer', 'customer_name',
            'status', 'status_display', 'quote_date', 'scheduled_date', 'start_date', 'completion_date',
            'job_street', 'job_city', 'job_state', 'job_zip', 'job_country',
            'quoted_amount', 'labor_rate', 'deposit_amount', 'deposit_paid', 'final_amount',
            'quote_valid_until', 'quote_sent_date', 'quote_sent_via', 'quote_version',
            'terms_conditions', 'customer_signature', 'customer_signed_date', 'customer_signed_name',
            'supervisor_signature', 'supervisor_signed_date', 'supervisor_signed_by',
            'last_customer_contact', 'internal_notes', 'invoice_id', 'invoice_sent_date',
            'payment_received_date', 'lead_employee', 'lead_employee_name',
            'assigned_employees', 'vehicle', 'vehicle_info',
            'is_recurring', 'recurrence_pattern', 'recurrence_pattern_display',
            'recurrence_end_date', 'recurrence_day_of_week', 'recurrence_day_of_week_display',
            'recurrence_day_of_month', 'recurrence_skip_holidays',
            'parent_job', 'job_series_id', 'is_exception', 'recurring_instances_count',
            'total_cost', 'profit_margin', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'total_cost', 'profit_margin', 
                           'recurring_instances_count', 'job_series_id']
    
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
    
    def get_recurring_instances_count(self, obj):
        """Get count of recurring instances if this is a parent job"""
        if obj.is_recurring and not obj.parent_job:
            return obj.recurring_instances.count()
        return 0

class JobDetailSerializer(JobSerializer):
    """Detailed serializer for Job with related objects"""
    vehicle = VehicleSerializer(read_only=True)
    materials_count = serializers.SerializerMethodField()
    labor_entries_count = serializers.SerializerMethodField()
    expenses_count = serializers.SerializerMethodField()
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        
        # Add related serializers only if available
        if CustomerSerializer:
            self.fields['customer'] = CustomerSerializer(read_only=True)
        if EmployeeSerializer:
            self.fields['lead_employee'] = EmployeeSerializer(read_only=True)
            self.fields['assigned_employees'] = EmployeeSerializer(many=True, read_only=True)
    
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
    material_name = serializers.CharField(source='material.name', read_only=True)
    material_unit = serializers.CharField(source='material.display_unit', read_only=True)
    total_cost = serializers.SerializerMethodField()
    total_price = serializers.SerializerMethodField()
    
    class Meta:
        model = JobMaterial
        fields = [
            'id', 'material', 'material_name', 'material_unit', 'quantity',
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


class JobDocumentSerializer(serializers.ModelSerializer):
    """Serializer for JobDocument model"""
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    
    class Meta:
        model = JobDocument
        fields = [
            'id', 'job', 'document_type', 'document_type_display', 'title', 'description',
            'file_url', 'file_name', 'file_size', 'file_type',
            'amount', 'vendor_name', 'expense_date', 'is_billable',
            'uploaded_by', 'uploaded_by_name', 'uploaded_at',
            'ocr_extracted_text', 'ocr_confidence'
        ]
        read_only_fields = ['id', 'uploaded_at', 'uploaded_by_name', 'document_type_display']


class JobStatusHistorySerializer(serializers.ModelSerializer):
    """Serializer for JobStatusHistory model"""
    changed_by_name = serializers.CharField(source='changed_by.get_full_name', read_only=True)
    from_status_display = serializers.CharField(source='get_from_status_display', read_only=True)
    to_status_display = serializers.CharField(source='get_to_status_display', read_only=True)
    
    class Meta:
        model = JobStatusHistory
        fields = [
            'id', 'job', 'from_status', 'from_status_display', 
            'to_status', 'to_status_display',
            'changed_by', 'changed_by_name', 'changed_at',
            'reason', 'latitude', 'longitude'
        ]
        read_only_fields = ['id', 'changed_at', 'changed_by_name']


class JobCommunicationSerializer(serializers.ModelSerializer):
    """Serializer for JobCommunication model"""
    sent_by_name = serializers.CharField(source='sent_by.get_full_name', read_only=True)
    communication_type_display = serializers.CharField(source='get_communication_type_display', read_only=True)
    direction_display = serializers.CharField(source='get_direction_display', read_only=True)
    
    class Meta:
        model = JobCommunication
        fields = [
            'id', 'job', 'communication_type', 'communication_type_display',
            'direction', 'direction_display', 'subject', 'content',
            'contact_name', 'contact_email', 'contact_phone',
            'sent_by', 'sent_by_name', 'sent_at',
            'is_delivered', 'delivered_at', 'is_read', 'read_at',
            'has_attachments', 'attachment_urls'
        ]
        read_only_fields = ['id', 'sent_at', 'sent_by_name']


class JobInvoiceSerializer(serializers.ModelSerializer):
    """Serializer for JobInvoice model"""
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    invoice_total = serializers.DecimalField(source='invoice.total_amount', read_only=True, max_digits=10, decimal_places=2)
    
    class Meta:
        model = JobInvoice
        fields = [
            'id', 'job', 'invoice', 'invoice_number', 'invoice_total',
            'includes_materials', 'includes_labor', 'includes_expenses',
            'materials_percentage', 'labor_percentage', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'invoice_number', 'invoice_total']


class JobQuoteSendSerializer(serializers.Serializer):
    """Serializer for sending job quotes"""
    send_via = serializers.ChoiceField(choices=['email', 'whatsapp', 'both', 'print'])
    email_address = serializers.EmailField(required=False)
    phone_number = serializers.CharField(required=False)
    include_terms = serializers.BooleanField(default=True)
    
    def validate(self, data):
        send_via = data.get('send_via')
        if send_via in ['email', 'both'] and not data.get('email_address'):
            raise serializers.ValidationError("Email address is required when sending via email")
        if send_via in ['whatsapp', 'both'] and not data.get('phone_number'):
            raise serializers.ValidationError("Phone number is required when sending via WhatsApp")
        return data


class JobSignatureSerializer(serializers.Serializer):
    """Serializer for capturing job signatures"""
    signature_type = serializers.ChoiceField(choices=['customer', 'supervisor'])
    signature_data = serializers.CharField(help_text="Base64 encoded signature image")
    signed_name = serializers.CharField(max_length=200)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False)
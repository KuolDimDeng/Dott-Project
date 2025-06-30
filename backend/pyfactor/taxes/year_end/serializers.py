from rest_framework import serializers
from taxes.models import (
    W2Form, W3Form, Form1099NEC, Form1099MISC, Form1096,
    YearEndTaxGeneration
)


class W2FormSerializer(serializers.ModelSerializer):
    employee_name = serializers.SerializerMethodField()
    
    class Meta:
        model = W2Form
        fields = [
            'id', 'employee_id', 'employee_name', 'tax_year', 'control_number',
            'wages_tips_other', 'federal_income_tax_withheld',
            'social_security_wages', 'social_security_tax_withheld',
            'medicare_wages_tips', 'medicare_tax_withheld',
            'social_security_tips', 'allocated_tips', 'advance_eic_payment',
            'dependent_care_benefits', 'nonqualified_plans',
            'box12_codes', 'statutory_employee', 'retirement_plan',
            'third_party_sick_pay', 'box14_other',
            'state_wages_tips', 'local_wages_tips',
            'status', 'pdf_file', 'pdf_generated_at',
            'distributed_to_employee', 'distribution_date', 'distribution_method',
            'efiled_to_ssa', 'ssa_submission_id', 'ssa_submission_date',
            'is_correction', 'original_w2_id', 'correction_code',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'pdf_generated_at']
    
    def get_employee_name(self, obj):
        # Get employee name from users app
        try:
            from users.models import Employee
            employee = Employee.objects.get(id=obj.employee_id)
            return f"{employee.first_name} {employee.last_name}"
        except:
            return "Unknown Employee"


class W3FormSerializer(serializers.ModelSerializer):
    class Meta:
        model = W3Form
        fields = [
            'id', 'tax_year', 'control_number', 'kind_of_payer',
            'total_forms', 'total_wages', 'total_federal_tax',
            'total_ss_wages', 'total_ss_tax', 'total_medicare_wages',
            'total_medicare_tax', 'total_ss_tips', 'total_allocated_tips',
            'total_advance_eic', 'total_dependent_care', 'total_nonqualified_plans',
            'total_deferred_compensation', 'third_party_sick_pay',
            'status', 'submission_date', 'ssa_tracking_number',
            'pdf_file', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class Form1099NECSerializer(serializers.ModelSerializer):
    vendor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Form1099NEC
        fields = [
            'id', 'vendor_id', 'vendor_name', 'tax_year', 'form_type',
            'recipient_tin', 'recipient_name', 'recipient_address',
            'account_number', 'status', 'nonemployee_compensation',
            'payer_made_direct_sales', 'federal_tax_withheld',
            'state_tax_info', 'corrected', 'void',
            'pdf_file', 'pdf_generated_at',
            'distributed_to_recipient', 'distribution_date', 'distribution_method',
            'efiled_to_irs', 'irs_submission_id', 'irs_submission_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'pdf_generated_at']
    
    def get_vendor_name(self, obj):
        # Get vendor name from purchases app
        try:
            from purchases.models import Vendor
            vendor = Vendor.objects.get(id=obj.vendor_id)
            return vendor.company_name or f"{vendor.first_name} {vendor.last_name}"
        except:
            return obj.recipient_name


class Form1099MISCSerializer(serializers.ModelSerializer):
    vendor_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Form1099MISC
        fields = [
            'id', 'vendor_id', 'vendor_name', 'tax_year', 'form_type',
            'recipient_tin', 'recipient_name', 'recipient_address',
            'account_number', 'status',
            'rents', 'royalties', 'other_income', 'fishing_boat_proceeds',
            'medical_healthcare_payments', 'substitute_payments',
            'direct_sales_indicator', 'crop_insurance_proceeds',
            'gross_proceeds_attorney', 'section_409a_deferrals',
            'excess_golden_parachute', 'nonqualified_deferred_comp',
            'federal_tax_withheld', 'state_tax_info',
            'corrected', 'void',
            'pdf_file', 'pdf_generated_at',
            'distributed_to_recipient', 'distribution_date', 'distribution_method',
            'efiled_to_irs', 'irs_submission_id', 'irs_submission_date',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'pdf_generated_at']
    
    def get_vendor_name(self, obj):
        # Get vendor name from purchases app
        try:
            from purchases.models import Vendor
            vendor = Vendor.objects.get(id=obj.vendor_id)
            return vendor.company_name or f"{vendor.first_name} {vendor.last_name}"
        except:
            return obj.recipient_name


class Form1096Serializer(serializers.ModelSerializer):
    class Meta:
        model = Form1096
        fields = [
            'id', 'tax_year', 'form_types_included',
            'total_forms', 'total_amount_reported',
            'filer_name', 'filer_address', 'filer_tin',
            'contact_name', 'contact_phone', 'contact_email',
            'status', 'submission_date', 'irs_tracking_number',
            'pdf_file', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class YearEndTaxGenerationSerializer(serializers.ModelSerializer):
    class Meta:
        model = YearEndTaxGeneration
        fields = [
            'id', 'tax_year', 'generation_type', 'status',
            'total_forms_expected', 'total_forms_generated', 'total_forms_distributed',
            'w2_count', 'w3_generated',
            'form_1099_nec_count', 'form_1099_misc_count', 'form_1096_generated',
            'started_at', 'completed_at', 'error_message',
            'generated_forms', 'initiated_by',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class VendorTaxSummarySerializer(serializers.Serializer):
    """Serializer for vendor tax summary information"""
    vendor_id = serializers.UUIDField()
    name = serializers.CharField()
    tin = serializers.CharField()
    tin_valid = serializers.BooleanField()
    total_payments = serializers.DecimalField(max_digits=12, decimal_places=2)
    payment_breakdown = serializers.DictField()
    forms_required = serializers.ListField(child=serializers.CharField())


class GenerateYearEndFormsSerializer(serializers.Serializer):
    """Serializer for year-end form generation request"""
    tax_year = serializers.IntegerField(required=True, min_value=2020, max_value=2050)
    regenerate = serializers.BooleanField(default=False, required=False)
    form_types = serializers.ListField(
        child=serializers.ChoiceField(choices=['w2', '1099', 'all']),
        default=['all']
    )
    send_notifications = serializers.BooleanField(default=True)


class W2CorrectionSerializer(serializers.Serializer):
    """Serializer for W-2 correction data"""
    wages_tips_other = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    federal_income_tax_withheld = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    social_security_wages = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    social_security_tax_withheld = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    medicare_wages_tips = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    medicare_tax_withheld = serializers.DecimalField(max_digits=12, decimal_places=2, required=False)
    correction_reason = serializers.CharField(max_length=200, required=True)
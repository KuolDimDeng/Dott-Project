from rest_framework import serializers
from .models import (
    PayrollRun, PayrollTransaction, TaxForm, PaySetting, PayStatement,
    PaymentDepositMethod, IncomeWithholding, BonusPayment
)
from hr.models import Timesheet, TimesheetEntry

class PayrollTimesheetSerializer(serializers.ModelSerializer):
    entries = serializers.SerializerMethodField()
    employee_name = serializers.CharField(source='employee.get_full_name', read_only=True)
    
    class Meta:
        model = Timesheet
        fields = ['id', 'timesheet_number', 'employee', 'employee_name', 
                 'period_start', 'period_end', 'total_regular_hours', 
                 'total_overtime_hours', 'status', 'entries']
    
    def get_entries(self, obj):
        entries = obj.entries.all()
        return TimesheetEntrySerializer(entries, many=True).data

class TimesheetEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = TimesheetEntry
        fields = ['id', 'date', 'regular_hours', 'overtime_hours', 'project', 'description']

class PayrollRunSerializer(serializers.ModelSerializer):
    class Meta:
        model = PayrollRun
        fields = '__all__'

class PayrollTransactionSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.get_full_name', read_only=True)
    timesheet_number = serializers.CharField(source='timesheet.timesheet_number', read_only=True, allow_null=True)
    
    class Meta:
        model = PayrollTransaction
        fields = [
            'id', 'employee', 'employee_name', 'payroll_run', 'timesheet',
            'timesheet_number', 'gross_pay', 'net_pay', 'taxes',
            'federal_tax', 'state_tax', 'state_code', 'medicare_tax',
            'social_security_tax', 'additional_withholdings'
        ]

class TaxFormSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxForm
        fields = '__all__'


class PaySettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaySetting
        fields = [
            'id', 'business_id', 'pay_frequency', 'pay_days', 'pay_weekday',
            'enable_direct_deposit', 'enable_bonuses', 'enable_commissions',
            'enable_recurring_allowances', 'enable_overtime', 'overtime_rate',
            'processing_lead_time', 'notify_employees_on_payday',
            'notify_payroll_admins_before_processing', 'admin_notification_days',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'business_id', 'created_at', 'updated_at']


class PayStatementSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    
    class Meta:
        model = PayStatement
        fields = [
            'id', 'employee', 'employee_name', 'business_id', 'statement_type',
            'pay_period_start', 'pay_period_end', 'pay_date', 'gross_pay', 'net_pay',
            'regular_hours', 'overtime_hours', 'pto_hours', 'sick_hours', 'holiday_hours',
            'federal_tax', 'state_tax', 'local_tax', 'medicare', 'social_security',
            'health_insurance', 'dental_insurance', 'vision_insurance', 'retirement_401k',
            'other_deductions', 'ytd_gross', 'ytd_net', 'ytd_federal_tax', 'ytd_state_tax',
            'ytd_medicare', 'ytd_social_security', 'additional_info', 'notes',
            'pdf_file', 'payroll_transaction', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'business_id', 'created_at', 'updated_at']


class PaymentDepositMethodSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    
    class Meta:
        model = PaymentDepositMethod
        fields = [
            'id', 'employee', 'employee_name', 'business_id', 'method_type',
            'bank_name', 'account_last_four', 'routing_number_last_four', 'account_type',
            'email', 'phone', 'username', 'wallet_address', 'crypto_currency',
            'is_default', 'is_active', 'payment_provider_id',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class IncomeWithholdingSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    
    class Meta:
        model = IncomeWithholding
        fields = [
            'id', 'employee', 'employee_name', 'business_id', 'tax_year',
            'filing_status', 'multiple_jobs', 'claim_dependents', 'dependent_amount',
            'other_income', 'deductions', 'extra_withholding',
            'state_code', 'state_filing_status', 'state_allowances', 'state_additional_withholding',
            'ca_filing_status', 'ca_allowances', 'ca_additional_withholding',
            'ny_filing_status', 'ny_allowances', 'ny_additional_withholding',
            'nyc_resident', 'yonkers_resident',
            'pa_additional_withholding', 'pa_work_municipality', 'pa_residence_municipality',
            'il_allowances', 'il_basic_allowances', 'il_additional_withholding',
            'is_electronically_signed', 'signature_date', 'ip_address',
            'w4_form_file', 'last_updated', 'last_updated_by'
        ]
        read_only_fields = ['id', 'last_updated']


class BonusPaymentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.full_name', read_only=True)
    
    class Meta:
        model = BonusPayment
        fields = [
            'id', 'employee', 'employee_name', 'business_id', 'bonus_type',
            'amount', 'description', 'is_approved', 'approved_by', 'approved_at',
            'is_paid', 'payment_date', 'payroll_transaction',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
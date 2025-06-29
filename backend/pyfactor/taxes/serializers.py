# taxes/serializers.py
from rest_framework import serializers
from .models import (
    State, IncomeTaxRate, PayrollTaxFiling, TaxFilingInstruction, TaxForm,
    TaxDataEntryControl, TaxDataEntryLog, TaxDataAbuseReport, TaxDataBlacklist,
    TaxSettings, TaxApiUsage, TaxFilingLocation, TaxReminder
)

class StateSerializer(serializers.ModelSerializer):
    class Meta:
        model = State
        fields = '__all__'

class IncomeTaxRateSerializer(serializers.ModelSerializer):
    state_code = serializers.CharField(source='state.code', read_only=True)
    
    class Meta:
        model = IncomeTaxRate
        fields = '__all__'
        
    def validate(self, data):
        """Validate tax rate data based on flat or progressive tax"""
        if data.get('is_flat_rate'):
            # Flat rates don't need income bounds
            data['income_min'] = None
            data['income_max'] = None
        else:
            # Progressive rates need income bounds
            if not data.get('income_min') and data.get('income_min') != 0:
                raise serializers.ValidationError("Income minimum is required for progressive tax rates")
        return data

class PayrollTaxFilingSerializer(serializers.ModelSerializer):
    state_code = serializers.CharField(source='state.code', read_only=True)
    
    class Meta:
        model = PayrollTaxFiling
        fields = '__all__'
        read_only_fields = ('submission_date', 'confirmation_number')

class TaxFilingInstructionSerializer(serializers.ModelSerializer):
    state_code = serializers.CharField(source='state.code', read_only=True)
    state_name = serializers.CharField(source='state.name', read_only=True)
    
    class Meta:
        model = TaxFilingInstruction
        fields = '__all__'

class TaxFormSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.__str__', read_only=True)
    ssn_last_four = serializers.SerializerMethodField()
    
    class Meta:
        model = TaxForm
        fields = [
            'id', 'employee', 'employee_name', 'form_type', 'tax_year', 
            'filing_status', 'submission_date', 'employer_id_number', 
            'file', 'state_code', 'state_employer_id', 'is_verified',
            'verified_by', 'verification_date', 'was_filed', 
            'filing_confirmation', 'ssn_last_four'
        ]
        read_only_fields = [
            'id', 'submission_date', 'ssn_last_four', 'is_verified',
            'verified_by', 'verification_date'
        ]
        
    def get_ssn_last_four(self, obj):
        """Get the SSN last four digits from employee through Stripe"""
        return obj.get_ssn_last_four()


class TaxDataEntryControlSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxDataEntryControl
        fields = [
            'id', 'control_type', 'max_entries_per_hour', 'max_entries_per_day',
            'max_entries_per_month', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TaxDataEntryLogSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = TaxDataEntryLog
        fields = [
            'id', 'control_type', 'entry_type', 'user', 'user_email',
            'ip_address', 'user_agent', 'status', 'entry_count',
            'details', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class TaxDataAbuseReportSerializer(serializers.ModelSerializer):
    user_email = serializers.CharField(source='user.email', read_only=True)
    resolved_by_email = serializers.CharField(source='resolved_by.email', read_only=True)
    
    class Meta:
        model = TaxDataAbuseReport
        fields = [
            'id', 'report_type', 'severity', 'status', 'user', 'user_email',
            'description', 'evidence', 'action_taken', 'created_at',
            'updated_at', 'resolved_at', 'resolved_by', 'resolved_by_email'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TaxDataBlacklistSerializer(serializers.ModelSerializer):
    created_by_email = serializers.CharField(source='created_by.email', read_only=True)
    
    class Meta:
        model = TaxDataBlacklist
        fields = [
            'id', 'blacklist_type', 'identifier', 'reason', 'is_active',
            'created_at', 'expires_at', 'created_by', 'created_by_email'
        ]
        read_only_fields = ['id', 'created_at']


class TaxSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxSettings
        fields = [
            'id', 'business_name', 'business_type', 'country', 'state_province',
            'city', 'postal_code', 'sales_tax_rate', 'income_tax_rate',
            'payroll_tax_rate', 'filing_website', 'filing_address',
            'filing_deadlines', 'ai_suggested', 'ai_confidence_score',
            'approved_by_name', 'approved_by_signature', 'approved_at',
            'approval_ip_address', 'confirmation_email_sent',
            'confirmation_email_sent_at', 'confirmation_email_sent_to',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TaxApiUsageSerializer(serializers.ModelSerializer):
    resets_at = serializers.SerializerMethodField()
    
    class Meta:
        model = TaxApiUsage
        fields = [
            'id', 'month_year', 'api_calls_count', 'cache_hits_count',
            'monthly_limit', 'plan_type', 'resets_at', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_resets_at(self, obj):
        """Calculate when the monthly usage resets"""
        from datetime import datetime
        from dateutil.relativedelta import relativedelta
        
        # Parse month_year (YYYY-MM format)
        year, month = map(int, obj.month_year.split('-'))
        current_date = datetime(year, month, 1)
        
        # Get first day of next month
        next_month = current_date + relativedelta(months=1)
        return next_month.isoformat()


class TaxFilingLocationSerializer(serializers.ModelSerializer):
    is_stale = serializers.ReadOnlyField()
    
    class Meta:
        model = TaxFilingLocation
        fields = [
            'id', 'country', 'state_province', 'city', 'postal_code',
            'federal_website', 'federal_name', 'federal_address', 'federal_phone', 'federal_email',
            'state_website', 'state_name', 'state_address', 'state_phone', 'state_email',
            'local_website', 'local_name', 'local_address', 'local_phone', 'local_email',
            'filing_deadlines', 'special_instructions', 'tax_types',
            'last_updated', 'created_at', 'verified', 'lookup_count', 'is_stale'
        ]
        read_only_fields = ['id', 'last_updated', 'created_at', 'lookup_count', 'is_stale']


class TaxReminderSerializer(serializers.ModelSerializer):
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = TaxReminder
        fields = [
            'id', 'title', 'description', 'reminder_type', 'due_date',
            'status', 'created_at', 'updated_at', 'is_overdue'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_is_overdue(self, obj):
        """Check if reminder is overdue"""
        from django.utils import timezone
        return obj.status == 'pending' and obj.due_date < timezone.now().date()
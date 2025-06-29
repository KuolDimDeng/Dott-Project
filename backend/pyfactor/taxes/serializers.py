# taxes/serializers.py
from rest_framework import serializers
from .models import (
    State, IncomeTaxRate, PayrollTaxFiling, TaxFilingInstruction, TaxForm,
    TaxDataEntryControl, TaxDataEntryLog, TaxDataAbuseReport, TaxDataBlacklist
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
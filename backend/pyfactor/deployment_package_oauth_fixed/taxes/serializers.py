# taxes/serializers.py
from rest_framework import serializers
from .models import State, IncomeTaxRate, PayrollTaxFiling, TaxFilingInstruction, TaxForm

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
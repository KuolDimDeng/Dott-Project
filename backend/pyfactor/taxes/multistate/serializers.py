"""
Serializers for multi-state tax operations API.
Handles serialization of nexus profiles, apportionment factors, and multi-state filings.
"""

from rest_framework import serializers
from decimal import Decimal
from typing import Dict, List
from .models import (
    MultistateNexusProfile, StateNexusStatus, BusinessActivity,
    ApportionmentFactors, MultistateReturn, StateReturnFiling,
    NexusThresholdMonitoring, ReciprocityAgreement, ConsolidatedGroup
)
from .nexus_tracker import NexusTracker
from .apportionment_calculator import ApportionmentCalculator


class BusinessActivitySerializer(serializers.ModelSerializer):
    """Serializer for business activities that may create nexus"""
    
    class Meta:
        model = BusinessActivity
        fields = [
            'id', 'activity_type', 'state', 'description', 'start_date', 'end_date',
            'address', 'city', 'zip_code', 'annual_value', 'creates_nexus',
            'nexus_analysis', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'nexus_analysis']
    
    def validate(self, data):
        """Validate business activity data"""
        if data.get('end_date') and data.get('start_date'):
            if data['end_date'] <= data['start_date']:
                raise serializers.ValidationError(
                    "End date must be after start date"
                )
        return data


class StateNexusStatusSerializer(serializers.ModelSerializer):
    """Serializer for state nexus status"""
    
    threshold_percentage = serializers.SerializerMethodField()
    compliance_requirements = serializers.SerializerMethodField()
    
    class Meta:
        model = StateNexusStatus
        fields = [
            'id', 'state', 'tax_type', 'has_nexus', 'nexus_types',
            'nexus_effective_date', 'current_sales', 'current_transactions',
            'current_payroll', 'current_property', 'sales_threshold',
            'transaction_threshold', 'threshold_analysis', 'is_registered',
            'registration_date', 'registration_number', 'filing_frequency',
            'next_filing_due', 'threshold_percentage', 'compliance_requirements',
            'last_threshold_check'
        ]
        read_only_fields = [
            'id', 'nexus_determination_date', 'last_threshold_check',
            'threshold_percentage', 'compliance_requirements'
        ]
    
    def get_threshold_percentage(self, obj):
        """Calculate percentage of threshold reached"""
        if obj.sales_threshold and obj.current_sales:
            return float((obj.current_sales / obj.sales_threshold) * 100)
        return 0.0
    
    def get_compliance_requirements(self, obj):
        """Get compliance requirements based on nexus status"""
        requirements = []
        if obj.has_nexus:
            if obj.tax_type == 'sales_tax':
                requirements = [
                    "Register for sales tax permit",
                    "File periodic sales tax returns",
                    "Collect and remit sales tax",
                    "Maintain transaction records"
                ]
            elif obj.tax_type == 'income_tax':
                requirements = [
                    "Register for income/franchise tax",
                    "File annual income tax return",
                    "Make estimated tax payments",
                    "Calculate proper apportionment"
                ]
        return requirements


class MultistateNexusProfileSerializer(serializers.ModelSerializer):
    """Serializer for multistate nexus profile"""
    
    state_nexus_statuses = StateNexusStatusSerializer(many=True, read_only=True)
    business_activities = BusinessActivitySerializer(many=True, read_only=True)
    nexus_states_count = serializers.SerializerMethodField()
    total_compliance_issues = serializers.SerializerMethodField()
    
    class Meta:
        model = MultistateNexusProfile
        fields = [
            'id', 'business_name', 'federal_ein', 'home_state', 'business_type',
            'tax_year_end', 'preferred_filing_method', 'enable_nexus_monitoring',
            'nexus_check_frequency', 'threshold_warning_percentage',
            'last_nexus_review', 'next_nexus_review', 'compliance_status',
            'settings', 'state_nexus_statuses', 'business_activities',
            'nexus_states_count', 'total_compliance_issues'
        ]
        read_only_fields = [
            'id', 'last_nexus_review', 'nexus_states_count', 'total_compliance_issues'
        ]
    
    def get_nexus_states_count(self, obj):
        """Count states with established nexus"""
        return obj.state_nexus_statuses.filter(has_nexus=True).count()
    
    def get_total_compliance_issues(self, obj):
        """Count total compliance issues"""
        return obj.threshold_monitoring.filter(
            is_active=True, 
            acknowledged=False
        ).count()


class ApportionmentFactorsSerializer(serializers.ModelSerializer):
    """Serializer for apportionment factors"""
    
    total_apportionment = serializers.SerializerMethodField()
    state_breakdown = serializers.SerializerMethodField()
    
    class Meta:
        model = ApportionmentFactors
        fields = [
            'id', 'tax_year', 'total_sales', 'total_payroll', 'total_property',
            'total_income', 'state_sales', 'state_payroll', 'state_property',
            'sales_factors', 'payroll_factors', 'property_factors',
            'apportionment_percentages', 'throwback_adjustments', 'nowhere_sales',
            'validation_warnings', 'calculation_method', 'is_final',
            'approved_by', 'approved_date', 'total_apportionment', 'state_breakdown'
        ]
        read_only_fields = [
            'id', 'calculation_date', 'total_apportionment', 'state_breakdown'
        ]
    
    def get_total_apportionment(self, obj):
        """Calculate total apportionment percentage"""
        return sum(Decimal(str(pct)) for pct in obj.apportionment_percentages.values())
    
    def get_state_breakdown(self, obj):
        """Get detailed breakdown by state"""
        breakdown = []
        for state in obj.apportionment_percentages.keys():
            breakdown.append({
                'state': state,
                'sales': obj.state_sales.get(state, 0),
                'payroll': obj.state_payroll.get(state, 0),
                'property': obj.state_property.get(state, 0),
                'sales_factor': obj.sales_factors.get(state, 0),
                'payroll_factor': obj.payroll_factors.get(state, 0),
                'property_factor': obj.property_factors.get(state, 0),
                'apportionment_percentage': obj.apportionment_percentages.get(state, 0)
            })
        return breakdown


class StateReturnFilingSerializer(serializers.ModelSerializer):
    """Serializer for individual state return filings"""
    
    class Meta:
        model = StateReturnFiling
        fields = [
            'id', 'state', 'state_return_type', 'state_form_number',
            'apportioned_income', 'apportionment_percentage', 'taxable_income',
            'tax_rate', 'gross_tax', 'credits', 'net_tax', 'minimum_tax',
            'total_tax_due', 'estimated_payments', 'withholding', 'balance_due',
            'refund', 'filing_status', 'confirmation_number', 'acknowledgment_date',
            'state_specific_data'
        ]
        read_only_fields = ['id', 'acknowledgment_date']


class MultistateReturnSerializer(serializers.ModelSerializer):
    """Serializer for multistate tax returns"""
    
    state_filings = StateReturnFilingSerializer(many=True, read_only=True)
    apportionment_summary = serializers.SerializerMethodField()
    
    class Meta:
        model = MultistateReturn
        fields = [
            'id', 'return_type', 'tax_year', 'filing_period', 'filing_status',
            'due_date', 'filed_date', 'extended_due_date', 'state_tax_calculations',
            'total_tax_due', 'total_payments_made', 'balance_due', 'refund_due',
            'filing_method', 'electronic_filing', 'compliance_issues',
            'review_notes', 'state_filings', 'apportionment_summary'
        ]
        read_only_fields = ['id', 'filed_date', 'apportionment_summary']
    
    def get_apportionment_summary(self, obj):
        """Get summary of apportionment factors used"""
        if obj.apportionment_factors:
            return {
                'total_income': obj.apportionment_factors.total_income,
                'apportionment_percentages': obj.apportionment_factors.apportionment_percentages,
                'calculation_method': obj.apportionment_factors.calculation_method
            }
        return None


class NexusThresholdMonitoringSerializer(serializers.ModelSerializer):
    """Serializer for nexus threshold monitoring alerts"""
    
    days_until_threshold = serializers.SerializerMethodField()
    
    class Meta:
        model = NexusThresholdMonitoring
        fields = [
            'id', 'alert_type', 'priority', 'state', 'tax_type', 'current_value',
            'threshold_value', 'percentage_of_threshold', 'message', 'recommendations',
            'is_active', 'acknowledged', 'acknowledged_by', 'acknowledged_date',
            'resolved', 'resolved_date', 'next_check_date', 'check_frequency_days',
            'days_until_threshold', 'created_at'
        ]
        read_only_fields = [
            'id', 'created_at', 'days_until_threshold'
        ]
    
    def get_days_until_threshold(self, obj):
        """Calculate estimated days until threshold is reached"""
        if obj.current_value and obj.threshold_value and obj.current_value < obj.threshold_value:
            # Simple projection based on current rate
            remaining = obj.threshold_value - obj.current_value
            # This would need more sophisticated calculation in real implementation
            return int(remaining / 1000)  # Placeholder calculation
        return None


class ReciprocityAgreementSerializer(serializers.ModelSerializer):
    """Serializer for reciprocity agreements"""
    
    class Meta:
        model = ReciprocityAgreement
        fields = [
            'id', 'state_a', 'state_b', 'agreement_type', 'effective_date',
            'expiration_date', 'description', 'tax_types_covered', 'conditions',
            'is_active'
        ]
        read_only_fields = ['id']


class ConsolidatedGroupSerializer(serializers.ModelSerializer):
    """Serializer for consolidated group filings"""
    
    class Meta:
        model = ConsolidatedGroup
        fields = [
            'id', 'group_name', 'parent_company', 'federal_ein', 'tax_year',
            'filing_method', 'member_entities', 'ownership_percentages',
            'combined_income', 'combined_apportionment', 'is_active'
        ]
        read_only_fields = ['id']


# Action serializers for complex operations

class NexusAnalysisRequestSerializer(serializers.Serializer):
    """Serializer for nexus analysis requests"""
    
    states = serializers.ListField(child=serializers.CharField(max_length=2))
    sales_data = serializers.DictField()
    business_activities = serializers.ListField(required=False)
    check_date = serializers.DateField(required=False)
    
    def validate_states(self, value):
        """Validate state codes"""
        valid_states = [
            'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
            'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
            'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
            'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
            'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
        ]
        
        for state in value:
            if state not in valid_states:
                raise serializers.ValidationError(f"Invalid state code: {state}")
        
        return value


class ApportionmentCalculationRequestSerializer(serializers.Serializer):
    """Serializer for apportionment calculation requests"""
    
    tax_year = serializers.IntegerField()
    total_income = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_sales = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_payroll = serializers.DecimalField(max_digits=15, decimal_places=2)
    total_property = serializers.DecimalField(max_digits=15, decimal_places=2)
    
    state_data = serializers.DictField(help_text="State-specific data")
    filing_method = serializers.ChoiceField(
        choices=['separate', 'combined', 'consolidated'],
        default='separate'
    )
    
    def validate_tax_year(self, value):
        """Validate tax year"""
        if value < 2020 or value > 2030:
            raise serializers.ValidationError("Tax year must be between 2020 and 2030")
        return value


class MultistateReturnGenerationRequestSerializer(serializers.Serializer):
    """Serializer for multistate return generation requests"""
    
    nexus_profile_id = serializers.UUIDField()
    return_type = serializers.ChoiceField(
        choices=['income_tax', 'franchise_tax', 'gross_receipts', 'combined_report']
    )
    tax_year = serializers.IntegerField()
    apportionment_factors_id = serializers.UUIDField()
    
    states_to_file = serializers.ListField(
        child=serializers.CharField(max_length=2),
        help_text="States where returns should be filed"
    )
    
    filing_method = serializers.ChoiceField(
        choices=['separate', 'combined', 'consolidated'],
        default='separate'
    )
    
    electronic_filing = serializers.BooleanField(default=True)
    due_date = serializers.DateField()
    extended_due_date = serializers.DateField(required=False)


class NexusUpdateRequestSerializer(serializers.Serializer):
    """Serializer for nexus status update requests"""
    
    nexus_profile_id = serializers.UUIDField()
    business_data = serializers.DictField(help_text="Updated business data")
    force_recalculation = serializers.BooleanField(default=False)
    notification_preferences = serializers.DictField(required=False)


class ComplianceReportRequestSerializer(serializers.Serializer):
    """Serializer for compliance report generation requests"""
    
    nexus_profile_id = serializers.UUIDField()
    report_type = serializers.ChoiceField(
        choices=['nexus_summary', 'threshold_monitoring', 'filing_requirements', 'full_compliance']
    )
    date_range_start = serializers.DateField()
    date_range_end = serializers.DateField()
    include_projections = serializers.BooleanField(default=True)
    states_filter = serializers.ListField(
        child=serializers.CharField(max_length=2),
        required=False
    )
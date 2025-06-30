"""
Serializers for Payroll Tax models
"""

from rest_framework import serializers
from decimal import Decimal
from django.utils import timezone
from taxes.models import (
    Form941, Form941ScheduleB, PayrollTaxDeposit,
    PayrollTaxFilingSchedule, EmployerTaxAccount,
    Form940, Form940ScheduleA, StateTaxAccount
)


class Form941ScheduleBSerializer(serializers.ModelSerializer):
    """Serializer for Form 941 Schedule B"""
    
    class Meta:
        model = Form941ScheduleB
        fields = [
            'id', 'daily_liabilities', 'month1_total', 'month2_total',
            'month3_total', 'quarter_total'
        ]
        read_only_fields = ['id']


class Form941Serializer(serializers.ModelSerializer):
    """Serializer for Form 941"""
    schedule_b = Form941ScheduleBSerializer(read_only=True)
    calculated_total_tax = serializers.SerializerMethodField()
    filing_status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Form941
        fields = [
            'id', 'quarter', 'year', 'period_start', 'period_end', 'due_date',
            'filing_date', 'status', 'filing_status_display',
            
            # Part 1
            'number_of_employees', 'wages_tips_compensation', 'federal_income_tax_withheld',
            'social_security_wages', 'social_security_tips', 'social_security_tax',
            'medicare_wages_tips', 'medicare_tax', 'additional_medicare_tax',
            
            # Totals
            'total_tax_before_adjustments', 'current_quarter_adjustments',
            'total_tax_after_adjustments',
            
            # Part 2
            'deposit_schedule', 'month1_liability', 'month2_liability', 'month3_liability',
            'total_deposits', 'balance_due', 'overpayment',
            
            # Schedule B
            'requires_schedule_b', 'schedule_b_data', 'schedule_b',
            
            # Part 3
            'business_closed', 'final_return', 'seasonal_employer',
            
            # E-filing
            'submission_id', 'irs_tracking_number', 'acknowledgment_number',
            'acknowledgment_date',
            
            # Validation
            'validation_errors', 'is_valid',
            
            # Metadata
            'created_at', 'updated_at', 'created_by',
            
            # Calculated fields
            'calculated_total_tax'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'filing_status_display',
            'calculated_total_tax'
        ]
    
    def get_calculated_total_tax(self, obj):
        """Get the calculated total tax"""
        return str(obj.calculate_total_tax())
    
    def validate(self, data):
        """Validate Form 941 data"""
        quarter = data.get('quarter')
        year = data.get('year')
        
        # Validate quarter
        if quarter and quarter not in [1, 2, 3, 4]:
            raise serializers.ValidationError({
                'quarter': 'Quarter must be 1, 2, 3, or 4'
            })
        
        # Validate year
        current_year = timezone.now().year
        if year and (year < 2020 or year > current_year + 1):
            raise serializers.ValidationError({
                'year': f'Year must be between 2020 and {current_year + 1}'
            })
        
        # Validate wages and taxes
        wages = data.get('wages_tips_compensation', Decimal('0'))
        ss_wages = data.get('social_security_wages', Decimal('0'))
        medicare_wages = data.get('medicare_wages_tips', Decimal('0'))
        
        if ss_wages > wages:
            raise serializers.ValidationError({
                'social_security_wages': 'Social Security wages cannot exceed total wages'
            })
        
        if medicare_wages > wages:
            raise serializers.ValidationError({
                'medicare_wages_tips': 'Medicare wages cannot exceed total wages'
            })
        
        return data
    
    def create(self, validated_data):
        """Create Form 941 with calculated dates"""
        quarter = validated_data['quarter']
        year = validated_data['year']
        
        # Calculate period dates
        quarter_dates = {
            1: ((1, 1), (3, 31), (4, 30)),
            2: ((4, 1), (6, 30), (7, 31)),
            3: ((7, 1), (9, 30), (10, 31)),
            4: ((10, 1), (12, 31), (1, 31))
        }
        
        start_month, start_day = quarter_dates[quarter][0]
        end_month, end_day = quarter_dates[quarter][1]
        due_month, due_day = quarter_dates[quarter][2]
        
        validated_data['period_start'] = timezone.datetime(
            year, start_month, start_day
        ).date()
        validated_data['period_end'] = timezone.datetime(
            year, end_month, end_day
        ).date()
        
        # Due date might be in next year for Q4
        due_year = year + 1 if quarter == 4 else year
        validated_data['due_date'] = timezone.datetime(
            due_year, due_month, due_day
        ).date()
        
        # Set created_by from context
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user.email
        
        return super().create(validated_data)


class PayrollTaxDepositSerializer(serializers.ModelSerializer):
    """Serializer for Payroll Tax Deposits"""
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = PayrollTaxDeposit
        fields = [
            'id', 'payroll_run_id', 'pay_date', 'deposit_date', 'due_date',
            'federal_income_tax', 'social_security_tax', 'medicare_tax',
            'total_deposit', 'status', 'status_display', 'payment_method',
            'confirmation_number', 'eftps_acknowledgment',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'status_display']
    
    def validate(self, data):
        """Validate deposit data"""
        # Calculate total if not provided
        if 'total_deposit' not in data or data['total_deposit'] == 0:
            data['total_deposit'] = (
                data.get('federal_income_tax', Decimal('0')) +
                data.get('social_security_tax', Decimal('0')) +
                data.get('medicare_tax', Decimal('0'))
            )
        
        # Validate deposit date vs due date
        if data.get('deposit_date') and data.get('due_date'):
            if data['deposit_date'] > data['due_date']:
                # This is a warning, not an error
                data.setdefault('metadata', {})['late_deposit'] = True
        
        return data


class PayrollTaxFilingScheduleSerializer(serializers.ModelSerializer):
    """Serializer for Payroll Tax Filing Schedule"""
    form_type_display = serializers.CharField(source='get_form_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = PayrollTaxFilingSchedule
        fields = [
            'id', 'form_type', 'form_type_display', 'year', 'quarter',
            'period_start', 'period_end', 'filing_deadline', 'extended_deadline',
            'status', 'status_display', 'filed_date', 'confirmation_number',
            'reminder_sent', 'reminder_date', 'state_code', 'is_overdue'
        ]
        read_only_fields = ['id', 'form_type_display', 'status_display', 'is_overdue']
    
    def get_is_overdue(self, obj):
        """Check if filing is overdue"""
        if obj.status in ['filed', 'extended']:
            return False
        return timezone.now().date() > obj.filing_deadline
    
    def validate(self, data):
        """Validate filing schedule data"""
        form_type = data.get('form_type')
        quarter = data.get('quarter')
        
        # Quarterly forms must have quarter
        if form_type in ['941', 'STATE_QUARTERLY'] and not quarter:
            raise serializers.ValidationError({
                'quarter': 'Quarter is required for quarterly forms'
            })
        
        # Annual forms should not have quarter
        if form_type in ['940', 'W2', '1099', 'STATE_ANNUAL'] and quarter:
            raise serializers.ValidationError({
                'quarter': 'Quarter should not be specified for annual forms'
            })
        
        return data


class EmployerTaxAccountSerializer(serializers.ModelSerializer):
    """Serializer for Employer Tax Account"""
    deposit_schedule_display = serializers.CharField(
        source='get_federal_deposit_schedule_display', 
        read_only=True
    )
    has_state_accounts = serializers.SerializerMethodField()
    
    class Meta:
        model = EmployerTaxAccount
        fields = [
            'id', 'ein', 'ein_verified', 'eftps_enrolled', 'eftps_pin',
            'state_accounts', 'federal_deposit_schedule', 'deposit_schedule_display',
            'previous_year_liability', 'tax_contact_name', 'tax_contact_email',
            'tax_contact_phone', 'has_poa', 'poa_firm_name', 'poa_caf_number',
            'created_at', 'updated_at', 'has_state_accounts'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'deposit_schedule_display',
            'has_state_accounts'
        ]
        extra_kwargs = {
            'eftps_pin': {'write_only': True}  # Never return PIN
        }
    
    def get_has_state_accounts(self, obj):
        """Check if any state accounts are configured"""
        return bool(obj.state_accounts)
    
    def validate_ein(self, value):
        """Validate EIN format"""
        # Remove any formatting
        ein_clean = value.replace('-', '').replace(' ', '')
        
        if len(ein_clean) != 9:
            raise serializers.ValidationError('EIN must be 9 digits')
        
        if not ein_clean.isdigit():
            raise serializers.ValidationError('EIN must contain only digits')
        
        # Format as XX-XXXXXXX
        return f"{ein_clean[:2]}-{ein_clean[2:]}"
    
    def validate_previous_year_liability(self, value):
        """Validate and set deposit schedule based on liability"""
        if value and value > Decimal('50000'):
            # Note: This is informational - the actual schedule update
            # should be done in the view or model
            self.context['suggested_schedule'] = 'semiweekly'
        
        return value


class PayrollTaxSummarySerializer(serializers.Serializer):
    """Summary serializer for payroll tax dashboard"""
    current_quarter = serializers.IntegerField()
    current_year = serializers.IntegerField()
    
    # Current quarter info
    current_quarter_wages = serializers.DecimalField(max_digits=15, decimal_places=2)
    current_quarter_tax_liability = serializers.DecimalField(max_digits=15, decimal_places=2)
    current_quarter_deposits = serializers.DecimalField(max_digits=15, decimal_places=2)
    current_quarter_balance = serializers.DecimalField(max_digits=15, decimal_places=2)
    
    # YTD info
    ytd_wages = serializers.DecimalField(max_digits=15, decimal_places=2)
    ytd_federal_tax = serializers.DecimalField(max_digits=15, decimal_places=2)
    ytd_social_security = serializers.DecimalField(max_digits=15, decimal_places=2)
    ytd_medicare = serializers.DecimalField(max_digits=15, decimal_places=2)
    ytd_total_tax = serializers.DecimalField(max_digits=15, decimal_places=2)
    
    # Upcoming deadlines
    upcoming_deadlines = serializers.ListField(
        child=serializers.DictField(),
        read_only=True
    )
    
    # Recent filings
    recent_filings = serializers.ListField(
        child=serializers.DictField(),
        read_only=True
    )
    
    # Compliance status
    deposit_schedule = serializers.CharField()
    all_deposits_current = serializers.BooleanField()
    all_filings_current = serializers.BooleanField()
    has_pending_notices = serializers.BooleanField()


class Form940ScheduleASerializer(serializers.ModelSerializer):
    """Serializer for Form 940 Schedule A"""
    credit_reduction_amount = serializers.DecimalField(
        max_digits=12, 
        decimal_places=2, 
        read_only=True
    )
    
    class Meta:
        model = Form940ScheduleA
        fields = [
            'id', 'state_code', 'state_ein', 'taxable_wages',
            'state_experience_rate', 'state_unemployment_tax_paid',
            'additional_contributions', 'total_contributions',
            'is_credit_reduction_state', 'credit_reduction_rate',
            'credit_reduction_amount', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'credit_reduction_amount']
    
    def validate_state_code(self, value):
        """Validate state code"""
        valid_states = [
            'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
            'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
            'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
            'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
            'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
            'DC', 'PR', 'VI'
        ]
        if value.upper() not in valid_states:
            raise serializers.ValidationError('Invalid state code')
        return value.upper()
    
    def validate(self, data):
        """Validate Schedule A data"""
        total_contributions = (
            data.get('state_unemployment_tax_paid', Decimal('0')) +
            data.get('additional_contributions', Decimal('0'))
        )
        
        if 'total_contributions' in data and data['total_contributions'] != total_contributions:
            raise serializers.ValidationError({
                'total_contributions': 'Total contributions must equal state tax paid plus additional contributions'
            })
        
        data['total_contributions'] = total_contributions
        return data


class Form940Serializer(serializers.ModelSerializer):
    """Serializer for Form 940"""
    schedule_a_states = Form940ScheduleASerializer(many=True, read_only=True)
    calculated_totals = serializers.SerializerMethodField()
    filing_status_display = serializers.CharField(source='get_status_display', read_only=True)
    validation_errors = serializers.SerializerMethodField()
    
    class Meta:
        model = Form940
        fields = [
            'id', 'year', 'ein', 'business_name', 'trade_name', 'address',
            
            # Part 1
            'amended_return', 'successor_employer', 'no_payments_to_employees', 'final_return',
            
            # Part 2
            'total_payments', 'payments_exempt_from_futa', 'payments_exceeding_7000',
            'total_taxable_futa_wages',
            
            # Part 3
            'adjustments_fringe_benefits', 'adjustments_group_life', 'adjustments_retirement',
            'adjustments_dependent_care', 'adjustments_other', 'total_adjustments',
            
            # Part 4
            'adjusted_taxable_futa_wages', 'futa_tax_rate', 'futa_tax_before_adjustments',
            'futa_tax_adjustments', 'futa_tax_after_adjustments',
            
            # Part 5
            'state_contributions_paid', 'state_taxable_wages', 'additional_tax_credit_reduction',
            'credit_reduction_states', 'total_credit_reduction', 'state_credit_allowable',
            
            # Part 6
            'total_futa_tax',
            
            # Part 7
            'first_quarter_liability', 'second_quarter_liability', 'third_quarter_liability',
            'fourth_quarter_liability', 'total_tax_liability',
            
            # Part 8
            'total_deposits', 'balance_due', 'overpayment', 'overpayment_applied_to_next_return',
            'overpayment_refunded',
            
            # Multi-state info
            'is_multi_state', 'schedule_a_attached', 'schedule_a_states',
            
            # Filing info
            'status', 'filing_status_display', 'filing_date', 'due_date', 'confirmation_number',
            
            # Third-party designee
            'third_party_designee', 'designee_name', 'designee_phone', 'designee_pin',
            
            # Signature
            'signer_name', 'signer_title', 'signature_date',
            
            # Preparer
            'paid_preparer', 'preparer_name', 'preparer_ptin', 'preparer_firm_name',
            'preparer_firm_ein', 'preparer_firm_address',
            
            # Metadata
            'created_at', 'updated_at', 'calculated_totals', 'validation_errors'
        ]
        read_only_fields = [
            'id', 'created_at', 'updated_at', 'filing_status_display',
            'calculated_totals', 'validation_errors'
        ]
    
    def get_calculated_totals(self, obj):
        """Get calculated totals for verification"""
        return {
            'taxable_wages_calculated': (
                obj.total_payments - obj.payments_exempt_from_futa - obj.payments_exceeding_7000
            ),
            'total_adjustments_calculated': (
                obj.adjustments_fringe_benefits + obj.adjustments_group_life +
                obj.adjustments_retirement + obj.adjustments_dependent_care +
                obj.adjustments_other
            ),
            'quarterly_total_calculated': (
                obj.first_quarter_liability + obj.second_quarter_liability +
                obj.third_quarter_liability + obj.fourth_quarter_liability
            ),
            'balance_calculated': obj.total_tax_liability - obj.total_deposits
        }
    
    def get_validation_errors(self, obj):
        """Get validation errors if any"""
        from taxes.payroll.form940_processor import Form940Processor
        
        processor = Form940Processor(obj.tenant_id, obj.year)
        errors = processor.validate_form940(obj.__dict__)
        return errors if errors else None
    
    def validate_year(self, value):
        """Validate tax year"""
        current_year = timezone.now().year
        
        # Can file for previous year, current year, or prepare for next year
        if value < current_year - 1 or value > current_year + 1:
            raise serializers.ValidationError(
                f'Tax year must be between {current_year - 1} and {current_year + 1}'
            )
        
        return value
    
    def validate_ein(self, value):
        """Validate EIN format"""
        # Remove any formatting
        ein_clean = value.replace('-', '').replace(' ', '')
        
        if len(ein_clean) != 9:
            raise serializers.ValidationError('EIN must be 9 digits')
        
        if not ein_clean.isdigit():
            raise serializers.ValidationError('EIN must contain only digits')
        
        # Format as XX-XXXXXXX
        return f"{ein_clean[:2]}-{ein_clean[2:]}"
    
    def validate(self, data):
        """Validate Form 940 data"""
        # If filing as amended, must have been previously filed
        if data.get('amended_return') and self.instance and self.instance.status != 'filed':
            raise serializers.ValidationError({
                'amended_return': 'Cannot amend a return that has not been filed'
            })
        
        # Validate overpayment disposition
        overpayment = data.get('overpayment', Decimal('0'))
        applied_to_next = data.get('overpayment_applied_to_next_return', False)
        refunded = data.get('overpayment_refunded', False)
        
        if overpayment > 0 and not (applied_to_next or refunded):
            raise serializers.ValidationError({
                'overpayment': 'Must specify whether overpayment should be applied to next return or refunded'
            })
        
        if applied_to_next and refunded:
            raise serializers.ValidationError({
                'overpayment': 'Cannot both apply overpayment to next return and request refund'
            })
        
        return data
    
    def create(self, validated_data):
        """Create Form 940 and calculate totals"""
        form940 = super().create(validated_data)
        form940.calculate_totals()
        form940.save()
        return form940
    
    def update(self, instance, validated_data):
        """Update Form 940 and recalculate totals"""
        form940 = super().update(instance, validated_data)
        form940.calculate_totals()
        form940.save()
        return form940


class StateTaxAccountSerializer(serializers.ModelSerializer):
    """Serializer for State Tax Account"""
    filing_frequency_display = serializers.CharField(
        source='get_filing_frequency_display',
        read_only=True
    )
    
    class Meta:
        model = StateTaxAccount
        fields = [
            'id', 'state_code', 'state_employer_number', 'state_unemployment_number',
            'experience_rate', 'experience_rate_effective_date',
            'state_withholding_number', 'filing_frequency', 'filing_frequency_display',
            'online_portal_url', 'online_username', 'online_password_hint',
            'is_active', 'registration_date', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'filing_frequency_display']
        extra_kwargs = {
            'online_username': {'write_only': True},
            'online_password_hint': {'write_only': True}
        }
    
    def validate_state_code(self, value):
        """Validate state code"""
        valid_states = [
            'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
            'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
            'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
            'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
            'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
            'DC', 'PR', 'VI'
        ]
        if value.upper() not in valid_states:
            raise serializers.ValidationError('Invalid state code')
        return value.upper()
    
    def validate_experience_rate(self, value):
        """Validate experience rate is reasonable"""
        if value < Decimal('0') or value > Decimal('0.1'):
            raise serializers.ValidationError(
                'Experience rate must be between 0% and 10%'
            )
        return value


class Form940ProcessorSerializer(serializers.Serializer):
    """Serializer for Form 940 processor requests"""
    year = serializers.IntegerField()
    calculate_only = serializers.BooleanField(default=True)
    save_draft = serializers.BooleanField(default=False)
    
    def validate_year(self, value):
        """Validate tax year"""
        current_year = timezone.now().year
        
        if value < current_year - 1 or value > current_year:
            raise serializers.ValidationError(
                f'Can only process Form 940 for {current_year - 1} or {current_year}'
            )
        
        return value


class Form940AmendmentSerializer(serializers.Serializer):
    """Serializer for Form 940 amendment requests"""
    original_form_id = serializers.UUIDField()
    reason = serializers.CharField(max_length=500)
    changes = serializers.DictField()
    
    def validate_original_form_id(self, value):
        """Validate original form exists and can be amended"""
        try:
            form = Form940.objects.get(
                id=value,
                tenant_id=self.context['request'].user.tenant_id
            )
            
            if form.status != 'filed':
                raise serializers.ValidationError(
                    'Can only amend forms that have been filed'
                )
            
            # Check if already amended
            if Form940.objects.filter(
                tenant_id=form.tenant_id,
                year=form.year,
                amended_return=True,
                status='filed'
            ).exists():
                raise serializers.ValidationError(
                    'This form has already been amended'
                )
            
            return value
            
        except Form940.DoesNotExist:
            raise serializers.ValidationError('Original form not found')
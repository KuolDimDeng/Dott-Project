# taxes/serializers.py
from rest_framework import serializers
from .models import (
    State, IncomeTaxRate, PayrollTaxFiling, TaxFilingInstruction, TaxForm,
    TaxDataEntryControl, TaxDataEntryLog, TaxDataAbuseReport, TaxDataBlacklist,
    TaxSettings, TaxApiUsage, TaxFilingLocation, TaxReminder, TaxFiling, FilingDocument,
    FilingConfirmation, FilingNotification, NotificationType, NotificationStatus,
    GlobalSalesTaxRate
)
import logging

logger = logging.getLogger(__name__)

class StateSerializer(serializers.ModelSerializer):
    filing_frequency_thresholds = serializers.JSONField(required=False)
    
    class Meta:
        model = State
        fields = [
            'id', 'name', 'code', 'is_active', 'country', 'service_type',
            'compliance_last_checked', 'compliance_check_frequency',
            'full_service_enabled', 'e_file_supported', 'e_file_portal_url',
            'has_local_taxes', 'notes',
            # E-filing configuration fields
            'e_file_api_base_url', 'e_file_api_version', 'e_file_formats',
            'base_tax_rate', 'filing_frequency_thresholds',
            'form_number', 'form_name', 'filing_due_day', 'vendor_discount_rate',
            'has_district_taxes', 'has_home_rule_cities', 'requires_location_reporting'
        ]

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
    state_name = serializers.CharField(source='state.name', read_only=True)
    
    class Meta:
        model = PayrollTaxFiling
        fields = '__all__'

class TaxFilingInstructionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaxFilingInstruction
        fields = '__all__'

class TaxFormSerializer(serializers.ModelSerializer):
    download_url = serializers.SerializerMethodField()
    
    class Meta:
        model = TaxForm
        fields = ['id', 'form_name', 'form_number', 'form_year', 'state', 'agency', 
                  'description', 'filing_frequency', 'due_date_rule', 'is_active',
                  'last_updated', 'download_url', 'official_url', 'instructions_url']
    
    def get_download_url(self, obj):
        """Generate download URL for the tax form"""
        request = self.context.get('request')
        if request and obj.form_file:
            return request.build_absolute_uri(obj.form_file.url)
        return None

class TaxDataEntryControlSerializer(serializers.ModelSerializer):
    """Serializer for tax data entry control policies"""
    class Meta:
        model = TaxDataEntryControl
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

class TaxDataEntryLogSerializer(serializers.ModelSerializer):
    """Serializer for tax data entry logs"""
    class Meta:
        model = TaxDataEntryLog
        fields = '__all__'
        read_only_fields = ['created_at']

class TaxDataAbuseReportSerializer(serializers.ModelSerializer):
    """Serializer for tax data abuse reports"""
    class Meta:
        model = TaxDataAbuseReport
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'resolved_at', 'resolved_by']

class TaxDataBlacklistSerializer(serializers.ModelSerializer):
    """Serializer for tax data blacklist entries"""
    class Meta:
        model = TaxDataBlacklist
        fields = '__all__'
        read_only_fields = ['created_at', 'created_by']

class TaxSettingsSerializer(serializers.ModelSerializer):
    """Serializer for tenant tax settings"""
    class Meta:
        model = TaxSettings
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

class TaxApiUsageSerializer(serializers.ModelSerializer):
    """Serializer for tax API usage tracking"""
    class Meta:
        model = TaxApiUsage
        fields = '__all__'
        read_only_fields = ['created_at']

class TaxFilingLocationSerializer(serializers.ModelSerializer):
    """Serializer for Tax Filing Locations"""
    class Meta:
        model = TaxFilingLocation
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def validate(self, data):
        """Validate the filing location data"""
        # Ensure required fields are present based on location type
        location_type = data.get('location_type')
        
        if location_type == 'mail':
            if not data.get('mailing_address'):
                raise serializers.ValidationError({
                    'mailing_address': 'Mailing address is required for mail filing locations'
                })
        elif location_type == 'online':
            if not data.get('portal_url'):
                raise serializers.ValidationError({
                    'portal_url': 'Portal URL is required for online filing locations'
                })
        elif location_type == 'office':
            if not data.get('office_address'):
                raise serializers.ValidationError({
                    'office_address': 'Office address is required for in-person filing locations'
                })
        
        return data

class TaxReminderSerializer(serializers.ModelSerializer):
    """Serializer for Tax Reminders"""
    days_until_due = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = TaxReminder
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'completed_at', 'days_until_due', 'is_overdue']
    
    def get_days_until_due(self, obj):
        """Calculate days until the reminder is due"""
        from datetime import date
        if obj.due_date:
            days = (obj.due_date - date.today()).days
            return max(0, days)
        return None
    
    def get_is_overdue(self, obj):
        """Check if the reminder is overdue"""
        from datetime import date
        if obj.due_date and obj.status == 'pending':
            return obj.due_date < date.today()
        return False

class FilingDocumentSerializer(serializers.ModelSerializer):
    """Serializer for filing documents."""
    uploaded_by_name = serializers.CharField(source='uploaded_by.get_full_name', read_only=True)
    
    class Meta:
        model = FilingDocument
        fields = [
            'document_id',
            'filing',
            'document_type',
            'file_name',
            'file_path',
            'file_size',
            'uploaded_at',
            'uploaded_by',
            'uploaded_by_name',
            'status',
            'notes'
        ]
        read_only_fields = ['document_id', 'uploaded_at', 'uploaded_by', 'uploaded_by_name']

class TaxFilingSerializer(serializers.ModelSerializer):
    """Serializer for tax filing records."""
    documents = FilingDocumentSerializer(many=True, read_only=True)
    document_count = serializers.SerializerMethodField()
    tax_type_display = serializers.CharField(source='get_tax_type_display', read_only=True)
    service_type_display = serializers.CharField(source='get_service_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = TaxFiling
        fields = '__all__'
        read_only_fields = ['filing_id', 'created_at', 'updated_at', 'created_by']

    def get_document_count(self, obj):
        """Get the count of documents."""
        return obj.documents.count()

class TaxFilingListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for tax filing list views."""
    document_count = serializers.SerializerMethodField()
    tax_type_display = serializers.CharField(source='get_tax_type_display', read_only=True)
    service_type_display = serializers.CharField(source='get_service_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = TaxFiling
        fields = [
            'filing_id',
            'tax_type',
            'tax_type_display',
            'service_type',
            'service_type_display',
            'status',
            'status_display',
            'filing_period',
            'filing_year',
            'due_date',
            'price',
            'document_count',
            'created_at'
        ]
    
    def get_document_count(self, obj):
        """Get total number of documents."""
        return obj.documents.count()


class GlobalSalesTaxRateSerializer(serializers.ModelSerializer):
    """Serializer for GlobalSalesTaxRate model"""
    rate_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = GlobalSalesTaxRate
        fields = [
            'id', 'country', 'country_name', 'region_code', 'region_name',
            'locality', 'tax_type', 'rate', 'rate_percentage',
            'effective_date', 'end_date', 'is_current',
            'ai_populated', 'ai_confidence_score', 'ai_source_notes',
            'ai_last_verified', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'ai_populated', 'ai_confidence_score', 'ai_source_notes',
            'ai_last_verified', 'created_at', 'updated_at'
        ]
    
    def get_rate_percentage(self, obj):
        """Convert decimal rate to percentage"""
        return float(obj.rate * 100) if obj.rate else 0.0


# Filing Service Serializers
class FilingServiceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new filing service requests"""
    
    class Meta:
        model = TaxFiling
        fields = [
            'country', 'region_code', 'period_type', 'filing_year',
            'period_month', 'period_quarter', 'filing_type_service',
            'special_instructions', 'total_sales', 'taxable_sales',
            'tax_collected', 'tax_rate', 'filing_fee'
        ]
        
    def validate(self, data):
        """Validate filing data"""
        # Validate period data
        if data.get('period_type') == 'monthly' and not data.get('period_month'):
            raise serializers.ValidationError("Month is required for monthly filings")
        if data.get('period_type') == 'quarterly' and not data.get('period_quarter'):
            raise serializers.ValidationError("Quarter is required for quarterly filings")
            
        return data
        
    def create(self, validated_data):
        """Create filing with additional fields"""
        # Set tax type to sales for filing service
        validated_data['tax_type'] = 'sales'
        validated_data['service_type'] = 'full'
        
        # Set period dates based on period type
        year = validated_data['filing_year']
        if validated_data['period_type'] == 'monthly':
            month = validated_data['period_month']
            validated_data['period_start'] = f"{year}-{month:02d}-01"
            if month == 12:
                validated_data['period_end'] = f"{year}-12-31"
            else:
                validated_data['period_end'] = f"{year}-{month+1:02d}-01"
        elif validated_data['period_type'] == 'quarterly':
            quarter = validated_data['period_quarter']
            quarter_months = {1: (1, 3), 2: (4, 6), 3: (7, 9), 4: (10, 12)}
            start_month, end_month = quarter_months[quarter]
            validated_data['period_start'] = f"{year}-{start_month:02d}-01"
            validated_data['period_end'] = f"{year}-{end_month:02d}-30"
        else:  # annual
            validated_data['period_start'] = f"{year}-01-01"
            validated_data['period_end'] = f"{year}-12-31"
            
        # Set filing period display
        if validated_data['period_type'] == 'monthly':
            month_name = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][validated_data['period_month']-1]
            validated_data['filing_period'] = f"{month_name} {year}"
        elif validated_data['period_type'] == 'quarterly':
            validated_data['filing_period'] = f"Q{validated_data['period_quarter']} {year}"
        else:
            validated_data['filing_period'] = f"{year}"
            
        # Set due date (placeholder - should be calculated based on country/state rules)
        from datetime import datetime, timedelta
        validated_data['due_date'] = datetime.now().date() + timedelta(days=30)
        
        # Set jurisdiction
        country = validated_data.get('country', 'US')
        region = validated_data.get('region_code', '')
        validated_data['jurisdiction'] = f"{country}-{region}" if region else country
        
        return super().create(validated_data)


class FilingServiceListSerializer(serializers.ModelSerializer):
    """Serializer for listing filing service requests"""
    period_display = serializers.CharField(source='filing_period', read_only=True)
    location_display = serializers.SerializerMethodField()
    filing_type_display = serializers.CharField(source='get_filing_type_service_display', read_only=True)
    payment_status_display = serializers.CharField(source='get_payment_status_display', read_only=True)
    
    class Meta:
        model = TaxFiling
        fields = [
            'filing_id', 'period_display', 'location_display', 'filing_type_service',
            'filing_type_display', 'status', 'filing_fee', 'due_date',
            'payment_status', 'payment_status_display', 'tax_report_url',
            'created_at'
        ]
        
    def get_location_display(self, obj):
        """Format location display"""
        if obj.region_code:
            return f"{obj.country} - {obj.region_code}"
        return obj.country or "Unknown"


class FilingServiceStatsSerializer(serializers.Serializer):
    """Serializer for filing service statistics"""
    total = serializers.IntegerField()
    pending = serializers.IntegerField()
    completed = serializers.IntegerField()
    overdue = serializers.IntegerField()
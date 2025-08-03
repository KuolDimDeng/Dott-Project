# taxes/serializers/tenant_tax_serializer.py
from rest_framework import serializers
from taxes.models import TenantTaxSettings, GlobalSalesTaxRate
from django_countries.serializers import CountryFieldMixin


class TenantTaxSettingsSerializer(CountryFieldMixin, serializers.ModelSerializer):
    """Serializer for tenant-specific tax settings"""
    rate_percentage = serializers.ReadOnlyField()
    country_name = serializers.CharField(read_only=True, source='country.name')
    
    class Meta:
        model = TenantTaxSettings
        fields = [
            'id',
            'tenant_id',
            'sales_tax_enabled',
            'sales_tax_rate',
            'sales_tax_type',
            'country',
            'country_name',
            'region_code',
            'region_name',
            'is_custom_rate',
            'original_global_rate',
            'tax_inclusive_pricing',
            'show_tax_on_receipts',
            'tax_registration_number',
            'notes',
            'rate_percentage',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'tenant_id', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        # Set tenant_id from request user
        validated_data['tenant_id'] = self.context['request'].user.tenant_id
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
    
    def update(self, instance, validated_data):
        validated_data['updated_by'] = self.context['request'].user
        return super().update(instance, validated_data)


class GlobalSalesTaxRateSerializer(CountryFieldMixin, serializers.ModelSerializer):
    """Serializer for global tax rates (read-only)"""
    rate_percentage = serializers.ReadOnlyField()
    
    class Meta:
        model = GlobalSalesTaxRate
        fields = [
            'id',
            'country',
            'country_name',
            'region_code',
            'region_name',
            'locality',
            'tax_type',
            'rate',
            'rate_percentage',
            'ai_confidence_score',
            'ai_source_notes',
            'manually_verified',
            'effective_date',
            'is_current'
        ]
        read_only_fields = fields  # All fields are read-only
# taxes/serializers_new/__init__.py
from .tenant_tax_serializer import TenantTaxSettingsSerializer, GlobalSalesTaxRateSerializer

__all__ = [
    'TenantTaxSettingsSerializer',
    'GlobalSalesTaxRateSerializer',
]
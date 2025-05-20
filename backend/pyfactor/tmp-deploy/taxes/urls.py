# taxes/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StateViewSet, IncomeTaxRateViewSet, 
    PayrollTaxFilingViewSet, TaxFilingInstructionViewSet,
    TaxCalculationView, TaxFormViewSet, GlobalComplianceViewSet, currency_info
)

router = DefaultRouter()
router.register(r'states', StateViewSet)
router.register(r'tax-rates', IncomeTaxRateViewSet)
router.register(r'tax-filings', PayrollTaxFilingViewSet)
router.register(r'filing-instructions', TaxFilingInstructionViewSet)
router.register(r'tax-forms', TaxFormViewSet)
router.register(r'global', GlobalComplianceViewSet, basename='global')

urlpatterns = [
    path('', include(router.urls)),
    path('calculate/', TaxCalculationView.as_view(), name='tax-calculate'),
    path('global-compliance/<str:country_code>/', GlobalComplianceViewSet.as_view({'get': 'global_compliance'}), name='global-compliance'),
    path('currency-info/<str:country_code>/', currency_info, name='currency-info'),
]
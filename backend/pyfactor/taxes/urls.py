# taxes/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StateViewSet, IncomeTaxRateViewSet, 
    PayrollTaxFilingViewSet, TaxFilingInstructionViewSet,
    TaxCalculationView, TaxFormViewSet, GlobalComplianceViewSet, currency_info,
    TaxDataEntryControlViewSet, TaxDataEntryLogViewSet,
    TaxDataAbuseReportViewSet, TaxDataBlacklistViewSet,
    TaxSettingsViewSet, TaxApiUsageViewSet,
    FilingDocumentUploadView, TaxFilingViewSet
)
from .views.filing_locations import TaxFilingLocationViewSet
from .views.reminders import TaxReminderViewSet
from .views.payment_views import (
    create_payment_session,
    get_filing_pricing,
    validate_payment_session,
    cancel_payment_session
)

router = DefaultRouter()
router.register(r'states', StateViewSet)
router.register(r'tax-rates', IncomeTaxRateViewSet)
router.register(r'tax-filings', PayrollTaxFilingViewSet)
router.register(r'filing-instructions', TaxFilingInstructionViewSet)
router.register(r'tax-forms', TaxFormViewSet)
router.register(r'global', GlobalComplianceViewSet, basename='global')
router.register(r'settings', TaxSettingsViewSet, basename='tax-settings')
router.register(r'api-usage', TaxApiUsageViewSet, basename='tax-api-usage')
router.register(r'filing-locations', TaxFilingLocationViewSet, basename='tax-filing-locations')
router.register(r'reminders', TaxReminderViewSet, basename='tax-reminders')

# New filing document endpoints
router.register(r'filings', TaxFilingViewSet, basename='tax-filing')
router.register(r'filing-documents', FilingDocumentUploadView, basename='filing-documents')

# Abuse control endpoints
router.register(r'abuse-control/controls', TaxDataEntryControlViewSet, basename='tax-entry-control')
router.register(r'abuse-control/logs', TaxDataEntryLogViewSet, basename='tax-entry-log')
router.register(r'abuse-control/reports', TaxDataAbuseReportViewSet, basename='tax-abuse-report')
router.register(r'abuse-control/blacklist', TaxDataBlacklistViewSet, basename='tax-blacklist')

urlpatterns = [
    path('', include(router.urls)),
    path('calculate/', TaxCalculationView.as_view(), name='tax-calculate'),
    path('global-compliance/<str:country_code>/', GlobalComplianceViewSet.as_view({'get': 'global_compliance'}), name='global-compliance'),
    path('currency-info/<str:country_code>/', currency_info, name='currency-info'),
    
    # Payment integration endpoints
    path('payment/create-session/', create_payment_session, name='tax-payment-create-session'),
    path('payment/pricing/', get_filing_pricing, name='tax-payment-pricing'),
    path('payment/validate-session/', validate_payment_session, name='tax-payment-validate-session'),
    path('payment/cancel-session/', cancel_payment_session, name='tax-payment-cancel-session'),
]
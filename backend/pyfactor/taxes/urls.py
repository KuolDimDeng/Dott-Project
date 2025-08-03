# taxes/urls.py
# Comprehensive tax management endpoints for sales, payroll, and year-end filing
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StateViewSet, IncomeTaxRateViewSet, 
    PayrollTaxFilingViewSet, TaxFilingInstructionViewSet,
    TaxCalculationView, TaxFormViewSet, GlobalComplianceViewSet, currency_info,
    TaxDataEntryControlViewSet, TaxDataEntryLogViewSet,
    TaxDataAbuseReportViewSet, TaxDataBlacklistViewSet,
    TaxSettingsViewSet, TaxApiUsageViewSet,
    FilingDocumentUploadView, TaxFilingViewSet,
    GlobalTaxRateViewSet
)
from .views.filing_locations import TaxFilingLocationViewSet
from .views.reminders import TaxReminderViewSet
from .views.payment_views import (
    create_payment_session,
    get_filing_pricing,
    validate_payment_session,
    cancel_payment_session
)
# from .views.esignature_views import (
#     TaxSignatureRequestViewSet,
#     send_signature_request,
#     cancel_signature_request,
#     check_signature_status,
#     download_signed_document,
#     get_audit_trail,
#     get_available_providers,
#     webhook_handler,
#     get_signature_statistics
# )
from .views.confirmation_views import (
    FilingConfirmationViewSet,
    FilingNotificationViewSet
)
from .views.tax_suggestions import get_tax_suggestions
from .views.tax_feedback import submit_tax_feedback
from .efiling.views import EFilingViewSet
from .views.filing_service import (
    FilingServiceViewSet, 
    get_country_requirements,
    get_sales_data,
    get_tax_info,
    get_countries_list
)
from .views.payroll_tax_views import (
    calculate_payroll_tax,
    get_payroll_tax_settings,
    create_payroll_tax_filing,
    get_payroll_tax_filing_history,
    get_payroll_tax_filing_status
)
from .views.payroll_filing_instructions import get_payroll_filing_instructions

router = DefaultRouter()
router.register(r'states', StateViewSet)
router.register(r'tax-rates', IncomeTaxRateViewSet)
router.register(r'tax-filings', PayrollTaxFilingViewSet)
router.register(r'filing-instructions', TaxFilingInstructionViewSet)
router.register(r'tax-forms', TaxFormViewSet)
router.register(r'global', GlobalComplianceViewSet, basename='global')
router.register(r'global-rates', GlobalTaxRateViewSet, basename='global-tax-rates')
router.register(r'settings', TaxSettingsViewSet, basename='tax-settings')

# Import tenant tax settings view
from .views.tenant_tax_settings_views import TenantTaxSettingsViewSet
router.register(r'tenant-settings', TenantTaxSettingsViewSet, basename='tenant-tax-settings')
router.register(r'api-usage', TaxApiUsageViewSet, basename='tax-api-usage')
router.register(r'filing-locations', TaxFilingLocationViewSet, basename='tax-filing-locations')
router.register(r'reminders', TaxReminderViewSet, basename='tax-reminders')

# New filing document endpoints
router.register(r'filings', TaxFilingViewSet, basename='tax-filing')
router.register(r'filing-documents', FilingDocumentUploadView, basename='filing-documents')

# E-filing endpoints
router.register(r'efiling', EFilingViewSet, basename='tax-efiling')

# E-signature endpoints
# router.register(r'esignature/requests', TaxSignatureRequestViewSet, basename='tax-signature-request')

# Filing confirmation endpoints
router.register(r'confirmations', FilingConfirmationViewSet, basename='tax-filing-confirmation')
router.register(r'notifications', FilingNotificationViewSet, basename='tax-filing-notification')

# Filing service endpoints
router.register(r'filings', FilingServiceViewSet, basename='filing-service')

# Abuse control endpoints
router.register(r'abuse-control/controls', TaxDataEntryControlViewSet, basename='tax-entry-control')
router.register(r'abuse-control/logs', TaxDataEntryLogViewSet, basename='tax-entry-log')
router.register(r'abuse-control/reports', TaxDataAbuseReportViewSet, basename='tax-abuse-report')
router.register(r'abuse-control/blacklist', TaxDataBlacklistViewSet, basename='tax-blacklist')

urlpatterns = [
    path('', include(router.urls)),
    path('calculate/', TaxCalculationView.as_view(), name='tax-calculate'),
    path('suggestions/', get_tax_suggestions, name='tax-suggestions'),
    path('feedback/', submit_tax_feedback, name='tax-feedback'),
    path('global-compliance/<str:country_code>/', GlobalComplianceViewSet.as_view({'get': 'global_compliance'}), name='global-compliance'),
    path('currency-info/<str:country_code>/', currency_info, name='currency-info'),
    
    # Payment integration endpoints
    path('payment/create-session/', create_payment_session, name='tax-payment-create-session'),
    path('payment/pricing/', get_filing_pricing, name='tax-payment-pricing'),
    path('payment/validate-session/', validate_payment_session, name='tax-payment-validate-session'),
    path('payment/cancel-session/', cancel_payment_session, name='tax-payment-cancel-session'),
    
    # PDF Generation endpoints
    path('pdf/', include('taxes.pdf_generation.urls')),
    
    # E-signature endpoints (temporarily disabled)
    # path('esignature/requests/<uuid:signature_id>/send/', send_signature_request, name='esignature-send'),
    # path('esignature/requests/<uuid:signature_id>/cancel/', cancel_signature_request, name='esignature-cancel'),
    # path('esignature/requests/<uuid:signature_id>/status/', check_signature_status, name='esignature-status'),
    # path('esignature/requests/<uuid:signature_id>/download/', download_signed_document, name='esignature-download'),
    # path('esignature/requests/<uuid:signature_id>/audit/', get_audit_trail, name='esignature-audit'),
    # path('esignature/providers/', get_available_providers, name='esignature-providers'),
    # path('esignature/statistics/', get_signature_statistics, name='esignature-statistics'),
    # path('esignature/webhook/<str:provider_name>/', webhook_handler, name='esignature-webhook'),
    
    # Filing service endpoints
    path('countries/', get_countries_list, name='tax-countries-list'),
    path('countries/<str:country_code>/requirements/', get_country_requirements, name='tax-country-requirements'),
    path('sales-data/', get_sales_data, name='tax-sales-data'),
    path('info/', get_tax_info, name='tax-info'),
    
    # Payroll tax endpoints
    path('payroll/calculate/', calculate_payroll_tax, name='payroll-tax-calculate'),
    path('payroll/settings/', get_payroll_tax_settings, name='payroll-tax-settings'),
    path('payroll/filing/create/', create_payroll_tax_filing, name='payroll-tax-filing-create'),
    path('payroll/filing/history/', get_payroll_tax_filing_history, name='payroll-tax-filing-history'),
    path('payroll/filing/<int:filing_id>/status/', get_payroll_tax_filing_status, name='payroll-tax-filing-status'),
    path('payroll/filing/<int:filing_id>/instructions/', get_payroll_filing_instructions, name='payroll-tax-filing-instructions'),
    
    # Year-end tax form endpoints (temporarily disabled)
    # path('year-end/', include('taxes.year_end.urls')),
    
    # Multi-state tax endpoints (temporarily disabled)
    # path('multistate/', include('taxes.multistate.urls')),
]
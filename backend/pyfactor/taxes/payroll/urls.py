"""
URL patterns for Payroll Tax APIs
"""

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    Form941ViewSet, PayrollTaxDepositViewSet,
    PayrollTaxFilingScheduleViewSet, EmployerTaxAccountViewSet,
    Form940ViewSet, StateTaxAccountViewSet,
    StatePayrollProcessorView, StatePayrollConfigViewSet,
    StateFilingViewSet, StateWithholdingView
)

app_name = 'payroll_tax'

router = DefaultRouter()
router.register(r'form-941', Form941ViewSet, basename='form941')
router.register(r'form-940', Form940ViewSet, basename='form940')
router.register(r'deposits', PayrollTaxDepositViewSet, basename='deposit')
router.register(r'filing-schedule', PayrollTaxFilingScheduleViewSet, basename='filing-schedule')
router.register(r'employer-account', EmployerTaxAccountViewSet, basename='employer-account')
router.register(r'state-accounts', StateTaxAccountViewSet, basename='state-account')
router.register(r'state-config', StatePayrollConfigViewSet, basename='state-config')
router.register(r'state-filings', StateFilingViewSet, basename='state-filing')

urlpatterns = [
    path('', include(router.urls)),
    # State payroll processing endpoints
    path('state/process/<str:payroll_run_id>/', StatePayrollProcessorView.as_view({'post': 'process_payroll'}), name='state-payroll-process'),
    path('state/withholding/', StateWithholdingView.as_view({'post': 'calculate'}), name='state-withholding'),
    path('state/validate-accounts/', StatePayrollProcessorView.as_view({'get': 'validate_accounts'}), name='validate-state-accounts'),
    path('state/generate-forms/', StatePayrollProcessorView.as_view({'post': 'generate_forms'}), name='generate-state-forms'),
    path('state/submit-filing/<str:filing_id>/', StatePayrollProcessorView.as_view({'post': 'submit_filing'}), name='submit-state-filing'),
]
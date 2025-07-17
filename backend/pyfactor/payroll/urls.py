from django.urls import path
from .views import (
    RunPayrollView, PayrollRunsView, PayrollTransactionsView, PayrollCalculationView, 
    payroll_report, PayStubView, PayStubDownloadView, PayrollSettingsView,
    DepositMethodListCreateView, DepositMethodDetailView,
    WithholdingListCreateView, WithholdingDetailView,
    BonusListCreateView, BonusDetailView,
    DeductionListCreateView, DeductionDetailView,
    PayStatementListView, PayStatementDetailView,
    PayrollStatsView
)
from .stripe_views import (
    setup_payroll_funding, confirm_funding_setup, get_payroll_funding_status,
    employee_bank_setup, employee_bank_status,
    calculate_payroll, approve_payroll, collect_payroll_funds
)
from .universal_views import (
    get_payment_options, setup_mobile_money, invite_employee_wise,
    calculate_payroll_cost, check_payment_setup_status
)
from .stripe_webhooks import stripe_payroll_webhook

urlpatterns = [
    path('run/', RunPayrollView.as_view(), name='run_payroll'),
    path('runs/', PayrollRunsView.as_view(), name='get_payroll_runs'),
    path('transactions/<int:run_id>/', PayrollTransactionsView.as_view(), name='get_payroll_transactions'),
    path('calculate/', calculate_payroll, name='payroll-calculate'),
    path('report/<int:pk>/', payroll_report, name='payroll_report'),
    
    # Stripe payroll endpoints
    path('setup-funding/', setup_payroll_funding, name='setup-payroll-funding'),
    path('confirm-funding/', confirm_funding_setup, name='confirm-funding-setup'),
    path('funding-status/', get_payroll_funding_status, name='payroll-funding-status'),
    path('employee/bank-setup/', employee_bank_setup, name='employee-bank-setup'),
    path('employee/bank-status/', employee_bank_status, name='employee-bank-status'),
    path('approve/', approve_payroll, name='approve-payroll'),
    path('collect-funds/', collect_payroll_funds, name='collect-payroll-funds'),
    
    # Universal payroll endpoints
    path('payment-options/<str:country_code>/', get_payment_options, name='payment-options'),
    path('employee/mobile-setup/', setup_mobile_money, name='mobile-money-setup'),
    path('employee/wise-invite/', invite_employee_wise, name='wise-invite'),
    path('calculate-cost/', calculate_payroll_cost, name='calculate-payroll-cost'),
    path('setup-status/', check_payment_setup_status, name='payment-setup-status'),
    
    # Webhook endpoint
    path('webhooks/stripe/', stripe_payroll_webhook, name='stripe-payroll-webhook'),
    
    # PayStub endpoints
    path('paystubs/', PayStubView.as_view(), name='employee-paystubs'),
    path('paystubs/<uuid:pk>/download/', PayStubDownloadView.as_view(), name='paystub-download'),
    
    # Payroll Settings
    path('settings/', PayrollSettingsView.as_view(), name='payroll-settings'),
    
    # Pay Management endpoints
    path('deposit-methods/', DepositMethodListCreateView.as_view(), name='deposit-methods-list'),
    path('deposit-methods/<uuid:pk>/', DepositMethodDetailView.as_view(), name='deposit-method-detail'),
    path('withholdings/', WithholdingListCreateView.as_view(), name='withholdings-list'),
    path('withholdings/<uuid:pk>/', WithholdingDetailView.as_view(), name='withholding-detail'),
    path('bonuses/', BonusListCreateView.as_view(), name='bonuses-list'),
    path('bonuses/<uuid:pk>/', BonusDetailView.as_view(), name='bonus-detail'),
    path('deductions/', DeductionListCreateView.as_view(), name='deductions-list'),
    path('deductions/<uuid:pk>/', DeductionDetailView.as_view(), name='deduction-detail'),
    path('statements/', PayStatementListView.as_view(), name='statements-list'),
    path('statements/<uuid:pk>/', PayStatementDetailView.as_view(), name='statement-detail'),
    path('stats/', PayrollStatsView.as_view(), name='payroll-stats'),
]
from django.urls import path
from .views import RunPayrollView, PayrollRunsView, PayrollTransactionsView, PayrollCalculationView

urlpatterns = [
    path('run/', RunPayrollView.as_view(), name='run_payroll'),
    path('runs/', PayrollRunsView.as_view(), name='get_payroll_runs'),
    path('transactions/<int:run_id>/', PayrollTransactionsView.as_view(), name='get_payroll_transactions'),
    path('api/payroll/calculate/', PayrollCalculateView.as_view(), name='payroll-calculate'),
]
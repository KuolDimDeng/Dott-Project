from django.urls import path
from .views import RunPayrollView, PayrollRunsView, PayrollTransactionsView, PayrollCalculationView, payroll_report

urlpatterns = [
    path('run/', RunPayrollView.as_view(), name='run_payroll'),
    path('runs/', PayrollRunsView.as_view(), name='get_payroll_runs'),
    path('transactions/<int:run_id>/', PayrollTransactionsView.as_view(), name='get_payroll_transactions'),
    path('calculate/', PayrollCalculationView.as_view(), name='payroll-calculate'),
    path('report/<int:pk>/', payroll_report, name='payroll_report'),
]
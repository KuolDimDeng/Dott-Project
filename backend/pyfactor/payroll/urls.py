from django.urls import path
from . import views

urlpatterns = [
    path('run/', views.run_payroll, name='run_payroll'),
    path('runs/', views.get_payroll_runs, name='get_payroll_runs'),
    path('transactions/<int:run_id>/', views.get_payroll_transactions, name='get_payroll_transactions'),
]
# /Users/kuoldeng/projectx/backend/pyfactor/reports/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('generate/<str:report_type>/', views.generate_report, name='generate_report'),
    path('list/', views.list_reports, name='list_reports'),
    path('aged-receivables/', views.aged_receivables, name='aged-receivables'),
    path('aged-payables/', views.aged_payables, name='aged-payables'),
    path('account-balances/', views.account_balances, name='account-balance'),
    path('trial-balance/', views.trial_balance, name='trial-balance'),


]
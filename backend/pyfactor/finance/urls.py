#/Users/kuoldeng/projectx/backend/pyfactor/finance/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from finance.views import (
    create_income,
    AccountTypeCreateView,
    account_view,  # Import the new view function
    TransactionCreateView,
    IncomeUpdateView,
    DeleteAccountView,
    TransactionListView,
    unpaid_invoices, # Import the new view function
    account_category_list,
    account_category_detail,
    chart_of_accounts,
    chart_of_account_detail,
   
)

urlpatterns = [
    path('api/incomes/', create_income, name='income-create'),
    path('api/account-types/', AccountTypeCreateView.as_view(), name='account-type-create'),
    path('api/accounts/', account_view, name='account-view'),
    path('api/transactions/', TransactionListView.as_view(), name='transaction-list'),
    path('api/incomes/<int:pk>/', IncomeUpdateView.as_view(), name='income-update'),
    path('api/delete-account/', DeleteAccountView.as_view(), name='delete-account'),
    path('api/transactions/create/', TransactionCreateView.as_view(), name='transaction-create'),
    path('api/unpaid-invoices/', unpaid_invoices, name='unpaid-invoices'),  # Add this new path
    path('api/account-categories/', account_category_list, name='account-category-list'),
    path('api/account-categories/<int:pk>/', account_category_detail, name='account-category-detail'),
    path('api/chart-of-accounts/', chart_of_accounts, name='chart-of-accounts'),
    path('api/chart-of-accounts/<int:pk>/', chart_of_account_detail, name='chart-of-account-detail'),
]

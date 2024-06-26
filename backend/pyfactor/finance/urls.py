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
    unpaid_invoices  # Import the new view function
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
]
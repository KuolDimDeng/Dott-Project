#/Users/kuoldeng/projectx/backend/pyfactor/finance/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from finance.views import (
    IncomeCreateView,
    AccountTypeCreateView,
    AccountCreateView,  # Import the AccountCreateView
    TransactionCreateView,
    IncomeUpdateView,
    DeleteAccountView,
    TransactionListView
)

urlpatterns = [
    path('api/incomes/', IncomeCreateView.as_view(), name='income-create'),
    path('api/account-types/', AccountTypeCreateView.as_view(), name='account-type-create'),
    path('api/accounts/', AccountCreateView.as_view(), name='account-create'),  # Add this line
    path('api/transactions/', TransactionListView.as_view(), name='transaction-create'),
    path('api/incomes/<int:pk>/', IncomeUpdateView.as_view(), name='income-update'),
    path('api/delete-account/', DeleteAccountView.as_view(), name='delete-account'),
    path('api/transactions/create/', TransactionCreateView.as_view(), name='transaction-list'),
]
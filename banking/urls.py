from django.urls import path
from .views import (
    BankAccountListView, 
    BankAccountDetailView,
    BankTransactionListView,
    AdminBankAccountView
)

urlpatterns = [
    # Bank account endpoints
    path('accounts/', BankAccountListView.as_view(), name='bank-account-list'),
    path('accounts/<uuid:pk>/', BankAccountDetailView.as_view(), name='bank-account-detail'),
    
    # Bank transaction endpoints
    path('transactions/', BankTransactionListView.as_view(), name='bank-transaction-list'),
    path('accounts/<uuid:account_id>/transactions/', BankTransactionListView.as_view(), name='account-transactions'),
    
    # Admin-only endpoints
    path('admin/accounts/', AdminBankAccountView.as_view(), name='admin-bank-accounts'),
] 
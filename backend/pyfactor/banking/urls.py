# File: /Users/kuoldeng/projectx/backend/pyfactor/banking/urls.py
from django.urls import path
from .views import (
    PlaidLinkTokenView, 
    PlaidExchangeTokenView, 
    PlaidAccountsView, 
    PlaidTransactionsView, 
    CreateSandboxPublicTokenView,
    DownloadTransactionsView,
    RecentTransactionsView,  # Add this new view
)

urlpatterns = [
    path('create_link_token/', PlaidLinkTokenView.as_view(), name='create_link_token'),
    path('exchange_token/', PlaidExchangeTokenView.as_view(), name='exchange_token'),
    path('accounts/', PlaidAccountsView.as_view(), name='accounts'),
    path('transactions/<str:account_id>/', PlaidTransactionsView.as_view(), name='transactions'),
    path('create_sandbox_public_token/', CreateSandboxPublicTokenView.as_view(), name='create_sandbox_public_token'),
    path('transactions/', PlaidTransactionsView.as_view(), name='plaid-transactions'),
    path('download-transactions/', DownloadTransactionsView.as_view(), name='download-transactions'),
    path('recent-transactions/', RecentTransactionsView.as_view(), name='recent-transactions'),  # Add this new path
]
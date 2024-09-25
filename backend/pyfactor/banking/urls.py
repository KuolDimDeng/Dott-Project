# File: /Users/kuoldeng/projectx/backend/pyfactor/banking/urls.py
from django.urls import path
from .views import (
    CreateLinkTokenView,
    PlaidExchangeTokenView,
    PlaidAccountsView,
    PlaidTransactionsView,
    CreateSandboxPublicTokenView,
    DownloadTransactionsView,
    RecentTransactionsView,
    ConnectedAccountsView,
    ConnectBankAccountView,
    BankingReportView,
)

urlpatterns = [
    path('create_link_token/', CreateLinkTokenView.as_view(), name='create_link_token'),
    path('exchange_token/', PlaidExchangeTokenView.as_view(), name='exchange_token'),
    path('accounts/', PlaidAccountsView.as_view(), name='accounts'),
    path('transactions/<str:account_id>/', PlaidTransactionsView.as_view(), name='transactions'),
    path('create_sandbox_public_token/', CreateSandboxPublicTokenView.as_view(), name='create_sandbox_public_token'),
    path('transactions/', PlaidTransactionsView.as_view(), name='plaid-transactions'),
    path('download-transactions/', DownloadTransactionsView.as_view(), name='download-transactions'),
    path('recent-transactions/', RecentTransactionsView.as_view(), name='recent-transactions'),
    path('connected-accounts/', ConnectedAccountsView.as_view(), name='connected-accounts'),
    path('connect-bank-account/', ConnectBankAccountView.as_view(), name='connect-bank-account'),
    path('report/', BankingReportView.as_view(), name='banking-report'),

]
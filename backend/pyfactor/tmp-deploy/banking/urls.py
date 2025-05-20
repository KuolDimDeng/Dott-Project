# File: /Users/kuoldeng/projectx/backend/pyfactor/banking/urls.py
from django.urls import path
from .views import (
    PlaidLinkTokenView,
    PlaidExchangeTokenView,
    PlaidAccountsView,
    PlaidTransactionsView,
    CreateSandboxPublicTokenView,
    DownloadTransactionsView,
    RecentTransactionsView,
    CreateLinkTokenView,
    ConnectedAccountsView,
    ConnectBankAccountView,
    BankingReportView,
    PaymentGatewayView,
)

urlpatterns = [
    path('link_token/', PlaidLinkTokenView.as_view(), name='plaid_link_token'),
    path('exchange_token/', PlaidExchangeTokenView.as_view(), name='plaid_exchange_token'),
    path('accounts/', PlaidAccountsView.as_view(), name='plaid_accounts'),
    path('transactions/', PlaidTransactionsView.as_view(), name='plaid_transactions'),
    path('download_transactions/', DownloadTransactionsView.as_view(), name='download_transactions'),
    path('recent_transactions/', RecentTransactionsView.as_view(), name='recent_transactions'),
    path('banking_report/', BankingReportView.as_view(), name='banking_report'),
    path('create_link_token/', CreateLinkTokenView.as_view(), name='create_link_token'),
    path('connect-bank-account/', ConnectBankAccountView.as_view(), name='connect-bank-account'),
    path('report/', BankingReportView.as_view(), name='banking-report'),
    path('payment-gateway/', PaymentGatewayView.as_view(), name='payment_gateway'),
]
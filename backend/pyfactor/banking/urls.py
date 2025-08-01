# File: /Users/kuoldeng/projectx/backend/pyfactor/banking/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
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
    BankTransactionImportView,
    BankingRuleViewSet,
)

# Import new V2 views
from .views_v2 import (
    SyncTransactionsView,
    BankingTransactionsView,
    BankingAccountsView,
    ReconciliationView,
    CashFlowReportView,
    AccountBalancesView,
    MonthlyStatementsView,
)

# Create router for ViewSets
router = DefaultRouter()
router.register(r'rules', BankingRuleViewSet, basename='banking-rules')

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Existing endpoints
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
    
    # New secure endpoints
    path('import-csv/', BankTransactionImportView.as_view(), name='import-csv'),
    
    # New V2 Banking Endpoints as per requirements
    path('sync/transactions/', SyncTransactionsView.as_view(), name='sync-transactions'),
    path('transactions/', BankingTransactionsView.as_view(), name='banking-transactions'),
    path('accounts/', BankingAccountsView.as_view(), name='banking-accounts'),
    path('reconciliation/', ReconciliationView.as_view(), name='reconciliation'),
    path('cash-flow/', CashFlowReportView.as_view(), name='cash-flow-report'),
    path('account-balances/', AccountBalancesView.as_view(), name='account-balances'),
    path('monthly-statements/', MonthlyStatementsView.as_view(), name='monthly-statements'),
]
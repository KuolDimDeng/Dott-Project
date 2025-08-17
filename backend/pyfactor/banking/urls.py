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

# Import Wise views
from .api import wise_views
from .api.wise_test_view import WiseTestView

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
    
    # Wise integration endpoints  
    path('method/', wise_views.get_banking_method, name='banking_method'),
    path('wise/setup/', wise_views.setup_wise_account, name='wise_setup'),
    path('wise/account/', wise_views.get_wise_account, name='wise_account'),
    path('wise/quote/', wise_views.get_transfer_quote, name='wise_quote'),
    path('wise/connect/', wise_views.connect_wise_account, name='wise_connect'),
    path('wise/test/', WiseTestView.as_view(), name='wise_test'),  # Test endpoint for staging
    path('settlements/', wise_views.get_settlements, name='settlements'),
    path('settlements/process/', wise_views.process_manual_settlement, name='process_settlement'),
    
    # New Banking Connection Management endpoints
    path('connections/', wise_views.list_bank_connections, name='bank_connections'),
    path('connections/<uuid:connection_id>/', wise_views.manage_bank_connection, name='manage_bank_connection'),
    
    # Module-specific Bank Account Management endpoints
    path('pos/accounts/', wise_views.get_pos_bank_accounts, name='pos_bank_accounts'),
    path('pos/set-default/', wise_views.set_default_pos_account, name='set_default_pos_account'),
    path('invoices/set-default/', wise_views.set_default_invoice_account, name='set_default_invoice_account'),
    path('payroll/set-default/', wise_views.set_default_payroll_account, name='set_default_payroll_account'),
    path('expenses/set-default/', wise_views.set_default_expense_account, name='set_default_expense_account'),
    path('vendors/set-default/', wise_views.set_default_vendor_account, name='set_default_vendor_account'),
]
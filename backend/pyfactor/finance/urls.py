from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from finance.views import (
    create_income,
    AccountTypeCreateView,
    account_view,
    TransactionCreateView,
    IncomeUpdateView,
    DeleteAccountView,
    TransactionListView,
    unpaid_invoices,
    account_category_list,
    account_category_detail,
    chart_of_accounts,
    chart_of_account_detail,
    journal_entry_detail,
    journal_entry_list,
    post_journal_entry,
    general_ledger,
    general_ledger_summary,
    account_reconciliation_detail,
    account_reconciliation_list,
    reconciliation_item_detail,
    reconciliation_item_list,
    month_end_closing_detail,
    month_end_closing_list,
    update_month_end_task,
    profit_and_loss_view,
    cash_flow_view,
    balance_sheet_view,
    fixed_asset_detail,
    fixed_asset_list,
    budget_detail,
    budget_list,
    budget_detail,
    intercompany_account_detail,
    intercompany_transaction_detail,
    intercompany_transaction_list,
    intercompany_account_list,
    audit_trail_detail,
    audit_trail_list

 
    
)

urlpatterns = [
    path('api/incomes/', create_income, name='income-create'),
    path('api/account-types/', AccountTypeCreateView.as_view(), name='account-type-create'),
    path('api/accounts/', account_view, name='account-view'),
    path('api/transactions/', TransactionListView.as_view(), name='transaction-list'),
    path('api/incomes/<int:pk>/', IncomeUpdateView.as_view(), name='income-update'),
    path('api/delete-account/', DeleteAccountView.as_view(), name='delete-account'),
    path('api/transactions/create/', TransactionCreateView.as_view(), name='transaction-create'),
    path('api/unpaid-invoices/', unpaid_invoices, name='unpaid-invoices'),
    path('api/account-categories/', account_category_list, name='account-category-list'),
    path('api/account-categories/<int:pk>/', account_category_detail, name='account-category-detail'),
    path('api/chart-of-accounts/', chart_of_accounts, name='chart-of-accounts'),
    path('api/chart-of-accounts/<int:pk>/', chart_of_account_detail, name='chart-of-account-detail'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),  # Add if JWT token refresh is needed
    path('journal-entries/', journal_entry_list, name='journal-entry-list'),
    path('journal-entries/<int:pk>/', journal_entry_detail, name='journal-entry-detail'),
    path('journal-entries/<int:pk>/post/', post_journal_entry, name='post-journal-entry'),
    path('api/general-ledger/', general_ledger, name='general-ledger'),
    path('api/general-ledger-summary/', general_ledger_summary, name='general-ledger-summary'),
    path('reconciliations/', account_reconciliation_list, name='account-reconciliation-list'),
    path('reconciliations/<int:pk>/', account_reconciliation_detail, name='account-reconciliation-detail'),
    path('reconciliation-items/', reconciliation_item_list, name='reconciliation-item-list'),
    path('reconciliation-items/<int:pk>/', reconciliation_item_detail, name='reconciliation-item-detail'),
    path('month-end-closings/', month_end_closing_list, name='month-end-closing-list'),
    path('month-end-closings/<int:pk>/', month_end_closing_detail, name='month-end-closing-detail'),
    path('month-end-tasks/<int:pk>/', update_month_end_task, name='update-month-end-task'),
    path('api/profit-and-loss/', profit_and_loss_view, name='profit_and_loss'),
    path('api/balance-sheet/', balance_sheet_view, name='balance_sheet'),
    path('api/cash-flow/', cash_flow_view, name='cash_flow'),
    path('fixed-assets/', fixed_asset_list, name='fixed-asset-list'),
    path('fixed-assets/<int:pk>/', fixed_asset_detail, name='fixed-asset-detail'),
    path('budgets/', budget_list, name='budget-list'),
    path('budgets/<int:pk>/', budget_detail, name='budget-detail'),
    path('intercompany-transactions/', intercompany_transaction_list, name='intercompany-transaction-list'),
    path('intercompany-transactions/<int:pk>/', intercompany_transaction_detail, name='intercompany-transaction-detail'),
    path('intercompany-accounts/', intercompany_account_list, name='intercompany-account-list'),
    path('intercompany-accounts/<int:pk>/', intercompany_account_detail, name='intercompany-account-detail'),
    path('audit-trail/', audit_trail_list, name='audit-trail-list'),
    path('audit-trail/<int:pk>/', audit_trail_detail, name='audit-trail-detail'),
]



    # ... other URL patterns ...


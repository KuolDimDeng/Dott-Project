from django.urls import path

from analysis.views import (
    profit_and_loss_analysis,
    get_chart_data,
    get_balance_sheet_data,
    get_cash_flow_data,
    get_budget_vs_actual_data,
    get_sales_analysis_data,
    get_expense_analysis_data,
    get_kpi_data
)

# Import new analytics views
try:
    from analytics.views import (
        get_key_metrics,
        get_chart_data as get_analytics_chart_data,
        get_dashboard_data
    )
    has_analytics = True
except ImportError:
    has_analytics = False

urlpatterns = [
    path('profit-and-loss-analysis/<str:time_range>/', profit_and_loss_analysis, name='profit-and-loss-analysis'),
    path('financial-data/get_chart_data', get_chart_data, name='get_chart_data'),
    path('balance-sheet-data', get_balance_sheet_data, name='balance_sheet_data'),
    path('cash-flow-data', get_cash_flow_data, name='cash_flow_data'),
    path('budget-vs-actual', get_budget_vs_actual_data, name='budget_vs_actual_data'),
    path('sales-data', get_sales_analysis_data, name='sales_analysis_data'),
    path('expense-data', get_expense_analysis_data, name='expense_analysis_data'),
    path('kpi-data', get_kpi_data, name='kpi_data'),  
]

# Add new analytics endpoints if available
if has_analytics:
    urlpatterns += [
        path('metrics/', get_key_metrics, name='analytics-metrics'),
        path('charts/', get_analytics_chart_data, name='analytics-charts'),
        path('dashboard/', get_dashboard_data, name='analytics-dashboard'),
    ]
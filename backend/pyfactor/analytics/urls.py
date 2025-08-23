from django.urls import path
from . import views

app_name = 'analytics'

urlpatterns = [
    # Key Metrics
    path('metrics/', views.get_key_metrics, name='key-metrics'),
    
    # Chart Data
    path('charts/', views.get_chart_data, name='chart-data'),
    
    # Dashboard Data (combined)
    path('dashboard/', views.get_dashboard_data, name='dashboard-data'),
]
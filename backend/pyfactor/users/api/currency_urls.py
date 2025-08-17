"""
Currency API URL Configuration - Direct access at /api/currency/
"""
from django.urls import path
from .currency_views import (
    get_currency_list_view,
    get_exchange_rate,
    test_auth,
    test_auth_public,
    currency_diagnostic
)
from .currency_views_v3 import (
    currency_preferences_v3,
    currency_health_check
)

urlpatterns = [
    # Currency API endpoints (accessible at /api/currency/)
    path('list/', get_currency_list_view, name='currency-list'),
    path('preferences/', currency_preferences_v3, name='currency-preferences'),  # Using v3 with comprehensive logging
    path('exchange-rate/', get_exchange_rate, name='currency-exchange-rate'),
    path('test-auth/', test_auth, name='currency-test-auth'),
    path('test-public/', test_auth_public, name='currency-test-public'),
    path('diagnostic/', currency_diagnostic, name='currency-diagnostic'),
    path('health/', currency_health_check, name='currency-health'),  # New health check endpoint
]
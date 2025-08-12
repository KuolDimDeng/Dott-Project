"""
Currency API URL Configuration - Direct access at /api/currency/
"""
from django.urls import path
from .currency_views import (
    get_currency_list_view,
    get_currency_preferences,
    update_currency_preferences,
    get_exchange_rate,
    test_auth,
    test_auth_public,
    currency_diagnostic
)

urlpatterns = [
    # Currency API endpoints (accessible at /api/currency/)
    path('list/', get_currency_list_view, name='currency-list'),
    path('preferences/', get_currency_preferences, name='currency-preferences'),
    path('exchange-rate/', get_exchange_rate, name='currency-exchange-rate'),
    path('test-auth/', test_auth, name='currency-test-auth'),
    path('test-public/', test_auth_public, name='currency-test-public'),
    path('diagnostic/', currency_diagnostic, name='currency-diagnostic'),
]
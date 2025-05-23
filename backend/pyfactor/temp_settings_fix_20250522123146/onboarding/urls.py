"""
Onboarding URL configuration.
"""
from django.urls import path
from .views import DatabaseHealthCheckView

urlpatterns = [
    path('db-health/', DatabaseHealthCheckView.as_view(), name='database_health_check'),
]

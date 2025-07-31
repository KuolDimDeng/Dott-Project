"""
Core module URLs
"""
from django.urls import path
from .views import performance_dashboard, cache_status

urlpatterns = [
    path('performance/', performance_dashboard, name='performance-dashboard'),
    path('cache-status/', cache_status, name='cache-status'),
]
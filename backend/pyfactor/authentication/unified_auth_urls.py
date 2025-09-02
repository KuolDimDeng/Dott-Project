"""
Unified Authentication URLs
"""
from django.urls import path
from . import unified_auth_views

app_name = 'unified_auth'

urlpatterns = [
    # Unified authentication
    path('login/', unified_auth_views.unified_auth, name='unified_auth'),
    path('link/', unified_auth_views.link_accounts, name='link_accounts'),
]
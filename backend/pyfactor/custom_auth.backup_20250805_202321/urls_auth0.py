"""
Auth0 URL patterns
"""
from django.urls import path
from . import auth0_views

urlpatterns = [
    # User management
    path('auth0/create-user/', auth0_views.create_auth0_user, name='create_auth0_user'),
    path('users/by-auth0-sub/<str:auth0_sub>/', auth0_views.get_user_by_auth0_sub, name='get_user_by_auth0_sub'),
    
    # Tenant management
    path('tenants/<uuid:tenant_id>/verify-owner/', auth0_views.verify_tenant_owner, name='verify_tenant_owner'),
    
    # Onboarding
    path('auth0/onboarding-status/', auth0_views.get_onboarding_status, name='get_onboarding_status'),
    path('auth0/complete-onboarding/', auth0_views.complete_onboarding, name='complete_onboarding'),
    
    # Account management
    path('auth0/close-account/', auth0_views.close_user_account, name='close_user_account'),
]
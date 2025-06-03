# Auth0 URL Configuration
from django.urls import path
from . import views_auth0

app_name = 'auth0'

urlpatterns = [
    # User endpoints
    path('users/me/', views_auth0.get_user_profile, name='user_profile'),
    
    # Onboarding endpoints
    path('onboarding/business-info/', views_auth0.submit_business_info, name='business_info'),
    path('onboarding/subscription/', views_auth0.submit_subscription, name='subscription'),
    path('onboarding/complete/', views_auth0.complete_onboarding, name='complete'),
    path('onboarding/status/', views_auth0.get_onboarding_status, name='status'),
]
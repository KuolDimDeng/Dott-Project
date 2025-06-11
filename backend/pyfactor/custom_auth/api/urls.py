from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import auth_views, tenant_views
from .views.auth0_views import (
    Auth0UserCreateView,
    Auth0UserProfileView,
    Auth0OnboardingBusinessInfoView,
    Auth0OnboardingSubscriptionView,
    Auth0OnboardingPaymentView,
    Auth0OnboardingCompleteView,
    Auth0OnboardingStatusView
)
from .views.user_check_views import CheckUserView
from .views.close_account_view import CloseAccountView
from .views.onboarding_status_view import UpdateOnboardingStatusView

router = DefaultRouter()

urlpatterns = [
    # Authentication endpoints
    path('auth/verify-credentials/', auth_views.VerifyCredentialsView.as_view(), name='verify-credentials'),
    path('auth/signup/', auth_views.SignUpView.as_view(), name='signup'),
    path('auth/user-profile/', auth_views.UserProfileView.as_view(), name='user-profile'),
    path('auth/verify-session/', auth_views.VerifySessionView.as_view(), name='verify-session'),
    path('auth/check-user-attributes/', auth_views.CheckUserAttributesView.as_view(), name='check-user-attributes'),
    path('auth/verify-tenant/', auth_views.VerifyTenantView.as_view(), name='verify-tenant'),
    
    # User check endpoint (for debugging)
    path('check-user/', CheckUserView.as_view(), name='check-user'),
    
    # Account management
    path('users/close-account/', CloseAccountView.as_view(), name='close-account'),
    path('users/update-onboarding-status/', UpdateOnboardingStatusView.as_view(), name='update-onboarding-status'),
    
    # Auth0 endpoints
    path('auth0/create-user/', Auth0UserCreateView.as_view(), name='auth0-create-user'),
    path('users/me/', Auth0UserProfileView.as_view(), name='auth0-user-profile'),
    path('onboarding/business-info/', Auth0OnboardingBusinessInfoView.as_view(), name='auth0-onboarding-business-info'),
    path('onboarding/subscription/', Auth0OnboardingSubscriptionView.as_view(), name='auth0-onboarding-subscription'),
    path('onboarding/payment/', Auth0OnboardingPaymentView.as_view(), name='auth0-onboarding-payment'),
    path('onboarding/complete/', Auth0OnboardingCompleteView.as_view(), name='auth0-onboarding-complete'),
    path('onboarding/status/', Auth0OnboardingStatusView.as_view(), name='auth0-onboarding-status'),
    
    # Tenant endpoints
    path('tenants/<uuid:tenant_id>/', tenant_views.TenantDetailView.as_view(), name='tenant-detail'),
    path('tenants/exists/', tenant_views.TenantExistsView.as_view(), name='tenant-exists'),
    path('tenants/current/', tenant_views.CurrentTenantView.as_view(), name='current-tenant'),
    path('tenants/validate/', tenant_views.ValidateTenantView.as_view(), name='validate-tenant'),
    path('tenants/by-email/<str:email>/', tenant_views.TenantByEmailView.as_view(), name='tenant-by-email'),
    path('tenants/verify-owner/', tenant_views.VerifyTenantOwnerView.as_view(), name='verify-tenant-owner'),
    
    # Include router URLs
    path('', include(router.urls)),
]

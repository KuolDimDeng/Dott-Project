from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import auth_views, tenant_views
from .views.oauth_exchange_view import OAuthExchangeView
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
from .views.update_session_view import UpdateSessionView
from .views.session_profile_view import SessionUserProfileView
from .views.register_view import EmailPasswordRegisterView
from .views.unified_profile_view import UnifiedProfileView
from .views.session_v2 import SessionV2View
from .views.pos_validation_view import ValidatePOSAccessView
from .views.password_login_fixed import PasswordLoginViewFixed
from custom_auth.views.email_views import SendEmailView, ContactFormView
from session_manager.views_refresh import refresh_session, session_status, session_verify
# Password login is now in auth_views
# from .views.password_login_view import PasswordLoginView
# from .views.test_endpoint_view import TestEndpointView

# Import new Auth0 views
try:
    from custom_auth import auth0_views
    has_new_auth0_views = True
except ImportError:
    has_new_auth0_views = False

router = DefaultRouter()

urlpatterns = [
    # Debug endpoint temporarily removed due to import issues
    # path('debug/session-state/', DebugSessionStateView.as_view(), name='debug-session-state'),
    # Authentication endpoints
    path('auth/signup/', auth_views.SignUpView.as_view(), name='signup'),
    path('auth/register/', EmailPasswordRegisterView.as_view(), name='email-password-register'),
    # Temporarily use fixed version to resolve transaction issues
    path('auth/password-login/', PasswordLoginViewFixed.as_view(), name='password-login'),
    # Original: path('auth/password-login/', auth_views.PasswordLoginView.as_view(), name='password-login'),
    path('auth/oauth-exchange/', OAuthExchangeView.as_view(), name='oauth-exchange'),
    path('auth/deployment-check/', auth_views.DeploymentCheckView.as_view(), name='deployment-check'),
    # path('auth/test-endpoint/', TestEndpointView.as_view(), name='test-endpoint'),
    path('auth/check-user-attributes/', auth_views.CheckUserAttributesView.as_view(), name='check-user-attributes'),
    
    # Industry-standard session management v2
    path('auth/session-v2', SessionV2View.as_view(), name='session-v2'),
    
    # Session refresh endpoints for auto-recovery
    path('auth/refresh', refresh_session, name='auth-refresh'),
    path('auth/session-verify', session_verify, name='auth-session-verify'),
    path('auth/session-status', session_status, name='auth-session-status'),
    
    # POS access validation endpoint
    path('auth/validate-pos-access', ValidatePOSAccessView.as_view(), name='validate-pos-access'),
    
    # Unified profile endpoint (consolidates all profile endpoints)
    path('auth/profile', UnifiedProfileView.as_view(), name='unified-profile'),
    
    # User check endpoint (for debugging)
    path('check-user/', CheckUserView.as_view(), name='check-user'),
    
    # Account management
    path('users/close-account/', CloseAccountView.as_view(), name='close-account'),
    
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
    path('tenants/current/', tenant_views.CurrentTenantView.as_view(), name='current-tenant'),
    path('tenants/verify/', tenant_views.VerifyTenantOwnerView.as_view(), name='verify-tenant'),
    
    # Email endpoints
    path('send-email/', SendEmailView.as_view(), name='send-email'),
    path('contact-form/', ContactFormView.as_view(), name='contact-form'),
    
    # Include router URLs
    path('', include(router.urls)),
]

# Add new Auth0 endpoints if available
if has_new_auth0_views:
    urlpatterns += [
        # New secure Auth0 endpoints
        path('users/by-auth0-sub/<str:auth0_sub>/', auth0_views.get_user_by_auth0_sub, name='get_user_by_auth0_sub'),
        path('tenants/<uuid:tenant_id>/verify-owner/', auth0_views.verify_tenant_owner, name='verify_tenant_owner'),
        path('auth0/onboarding-status/', auth0_views.get_onboarding_status, name='get_onboarding_status'),
        
        path('auth0/close-account/', auth0_views.close_user_account, name='close_user_account'),
        path('auth0/check-onboarding-status/', auth0_views.check_onboarding_status, name='check_onboarding_status'),
    ]

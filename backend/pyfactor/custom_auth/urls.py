# At the top of your urls.py file
"""URL Configuration for Authentication

This module defines the URL patterns for all authentication-related functionality:
- User registration and account activation
- Token-based authentication
- Password reset flow
- Social authentication
- Session management
- Tenant management

All URLs are prefixed with 'auth/' from the main URLs configuration.
"""

from django.urls import path, re_path, include, register_converter
from django.contrib.auth import views as auth_views
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView, TokenVerifyView
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.routers import DefaultRouter

# Import views from subdirectories
from custom_auth.views.signup import SignupView as APISignupView
from custom_auth.views.tenant import TenantVerifyView as OldTenantVerifyView, TenantCreateView
from custom_auth.views.tenant_verify import TenantVerifyView as NewTenantVerifyView
from custom_auth.api.views.tenant_views import TenantDetailView
from custom_auth.views.token_views import TokenRefreshView

# Import directly from the main_views.py file
from .main_views import (
    AuthErrorView, RegisterView, CustomTokenObtainPairView, CustomAuthToken,
    SocialLoginView, SessionView, SignUpView, ForgotPasswordView,
    CustomPasswordResetView, CustomPasswordResetConfirmView,
    ActivateAccountView, ResendActivationEmailView, VerifyEmailView, health_check
)

from custom_auth.rls_debug import rls_debug_view, fix_rls_view

class UUIDConverter:
    regex = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

    def to_python(self, value):
        return value

    def to_url(self, value):
        return value

register_converter(UUIDConverter, 'uuid')

# Create router for Rest Framework
router = DefaultRouter()

urlpatterns = [
       # Auth error logging endpoints - handle both patterns explicitly
    re_path(r'^_log/?$', AuthErrorView.as_view(), name='auth_log'),
    re_path(r'^error/?$', AuthErrorView.as_view(), name='auth_error'),

    # OAuth Authentication endpoints
    # path('auth/signup/', OAuthSignUpView.as_view(), name='oauth_signup'),
    # path('auth/profile/', OAuthUserProfileView.as_view(), name='oauth_profile'),
    
    # Registration and Signup
    # Commented out redundant signup endpoints as part of consolidation
    # path('register/', RegisterView.as_view(), name='register'),
    # path('signup/', SignupView.as_view(), name='signup'),
    # path('auth/signup/', AuthSignupView.as_view(), name='auth_signup'),

    # Token Management
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'),
    path('auth-token/', CustomAuthToken.as_view(), name='auth_token'),

    # Add new API endpoint for token refresh
    path('refresh/', TokenRefreshView.as_view(), name='api_token_refresh'),

    # Password Reset Flow
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('password-reset/', CustomPasswordResetView.as_view(), name='password_reset'),
    path(
        'password-reset/done/',
        auth_views.PasswordResetDoneView.as_view(),
        name='password_reset_done'
    ),
    path(
        'reset/<uidb64>/<token>/',
        CustomPasswordResetConfirmView.as_view(),
        name='password_reset_confirm'
    ),
    path(
        'reset/done/',
        auth_views.PasswordResetCompleteView.as_view(),
        name='password_reset_complete'
    ),

    # Social Authentication
    path('social-login/', SocialLoginView.as_view(), name='social_login'),

    # Email Verification
    path(
        'activate/<str:uidb64>/<str:token>/',
        ActivateAccountView.as_view(),
        name='activate'
    ),
    path(
        'resend-activation/',
        ResendActivationEmailView.as_view(),
        name='resend_activation'
    ),
    
    # Account Management
    path(
        'verify-email/<str:key>/',
        VerifyEmailView.as_view(),
        name='verify_email'
    ),
    path('health-check/', health_check.as_view(), name='health-check'),
    
    # User Signup API
    # Commented out redundant signup endpoint as part of consolidation
    # path('signup/', SignupAPIView.as_view(), name='signup_api'),

    # Tenant endpoints (legacy)
    path('tenant/verify/', OldTenantVerifyView.as_view(), name='tenant-verify-old'),
    path('tenant/create/', TenantCreateView.as_view(), name='tenant-create'),
    
    # Enhanced tenant management endpoints
    path('tenant/verify/', NewTenantVerifyView.as_view(), name='tenant-verify'),

    # Debug endpoints for RLS
    path('debug/rls/', rls_debug_view, name='rls_debug'),
    path('debug/rls/fix/', fix_rls_view, name='rls_fix'),
    
    # RBAC endpoints
    path('rbac/', include('custom_auth.urls_rbac')),
]

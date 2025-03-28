# At the top of your urls.py file
"""URL Configuration for Authentication

This module defines the URL patterns for all authentication-related functionality:
- User registration and account activation
- Token-based authentication
- Password reset flow
- Social authentication
- Session management
- Tenant management

All URLs are prefixed with 'api/' from the main URLs configuration.
"""

from django.urls import path, re_path, include, register_converter
from django.contrib.auth import views as auth_views
from rest_framework.parsers import JSONParser, FormParser, MultiPartParser
from rest_framework.decorators import api_view, permission_classes
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

# Import views from subdirectories
from custom_auth.views.signup import SignupView as APISignupView
from custom_auth.views.tenant import TenantVerifyView, TenantCreateView
from custom_auth.api.views.tenant_views import TenantDetailView

# Import directly from the main_views.py file
from .main_views import (
    AuthErrorView, RegisterView, CustomTokenObtainPairView, CustomAuthToken,
    SocialLoginView, SessionView, SignUpView, ForgotPasswordView,
    CustomPasswordResetView, CustomPasswordResetConfirmView,
    ActivateAccountView, ResendActivationEmailView, VerifyEmailView, health_check
)

class UUIDConverter:
    regex = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

    def to_python(self, value):
        return value

    def to_url(self, value):
        return str(value)

register_converter(UUIDConverter, 'uuid')

urlpatterns = [
       # API endpoints
       path('api/', include('custom_auth.api.urls')),

       # Session endpoints
    
       # Auth error logging endpoints - handle both patterns explicitly
    re_path(r'^auth/_log/?$', AuthErrorView.as_view(), name='auth_log'),
    re_path(r'^auth/error/?$', AuthErrorView.as_view(), name='auth_error'),


    
    # Registration and Signup
    path('register/', RegisterView.as_view(), name='register'),
    path('signup/', SignUpView.as_view(), name='signup'),

    # Token Management
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/blacklist/', TokenBlacklistView.as_view(), name='token_blacklist'),
    path('auth-token/', CustomAuthToken.as_view(), name='auth_token'),

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
    path('api/auth/signup/', APISignupView.as_view(), name='signup_api'),

    # Tenant endpoints
    path('tenant/verify/', TenantVerifyView.as_view(), name='tenant-verify'),
    path('tenant/create/', TenantCreateView.as_view(), name='tenant-create'),
]

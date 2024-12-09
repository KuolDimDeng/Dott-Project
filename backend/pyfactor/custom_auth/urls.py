# At the top of your urls.py file
"""URL Configuration for Authentication

This module defines the URL patterns for all authentication-related functionality:
- User registration and account activation
- Token-based authentication
- Password reset flow
- Social authentication
- Session management

All URLs are prefixed with 'api/' from the main URLs configuration.
"""

from django.urls import path
from django.contrib.auth import views as auth_views
from rest_framework_simplejwt.views import TokenRefreshView, TokenBlacklistView

from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    CustomAuthToken,
    SocialLoginView,
    UpdateSessionView,
    SignUpView,
    ForgotPasswordView,
    CustomPasswordResetView,
    CustomPasswordResetConfirmView,
    ActivateAccountView,
    ResendActivationEmailView,
    VerifyEmailView,
    health_check
)

urlpatterns = [
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

    # Session Management
    path('update-session/', UpdateSessionView.as_view(), name='update_session'),

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

]
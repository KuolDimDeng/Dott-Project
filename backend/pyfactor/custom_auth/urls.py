#/Users/kuoldeng/projectx/backend/pyfactor/custom_auth/urls.py
from django.urls import path
from django.contrib.auth import views as auth_views
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    CustomAuthToken,
    SocialLoginView,
    UpdateSessionView,  # Ensure this is a function view or wrap it in `as_view()` if it’s a class-based view
    SignUpView,
    ForgotPasswordView,
    CustomPasswordResetView,
    CustomPasswordResetConfirmView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),  # Standard registration
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),  # JWT token obtain
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),  # JWT token refresh
    path('auth-token/', CustomAuthToken.as_view(), name='auth_token'),  # Custom token-based auth endpoint
    path('social-login/', SocialLoginView.as_view(), name='social_login'),  # Social login
    path('signup/', SignUpView.as_view(), name='signup'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),  # Password reset request
    path('password-reset/', CustomPasswordResetView.as_view(), name='password_reset'),  # Password reset form
    path('password-reset/done/', auth_views.PasswordResetDoneView.as_view(), name='password_reset_done'),  # Reset done view
    path('reset/<uidb64>/<token>/', CustomPasswordResetConfirmView.as_view(), name='password_reset_confirm'),  # Password reset confirm
    path('reset/done/', auth_views.PasswordResetCompleteView.as_view(), name='password_reset_complete'),  # Reset complete view
    path('update-session/', UpdateSessionView.as_view(), name='update_session'),


]

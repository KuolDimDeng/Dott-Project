from django.urls import path
from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    ProfileView,
    CustomAuthToken,
    OnboardingStatusView,
    ActivateAccountView,
    SocialLoginView,
    CustomTokenRefreshView,
)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),  # Use your custom refresh view
    path('profile/', ProfileView.as_view(), name='profile'),
    path('auth-token/', CustomAuthToken.as_view(), name='auth_token'),
    path('onboarding-status/', OnboardingStatusView.as_view(), name='onboarding_status'),
    path('activate/<uidb64>/<token>/', ActivateAccountView.as_view(), name='activate'),
    path('social-login/', SocialLoginView.as_view(), name='social_login'),
    path('user/', ProfileView.as_view(), name='user'),  # Endpoint for /api/user
]

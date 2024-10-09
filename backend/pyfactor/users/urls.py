from django.urls import path
from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    ProfileView,
    CustomAuthToken,  # Correct class name
    OnboardingStatusView,  # Updated name correctly
    CompleteOnboardingView,  # Updated name correctly
    ActivateAccountView,
    SocialLoginView,
    CustomTokenRefreshView)
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', ProfileView.as_view(), name='profile'),  # Call .as_view() for class-based views
    path('auth-token/', CustomAuthToken.as_view(), name='auth_token'),  # Corrected class name here
    path('onboarding-status/', OnboardingStatusView.as_view(), name='onboarding_status'),  # Added .as_view()
    path('complete-onboarding/', CompleteOnboardingView.as_view(), name='complete_onboarding'),  # Added .as_view()
    path('activate/<uidb64>/<token>/', ActivateAccountView.as_view(), name='activate'),
    path('social-login/', SocialLoginView.as_view(), name='social_login'),
    path('token/refresh/', CustomTokenRefreshView.as_view(), name='token_refresh'),
    path('user/', ProfileView.as_view(), name='user'),  # Add this line for the /api/user endpoint



]

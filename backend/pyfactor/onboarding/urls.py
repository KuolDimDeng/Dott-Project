# URLs
from django.urls import path
from .views import (
    StartOnboardingView, 
    UpdateOnboardingView, 
    CompleteOnboardingView, 
    CleanupOnboardingView, 
    OnboardingStatusView, 
    GoogleTokenExchangeView,
    update_session,  # Add the new endpoint
    SaveEmailView,  # Add the new endpoint
)

urlpatterns = [
    path('start/', StartOnboardingView.as_view(), name='start_onboarding'),
    path('update/<str:step>/', UpdateOnboardingView.as_view(), name='update_onboarding'),
    path('complete/', CompleteOnboardingView.as_view(), name='complete_onboarding'),
    path('cleanup/', CleanupOnboardingView.as_view(), name='cleanup_onboarding'),
    path('status/', OnboardingStatusView.as_view(), name='onboarding_status'),
    path('token-exchange/', GoogleTokenExchangeView.as_view(), name='token_exchange'),
    path('save-email/', SaveEmailView.as_view(), name='save_email'),  # Add the new endpoint
    path('api/auth/update-session/', update_session, name='update_session'),


]
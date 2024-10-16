# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/urls.py

from django.urls import path
from .views import (
    StartOnboardingView,
    CompleteOnboardingView,
    CleanupOnboardingView,
    OnboardingStatusView,
    GoogleTokenExchangeView,
    update_session,
    SaveEmailView,
    SaveStep1View,
    SaveStep2View,
    SaveStep3View,
    SaveStep4View,
    UpdateOnboardingView,
    OnboardingSuccessView
)

app_name = 'onboarding'


urlpatterns = [
    path('start/', StartOnboardingView.as_view(), name='start_onboarding'),
    path('update/<str:step>/', UpdateOnboardingView.as_view(), name='update_onboarding'),
    path('complete/', CompleteOnboardingView.as_view(), name='complete_onboarding'),
    path('cleanup/', CleanupOnboardingView.as_view(), name='cleanup_onboarding'),
    path('status/', OnboardingStatusView.as_view(), name='onboarding_status'),
    path('token-exchange/', GoogleTokenExchangeView.as_view(), name='token_exchange'),
    path('update-session/', update_session, name='update_session'),
    path('save-email/', SaveEmailView.as_view(), name='save_email'),
    path('save-step1/', SaveStep1View.as_view(), name='save_step1'),
    path('save-step2/', SaveStep2View.as_view(), name='save_step2'),
    path('save-step3/', SaveStep3View.as_view(), name='save_step3'),
    path('save-step4/', SaveStep4View.as_view(), name='save_step4'),
    path('success/', OnboardingSuccessView.as_view(), name='onboarding_success'),  # Add this new route

]
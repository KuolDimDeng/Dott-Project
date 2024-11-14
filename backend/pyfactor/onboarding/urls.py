from django.urls import path
from . import views
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
    # Status and update routes
    path('status/', OnboardingStatusView.as_view(), name='onboarding_status'),
    path('update/<str:step>/', UpdateOnboardingView.as_view(), name='update_onboarding'),
    
    # Authentication routes
    path('token-exchange/', GoogleTokenExchangeView.as_view(), name='token_exchange'),
    path('update-session/', update_session, name='update_session'),
    
    # Step routes
    path('save-email/', SaveEmailView.as_view(), name='save_email'),
    path('save-step1/', SaveStep1View.as_view(), name='save_step1'),
    path('save-step2/', SaveStep2View.as_view(), name='save_step2'),
    path('save-step3/', SaveStep3View.as_view(), name='save_step3'),
    
    # Step 4 routes - consolidated
    path('step4/start/', SaveStep4View.as_view(), name='step4_start'),
    path('step4/save/', SaveStep4View.as_view(), name='step4_save'),
    
    # Task management routes
    path('task/<str:task_id>/status/', views.get_task_status, name='task_status'),
    path('task/<str:task_id>/cancel/', views.cancel_task, name='cancel_task'),
    
    # Completion routes
    path('complete/', CompleteOnboardingView.as_view(), name='complete_onboarding'),
    path('success/', OnboardingSuccessView.as_view(), name='onboarding_success'),
    
    # Maintenance routes
    path('cleanup/', CleanupOnboardingView.as_view(), name='cleanup_onboarding'),
]
# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/urls.py

"""URL Configuration for onboarding app

This module handles all URL routing for the onboarding process, including:
- Authentication routes
- Step progress tracking
- Step-specific views
- Task management
- Onboarding completion
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from django.views.decorators.csrf import csrf_exempt  # Add this import

from . import views
from .views import (
    StartOnboardingView,
    CompleteOnboardingView,
    CleanupOnboardingView,
    CheckOnboardingStatusView,  # Changed from OnboardingStatusView
    GoogleTokenExchangeView,
    update_session,
    SaveEmailView,
    SaveStep1View,
    SaveStep2View,
    SaveStep3View,
    SaveStep4View,
    UpdateOnboardingView,
    OnboardingSuccessView,
    get_task_status,
    cancel_task,
)

app_name = 'onboarding'

urlpatterns = [
    # Authentication & Token routes
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token-exchange/', GoogleTokenExchangeView.as_view(), name='token_exchange'),
    path('session/update/', update_session, name='update_session'),

    # Status and Progress routes
    path('status/', CheckOnboardingStatusView.as_view(), name='onboarding_status'),
    path('progress/', CheckOnboardingStatusView.as_view(), name='onboarding_progress'),
    path('check-status/', CheckOnboardingStatusView.as_view(), name='check_onboarding_status'),


    # Step Management routes
    path('start/', StartOnboardingView.as_view(), name='start_onboarding'),
    path('save-email/', SaveEmailView.as_view(), name='save_email'),

    # Basic step routes
    path('save-step1/', SaveStep1View.as_view(), name='save_step1'),
    path('save-step2/', SaveStep2View.as_view(), name='save_step2'),
    path('save-step3/', SaveStep3View.as_view(), name='save_step3'),

    # Step 4 routes - ordered from most specific to most general
    path('step4/save/', csrf_exempt(SaveStep4View.as_view()), name='step4_save'),  # Place save first
    path('step4/setup/cancel/', csrf_exempt(SaveStep4View.as_view()), name='step4_cancel'),
    path('step4/setup/status/', csrf_exempt(SaveStep4View.as_view()), name='step4_status'),
    path('step4/setup/start/', csrf_exempt(SaveStep4View.as_view()), name='step4_start'),
    path('step4/setup/', csrf_exempt(SaveStep4View.as_view()), name='step4_setup'),
    path('step4/', csrf_exempt(SaveStep4View.as_view()), name='step4_complete'),

    # Task Management routes
    path('tasks/<str:task_id>/status/', get_task_status, name='task_status'),
    path('tasks/<str:task_id>/cancel/', cancel_task, name='cancel_task'),

    # Completion and update routes  
    path('update/<str:step>/', UpdateOnboardingView.as_view(), name='update_onboarding'),
    path('complete/', CompleteOnboardingView.as_view(), name='complete_onboarding'), 
    path('success/', OnboardingSuccessView.as_view(), name='onboarding_success'),

    # Maintenance routes
    path('cleanup/', CleanupOnboardingView.as_view(), name='cleanup_onboarding'),
]
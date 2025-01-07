# /Users/kuoldeng/projectx/backend/pyfactor/onboarding/urls.py

"""URL Configuration for onboarding app

This module handles all URL routing for the onboarding process, including:
- Authentication routes
- Step progress tracking
- Step-specific views
- Task management
- Database management
- Onboarding completion and reset
"""


from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from django.views.decorators.csrf import csrf_exempt

from . import views
from .views import (
   StartOnboardingView,
   CompleteOnboardingView, 
   CleanupOnboardingView,
   CheckOnboardingStatusView,
   GoogleTokenExchangeView,
   DatabaseHealthCheckView,
   ResetOnboardingView,
   update_session,
   SaveEmailView,
   SaveStep1View,
   SaveStep2View, 
   SaveStep3View,
   SaveStep4View,
   UpdateOnboardingView,
   OnboardingSuccessView,
   SetupStatusView,
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
   path('start/', StartOnboardingView.as_view(), name='start_onboarding'),
   path('save-email/', SaveEmailView.as_view(), name='save_email'),

   # Onboarding Step routes
   path('business-info/', SaveStep1View.as_view(), name='save_business_info'),
   path('subscription/', SaveStep2View.as_view(), name='save_subscription'),
   path('payment/', SaveStep3View.as_view(), name='save_payment'),
   path('setup/', SaveStep4View.as_view(), name='save_setup'),

   # Database Management routes
   path('database/health-check/', DatabaseHealthCheckView.as_view(), name='database-health'),
   path('database/status/', views.get_database_status, name='database-status'),
   path('database/reset/', ResetOnboardingView.as_view(), name='reset-database'),

   # Setup Management routes
   path('setup/status/', SetupStatusView.as_view(), name='setup_status'),
   path('setup/start/', SaveStep4View.as_view(), name='setup_start'),
   path('setup/cancel/', SaveStep4View.as_view(), name='setup_cancel'),
   path('setup/complete/', SaveStep4View.as_view(), name='setup_complete'),

   # Task Management routes
   path('tasks/<str:task_id>/status/', get_task_status, name='task_status'),
   path('tasks/<str:task_id>/cancel/', cancel_task, name='cancel_task'),

   # Update and Completion routes
   path('update/<str:step>/', UpdateOnboardingView.as_view(), name='update_onboarding'),
   path('complete/', CompleteOnboardingView.as_view(), name='complete_onboarding'),
   path('success/', OnboardingSuccessView.as_view(), name='onboarding_success'),

   # Maintenance and Reset routes
   path('cleanup/', CleanupOnboardingView.as_view(), name='cleanup_onboarding'),
   path('reset/', ResetOnboardingView.as_view(), name='reset-onboarding'),
]
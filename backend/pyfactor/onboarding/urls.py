#/Users/kuoldeng/projectx/backend/pyfactor/onboarding/urls.py
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView as JWTTokenVerifyView
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
    SaveStep1View,
    SaveStep2View,
    SaveStep3View,
    SaveStep4View,
    UpdateOnboardingView,
    OnboardingSuccessView,
    get_task_status,
    cancel_task,
    ValidateSubscriptionAccessView,
    GetBusinessInfoView,
    UpdateOnboardingStatusView,
    SubscriptionStatusView,
    SetupStatusCheckView,
)
from .views.setup import SetupStatusView, InitializeSetupView
from .views.dashboard_setup import DashboardSchemaSetupView
from .api.views.webhook_views import stripe_webhook  # Update this import path
from .views.subscription import SubscriptionSaveView


app_name = 'onboarding'

urlpatterns = [
    # Webhook routes
    path('webhooks/stripe/', csrf_exempt(stripe_webhook), name='stripe-webhook'),
    
    # Authentication & Token routes
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token-exchange/', GoogleTokenExchangeView.as_view(), name='token_exchange'),
    path('session/update/', update_session, name='update_session'),
    path('token/verify/', JWTTokenVerifyView.as_view(), name='token_verify'),
    
    # Status routes
    path('status/', CheckOnboardingStatusView.as_view(), name='status'),
    path('status-update/', UpdateOnboardingStatusView.as_view(), name='update-status'),
    
    # Step routes
    path('steps/current/', SaveStep1View.as_view(), name='current-step'),
    path('steps/next/', SaveStep2View.as_view(), name='next-step'),
    path('steps/<int:step>/', SaveStep3View.as_view(), name='step'),
    
    # Business Info routes
    path('business-info/', GetBusinessInfoView.as_view(), name='business-info'),
    path('business-info/validate/', ValidateSubscriptionAccessView.as_view(), name='validate-business-info'),
    path('save-business-info/', SaveStep1View.as_view(), name='save-business-info'),
    
    # Subscription routes
    path('subscription/validate/', ValidateSubscriptionAccessView.as_view(), name='validate-subscription'),
    path('subscription/save/', SubscriptionSaveView.as_view(), name='subscription_save'),
    path('subscription/status/', SubscriptionStatusView.as_view(), name='subscription-status'),
    
    # Setup routes
    path('setup/', InitializeSetupView.as_view(), name='initialize-setup'),
    path('setup/status/', SetupStatusView.as_view(), name='setup-status'),
    path('setup/status/<uuid:tenant_id>/', SetupStatusView.as_view(), name='setup-status-with-tenant'),
    path('setup/start/', StartOnboardingView.as_view(), name='start-setup'),
    path('setup/cancel/', StartOnboardingView.as_view(), name='cancel-setup'),
    path('setup/complete/', CompleteOnboardingView.as_view(), name='complete-setup'),
    
    # Database routes 
    path('database/health/', DatabaseHealthCheckView.as_view(), name='database-health'),
    path('database/status/', get_task_status, name='database-status'),
    path('database/reset/', ResetOnboardingView.as_view(), name='database-reset'),
    
    # Task routes
    path('tasks/<str:task_id>/status/', get_task_status, name='task-status'),
    path('tasks/<str:task_id>/cancel/', cancel_task, name='cancel-task'),
    path('setup-status/<str:task_id>/', SetupStatusCheckView.as_view(), name='setup-status-check'),
    
    # Maintenance routes
    path('cleanup/', CleanupOnboardingView.as_view(), name='cleanup'),
    path('reset/', ResetOnboardingView.as_view(), name='reset'),
    
    # Success/Complete routes
    path('success/', OnboardingSuccessView.as_view(), name='success'),
    path('complete/', CompleteOnboardingView.as_view(), name='complete'),
    
    # Dashboard routes
    path('setup/trigger/', DashboardSchemaSetupView.as_view(), name='trigger_schema_setup'),
]

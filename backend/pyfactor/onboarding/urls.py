#/Users/kuoldeng/projectx/backend/pyfactor/onboarding/urls.py
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView as JWTTokenVerifyView
from django.views.decorators.csrf import csrf_exempt
from . import views
from .views import (
    StartOnboardingView,
    CompleteOnboardingView,  # Import but don't use in URL patterns
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
from .api.views.webhook_views import stripe_webhook
from .api.payment_views import payment_pending_view, complete_payment_view
from .views.subscription import SubscriptionSaveView
from .views.onboarding_api import OnboardingStatusAPI, CompleteOnboardingAPI, ResumeOnboardingAPI
from .api.status_views import OnboardingStatusView, ForceCompleteOnboardingView
from .api.data_views import OnboardingDataView
from rest_framework.routers import DefaultRouter
# Import the new complete-all view if it exists
try:
    from .api.views.complete_all_view import complete_all_onboarding
except ImportError:
    complete_all_onboarding = None


app_name = 'onboarding'

# Create a router for ViewSet registration
router = DefaultRouter()

urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Webhook routes (no auth required)
    path('webhooks/stripe/', csrf_exempt(stripe_webhook), name='stripe-webhook'),
    
    # Authentication & Token routes
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token-exchange/', GoogleTokenExchangeView.as_view(), name='token_exchange'),
    path('session/update/', update_session, name='update_session'),
    path('token/verify/', JWTTokenVerifyView.as_view(), name='token_verify'),
    
    # Status routes
    path('status/', CheckOnboardingStatusView.as_view(), name='onboarding-status'),
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
    path('setup/', InitializeSetupView.as_view(), name='setup'),
    path('setup/status/', SetupStatusView.as_view(), name='setup-status'),
    path('setup/status/<uuid:tenant_id>/', SetupStatusView.as_view(), name='setup-status-with-tenant'),
    path('setup/start/', StartOnboardingView.as_view(), name='start-setup'),
    path('setup/cancel/', StartOnboardingView.as_view(), name='cancel-setup'),
    # REMOVED: setup/complete endpoint - Use api/complete/ instead
    
    # Database routes 
    path('database/health/', DatabaseHealthCheckView.as_view(), name='database-health'),
    path('database/reset/', ResetOnboardingView.as_view(), name='database-reset'),
    
    # Task routes
    path('setup-status/<str:task_id>/', SetupStatusCheckView.as_view(), name='setup-status-check'),
    
    # Maintenance routes
    path('cleanup/', CleanupOnboardingView.as_view(), name='cleanup'),
    path('reset/', ResetOnboardingView.as_view(), name='onboarding-reset'),
    
    # Success/Complete routes
    path('success/', OnboardingSuccessView.as_view(), name='success'),
    # REMOVED: complete endpoint - Use api/complete/ instead
    
    # Dashboard routes
    path('setup/trigger/', DashboardSchemaSetupView.as_view(), name='trigger_schema_setup'),
    
    # New tiered storage API endpoints
    path('api/status/', OnboardingStatusAPI.as_view(), name='api-onboarding-status'),
    path('api/complete/', CompleteOnboardingAPI.as_view(), name='api-complete-onboarding'),
    path('api/resume/', ResumeOnboardingAPI.as_view(), name='api-resume-onboarding'),
    path('api/data/', OnboardingDataView.as_view(), name='api-onboarding-data'),
    
    # Payment verification endpoints
    path('payment-pending/', payment_pending_view, name='payment-pending'),
    path('complete-payment/', complete_payment_view, name='complete-payment'),
    
    # Single source of truth status endpoints
    path('status/', OnboardingStatusView.as_view(), name='onboarding-status'),
    path('force-complete/', ForceCompleteOnboardingView.as_view(), name='force-complete-onboarding'),
]

# Add the new complete-all endpoint if available
if complete_all_onboarding:
    urlpatterns.append(
        path('api/onboarding/complete-all/', complete_all_onboarding, name='complete-all-onboarding')
    )

"""
Views package for onboarding app.
Contains views for handling onboarding flow and setup process.
"""

# Import setup views
from .setup import SetupStatusView, InitializeSetupView, SetupStatusCheckView

# Import onboarding views with optimized imports
from onboarding.views.views import (
    # Core views needed for URLs
    DatabaseHealthCheckView,
    StartOnboardingView,
    CompleteOnboardingView,
    CleanupOnboardingView,
    CheckOnboardingStatusView,
    GoogleTokenExchangeView,
    ResetOnboardingView,
    
    # Step views
    SaveStep1View,
    SaveStep2View,
    SaveStep3View,
    SaveStep4View,
    UpdateOnboardingView,
    OnboardingSuccessView,
    
    # Status views
    ValidateSubscriptionAccessView,
    GetBusinessInfoView,
    UpdateOnboardingStatusView,
    SubscriptionStatusView,
    
    # Utility functions
    update_session,
    get_task_status,
    check_setup_status,
    get_schema_status,
    cancel_task,
)

# Define exports with all required views
__all__ = [
    # Setup views
    'SetupStatusView',
    'InitializeSetupView',
    'SetupStatusCheckView',
    
    # Core views
    'DatabaseHealthCheckView',
    'StartOnboardingView',
    'CompleteOnboardingView',
    'CleanupOnboardingView',
    'CheckOnboardingStatusView',
    'GoogleTokenExchangeView',
    'ResetOnboardingView',
    
    # Step views
    'SaveStep1View',
    'SaveStep2View',
    'SaveStep3View',
    'SaveStep4View',
    'UpdateOnboardingView',
    'OnboardingSuccessView',
    
    # Status views
    'ValidateSubscriptionAccessView',
    'GetBusinessInfoView',
    'UpdateOnboardingStatusView',
    'SubscriptionStatusView',
    
    # Utility functions
    'update_session',
    'get_task_status',
    'check_setup_status',
    'get_schema_status',
    'cancel_task',
]
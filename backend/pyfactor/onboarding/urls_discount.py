"""
URLs for discount-related endpoints
"""
from django.urls import path
from .views.discount_check import (
    CheckDiscountEligibilityView,
    GetPricingForCountryView
)
from .views.debug_kenya import DebugKenyaPricingView

urlpatterns = [
    # Discount check during onboarding
    path(
        'api/discount/check-eligibility/', 
        CheckDiscountEligibilityView.as_view(), 
        name='check-discount-eligibility'
    ),
    
    # Public pricing endpoint
    path(
        'api/pricing/by-country/', 
        GetPricingForCountryView.as_view(), 
        name='pricing-by-country'
    ),
    
    # Debug endpoint
    path(
        'api/debug/kenya-pricing/', 
        DebugKenyaPricingView.as_view(), 
        name='debug-kenya-pricing'
    ),
]
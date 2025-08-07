#/Users/kuoldeng/projectx/backend/pyfactor/users/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProfileView,
    UserMenuPrivilegeViewSet
)
from .business_views import (
    business_search,
    get_business_details,
    get_user_subscription,
    update_business,
    update_business_details,
    create_business,
    create_business_details,
    update_subscription_plan,
    stripe_webhook,
    CreateCheckoutSessionView
)
from .api.checkout.checkout_session import create_checkout_session
from .api.checkout.checkout_session_v2 import create_checkout_session_v2, get_subscription_pricing
from .api.checkout.mobile_money_checkout import create_mobile_money_checkout, verify_mobile_money_payment
from .api.payment_methods import get_payment_methods, check_mobile_money_support
from .api.subscription_views import subscription_status
from .api.subscription_status_views import subscription_status as grace_period_status, retry_payment
from .api.business_logo_views import upload_business_logo, delete_business_logo, get_business_logo
from .api.currency_views import get_currency_list_view, get_exchange_rate
from .api.currency_views_hotfix import currency_preferences_hotfix as get_currency_preferences
from .api.currency_views_v3 import currency_health_check
from .api.business_settings_views import business_settings, accounting_standards_info
from rest_framework_simplejwt.views import TokenRefreshView

# Create a router for the menu privileges API
router = DefaultRouter()
router.register(r'menu-privileges', UserMenuPrivilegeViewSet, basename='menu-privileges')

urlpatterns = [
    path('profile', ProfileView.as_view(), name='user-profile'),
    path('business/search', business_search, name='business_search'),
    path('business/details', get_business_details, name='get_business_details'),
    path('business/subscription', get_user_subscription, name='get_user_subscription'),
    path('business/update', update_business, name='update_business'),
    path('business/details/update', update_business_details, name='update_business_details'),
    path('business/details/create', create_business_details, name='create_business_details'),
    path('business/create', create_business, name='create_business'),
    path('subscription/update', update_subscription_plan, name='update_subscription_plan'),
    path('checkout-session', create_checkout_session, name='checkout-session'),
    path('stripe-webhook', stripe_webhook, name='stripe-webhook'),
    path('checkout-view', CreateCheckoutSessionView.as_view(), name='checkout-view'),
    path('refresh-token', TokenRefreshView.as_view(), name='refresh-token'),
    path('webhook/stripe', stripe_webhook, name='stripe_webhook'),
    path('api/subscription/status', subscription_status, name='subscription_status'),
    path('api/subscription/grace-status', grace_period_status, name='grace_period_status'),
    path('api/subscription/retry-payment', retry_payment, name='retry_payment'),
    # Payment methods and mobile money
    path('api/payment-methods', get_payment_methods, name='get_payment_methods'),
    path('api/mobile-money/check-support', check_mobile_money_support, name='check_mobile_money_support'),
    path('api/checkout/create-v2', create_checkout_session_v2, name='create_checkout_session_v2'),
    path('api/checkout/mobile-money', create_mobile_money_checkout, name='create_mobile_money_checkout'),
    path('api/checkout/mobile-money/verify', verify_mobile_money_payment, name='verify_mobile_money_payment'),
    path('api/subscription/pricing', get_subscription_pricing, name='get_subscription_pricing'),
    # Business logo endpoints
    path('api/business/logo/upload', upload_business_logo, name='upload_business_logo'),
    path('api/business/logo/delete', delete_business_logo, name='delete_business_logo'),
    path('api/business/logo', get_business_logo, name='get_business_logo'),
    # Currency endpoints
    path('api/currency/list', get_currency_list_view, name='get_currency_list'),
    path('api/currency/preferences', get_currency_preferences, name='get_currency_preferences'),
    path('api/currency/health', currency_health_check, name='currency_health_check'),
    path('api/currency/exchange-rate', get_exchange_rate, name='get_exchange_rate'),
    # Business settings and accounting standards
    path('api/business/settings', business_settings, name='business_settings'),
    path('api/accounting/standards-info', accounting_standards_info, name='accounting_standards_info'),
    # Include the router URLs
    path('api', include(router.urls)),
]

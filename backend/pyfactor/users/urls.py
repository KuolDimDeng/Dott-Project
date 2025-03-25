#/Users/kuoldeng/projectx/backend/pyfactor/users/urls.py
from django.urls import path
from .views import (
    ProfileView,
)
from .business_views import (
    BusinessRegistrationView,
    EcommerceIntegrationView,
    WooCommerceIntegrationView,
    ecommerce_platform_selection,
    get_business_data,
    AddBusinessMemberView,
    update_subscription_plan,
    stripe_webhook,
    CreateCheckoutSessionView
)
from .api.checkout.checkout_session import create_checkout_session
from .api.subscription_views import subscription_status
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    # User profile endpoints
    path('api/profile/', ProfileView.as_view(), name='profile'),
    path('api/user/', ProfileView.as_view(), name='user'),  # Endpoint for /api/user
    
    # Business endpoints
    path('api/business/register/', BusinessRegistrationView.as_view(), name='business_register'),
    path('ecommerce-integration/', EcommerceIntegrationView.as_view(), name='ecommerce-integration'),
    path('integrate/woocommerce/', WooCommerceIntegrationView.as_view(), name='woocommerce-integration'),
    path('ecommerce-platform-selection/', ecommerce_platform_selection, name='ecommerce_platform_selection'),
    path('api/business/data/', get_business_data, name='business_data'),
    path('add-member/', AddBusinessMemberView.as_view(), name='add-business-member'),
    path('checkout/create-session/', create_checkout_session, name='create_checkout_session'),
    path('update-subscription/', update_subscription_plan, name='update_subscription_plan'),
    path('webhook/stripe/', stripe_webhook, name='stripe_webhook'),
    path('api/subscription/status/', subscription_status, name='subscription_status'),
]

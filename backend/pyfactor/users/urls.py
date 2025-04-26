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
from .api.subscription_views import subscription_status
from rest_framework_simplejwt.views import TokenRefreshView

# Create a router for the menu privileges API
router = DefaultRouter()
router.register(r'menu-privileges', UserMenuPrivilegeViewSet, basename='menu-privileges')

urlpatterns = [
    path('profile/', ProfileView.as_view(), name='user-profile'),
    path('business/search/', business_search, name='business_search'),
    path('business/details/', get_business_details, name='get_business_details'),
    path('business/subscription/', get_user_subscription, name='get_user_subscription'),
    path('business/update/', update_business, name='update_business'),
    path('business/details/update/', update_business_details, name='update_business_details'),
    path('business/details/create/', create_business_details, name='create_business_details'),
    path('business/create/', create_business, name='create_business'),
    path('subscription/update/', update_subscription_plan, name='update_subscription_plan'),
    path('checkout-session/', create_checkout_session, name='checkout-session'),
    path('stripe-webhook/', stripe_webhook, name='stripe-webhook'),
    path('checkout-view/', CreateCheckoutSessionView.as_view(), name='checkout-view'),
    path('refresh-token/', TokenRefreshView.as_view(), name='refresh-token'),
    path('webhook/stripe/', stripe_webhook, name='stripe_webhook'),
    path('api/subscription/status/', subscription_status, name='subscription_status'),
    # Include the router URLs
    path('api/', include(router.urls)),
]

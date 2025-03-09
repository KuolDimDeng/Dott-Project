# /Users/kuoldeng/projectx/backend/pyfactor/business/urls.py

from django.urls import path

from .api.checkout.checkout_session import create_checkout_session



from .views import (
    BusinessRegistrationView, 
    EcommerceIntegrationView, 
    WooCommerceIntegrationView, 
    ecommerce_platform_selection,
    get_business_data,  # Changed this import
    AddBusinessMemberView  # Added this import
)

urlpatterns = [
    path('api/business/register/', BusinessRegistrationView.as_view(), name='business_register'),
    path('ecommerce-integration/', EcommerceIntegrationView.as_view(), name='ecommerce-integration'),
    path('integrate/woocommerce/', WooCommerceIntegrationView.as_view(), name='woocommerce-integration'),
    path('ecommerce-platform-selection/', ecommerce_platform_selection, name='ecommerce_platform_selection'),
    path('api/business/data/', get_business_data, name='business_data'),  # Changed this line
    path('add-member/', AddBusinessMemberView.as_view(), name='add-business-member'),
    path('checkout/create-session/', create_checkout_session, name='create_checkout_session'),

    path('update-subscription/', views.update_subscription_plan, name='update_subscription_plan'),
    path('webhook/stripe/', views.stripe_webhook, name='stripe_webhook'),
]
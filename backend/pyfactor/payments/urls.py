# payments/urls.py
from django.urls import path
from . import views

# Import payment views from accounts app for Stripe integration
from accounts import views_payment

urlpatterns = [
    # Payment provider endpoints
    path('providers/country/<str:country_code>/', views.country_payment_providers, name='country-payment-providers'),
    path('providers/<str:provider_name>/form/', views.provider_form, name='provider-form'),
    path('employees/<str:employee_id>/payment-method/', views.employee_payment_method, name='employee-payment-method'),
    
    # Stripe payment processing endpoints
    path('create-payment-intent/', views_payment.create_payment_intent, name='create_payment_intent'),
    path('confirm-payment/', views_payment.confirm_payment, name='confirm_payment'),
    path('stripe-webhook/', views_payment.stripe_webhook, name='stripe_webhook'),
    
    # Payment recording endpoint
    path('record/', views.record_payment, name='record_payment'),
]
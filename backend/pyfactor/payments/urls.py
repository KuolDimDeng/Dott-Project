# payments/urls.py
from django.urls import path
from . import views
from . import webhook_handlers
from . import stripe_connect
from . import invoice_checkout
from . import tax_filing_checkout
from . import paystack_webhook

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
    path('create-subscription/', views_payment.create_subscription, name='create_subscription'),
    # Note: Stripe webhook is now handled at /api/onboarding/webhooks/stripe/
    
    # Tax filing payment webhook
    path('webhooks/stripe/tax-filing/', webhook_handlers.stripe_webhook_handler, name='tax_filing_stripe_webhook'),
    
    # Payment recording endpoint
    path('record/', views.record_payment, name='record_payment'),
    
    # Stripe Connect Express endpoints
    path('stripe-connect/create-account/', stripe_connect.create_stripe_connect_account, name='create_stripe_connect_account'),
    path('stripe-connect/onboarding-link/', stripe_connect.create_onboarding_link, name='create_onboarding_link'),
    path('stripe-connect/account-status/', stripe_connect.get_account_status, name='get_account_status'),
    path('stripe-connect/refresh-onboarding/', stripe_connect.refresh_onboarding_link, name='refresh_onboarding_link'),
    
    # Invoice payment endpoints
    path('invoice-checkout/', invoice_checkout.create_invoice_checkout, name='create_invoice_checkout'),
    path('invoice-payment-link/', invoice_checkout.create_invoice_payment_link, name='create_invoice_payment_link'),
    path('invoice-details/<uuid:invoice_id>/', invoice_checkout.get_invoice_details, name='get_invoice_details'),
    
    # Stripe-specific invoice checkout (matches frontend expectation)
    path('stripe/create-invoice-checkout/', invoice_checkout.create_invoice_checkout, name='stripe_create_invoice_checkout'),
    
    # Tax filing payment endpoints
    path('create-filing-session/', tax_filing_checkout.create_filing_session, name='create_filing_session'),
    
    # Paystack payment verification
    path('verify-paystack/', views.verify_paystack_payment, name='verify_paystack_payment'),
    
    # Paystack webhook handler
    path('webhooks/paystack/', paystack_webhook.paystack_webhook_handler, name='paystack_webhook'),
]
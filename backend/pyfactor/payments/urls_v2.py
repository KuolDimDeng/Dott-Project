# payments/urls_v2.py - Enhanced Payment System URL Configuration
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views_v2 import (
    PaymentGatewayViewSet, PaymentMethodViewSet, TransactionViewSet,
    ProcessPaymentView, ProcessPayoutView, AddPaymentMethodView,
    ReconciliationView, ReportsView
)
from .webhook_handlers_v2 import (
    UnifiedWebhookHandler, WebhookStatusView,
    stripe_webhook_handler, flutterwave_webhook_handler,
    mpesa_webhook_handler, bank_transfer_webhook_handler
)

# Create router for ViewSets
router = DefaultRouter()
router.register(r'gateways', PaymentGatewayViewSet, basename='payment-gateway')
router.register(r'methods', PaymentMethodViewSet, basename='payment-method')
router.register(r'transactions', TransactionViewSet, basename='transaction')

app_name = 'payments'

urlpatterns = [
    # Include ViewSet URLs
    path('', include(router.urls)),
    
    # Payment Processing Endpoints
    path('process/', ProcessPaymentView.as_view(), name='process-payment'),
    path('payout/', ProcessPayoutView.as_view(), name='process-payout'),
    path('methods/add/', AddPaymentMethodView.as_view(), name='add-payment-method'),
    
    # Reconciliation Endpoints
    path('reconciliation/', ReconciliationView.as_view(), name='reconciliation'),
    
    # Reporting Endpoints
    path('reports/', ReportsView.as_view(), name='reports'),
    
    # Webhook Endpoints
    path('webhooks/<str:gateway_name>/', UnifiedWebhookHandler.as_view(), name='unified-webhook'),
    path('webhooks/status/', WebhookStatusView.as_view(), name='webhook-status'),
    
    # Individual Gateway Webhook Endpoints (for backward compatibility)
    path('webhooks/stripe/', stripe_webhook_handler, name='stripe-webhook'),
    path('webhooks/flutterwave/', flutterwave_webhook_handler, name='flutterwave-webhook'),
    path('webhooks/mpesa/', mpesa_webhook_handler, name='mpesa-webhook'),
    path('webhooks/bank_transfer/', bank_transfer_webhook_handler, name='bank-transfer-webhook'),
]

# Additional URL patterns for specific gateway endpoints
gateway_patterns = [
    # Gateway Management
    path('gateways/<uuid:pk>/test-credentials/', 
         PaymentGatewayViewSet.as_view({'post': 'test_credentials'}), 
         name='gateway-test-credentials'),
    path('gateways/<uuid:pk>/supported-features/', 
         PaymentGatewayViewSet.as_view({'get': 'supported_features'}), 
         name='gateway-supported-features'),
    
    # Payment Method Management
    path('methods/<uuid:pk>/verify/', 
         PaymentMethodViewSet.as_view({'post': 'verify'}), 
         name='payment-method-verify'),
    path('methods/<uuid:pk>/set-default/', 
         PaymentMethodViewSet.as_view({'post': 'set_default'}), 
         name='payment-method-set-default'),
    
    # Transaction Management
    path('transactions/<uuid:pk>/status/', 
         TransactionViewSet.as_view({'get': 'status'}), 
         name='transaction-status'),
    path('transactions/<uuid:pk>/retry/', 
         TransactionViewSet.as_view({'post': 'retry'}), 
         name='transaction-retry'),
]

# Add gateway-specific patterns to main URL patterns
urlpatterns.extend(gateway_patterns)

# URL patterns mapping to requested endpoints
"""
Endpoint Mapping:

1. /api/payments/process/ → ProcessPaymentView.post()
   - Process payment transactions
   - POST with payment details

2. /api/payments/gateways/ → PaymentGatewayViewSet
   - GET: List all active payment gateways
   - POST: Create new payment gateway (admin only)
   - PUT/PATCH: Update gateway configuration
   - DELETE: Deactivate gateway

3. /api/payments/methods/ → PaymentMethodViewSet
   - GET: List user's payment methods
   - POST: Add new payment method
   - PUT/PATCH: Update payment method
   - DELETE: Remove payment method

4. /api/payments/transactions/ → TransactionViewSet
   - GET: List user's transactions
   - POST: Create new transaction
   - GET /<id>/: Get specific transaction
   - GET /<id>/status/: Get real-time transaction status

5. /api/payments/reconciliation/ → ReconciliationView
   - GET: Get reconciliation reports
   - POST: Create reconciliation record

6. /api/payments/reports/ → ReportsView
   - GET: Payment analytics and reports
   - Query params: type, period_start, period_end

7. /api/payments/webhooks/<gateway>/ → UnifiedWebhookHandler
   - POST: Process webhooks from payment gateways
   - Unified handler for all gateways

Additional Endpoints:

- /api/payments/payout/ → ProcessPayoutView.post()
- /api/payments/methods/add/ → AddPaymentMethodView.post()
- /api/payments/webhooks/status/ → WebhookStatusView (GET/POST)
- /api/payments/gateways/<id>/test-credentials/ → Test gateway credentials
- /api/payments/gateways/<id>/supported-features/ → Get gateway capabilities
- /api/payments/methods/<id>/verify/ → Verify payment method
- /api/payments/methods/<id>/set-default/ → Set as default payment method
- /api/payments/transactions/<id>/retry/ → Retry failed transaction

Webhook URLs for payment providers:
- /api/payments/webhooks/stripe/
- /api/payments/webhooks/flutterwave/
- /api/payments/webhooks/mpesa/
- /api/payments/webhooks/bank_transfer/
"""
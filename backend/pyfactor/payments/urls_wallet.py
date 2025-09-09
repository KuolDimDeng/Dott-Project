"""
Mobile Money Wallet URL Configuration
"""
from django.urls import path
from rest_framework.routers import DefaultRouter
from .views_wallet import WalletViewSet

router = DefaultRouter()
router.register('', WalletViewSet, basename='wallet')

urlpatterns = router.urls

# The following URLs are created by the router:
# GET /api/payments/wallet/{id}/ - Get wallet details
# GET /api/payments/wallet/balance/ - Get wallet balance
# POST /api/payments/wallet/topup/ - Top up wallet
# POST /api/payments/wallet/send/ - Send money
# GET /api/payments/wallet/transactions/ - Get transaction history
# GET /api/payments/wallet/requests/ - Get transfer requests
# POST /api/payments/wallet/accept_request/ - Accept transfer request
# POST /api/payments/wallet/reject_request/ - Reject transfer request
# GET /api/payments/wallet/providers/ - Get available providers

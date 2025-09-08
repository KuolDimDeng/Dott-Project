"""
Dott Pay QR Payment System URL Configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_dott_pay import DottPayProfileViewSet, DottPayMerchantViewSet

# Create router
router = DefaultRouter()
router.register(r'profile', DottPayProfileViewSet, basename='dott-pay-profile')
router.register(r'merchant', DottPayMerchantViewSet, basename='dott-pay-merchant')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
]

# Additional URL patterns for specific endpoints
dott_pay_urls = [
    # Consumer endpoints
    path('profile/my/', DottPayProfileViewSet.as_view({'get': 'my_profile'}), name='dott-pay-my-profile'),
    path('profile/qr-code/', DottPayProfileViewSet.as_view({'get': 'qr_code'}), name='dott-pay-qr-code'),
    path('profile/limits/', DottPayProfileViewSet.as_view({'post': 'update_limits'}), name='dott-pay-update-limits'),
    path('profile/payment-method/', DottPayProfileViewSet.as_view({'post': 'set_default_payment_method'}), name='dott-pay-set-payment-method'),
    path('profile/transactions/', DottPayProfileViewSet.as_view({'get': 'transactions'}), name='dott-pay-transactions'),
    
    # Merchant endpoints
    path('merchant/scan/', DottPayMerchantViewSet.as_view({'post': 'scan_qr'}), name='dott-pay-scan-qr'),
    path('merchant/status/', DottPayMerchantViewSet.as_view({'get': 'transaction_status'}), name='dott-pay-transaction-status'),
]

urlpatterns += dott_pay_urls
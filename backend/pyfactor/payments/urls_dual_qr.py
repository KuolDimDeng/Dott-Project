"""
Dual QR System URL Configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views_dual_qr import (
    MerchantProfileViewSet,
    UniversalQRViewSet,
    UniversalScannerViewSet,
    P2PTransactionViewSet,
    QREducationViewSet
)

# Create router
router = DefaultRouter()
router.register(r'merchant', MerchantProfileViewSet, basename='merchant-profile')
router.register(r'universal', UniversalQRViewSet, basename='universal-qr')
router.register(r'scanner', UniversalScannerViewSet, basename='universal-scanner')
router.register(r'p2p', P2PTransactionViewSet, basename='p2p-transaction')
router.register(r'education', QREducationViewSet, basename='qr-education')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
]

# Additional URL patterns for specific endpoints
dual_qr_urls = [
    # Merchant endpoints (Receive QR - Green)
    path('merchant/activate/', MerchantProfileViewSet.as_view({'post': 'activate'}), name='merchant-activate'),
    path('merchant/receive-qr/', MerchantProfileViewSet.as_view({'get': 'my_receive_qr'}), name='merchant-receive-qr'),
    path('merchant/dynamic-qr/', MerchantProfileViewSet.as_view({'post': 'generate_dynamic_qr'}), name='merchant-dynamic-qr'),
    
    # Universal QR endpoints (Both QRs)
    path('universal/my-qrs/', UniversalQRViewSet.as_view({'get': 'my_qr_codes'}), name='my-qr-codes'),
    
    # Scanner endpoints (with safety checks)
    path('scanner/scan/', UniversalScannerViewSet.as_view({'post': 'scan'}), name='universal-scan'),
    
    # P2P Transaction endpoints
    path('p2p/history/', P2PTransactionViewSet.as_view({'get': 'history'}), name='p2p-history'),
    
    # Education endpoints
    path('education/color-rules/', QREducationViewSet.as_view({'get': 'color_rules'}), name='color-rules'),
]

urlpatterns += dual_qr_urls
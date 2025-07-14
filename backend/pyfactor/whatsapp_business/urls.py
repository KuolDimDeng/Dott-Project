from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    WhatsAppBusinessSettingsViewSet,
    WhatsAppCatalogViewSet,
    WhatsAppProductViewSet,
    WhatsAppOrderViewSet,
    WhatsAppAnalyticsViewSet
)

router = DefaultRouter()
router.register(r'settings', WhatsAppBusinessSettingsViewSet, basename='whatsapp-settings')
router.register(r'catalogs', WhatsAppCatalogViewSet, basename='whatsapp-catalogs')
router.register(r'products', WhatsAppProductViewSet, basename='whatsapp-products')
router.register(r'orders', WhatsAppOrderViewSet, basename='whatsapp-orders')
router.register(r'analytics', WhatsAppAnalyticsViewSet, basename='whatsapp-analytics')

urlpatterns = [
    path('', include(router.urls)),
]
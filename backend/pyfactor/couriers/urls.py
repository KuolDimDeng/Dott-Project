"""
Courier API URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourierViewSet, DeliveryOrderViewSet, CourierEarningsViewSet, NearbyCouriersViewSet
from .views_mobile import MobileCourierViewSet

router = DefaultRouter()
router.register(r'couriers', CourierViewSet, basename='courier')
router.register(r'deliveries', DeliveryOrderViewSet, basename='delivery')
router.register(r'earnings', CourierEarningsViewSet, basename='earnings')
router.register(r'nearby', NearbyCouriersViewSet, basename='nearby')
router.register(r'mobile', MobileCourierViewSet, basename='mobile-courier')

app_name = 'couriers'

urlpatterns = [
    path('', include(router.urls)),
]
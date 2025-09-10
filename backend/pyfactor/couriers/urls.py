"""
Courier API URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourierViewSet, DeliveryOrderViewSet, CourierEarningsViewSet, NearbyCouriersViewSet
from .views_mobile import MobileCourierViewSet
from .views_profile import courier_profile, courier_deliveries

router = DefaultRouter()
router.register(r'couriers', CourierViewSet, basename='courier')
router.register(r'deliveries', DeliveryOrderViewSet, basename='delivery')
router.register(r'earnings', CourierEarningsViewSet, basename='earnings')
router.register(r'nearby', NearbyCouriersViewSet, basename='nearby')
router.register(r'mobile', MobileCourierViewSet, basename='mobile-courier')

app_name = 'couriers'

urlpatterns = [
    path('profile/', courier_profile, name='courier_profile'),
    path('deliveries/', courier_deliveries, name='courier_deliveries'),
    path('', include(router.urls)),
]
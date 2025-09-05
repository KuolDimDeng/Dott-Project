"""
Courier API URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CourierViewSet, DeliveryOrderViewSet, CourierEarningsViewSet, NearbyCouriersViewSet

router = DefaultRouter()
router.register(r'couriers', CourierViewSet, basename='courier')
router.register(r'deliveries', DeliveryOrderViewSet, basename='delivery')
router.register(r'earnings', CourierEarningsViewSet, basename='earnings')
router.register(r'nearby', NearbyCouriersViewSet, basename='nearby')

app_name = 'couriers'

urlpatterns = [
    path('', include(router.urls)),
]
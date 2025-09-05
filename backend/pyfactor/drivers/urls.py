"""
Driver API URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DriverViewSet, DeliveryOrderViewSet, DriverEarningsViewSet, NearbyDriversViewSet

router = DefaultRouter()
router.register(r'drivers', DriverViewSet, basename='driver')
router.register(r'deliveries', DeliveryOrderViewSet, basename='delivery')
router.register(r'earnings', DriverEarningsViewSet, basename='earnings')
router.register(r'nearby', NearbyDriversViewSet, basename='nearby')

app_name = 'drivers'

urlpatterns = [
    path('', include(router.urls)),
]
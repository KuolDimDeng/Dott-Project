from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InventoryItemViewSet, CategoryViewSet, SupplierViewSet,
    LocationViewSet, InventoryTransactionViewSet
)

router = DefaultRouter()
router.register(r'items', InventoryItemViewSet)
router.register(r'categories', CategoryViewSet)
router.register(r'suppliers', SupplierViewSet)
router.register(r'locations', LocationViewSet)
router.register(r'transactions', InventoryTransactionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
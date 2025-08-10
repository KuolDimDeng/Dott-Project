from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .api import ProductSupplierViewSet, ProductSupplierItemViewSet

app_name = 'product_suppliers'

router = DefaultRouter()
router.register(r'suppliers', ProductSupplierViewSet, basename='productsupplier')
router.register(r'supplier-items', ProductSupplierItemViewSet, basename='productsupplieritem')

urlpatterns = [
    path('api/', include(router.urls)),
]
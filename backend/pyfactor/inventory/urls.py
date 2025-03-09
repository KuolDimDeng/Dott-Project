from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    InventoryItemViewSet, CategoryViewSet, SupplierViewSet,
    LocationViewSet, InventoryTransactionViewSet, ProductViewSet,
    ServiceViewSet, DepartmentViewSet, CustomChargePlanViewSet,
    create_product, create_service, product_list, service_list,
    product_detail, service_detail, product_by_barcode, print_barcode
)

# Create a router for viewsets
router = DefaultRouter()
router.register(r'items', InventoryItemViewSet, basename='inventoryitem')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'suppliers', SupplierViewSet, basename='supplier')
router.register(r'locations', LocationViewSet, basename='location')
router.register(r'transactions', InventoryTransactionViewSet, basename='inventorytransaction')
router.register(r'products-viewset', ProductViewSet, basename='productviewset')
router.register(r'services-viewset', ServiceViewSet, basename='serviceviewset')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'custom-charge-plans', CustomChargePlanViewSet, basename='customchargeplan')

# Define URL patterns
urlpatterns = [
    # Include router URLs
    path('', include(router.urls)),
    
    # Product and service management endpoints
    # Create endpoints with and without trailing slash
    path('products/create/', create_product, name='create_product'),
    path('products/create', create_product, name='create_product_no_slash'),
    path('services/create/', create_service, name='create_service'),
    path('services/create', create_service, name='create_service_no_slash'),
    
    # List endpoints
    path('products/', product_list, name='product_list'),
    path('services/', service_list, name='service_list'),
    
    # Detail endpoints
    path('products/<uuid:pk>/', product_detail, name='product-detail'),
    path('services/<uuid:pk>/', service_detail, name='service-detail'),
    
    # Special product endpoints
    path('products/barcode/<str:barcode>/', product_by_barcode, name='product-by-barcode'),
    path('products/<uuid:product_id>/print-barcode/', print_barcode, name='print-barcode'),
]
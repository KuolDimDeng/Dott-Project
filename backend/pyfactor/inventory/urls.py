from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import api_views

# Create a router for standard views
router = DefaultRouter()
router.register(r'items', views.InventoryItemViewSet, basename='inventory-item')
router.register(r'categories', views.CategoryViewSet)
router.register(r'suppliers', views.SupplierViewSet)
router.register(r'locations', views.LocationViewSet)
router.register(r'transactions', views.InventoryTransactionViewSet)
router.register(r'products', views.ProductViewSet, basename='product')
router.register(r'services', views.ServiceViewSet, basename='service')
router.register(r'departments', views.DepartmentViewSet)
router.register(r'charge-plans', views.CustomChargePlanViewSet)

# Create a router for optimized views
optimized_router = DefaultRouter()
optimized_router.register(r'products', api_views.OptimizedProductViewSet, basename='optimized-product')

urlpatterns = [
    # Standard API endpoints
    path('', include(router.urls)),
    
    # Optimized API endpoints
    path('optimized/', include(optimized_router.urls)),
    
    # Ultra-optimized endpoints
    path('ultra/products/', api_views.ultra_fast_products, name='ultra-fast-products'),
    path('ultra/products/with-department/', api_views.products_with_department, name='products-with-department'),
    path('ultra/products/stats/', api_views.product_stats, name='product-stats'),
    path('ultra/products/code/<str:code>/', api_views.product_by_code, name='product-by-code'),
    
    # Existing function-based views
    path('products/create/', views.create_product, name='create-product'),
    path('services/create/', views.create_service, name='create-service'),
    path('products-list/', views.product_list, name='product-list'),
    path('services-list/', views.service_list, name='service-list'),
    path('products/<uuid:pk>/', views.product_detail, name='product-detail'),
    path('services/<uuid:pk>/', views.service_detail, name='service-detail'),
    path('products/barcode/<str:barcode>/', views.product_by_barcode, name='product-by-barcode'),
    path('products/<uuid:product_id>/print-barcode/', views.print_barcode, name='print-barcode'),
]
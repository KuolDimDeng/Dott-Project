from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import api_views
from . import service_api_views
from .optimized_service_views import optimized_create_service
from . import service_api_views

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

# Create routers for optimized views
optimized_router = DefaultRouter()
optimized_router.register(r'products', api_views.OptimizedProductViewSet, basename='optimized-product')

# Create router for optimized service views
optimized_service_router = DefaultRouter()
optimized_service_router.register(r'services', service_api_views.OptimizedServiceViewSet, basename='optimized-service')

urlpatterns = [
    # Standard API endpoints
    path('', include(router.urls)),
    
    # Explicit patterns for products without trailing slash
    path('products', views.ProductViewSet.as_view({'get': 'list', 'post': 'create'}), name='product-list-no-slash'),
    path('products/<uuid:pk>', views.ProductViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='product-detail-no-slash'),
    
    # Optimized API endpoints
    path('optimized/', include(optimized_router.urls)),
    path('optimized/', include(optimized_service_router.urls)),
    
    # Ultra-optimized product endpoints
    path('ultra/products/', api_views.ultra_fast_products, name='ultra-fast-products'),
    path('ultra/products', api_views.ultra_fast_products, name='ultra-fast-products-no-slash'),
    path('ultra/products/with-department/', api_views.products_with_department, name='products-with-department'),
    path('ultra/products/stats/', api_views.product_stats, name='product-stats'),
    path('ultra/products/code/<str:code>/', api_views.product_by_code, name='product-by-code'),
    
    # Ultra-optimized service endpoints
    path('ultra/services/', service_api_views.ultra_fast_services, name='ultra-fast-services'),
    path('ultra/services', service_api_views.ultra_fast_services, name='ultra-fast-services-no-slash'),
    path('ultra/services/stats/', service_api_views.service_stats, name='service-stats'),
    path('ultra/services/code/<str:code>/', service_api_views.service_by_code, name='service-by-code'),
    
    # Existing function-based views
    path('products/create/', views.create_product, name='create-product'),
    path('products/create', views.create_product, name='create-product-no-slash'),  # Add URL pattern without trailing slash
    path('services/create/', optimized_create_service, name='create-service'),
    path('services/create', optimized_create_service, name='create-service-no-slash'),  # Add URL pattern without trailing slash
    path('products-list/', views.product_list, name='product-list'),
    path('services-list/', views.service_list, name='service-list'),
    path('products/<uuid:pk>/', views.product_detail, name='product-detail'),
    path('services/<uuid:pk>/', views.service_detail, name='service-detail'),
    path('products/barcode/<str:barcode>/', views.product_by_barcode, name='product-by-barcode'),
    path('products/<uuid:product_id>/print-barcode/', views.print_barcode, name='print-barcode'),
]
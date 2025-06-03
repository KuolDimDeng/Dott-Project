#!/usr/bin/env python
"""
Script to update the urls.py file to use the optimized_create_service function.
"""
import os
import sys

def update_urls_file():
    """
    Update the urls.py file to use the optimized_create_service function.
    """
    # Path to the urls.py file
    urls_file = os.path.join(os.path.dirname(__file__), 'urls.py')
    
    # Read the current content
    with open(urls_file, 'r') as f:
        content = f.read()
    
    # Add the import for optimized_create_service
    if 'from .optimized_service_views import optimized_create_service' not in content:
        content = content.replace(
            'from . import api_views',
            'from . import api_views\nfrom . import service_api_views\nfrom .optimized_service_views import optimized_create_service'
        )
    
    # Replace the path for services/create/
    if "path('services/create/', views.create_service, name='create-service')," in content:
        content = content.replace(
            "path('services/create/', views.create_service, name='create-service'),",
            "path('services/create/', optimized_create_service, name='create-service'),"
        )
    
    # Add the optimized service router if it doesn't exist
    if "optimized_service_router = DefaultRouter()" not in content:
        content = content.replace(
            "optimized_router = DefaultRouter()",
            "optimized_router = DefaultRouter()\n\n# Create router for optimized service views\noptimized_service_router = DefaultRouter()"
        )
        
        content = content.replace(
            "optimized_router.register(r'products', api_views.OptimizedProductViewSet, basename='optimized-product')",
            "optimized_router.register(r'products', api_views.OptimizedProductViewSet, basename='optimized-product')\noptimized_service_router.register(r'services', service_api_views.OptimizedServiceViewSet, basename='optimized-service')"
        )
    
    # Add the optimized service router to urlpatterns if it doesn't exist
    if "path('optimized/', include(optimized_service_router.urls))," not in content:
        content = content.replace(
            "path('optimized/', include(optimized_router.urls)),",
            "path('optimized/', include(optimized_router.urls)),\n    path('optimized/', include(optimized_service_router.urls)),"
        )
    
    # Add the ultra-optimized service endpoints if they don't exist
    if "path('ultra/services/stats/', service_api_views.service_stats, name='service-stats')," not in content:
        content = content.replace(
            "path('ultra/products/code/<str:code>/', api_views.product_by_code, name='product-by-code'),",
            "path('ultra/products/code/<str:code>/', api_views.product_by_code, name='product-by-code'),\n    \n    # Ultra-optimized service endpoints\n    path('ultra/services/', service_api_views.ultra_fast_services, name='ultra-fast-services'),\n    path('ultra/services/stats/', service_api_views.service_stats, name='service-stats'),\n    path('ultra/services/code/<str:code>/', service_api_views.service_by_code, name='service-by-code'),"
        )
    
    # Write the updated content back to the file
    with open(urls_file, 'w') as f:
        f.write(content)
    
    print(f"Updated {urls_file}")

if __name__ == '__main__':
    update_urls_file()
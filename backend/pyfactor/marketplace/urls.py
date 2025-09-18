from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ConsumerSearchViewSet,
    BusinessListingViewSet,
    PublicBusinessViewSet
)
from .placeholder_inquiry_views import (
    send_placeholder_inquiry,
    check_placeholder_status
)
from .views_mobile_orders import MobileBusinessOrdersViewSet

# Business-side marketplace routes
router = DefaultRouter()
router.register(r'mobile/orders', MobileBusinessOrdersViewSet, basename='mobile-orders')
# Note: BusinessListingViewSet is registered with explicit paths below, not via router

urlpatterns = [
    # Include router URLs for mobile orders
    path('', include(router.urls)),
    
    # Consumer endpoints (if needed)
    path('consumer/', include([
        path('businesses/', ConsumerSearchViewSet.as_view({'get': 'list'}), name='consumer-businesses'),
        path('businesses/featured/', ConsumerSearchViewSet.as_view({'get': 'featured'}), name='consumer-featured'),
        path('featured_items/', ConsumerSearchViewSet.as_view({'get': 'featured_items'}), name='consumer-featured-items'),
        path('track_view/', ConsumerSearchViewSet.as_view({'post': 'track_view'}), name='consumer-track-view'),
        path('categories/', ConsumerSearchViewSet.as_view({'get': 'categories'}), name='consumer-categories'),
        path('category_hierarchy/', ConsumerSearchViewSet.as_view({'get': 'category_hierarchy'}), name='consumer-category-hierarchy'),
    ])),
    
    # Business marketplace endpoints
    path('business/my-listing/', BusinessListingViewSet.as_view({'get': 'my_listing', 'post': 'my_listing'}), name='my-listing'),
    path('business/update-delivery/', BusinessListingViewSet.as_view({'post': 'update_delivery_settings'}), name='update-delivery'),
    path('business/<uuid:pk>/public/', PublicBusinessViewSet.as_view({'get': 'retrieve'}), name='business-public'),
    path('business/<uuid:pk>/products/', PublicBusinessViewSet.as_view({'get': 'products'}), name='business-products'),
    path('business/<uuid:pk>/services/', PublicBusinessViewSet.as_view({'get': 'services'}), name='business-services'),
    
    # New mobile app business endpoints
    path('business/listing/', BusinessListingViewSet.as_view({'get': 'listing', 'patch': 'listing'}), name='business-listing'),
    path('business/update-status/', BusinessListingViewSet.as_view({'patch': 'update_status'}), name='business-update-status'),
    path('business/operating-hours/', BusinessListingViewSet.as_view({'patch': 'operating_hours'}), name='business-operating-hours'),
    path('business/subcategories/', BusinessListingViewSet.as_view({'patch': 'subcategories'}), name='business-subcategories'),
    path('business/sync-products/', BusinessListingViewSet.as_view({'post': 'sync_products'}), name='business-sync-products'),
    path('business/analytics/', BusinessListingViewSet.as_view({'get': 'analytics'}), name='business-analytics'),
    path('business/products/', BusinessListingViewSet.as_view({'get': 'products', 'post': 'products'}), name='business-products-management'),
    
    # Placeholder business inquiry endpoints
    path('placeholder/inquiry/', send_placeholder_inquiry, name='placeholder-inquiry'),
    path('placeholder/<str:business_id>/status/', check_placeholder_status, name='placeholder-status'),
]
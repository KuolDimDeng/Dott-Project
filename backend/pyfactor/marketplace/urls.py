from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ConsumerSearchViewSet, 
    BusinessListingViewSet
)

# Business-side marketplace routes
router = DefaultRouter()
router.register(r'business', BusinessListingViewSet, basename='business-listing')

urlpatterns = [
    path('', include(router.urls)),
    
    # Business marketplace endpoints
    path('business/my-listing/', BusinessListingViewSet.as_view({'get': 'my_listing', 'post': 'my_listing'}), name='my-listing'),
    path('business/update-delivery/', BusinessListingViewSet.as_view({'post': 'update_delivery_settings'}), name='update-delivery'),
    path('business/<uuid:pk>/public/', BusinessListingViewSet.as_view({'get': 'public_view'}), name='business-public'),
    path('business/<uuid:pk>/products/', BusinessListingViewSet.as_view({'get': 'get_products'}), name='business-products'),
    path('business/<uuid:pk>/services/', BusinessListingViewSet.as_view({'get': 'get_services'}), name='business-services'),
]
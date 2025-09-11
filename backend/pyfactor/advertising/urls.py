from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AdvertisingCampaignViewSet,
    AdvertisingAnalyticsViewSet,
    BusinessFeaturedStatusViewSet,
)

router = DefaultRouter()
router.register(r'campaigns', AdvertisingCampaignViewSet, basename='campaign')
router.register(r'analytics', AdvertisingAnalyticsViewSet, basename='analytics')
router.register(r'featured', BusinessFeaturedStatusViewSet, basename='featured')

app_name = 'advertising'

urlpatterns = [
    path('', include(router.urls)),
    
    # Additional custom endpoints
    path('featured-status/', 
         AdvertisingAnalyticsViewSet.as_view({'get': 'featured_status'}), 
         name='featured-status'),
    path('featured-options/', 
         AdvertisingAnalyticsViewSet.as_view({'get': 'featured_options'}), 
         name='featured-options'),
    path('upload-image/', 
         AdvertisingCampaignViewSet.as_view({'post': 'upload_image'}), 
         name='upload-image'),
]
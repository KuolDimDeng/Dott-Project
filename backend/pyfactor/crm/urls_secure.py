from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views.secure_customer_viewset import SecureCustomerViewSet

# API versioning - industry standard
app_name = 'crm'

# Version 1 router
router_v1 = DefaultRouter()
router_v1.register(r'customers', SecureCustomerViewSet, basename='customer')

urlpatterns = [
    # API v1 endpoints
    path('api/v1/', include(router_v1.urls)),
    
    # Current version (backwards compatibility)
    path('', include(router_v1.urls)),
]

"""
New URLs for sales module using industry-standard ViewSets.
Replace the old urls.py with this once tested.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .viewsets import SalesOrderViewSet, InvoiceViewSet, EstimateViewSet
from .views import (
    # Keep some existing views that work properly
    customer_list,
    create_customer,
    customer_detail,
    update_customer,
    delete_customer,
)

# Create router for ViewSets
router = DefaultRouter()
router.register(r'orders', SalesOrderViewSet, basename='salesorder')
router.register(r'invoices', InvoiceViewSet, basename='invoice')
router.register(r'estimates', EstimateViewSet, basename='estimate')

urlpatterns = [
    # Include ViewSet routes
    path('', include(router.urls)),
    
    # Keep existing customer endpoints (they work)
    path('customers/', customer_list, name='customer_list'),
    path('customers/create/', create_customer, name='create_customer'),
    path('customers/<uuid:pk>/', customer_detail, name='customer-detail'),
    path('customers/<uuid:pk>/update/', update_customer, name='update-customer'),
    path('customers/<uuid:pk>/delete/', delete_customer, name='delete-customer'),
]
from django.urls import path
from .views import (
    InvoiceCreateView,
    create_customer,
    customer_list,
    customer_detail,
    create_product,
    create_service,
    create_vendor,
    product_list,
    service_list,
    
)

urlpatterns = [
    path('invoices/', InvoiceCreateView.as_view(), name='invoice-create'),
    path('create-customer/', create_customer, name='create_customer'),
    path('customers/', customer_list, name='customer_list'),
    path('customers/<int:pk>/', customer_detail, name='customer-detail'),
    path('create-product/', create_product, name='create_product'),
    path('create-service/', create_service, name='create_service'),
    path('create-vendor/', create_vendor, name='create_vendor'),
    path('products/', product_list, name='product_list'),
    path('services/', service_list, name='service_list'),
    # ...other URL patterns
]
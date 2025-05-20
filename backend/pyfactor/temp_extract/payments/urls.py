# payments/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path('providers/country/<str:country_code>/', views.country_payment_providers, name='country-payment-providers'),
    path('providers/<str:provider_name>/form/', views.provider_form, name='provider-form'),
    path('employees/<str:employee_id>/payment-method/', views.employee_payment_method, name='employee-payment-method'),
]
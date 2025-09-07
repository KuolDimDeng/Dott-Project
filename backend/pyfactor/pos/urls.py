"""
POS URL Configuration
"""
from django.urls import path
from . import views

app_name = 'pos'

urlpatterns = [
    # POS Configuration
    path('config/', views.get_pos_config, name='pos_config'),
    
    # Products
    path('products/', views.get_pos_products, name='pos_products'),
    
    # Transactions
    path('transactions/', views.complete_sale, name='complete_sale'),
    
    # Tax
    path('tax-rate/', views.get_tax_rate, name='tax_rate'),
]
"""
Mobile Money URLs Configuration
"""

from django.urls import path
from .views_mobile_money import (
    initialize_payment,
    check_payment_status,
    process_refund,
    momo_webhook,
    mpesa_webhook
)

urlpatterns = [
    # Payment endpoints
    path('initialize/', initialize_payment, name='mobile_money_initialize'),
    path('status/<str:reference_id>/', check_payment_status, name='mobile_money_status'),
    path('refund/<str:reference_id>/', process_refund, name='mobile_money_refund'),
    
    # Webhook endpoints
    path('webhook/momo/', momo_webhook, name='momo_webhook'),
    path('webhook/mpesa/', mpesa_webhook, name='mpesa_webhook'),
]
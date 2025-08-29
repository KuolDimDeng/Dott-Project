"""
MTN MoMo URL Configuration
"""

from django.urls import path
from .views_momo import (
    create_momo_user,
    generate_momo_key,
    get_momo_token,
    request_momo_payment,
    check_momo_status,
    get_momo_balance,
    momo_webhook,
    initialize_momo
)

urlpatterns = [
    # Setup endpoints
    path('create-user/', create_momo_user, name='momo-create-user'),
    path('generate-key/', generate_momo_key, name='momo-generate-key'),
    path('get-token/', get_momo_token, name='momo-get-token'),
    path('initialize/', initialize_momo, name='momo-initialize'),
    
    # Payment endpoints
    path('request-payment/', request_momo_payment, name='momo-request-payment'),
    path('check-status/<str:reference_id>/', check_momo_status, name='momo-check-status'),
    path('balance/', get_momo_balance, name='momo-balance'),
    
    # Webhook
    path('webhook/', momo_webhook, name='momo-webhook'),
]
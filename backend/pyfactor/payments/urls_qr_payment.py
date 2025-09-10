# payments/urls_qr_payment.py
from django.urls import path
from . import views_qr_payment

urlpatterns = [
    # QR Payment Management Endpoints
    path('create/', views_qr_payment.create_qr_payment, name='create_qr_payment'),
    path('status/<str:transaction_id>/', views_qr_payment.get_qr_payment_status, name='get_qr_payment_status'),
    path('complete/', views_qr_payment.complete_qr_payment, name='complete_qr_payment'),
    path('list/', views_qr_payment.list_qr_payments, name='list_qr_payments'),
    path('cancel/<str:transaction_id>/', views_qr_payment.cancel_qr_payment, name='cancel_qr_payment'),
]
from django.urls import path
from . import phone_auth_views

urlpatterns = [
    # Phone authentication endpoints
    path('send-otp/', phone_auth_views.send_otp, name='phone-send-otp'),
    path('verify-otp/', phone_auth_views.verify_otp, name='phone-verify-otp'),
    path('status/', phone_auth_views.phone_auth_status, name='phone-auth-status'),
]
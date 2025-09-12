from django.urls import path
from . import phone_auth_views

urlpatterns = [
    # Phone authentication endpoints
    path('send-otp/', phone_auth_views.send_otp, name='phone-send-otp'),
    path('verify-otp/', phone_auth_views.verify_otp, name='phone-verify-otp'),
    path('status/', phone_auth_views.phone_auth_status, name='phone-auth-status'),
    path('check-account/', phone_auth_views.check_account, name='phone-check-account'),
    
    # PIN management endpoints
    path('set-pin/', phone_auth_views.set_pin, name='phone-set-pin'),
    path('verify-pin/', phone_auth_views.verify_pin, name='phone-verify-pin'),
]
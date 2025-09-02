"""
Phone Authentication URLs
"""
from django.urls import path
from . import phone_auth_views

app_name = 'phone_auth'

urlpatterns = [
    # Phone authentication
    path('register/', phone_auth_views.register_phone, name='register_phone'),
    path('verify/', phone_auth_views.verify_otp, name='verify_otp'),
    path('biometric/', phone_auth_views.biometric_login, name='biometric_login'),
    path('enable-biometric/', phone_auth_views.enable_biometric, name='enable_biometric'),
    path('link-email/', phone_auth_views.link_email, name='link_email'),
]
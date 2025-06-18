"""
Security URLs
"""

from django.urls import path
from . import security_views

urlpatterns = [
    # Heartbeat
    path('heartbeat/', security_views.update_heartbeat, name='session-heartbeat'),
    
    # Device management
    path('devices/', security_views.get_user_devices, name='user-devices'),
    path('devices/trust/', security_views.trust_device, name='trust-device'),
    path('devices/verify/', security_views.verify_device_trust, name='verify-device'),
    path('devices/revoke/', security_views.revoke_device_trust, name='revoke-device'),
    
    # Security status
    path('security/', security_views.get_session_security, name='session-security'),
    
    # Failed login handling
    path('failed-login/', security_views.handle_failed_login, name='failed-login'),
]
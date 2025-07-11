"""
Admin settings management
"""
from django.conf import settings
from django.core.cache import cache
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from notifications.admin_views import EnhancedAdminPermission
from notifications.models import AdminUser
import json


class AdminSettingsView(APIView):
    """
    System settings management for super admins
    """
    permission_classes = [EnhancedAdminPermission]
    
    SETTINGS_CACHE_KEY = 'admin_system_settings'
    SETTINGS_CACHE_TIMEOUT = 3600  # 1 hour
    
    def get(self, request):
        # Only super admins can access settings
        if request.admin_user.admin_role != 'super_admin':
            return Response(
                {'error': 'Only super administrators can access settings'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Try to get from cache first
        settings_data = cache.get(self.SETTINGS_CACHE_KEY)
        if not settings_data:
            settings_data = self._load_settings()
            cache.set(self.SETTINGS_CACHE_KEY, settings_data, self.SETTINGS_CACHE_TIMEOUT)
        
        # Mask sensitive values
        masked_settings = self._mask_sensitive_values(settings_data)
        
        return Response(masked_settings)
    
    def patch(self, request):
        # Only super admins can modify settings
        if request.admin_user.admin_role != 'super_admin':
            return Response(
                {'error': 'Only super administrators can modify settings'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Get current settings
            current_settings = self._load_settings()
            
            # Update with new values
            updated_settings = self._update_settings(current_settings, request.data)
            
            # Save settings
            self._save_settings(updated_settings)
            
            # Clear cache
            cache.delete(self.SETTINGS_CACHE_KEY)
            
            # Log the change
            from notifications.admin_security import log_security_event
            log_security_event(
                request.admin_user,
                'settings_updated',
                {'sections': list(request.data.keys())},
                request,
                True
            )
            
            return Response({
                'success': True,
                'message': 'Settings updated successfully'
            })
            
        except Exception as e:
            return Response(
                {'error': f'Failed to update settings: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    def _load_settings(self):
        """Load settings from database or use defaults"""
        # In production, this would load from a database table
        # For now, using defaults and environment variables
        
        return {
            'general': {
                'system_name': getattr(settings, 'SYSTEM_NAME', 'Dott Admin Portal'),
                'support_email': getattr(settings, 'SUPPORT_EMAIL', 'support@dottapps.com'),
                'default_timezone': getattr(settings, 'TIME_ZONE', 'UTC'),
                'maintenance_mode': getattr(settings, 'MAINTENANCE_MODE', False),
                'maintenance_message': getattr(settings, 'MAINTENANCE_MESSAGE', 'System is under maintenance. Please check back later.'),
            },
            'security': {
                'session_timeout': getattr(settings, 'SESSION_COOKIE_AGE', 3600) // 60,  # Convert to minutes
                'password_require_uppercase': True,
                'password_require_numbers': True,
                'password_require_special': True,
                'password_min_length': 8,
                'two_factor_auth': 'optional',  # disabled, optional, required
                'admin_ip_whitelist': getattr(settings, 'ADMIN_IP_WHITELIST', []),
                'max_login_attempts': 5,
                'lockout_duration': 60,  # minutes
            },
            'notifications': {
                'email_provider': getattr(settings, 'EMAIL_PROVIDER', 'sendgrid'),
                'sender_email': getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@dottapps.com'),
                'sender_name': getattr(settings, 'DEFAULT_FROM_NAME', 'Dott'),
                'retention_days': 90,
                'rate_limit_count': 100,
                'rate_limit_window': 3600,  # seconds
                'batch_size': 100,
            },
            'integrations': {
                'stripe_api_key': self._mask_api_key(getattr(settings, 'STRIPE_SECRET_KEY', '')),
                'auth0_domain': getattr(settings, 'AUTH0_DOMAIN', ''),
                'auth0_client_id': getattr(settings, 'AUTH0_CLIENT_ID', ''),
                'crisp_website_id': getattr(settings, 'CRISP_WEBSITE_ID', ''),
                'google_analytics_id': getattr(settings, 'GOOGLE_ANALYTICS_ID', ''),
                'sentry_dsn': self._mask_api_key(getattr(settings, 'SENTRY_DSN', '')),
            },
            'features': {
                'enable_tax_filing': True,
                'enable_payroll': True,
                'enable_smart_insights': True,
                'enable_document_ai': True,
                'enable_mobile_apps': False,
            },
            'billing': {
                'grace_period_days': 7,
                'dunning_emails': [3, 5, 7],  # Days to send reminder emails
                'auto_suspend_after_days': 14,
                'require_payment_method': True,
                'enable_wire_transfers': False,
            }
        }
    
    def _mask_sensitive_values(self, settings_data):
        """Mask sensitive values for security"""
        masked = json.loads(json.dumps(settings_data))  # Deep copy
        
        # Mask sensitive fields
        if 'integrations' in masked:
            for key in ['stripe_api_key', 'sentry_dsn']:
                if key in masked['integrations'] and masked['integrations'][key]:
                    masked['integrations'][key] = self._mask_api_key(masked['integrations'][key])
        
        return masked
    
    def _mask_api_key(self, key):
        """Mask API key showing only first and last few characters"""
        if not key or len(key) < 8:
            return key
        
        if key.startswith('sk_') or key.startswith('pk_'):
            # Stripe-style keys
            return f"{key[:7]}...{key[-4:]}"
        else:
            # Generic masking
            return f"{key[:4]}...{key[-4:]}"
    
    def _update_settings(self, current, updates):
        """Merge updates into current settings"""
        result = json.loads(json.dumps(current))  # Deep copy
        
        for section, values in updates.items():
            if section in result and isinstance(values, dict):
                result[section].update(values)
            else:
                result[section] = values
        
        return result
    
    def _save_settings(self, settings_data):
        """Save settings to database"""
        # In production, this would save to a database table
        # For now, we'll just validate and log
        
        # Validate required fields
        required_fields = [
            ('general', 'system_name'),
            ('general', 'support_email'),
            ('security', 'session_timeout'),
            ('notifications', 'sender_email'),
        ]
        
        for section, field in required_fields:
            if section not in settings_data or field not in settings_data[section]:
                raise ValueError(f"Required field {section}.{field} is missing")
        
        # Log the save operation (in production, save to DB)
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Settings updated: {list(settings_data.keys())}")
        
        return True
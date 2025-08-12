"""
Settings patch to fix 503/500 errors by disabling problematic features
Apply this by importing it at the end of settings.py
"""
import os
import logging

logger = logging.getLogger(__name__)

# Disable problematic middleware that might cause 503 errors
MIDDLEWARE_TO_REMOVE = [
    'session_manager.security_middleware.SessionSecurityMiddleware',
    'session_manager.security_middleware.DeviceFingerprintMiddleware', 
    'session_manager.security_middleware.SessionHeartbeatMiddleware',
    'custom_auth.enhanced_rls_middleware.EnhancedRowLevelSecurityMiddleware',
    'custom_auth.middleware.TenantMiddleware',
    'audit.middleware.AuditMiddleware',
    'custom_auth.middleware_package.onboarding_middleware.OnboardingMiddleware',
]

# Patch function to apply fixes
def patch_settings(settings_module):
    """Apply patches to fix 503/500 errors"""
    
    # 1. Fix middleware
    if hasattr(settings_module, 'MIDDLEWARE'):
        original_count = len(settings_module.MIDDLEWARE)
        settings_module.MIDDLEWARE = [
            m for m in settings_module.MIDDLEWARE 
            if m not in MIDDLEWARE_TO_REMOVE
        ]
        removed_count = original_count - len(settings_module.MIDDLEWARE)
        logger.info(f"[Settings Patch] Removed {removed_count} problematic middleware")
    
    # 2. Fix authentication - use simpler auth
    if hasattr(settings_module, 'REST_FRAMEWORK'):
        settings_module.REST_FRAMEWORK['DEFAULT_AUTHENTICATION_CLASSES'] = [
            'rest_framework.authentication.SessionAuthentication',
            'custom_auth.auth0_authentication.Auth0JWTAuthentication',
        ]
        logger.info("[Settings Patch] Simplified authentication classes")
    
    # 3. Disable cache if Redis is not available
    if hasattr(settings_module, 'CACHES'):
        # Check if Redis is actually available
        redis_url = os.environ.get('REDIS_URL')
        if not redis_url:
            settings_module.CACHES = {
                'default': {
                    'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
                }
            }
            logger.warning("[Settings Patch] Redis not available, using DummyCache")
    
    # 4. Ensure ALLOWED_HOSTS includes the Render domain
    if hasattr(settings_module, 'ALLOWED_HOSTS'):
        render_hosts = [
            'api.dottapps.com',
            '.onrender.com',
            '.dottapps.com'
        ]
        for host in render_hosts:
            if host not in settings_module.ALLOWED_HOSTS:
                settings_module.ALLOWED_HOSTS.append(host)
        logger.info(f"[Settings Patch] Ensured ALLOWED_HOSTS includes Render domains")
    
    # 5. Disable CSRF for API endpoints (temporary fix)
    if hasattr(settings_module, 'CSRF_TRUSTED_ORIGINS'):
        settings_module.CSRF_TRUSTED_ORIGINS.extend([
            'https://api.dottapps.com',
            'https://*.dottapps.com',
            'https://*.onrender.com',
        ])
    
    # 6. Set logging to DEBUG for troubleshooting
    if hasattr(settings_module, 'LOGGING'):
        settings_module.LOGGING['root']['level'] = 'DEBUG'
        settings_module.LOGGING['loggers']['django']['level'] = 'DEBUG'
        settings_module.LOGGING['loggers']['custom_auth']['level'] = 'DEBUG'
        settings_module.LOGGING['loggers']['users']['level'] = 'DEBUG'
    
    logger.info("[Settings Patch] All patches applied successfully")
    
# Function to test if basic functionality works
def test_basic_functionality():
    """Test if basic Django functionality works"""
    try:
        from django.db import connection
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            logger.info(f"[Settings Patch] Database connection test: {result}")
    except Exception as e:
        logger.error(f"[Settings Patch] Database connection failed: {str(e)}")
    
    try:
        from django.core.cache import cache
        cache.set('test_key', 'test_value', 60)
        value = cache.get('test_key')
        logger.info(f"[Settings Patch] Cache test: {value}")
    except Exception as e:
        logger.error(f"[Settings Patch] Cache test failed: {str(e)}")
#!/usr/bin/env python
"""
Update Django settings.py to include enhanced security middleware.
"""
import re

def update_settings():
    settings_path = '/Users/kuoldeng/projectx/backend/pyfactor/pyfactor/settings.py'
    
    with open(settings_path, 'r') as f:
        content = f.read()
    
    # Check if enhanced middleware already added
    if 'EnhancedTenantMiddleware' in content:
        print("✅ Enhanced middleware already configured")
        return False
    
    # Find the MIDDLEWARE list and add our security middleware
    middleware_pattern = r'(MIDDLEWARE = \[.*?\'django\.middleware\.security\.SecurityMiddleware\',)'
    
    replacement = r'''\1
    
    # CRITICAL: Tenant isolation middleware (MUST be early in chain)
    'custom_auth.middleware_enhanced.EnhancedTenantMiddleware',
    'custom_auth.middleware_enhanced.CrossTenantAccessMonitor','''
    
    new_content = re.sub(middleware_pattern, replacement, content, flags=re.DOTALL)
    
    # Add logging configuration for security
    if 'security.tenant' not in content:
        logging_config = '''

# Security Logging Configuration
LOGGING['loggers']['security.tenant'] = {
    'handlers': ['console', 'file'],
    'level': 'INFO',
    'propagate': False,
}

LOGGING['loggers']['security.monitor'] = {
    'handlers': ['console', 'file'], 
    'level': 'WARNING',
    'propagate': False,
}

# Tenant isolation settings
TENANT_ISOLATION = {
    'ENABLED': True,
    'ENFORCE_AT_DATABASE': True,
    'LOG_VIOLATIONS': True,
    'BLOCK_NO_TENANT': True,
}
'''
        new_content += logging_config
    
    # Write back
    with open(settings_path, 'w') as f:
        f.write(new_content)
    
    print("✅ Updated settings.py with enhanced security middleware")
    return True

if __name__ == "__main__":
    update_settings()
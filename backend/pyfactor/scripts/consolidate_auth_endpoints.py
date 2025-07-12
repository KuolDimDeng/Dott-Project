#!/usr/bin/env python
"""
Consolidate Redundant Authentication Endpoints

This script identifies and helps remove redundant authentication endpoints
to simplify the API surface and reduce confusion.

Run with: python scripts/consolidate_auth_endpoints.py
"""

import os
import re
from datetime import datetime
from pathlib import Path

# Endpoint consolidation mapping
ENDPOINT_CONSOLIDATION = {
    # Session Management - Keep only session-v2
    'session': {
        'keep': [
            '/api/auth/session-v2',  # Primary session endpoint
            '/api/sessions/security/',  # Security features
        ],
        'remove': [
            '/api/sessions/create/',
            '/api/sessions/current/',
            '/api/sessions/refresh/',
            '/api/sessions/',
            '/api/sessions/active/',
            '/api/session/',
            '/api/auth/session/',
            '/api/auth/update-session/',
            '/api/auth/verify-session/',
            '/api/auth/sync-session/',
            '/api/auth/clear-cache/',
            '/api/onboarding/session/update/',
        ],
        'reason': 'Consolidate all session management to session-v2 endpoint'
    },
    
    # User Profile - Single unified endpoint
    'profile': {
        'keep': [
            '/api/auth/profile',  # Unified profile endpoint
        ],
        'remove': [
            '/api/users/me/',
            '/api/users/me/session/',
            '/api/auth/user-profile/',
            '/api/user/profile/',
            '/api/profile/',
            '/api/unified-profile/',
        ],
        'reason': 'Single profile endpoint with consistent data structure'
    },
    
    # Authentication/Login
    'auth': {
        'keep': [
            '/api/auth/login',  # Primary login
            '/api/auth/signup',  # Primary signup
            '/api/auth/token/refresh/',  # Token refresh
        ],
        'remove': [
            '/api/auth/register/',
            '/auth/register/',
            '/auth/signup/',
            '/api/auth/token/',
            '/api/auth/auth-token/',
            '/api/auth/verify-credentials/',
        ],
        'reason': 'Simplify to single login/signup flow'
    },
    
    # Onboarding Completion
    'onboarding_complete': {
        'keep': [
            '/api/onboarding/complete-all',  # Single completion endpoint
        ],
        'remove': [
            '/api/onboarding/complete/',
            '/api/onboarding/complete-payment/',
            '/api/onboarding/api/onboarding/complete-all/',
            '/api/auth0/complete-onboarding/',
            '/api/users/update-onboarding-status/',
            '/force-complete/',
        ],
        'reason': 'Single endpoint for all onboarding completion'
    },
    
    # Tenant Management
    'tenant': {
        'keep': [
            '/api/tenants/current',  # Get current tenant
            '/api/tenants/{id}',  # Get specific tenant
            '/api/tenants/verify',  # Verify ownership
        ],
        'remove': [
            '/api/tenants/exists/',
            '/api/tenants/validate/',
            '/api/tenants/by-email/{email}/',
            '/api/auth/verify-tenant/',
            '/api/tenants/verify-owner/',
            '/api/tenants/{id}/verify-owner/',
        ],
        'reason': 'Reduce tenant endpoints to essentials'
    }
}

def find_url_patterns(directory):
    """Find all URL pattern definitions in the codebase"""
    url_patterns = {}
    
    for root, dirs, files in os.walk(directory):
        # Skip migrations and __pycache__
        if 'migrations' in root or '__pycache__' in root:
            continue
            
        for file in files:
            if file.endswith('.py'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r') as f:
                        content = f.read()
                        
                    # Find URL patterns
                    patterns = re.findall(r'path\([\'"]([^\'"]*)[\'"]\s*,', content)
                    patterns.extend(re.findall(r'url\(r?\^?[\'"]([^\'"]*)[\'"]\s*,', content))
                    
                    if patterns:
                        url_patterns[filepath] = patterns
                        
                except Exception as e:
                    print(f"Error reading {filepath}: {e}")
                    
    return url_patterns

def find_endpoint_usage(directory, endpoint):
    """Find where an endpoint is used in frontend code"""
    usage_locations = []
    
    # Common patterns for API calls
    patterns = [
        f"'{endpoint}'",
        f'"{endpoint}"',
        f"`{endpoint}`",
        f"'{endpoint.replace('/api/', '/')}'",  # Frontend might omit /api/
    ]
    
    for root, dirs, files in os.walk(directory):
        if 'node_modules' in root or '.next' in root:
            continue
            
        for file in files:
            if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r') as f:
                        content = f.read()
                        
                    for pattern in patterns:
                        if pattern in content:
                            # Find line numbers
                            lines = content.split('\n')
                            for i, line in enumerate(lines):
                                if pattern in line:
                                    usage_locations.append({
                                        'file': filepath,
                                        'line': i + 1,
                                        'code': line.strip()
                                    })
                                    
                except Exception as e:
                    pass
                    
    return usage_locations

def generate_migration_report():
    """Generate a detailed migration report"""
    print("=== Authentication Endpoint Consolidation Report ===")
    print(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    backend_dir = "/Users/kuoldeng/projectx/backend/pyfactor"
    frontend_dir = "/Users/kuoldeng/projectx/frontend/pyfactor_next"
    
    # Find all URL patterns
    print("Scanning backend for URL patterns...")
    url_patterns = find_url_patterns(backend_dir)
    
    # Generate report for each consolidation group
    for group_name, config in ENDPOINT_CONSOLIDATION.items():
        print(f"\n## {group_name.upper()} Consolidation")
        print(f"Reason: {config['reason']}")
        print()
        
        print("KEEP these endpoints:")
        for endpoint in config['keep']:
            print(f"  ✅ {endpoint}")
            
        print("\nREMOVE these endpoints:")
        for endpoint in config['remove']:
            print(f"  ❌ {endpoint}")
            
            # Find frontend usage
            print("     Frontend usage:")
            usage = find_endpoint_usage(frontend_dir, endpoint)
            if usage:
                for use in usage[:3]:  # Show first 3 usages
                    print(f"       - {use['file']}:{use['line']}")
                if len(usage) > 3:
                    print(f"       ... and {len(usage) - 3} more")
            else:
                print("       - No direct usage found")
                
    print("\n## Implementation Steps:")
    print("1. Update frontend to use consolidated endpoints")
    print("2. Add deprecation warnings to old endpoints")
    print("3. Monitor usage for 2 weeks")
    print("4. Remove deprecated endpoints")
    print("5. Update documentation")

def create_deprecation_decorator():
    """Create a decorator for marking endpoints as deprecated"""
    decorator_code = '''
from functools import wraps
from django.http import JsonResponse
import logging

logger = logging.getLogger(__name__)

def deprecated_endpoint(replacement_endpoint, removal_date="2025-02-01"):
    """
    Decorator to mark an endpoint as deprecated
    
    Args:
        replacement_endpoint: The new endpoint to use instead
        removal_date: When this endpoint will be removed
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapped_view(request, *args, **kwargs):
            # Log deprecation warning
            logger.warning(
                f"DEPRECATED endpoint called: {request.path} "
                f"by {request.META.get('REMOTE_ADDR')} "
                f"User-Agent: {request.META.get('HTTP_USER_AGENT')}"
            )
            
            # Add deprecation headers
            response = view_func(request, *args, **kwargs)
            response['X-Deprecated'] = 'true'
            response['X-Deprecated-Since'] = '2025-01-23'
            response['X-Deprecated-Removal'] = removal_date
            response['X-Replacement-Endpoint'] = replacement_endpoint
            
            # Add warning to JSON responses
            if hasattr(response, 'data') and isinstance(response.data, dict):
                response.data['_deprecation_warning'] = (
                    f"This endpoint is deprecated and will be removed on {removal_date}. "
                    f"Please use {replacement_endpoint} instead."
                )
                
            return response
        return wrapped_view
    return decorator
'''
    
    filepath = os.path.join(backend_dir, 'core', 'decorators', 'deprecation.py')
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    
    with open(filepath, 'w') as f:
        f.write(decorator_code)
        
    print(f"\nCreated deprecation decorator at: {filepath}")

def main():
    print("Authentication Endpoint Consolidation Tool")
    print("=" * 50)
    
    # Generate migration report
    generate_migration_report()
    
    # Create deprecation decorator
    create_deprecation_decorator()
    
    print("\n\n## Next Steps:")
    print("1. Review the consolidation report above")
    print("2. Update frontend code to use new endpoints")
    print("3. Apply @deprecated_endpoint decorator to old endpoints")
    print("4. Monitor logs for deprecated endpoint usage")
    print("5. Remove old endpoints after migration period")
    
    print("\n## Quick Stats:")
    total_remove = sum(len(config['remove']) for config in ENDPOINT_CONSOLIDATION.values())
    total_keep = sum(len(config['keep']) for config in ENDPOINT_CONSOLIDATION.values())
    print(f"Endpoints to remove: {total_remove}")
    print(f"Endpoints to keep: {total_keep}")
    print(f"Reduction: {total_remove} endpoints ({total_remove/(total_remove+total_keep)*100:.1f}%)")

if __name__ == "__main__":
    main()
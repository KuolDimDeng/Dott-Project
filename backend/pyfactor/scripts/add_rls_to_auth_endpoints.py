#!/usr/bin/env python
"""
Add RLS (Row-Level Security) context to authentication endpoints

This script adds proper tenant context setting to all endpoints
that handle tenant-specific data.

Run with: python scripts/add_rls_to_auth_endpoints.py
"""

import os
import re
from datetime import datetime

def backup_file(filepath):
    """Create a backup of the file before modifying"""
    backup_path = f"{filepath}.backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    with open(filepath, 'r') as f:
        content = f.read()
    with open(backup_path, 'w') as f:
        f.write(content)
    print(f"Created backup: {backup_path}")
    return backup_path

def add_rls_to_auth0_views():
    """Add RLS context to Auth0 views"""
    filepath = "/Users/kuoldeng/projectx/backend/pyfactor/custom_auth/api/views/auth0_views.py"
    
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    
    backup_file(filepath)
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Add import if not present
    if "from custom_auth.rls import set_tenant_context, clear_tenant_context" not in content:
        import_pattern = r'(from rest_framework.response import Response\n)'
        content = re.sub(import_pattern, r'\1from custom_auth.rls import set_tenant_context, clear_tenant_context\n', content)
    
    # Add RLS context to Auth0UserCreateView post method
    if "class Auth0UserCreateView" in content and "set_tenant_context" not in content:
        # Find the section where tenant is created/retrieved
        pattern = r'(\s+)(tenant = Tenant\.objects\.create\([\s\S]*?\))'
        replacement = r'\1\2\n\1# Set RLS context for tenant operations\n\1set_tenant_context(str(tenant.id))'
        content = re.sub(pattern, replacement, content)
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"✓ Added RLS context to {filepath}")

def add_rls_to_tenant_views():
    """Add RLS context to tenant views"""
    filepath = "/Users/kuoldeng/projectx/backend/pyfactor/custom_auth/api/views/tenant_views.py"
    
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    
    backup_file(filepath)
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Add import if not present
    if "from custom_auth.rls import set_tenant_context, clear_tenant_context" not in content:
        import_pattern = r'(from custom_auth.models import Tenant\n)'
        content = re.sub(import_pattern, r'\1from custom_auth.rls import set_tenant_context, clear_tenant_context\n', content)
    
    # Add RLS wrapper function if not present
    if "def with_tenant_context" not in content:
        wrapper_code = '''
def with_tenant_context(tenant_id):
    """Decorator to set tenant context for a code block"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            if tenant_id:
                set_tenant_context(str(tenant_id))
            try:
                return func(*args, **kwargs)
            finally:
                if tenant_id:
                    clear_tenant_context()
        return wrapper
    return decorator

'''
        # Insert after imports
        import_end = content.find('\n\nclass')
        if import_end > 0:
            content = content[:import_end] + '\n' + wrapper_code + content[import_end:]
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"✓ Added RLS context helper to {filepath}")

def add_rls_to_session_views():
    """Add RLS context to session views"""
    filepath = "/Users/kuoldeng/projectx/backend/pyfactor/session_manager/views.py"
    
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
    
    backup_file(filepath)
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Add import if not present
    if "from custom_auth.rls import set_tenant_context, clear_tenant_context" not in content:
        import_pattern = r'(from \.models import UserSession\n)'
        content = re.sub(import_pattern, r'\1from custom_auth.rls import set_tenant_context, clear_tenant_context\n', content)
    
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"✓ Added RLS import to {filepath}")

def add_rls_to_onboarding_views():
    """Add RLS context to onboarding views that are missing it"""
    files_to_update = [
        "/Users/kuoldeng/projectx/backend/pyfactor/onboarding/api/views/complete_all_view.py",
        "/Users/kuoldeng/projectx/backend/pyfactor/onboarding/api/status_views.py",
        "/Users/kuoldeng/projectx/backend/pyfactor/onboarding/views/subscription.py",
    ]
    
    for filepath in files_to_update:
        if not os.path.exists(filepath):
            print(f"File not found: {filepath}")
            continue
        
        backup_file(filepath)
        
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Add import if not present
        if "from custom_auth.rls import set_tenant_context" not in content:
            # Find appropriate place to add import
            if "from django." in content:
                import_pattern = r'(from django\.[\s\S]*?\n)'
                content = re.sub(import_pattern, r'\1from custom_auth.rls import set_tenant_context, clear_tenant_context\n', content, count=1)
            elif "from rest_framework" in content:
                import_pattern = r'(from rest_framework[\s\S]*?\n)'
                content = re.sub(import_pattern, r'\1from custom_auth.rls import set_tenant_context, clear_tenant_context\n', content, count=1)
        
        with open(filepath, 'w') as f:
            f.write(content)
        
        print(f"✓ Added RLS import to {filepath}")

def main():
    print("Adding RLS Context to Authentication Endpoints")
    print("=" * 50)
    print()
    
    print("1. Adding RLS to Auth0 views...")
    add_rls_to_auth0_views()
    
    print("\n2. Adding RLS to tenant views...")
    add_rls_to_tenant_views()
    
    print("\n3. Adding RLS to session views...")
    add_rls_to_session_views()
    
    print("\n4. Adding RLS to onboarding views...")
    add_rls_to_onboarding_views()
    
    print("\n✓ RLS context additions complete!")
    print("\nNext steps:")
    print("1. Review the changes in each file")
    print("2. Add actual set_tenant_context() calls where needed")
    print("3. Test tenant isolation")
    print("4. Deploy changes")

if __name__ == "__main__":
    main()
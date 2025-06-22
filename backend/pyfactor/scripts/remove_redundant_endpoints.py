#!/usr/bin/env python
"""
Remove Redundant Authentication Endpoints

This script removes redundant endpoints from the codebase.
Since we're in test mode, we can remove them immediately.

Run with: python scripts/remove_redundant_endpoints.py
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

def remove_auth_endpoints():
    """Remove redundant endpoints from custom_auth/api/urls.py"""
    filepath = "/Users/kuoldeng/projectx/backend/pyfactor/custom_auth/api/urls.py"
    
    # Create backup
    backup_file(filepath)
    
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Define endpoints to remove with their line patterns
    endpoints_to_remove = [
        # Session management redundant endpoints
        r"path\('auth/verify-session/',.*?\),",
        r"path\('auth/update-session/',.*?\),",
        r"path\('users/update-onboarding-status/',.*?\),",
        
        # User profile redundant endpoints
        r"path\('auth/user-profile/',.*?\),",
        r"path\('users/me/session/',.*?\),",
        
        # Authentication redundant endpoints
        r"path\('auth/verify-credentials/',.*?\),",
        
        # Tenant redundant endpoints
        r"path\('tenants/exists/',.*?\),",
        r"path\('tenants/validate/',.*?\),",
        r"path\('tenants/by-email/<str:email>/',.*?\),",
        r"path\('auth/verify-tenant/',.*?\),",
        r"path\('tenants/verify-owner/',.*?\),",
        
        # Onboarding redundant endpoints
        r"path\('auth0/complete-onboarding/',.*?\),",
        r"path\('users/update-onboarding-status/',.*?\),",
    ]
    
    # Remove each endpoint
    for pattern in endpoints_to_remove:
        content = re.sub(pattern, '', content, flags=re.MULTILINE | re.DOTALL)
    
    # Clean up extra blank lines
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    
    # Write back
    with open(filepath, 'w') as f:
        f.write(content)
    
    print(f"✓ Removed redundant endpoints from {filepath}")

def remove_session_manager_endpoints():
    """Remove redundant session manager endpoints"""
    filepath = "/Users/kuoldeng/projectx/backend/pyfactor/session_manager/urls.py"
    
    if os.path.exists(filepath):
        # Create backup
        backup_file(filepath)
        
        # For session manager, we'll comment out most endpoints except security
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Comment out redundant endpoints
        patterns_to_comment = [
            (r"(path\('create/',.*?\),)", r"# REMOVED - Use /api/auth/session-v2\n    # \1"),
            (r"(path\('current/',.*?\),)", r"# REMOVED - Use /api/auth/session-v2\n    # \1"),
            (r"(path\('refresh/',.*?\),)", r"# REMOVED - Use /api/auth/session-v2\n    # \1"),
            (r"(path\('',.*?SessionListView.*?\),)", r"# REMOVED - Use /api/auth/session-v2\n    # \1"),
            (r"(path\('active/',.*?\),)", r"# REMOVED - Use /api/auth/session-v2\n    # \1"),
        ]
        
        for pattern, replacement in patterns_to_comment:
            content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)
        
        with open(filepath, 'w') as f:
            f.write(content)
        
        print(f"✓ Commented out redundant session endpoints in {filepath}")

def update_frontend_endpoints():
    """Update frontend to use consolidated endpoints"""
    replacements = [
        # Profile endpoints
        ("/api/profile/", "/api/auth/profile"),
        ("/api/user/profile/", "/api/auth/profile"),
        ("/api/users/me/", "/api/auth/profile"),
        
        # Session endpoints
        ("/api/sessions/create/", "/api/auth/session-v2"),
        ("/api/auth/verify-session/", "/api/auth/session-v2"),
        
        # Onboarding endpoints
        ("/api/onboarding/complete/", "/api/onboarding/complete-all"),
    ]
    
    frontend_dir = "/Users/kuoldeng/projectx/frontend/pyfactor_next"
    updated_files = []
    
    for root, dirs, files in os.walk(frontend_dir):
        # Skip node_modules and .next
        if 'node_modules' in root or '.next' in root:
            continue
            
        for file in files:
            if file.endswith(('.js', '.jsx', '.ts', '.tsx')):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r') as f:
                        content = f.read()
                    
                    original_content = content
                    for old_endpoint, new_endpoint in replacements:
                        if old_endpoint in content:
                            content = content.replace(old_endpoint, new_endpoint)
                            # Also handle without trailing slash
                            content = content.replace(old_endpoint.rstrip('/'), new_endpoint.rstrip('/'))
                    
                    if content != original_content:
                        # Create backup
                        backup_file(filepath)
                        
                        with open(filepath, 'w') as f:
                            f.write(content)
                        
                        updated_files.append(filepath)
                        
                except Exception as e:
                    print(f"Error updating {filepath}: {e}")
    
    print(f"\n✓ Updated {len(updated_files)} frontend files:")
    for f in updated_files[:10]:  # Show first 10
        print(f"  - {f}")
    if len(updated_files) > 10:
        print(f"  ... and {len(updated_files) - 10} more")

def remove_auth_urls():
    """Remove redundant auth URLs from custom_auth/urls.py"""
    filepath = "/Users/kuoldeng/projectx/backend/pyfactor/custom_auth/urls.py"
    
    if os.path.exists(filepath):
        backup_file(filepath)
        
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Remove redundant patterns
        patterns_to_remove = [
            r"path\('register/',.*?\),",
            r"path\('signup/',.*?\),",
        ]
        
        for pattern in patterns_to_remove:
            content = re.sub(pattern, '', content, flags=re.MULTILINE | re.DOTALL)
        
        # Clean up extra blank lines
        content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
        
        with open(filepath, 'w') as f:
            f.write(content)
        
        print(f"✓ Removed redundant auth URLs from {filepath}")

def main():
    print("Removing Redundant Authentication Endpoints")
    print("=" * 50)
    print()
    
    # Remove backend endpoints
    print("1. Removing redundant backend endpoints...")
    remove_auth_endpoints()
    remove_session_manager_endpoints()
    remove_auth_urls()
    
    # Update frontend
    print("\n2. Updating frontend to use consolidated endpoints...")
    update_frontend_endpoints()
    
    print("\n✓ Redundant endpoints removed successfully!")
    print("\nNext steps:")
    print("1. Test authentication flows")
    print("2. Deploy backend changes")
    print("3. Deploy frontend changes")

if __name__ == "__main__":
    main()
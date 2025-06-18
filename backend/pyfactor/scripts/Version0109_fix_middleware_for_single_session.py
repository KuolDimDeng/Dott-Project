#!/usr/bin/env python3
"""
Version0109_fix_middleware_for_single_session.py

Fix middleware configuration after removing Django sessions.
Removes AuthenticationMiddleware and adds security middleware.

Author: Claude
Date: 2025-01-18
"""

import os
import sys
import re
from datetime import datetime

# Add the parent directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def backup_settings(settings_path):
    """Create a backup of settings.py"""
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_path = f"{settings_path}.backup_{timestamp}"
    
    with open(settings_path, 'r') as f:
        content = f.read()
    
    with open(backup_path, 'w') as f:
        f.write(content)
    
    print(f"✓ Created backup: {backup_path}")
    return backup_path


def fix_middleware(settings_path):
    """Fix middleware configuration"""
    print("\n=== Fixing Middleware Configuration ===")
    
    with open(settings_path, 'r') as f:
        content = f.read()
    
    # Find MIDDLEWARE setting
    middleware_match = re.search(r'MIDDLEWARE\s*=\s*\[(.*?)\]', content, re.DOTALL)
    if not middleware_match:
        print("✗ Could not find MIDDLEWARE setting")
        return False
    
    middleware_content = middleware_match.group(1)
    middleware_lines = [line.strip() for line in middleware_content.split('\n') if line.strip()]
    
    # Remove problematic middleware
    middleware_to_remove = [
        'django.contrib.auth.middleware.AuthenticationMiddleware',
        'django.contrib.messages.middleware.MessageMiddleware',  # Also remove messages since it depends on sessions
    ]
    
    # Add security middleware
    middleware_to_add = [
        'session_manager.security_middleware.SessionSecurityMiddleware',
        'session_manager.security_middleware.DeviceFingerprintMiddleware',
        'session_manager.security_middleware.SessionHeartbeatMiddleware',
    ]
    
    # Filter out middleware to remove
    updated_middleware = []
    for line in middleware_lines:
        should_keep = True
        for remove_item in middleware_to_remove:
            if remove_item in line:
                print(f"  - Removing: {remove_item}")
                should_keep = False
                break
        
        if should_keep and line and not line.startswith('#'):
            updated_middleware.append(line)
    
    # Add security middleware after session_manager.middleware.SessionMiddleware
    final_middleware = []
    for i, line in enumerate(updated_middleware):
        final_middleware.append(line)
        
        # Add security middleware after SessionMiddleware
        if 'session_manager.middleware.SessionMiddleware' in line:
            print(f"  + Adding security middleware after SessionMiddleware")
            for new_mw in middleware_to_add:
                # Check if already exists
                if not any(new_mw in existing for existing in updated_middleware):
                    final_middleware.append(f"    '{new_mw}',")
                    print(f"  + Added: {new_mw}")
    
    # Reconstruct MIDDLEWARE setting
    new_middleware = "MIDDLEWARE = [\n" + "\n".join(final_middleware) + "\n]"
    
    # Replace in content
    content = re.sub(r'MIDDLEWARE\s*=\s*\[.*?\]', new_middleware, content, flags=re.DOTALL)
    
    # Write back
    with open(settings_path, 'w') as f:
        f.write(content)
    
    print("✓ Updated MIDDLEWARE configuration")
    return True


def remove_installed_apps_dependencies(settings_path):
    """Remove apps that depend on Django sessions"""
    print("\n=== Checking INSTALLED_APPS ===")
    
    with open(settings_path, 'r') as f:
        content = f.read()
    
    # Find INSTALLED_APPS setting
    apps_match = re.search(r'INSTALLED_APPS\s*=\s*\[(.*?)\]', content, re.DOTALL)
    if not apps_match:
        print("✗ Could not find INSTALLED_APPS setting")
        return False
    
    apps_content = apps_match.group(1)
    apps_lines = [line.strip() for line in apps_content.split('\n') if line.strip()]
    
    # Apps to check/remove
    apps_to_check = [
        'django.contrib.messages',  # Depends on sessions
    ]
    
    # Filter apps
    updated_apps = []
    for line in apps_lines:
        should_keep = True
        for check_app in apps_to_check:
            if check_app in line and not line.startswith('#'):
                print(f"  - Commenting out: {check_app}")
                updated_apps.append(f"    # {line.strip()}  # Requires Django sessions")
                should_keep = False
                break
        
        if should_keep and line:
            updated_apps.append(line)
    
    # Reconstruct INSTALLED_APPS setting
    new_apps = "INSTALLED_APPS = [\n" + "\n".join(updated_apps) + "\n]"
    
    # Replace in content
    content = re.sub(r'INSTALLED_APPS\s*=\s*\[.*?\]', new_apps, content, flags=re.DOTALL)
    
    # Write back
    with open(settings_path, 'w') as f:
        f.write(content)
    
    print("✓ Updated INSTALLED_APPS")
    return True


def add_security_settings(settings_path):
    """Add security-related settings"""
    print("\n=== Adding Security Settings ===")
    
    with open(settings_path, 'r') as f:
        content = f.read()
    
    # Check if security settings already exist
    if 'SESSION_SECURITY_RISK_THRESHOLD_HIGH' in content:
        print("✓ Security settings already present")
        return True
    
    # Add security settings before the file ends
    security_settings = """
# ===== ENHANCED SECURITY SETTINGS =====
# Risk thresholds for session security
SESSION_SECURITY_RISK_THRESHOLD_HIGH = 70
SESSION_SECURITY_RISK_THRESHOLD_MEDIUM = 50

# Heartbeat configuration
SESSION_HEARTBEAT_INTERVAL = 60  # seconds
SESSION_HEARTBEAT_GRACE_PERIOD = 120  # seconds

# Device trust configuration
DEVICE_TRUST_DURATION_DAYS = 90
MAX_FAILED_LOGIN_ATTEMPTS = 5
DEVICE_BLOCK_DURATION_HOURS = 1

# Security event retention
SECURITY_EVENT_RETENTION_DAYS = 90
# =====================================
"""
    
    # Add before the last few lines
    content = content.rstrip() + '\n' + security_settings
    
    with open(settings_path, 'w') as f:
        f.write(content)
    
    print("✓ Added security settings")
    return True


def main():
    """Main function"""
    print("=" * 60)
    print("Fix Middleware for Single Session System")
    print("Version: 0109")
    print("=" * 60)
    print()
    
    # Get settings path
    settings_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'pyfactor',
        'settings.py'
    )
    
    if not os.path.exists(settings_path):
        print(f"✗ Settings file not found: {settings_path}")
        return False
    
    # Create backup
    backup_path = backup_settings(settings_path)
    
    try:
        # Fix middleware
        if not fix_middleware(settings_path):
            print("✗ Failed to fix middleware")
            return False
        
        # Check INSTALLED_APPS
        if not remove_installed_apps_dependencies(settings_path):
            print("✗ Failed to update INSTALLED_APPS")
            return False
        
        # Add security settings
        if not add_security_settings(settings_path):
            print("✗ Failed to add security settings")
            return False
        
        print("\n" + "=" * 60)
        print("✓ Settings updated successfully!")
        print("=" * 60)
        print()
        print("Changes made:")
        print("1. Removed django.contrib.auth.middleware.AuthenticationMiddleware")
        print("2. Removed django.contrib.messages.middleware.MessageMiddleware")
        print("3. Added security middleware for enhanced session protection")
        print("4. Commented out django.contrib.messages in INSTALLED_APPS")
        print("5. Added security configuration settings")
        print()
        print("Next steps:")
        print("1. Commit these changes")
        print("2. Push to Dott_Main_Dev_Deploy branch")
        print("3. Render will auto-deploy")
        print("4. Run migrations: python manage.py migrate session_manager")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Error occurred: {e}")
        print(f"Restoring from backup: {backup_path}")
        
        # Restore backup
        with open(backup_path, 'r') as f:
            content = f.read()
        with open(settings_path, 'w') as f:
            f.write(content)
        
        print("✓ Restored from backup")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
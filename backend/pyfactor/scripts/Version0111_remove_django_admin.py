#!/usr/bin/env python3
"""
Version0111_remove_django_admin.py

Remove Django admin to fix deployment with single session system.
Django admin requires Django's session framework which we've removed.

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


def remove_django_admin(settings_path):
    """Remove Django admin from SHARED_APPS"""
    print("\n=== Removing Django Admin ===")
    
    with open(settings_path, 'r') as f:
        content = f.read()
    
    # Remove django.contrib.admin from SHARED_APPS
    content = re.sub(
        r"(\s*)'django\.contrib\.admin',?\s*\n",
        r"\1# 'django.contrib.admin',  # Disabled - requires Django sessions\n",
        content
    )
    
    print("✓ Commented out django.contrib.admin")
    
    with open(settings_path, 'w') as f:
        f.write(content)
    
    return True


def remove_admin_context_processor(settings_path):
    """Remove admin context processor"""
    print("\n=== Removing Admin Context Processor ===")
    
    with open(settings_path, 'r') as f:
        content = f.read()
    
    # The auth context processor is still needed for user authentication
    # No changes needed here
    print("✓ Auth context processor can stay (doesn't require Django sessions)")
    
    return True


def update_urls_py():
    """Update main urls.py to remove admin"""
    print("\n=== Updating URLs Configuration ===")
    
    urls_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'pyfactor',
        'urls.py'
    )
    
    if not os.path.exists(urls_path):
        print("✗ urls.py not found")
        return False
    
    with open(urls_path, 'r') as f:
        content = f.read()
    
    # Comment out admin import and URL pattern
    content = re.sub(
        r"from django\.contrib import admin",
        "# from django.contrib import admin  # Disabled - requires Django sessions",
        content
    )
    
    content = re.sub(
        r"path\('admin/', admin\.site\.urls\),",
        "# path('admin/', admin.site.urls),  # Disabled - requires Django sessions",
        content
    )
    
    with open(urls_path, 'w') as f:
        f.write(content)
    
    print("✓ Updated urls.py")
    return True


def create_admin_alternative_doc():
    """Create documentation for admin alternatives"""
    doc_content = """# Django Admin Alternatives for Single Session System

Since we're using a custom session system without Django's session framework,
the standard Django admin is not compatible. Here are alternatives:

## Option 1: Custom Admin Interface (Recommended)
Create a custom admin interface that uses your session_manager:
- Build with Django REST Framework + React
- Use session_manager.authentication.SessionAuthentication
- Implement role-based access control

## Option 2: Third-Party Admin
Use admin interfaces that don't depend on Django sessions:
- Django-Jet (with modifications)
- React-Admin with DRF backend
- Custom Vue.js admin panel

## Option 3: Database Management
For emergency access:
- Use pgAdmin or similar PostgreSQL clients
- Create management commands for common tasks
- Use Django shell with custom authentication

## Option 4: Re-enable Django Admin (Not Recommended)
If you absolutely need Django admin:
1. Re-add django.contrib.sessions to INSTALLED_APPS
2. Re-add SessionMiddleware to MIDDLEWARE
3. Configure SESSION_ENGINE to use database
4. This creates a dual-session system (not recommended)

## Management Commands
Instead of admin, create management commands:
```python
# management/commands/create_superuser.py
from django.core.management.base import BaseCommand
from custom_auth.models import User

class Command(BaseCommand):
    def handle(self, *args, **options):
        # Create superuser logic
        pass
```

## Security Note
The custom session system provides better security than Django's default sessions.
Any admin interface should use the same session_manager for consistency.
"""
    
    doc_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'ADMIN_ALTERNATIVES.md'
    )
    
    with open(doc_path, 'w') as f:
        f.write(doc_content)
    
    print(f"\n✓ Created admin alternatives documentation: {doc_path}")
    return True


def main():
    """Main function"""
    print("=" * 60)
    print("Remove Django Admin for Single Session System")
    print("Version: 0111")
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
        # Remove Django admin
        if not remove_django_admin(settings_path):
            print("✗ Failed to remove Django admin")
            return False
        
        # Update context processors
        if not remove_admin_context_processor(settings_path):
            print("✗ Failed to update context processors")
            return False
        
        # Update URLs
        if not update_urls_py():
            print("✗ Failed to update urls.py")
            return False
        
        # Create documentation
        if not create_admin_alternative_doc():
            print("✗ Failed to create documentation")
            return False
        
        print("\n" + "=" * 60)
        print("✓ Django admin removed successfully!")
        print("=" * 60)
        print()
        print("Changes made:")
        print("1. Commented out django.contrib.admin in INSTALLED_APPS")
        print("2. Commented out admin URL pattern in urls.py")
        print("3. Created ADMIN_ALTERNATIVES.md with alternatives")
        print()
        print("Next steps:")
        print("1. Commit these changes")
        print("2. Push to trigger deployment")
        print("3. Migrations should now work without admin errors")
        print()
        print("For admin functionality, see ADMIN_ALTERNATIVES.md")
        
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
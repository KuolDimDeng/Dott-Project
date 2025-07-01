#!/usr/bin/env python
"""Test script to check all imports and basic Django configuration"""

import sys
import os

# Add the project directory to the Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

print("=== Testing Django Imports ===")

# Set minimal Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
os.environ.setdefault('SECRET_KEY', 'test-secret-key')
os.environ.setdefault('DATABASE_URL', 'sqlite:///test.db')
os.environ.setdefault('DEBUG', 'True')

try:
    import django
    print("✓ Django imported successfully")
    
    # Setup Django
    django.setup()
    print("✓ Django setup completed")
    
    # Test app imports
    print("\n=== Testing App Imports ===")
    
    apps_to_test = [
        'taxes',
        'taxes.models',
        'taxes.urls',
        'taxes.views',
        'taxes.payroll.urls',
        'taxes.year_end.urls',
        'taxes.year_end.views',
        'taxes.year_end.w2_generator',
        'taxes.year_end.form1099_generator',
        'taxes.multistate.urls',
        'taxes.multistate.views',
        'purchases.models',
        'sales.models',
        'custom_auth.permissions',
        'users.models',
        'hr.models',
    ]
    
    failed_imports = []
    
    for app in apps_to_test:
        try:
            __import__(app)
            print(f"✓ {app}")
        except ImportError as e:
            print(f"✗ {app}: {str(e)}")
            failed_imports.append((app, str(e)))
        except Exception as e:
            print(f"✗ {app}: {type(e).__name__}: {str(e)}")
            failed_imports.append((app, f"{type(e).__name__}: {str(e)}"))
    
    # Test URL configuration
    print("\n=== Testing URL Configuration ===")
    try:
        from django.urls import reverse
        from pyfactor import urls
        print("✓ URL configuration loaded")
    except Exception as e:
        print(f"✗ URL configuration error: {str(e)}")
        failed_imports.append(("URLs", str(e)))
    
    # Summary
    print("\n=== Summary ===")
    if failed_imports:
        print(f"Failed imports: {len(failed_imports)}")
        for app, error in failed_imports:
            print(f"  - {app}: {error}")
        sys.exit(1)
    else:
        print("All imports successful!")
        sys.exit(0)
        
except Exception as e:
    print(f"✗ Setup failed: {type(e).__name__}: {str(e)}")
    sys.exit(1)
#!/usr/bin/env python3
"""
Version0108_create_security_migrations.py

Create Django migrations for enhanced security models.
Run this to generate the migration files.

Author: Claude
Date: 2025-01-18
"""

import os
import sys
import subprocess

# Add the parent directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def main():
    """Main function."""
    print("=" * 60)
    print("Creating Security Model Migrations")
    print("Version: 0108")
    print("=" * 60)
    print()
    
    # First, update the models.py to import security models
    models_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        'session_manager',
        'models.py'
    )
    
    print("Adding imports to models.py...")
    
    # Read current models.py
    with open(models_path, 'r') as f:
        content = f.read()
    
    # Add import at the end if not already present
    if 'from .security_models import' not in content:
        content += '\n\n# Import security models to ensure they are discovered by migrations\nfrom .security_models import DeviceFingerprint, SessionSecurity, DeviceTrust\n'
        
        with open(models_path, 'w') as f:
            f.write(content)
        
        print("✓ Added security model imports to models.py")
    else:
        print("✓ Security model imports already present")
    
    # Now create the migrations
    print("\nCreating migrations...")
    
    try:
        # Change to Django project directory
        django_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        os.chdir(django_dir)
        
        # Run makemigrations
        result = subprocess.run(
            [sys.executable, 'manage.py', 'makemigrations', 'session_manager'],
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print("✓ Migrations created successfully!")
            print("\nOutput:")
            print(result.stdout)
            
            # Show migration commands
            print("\n" + "=" * 60)
            print("Next Steps:")
            print("=" * 60)
            print("\n1. Review the migration file(s) created")
            print("2. Deploy to production")
            print("3. Run on Render:")
            print("   python manage.py migrate session_manager")
            print("\n4. Update settings.py to add the new middleware:")
            print("   - session_manager.security_middleware.SessionSecurityMiddleware")
            print("   - session_manager.security_middleware.DeviceFingerprintMiddleware")
            print("   - session_manager.security_middleware.SessionHeartbeatMiddleware")
            
        else:
            print("✗ Error creating migrations:")
            print(result.stderr)
            return False
            
    except Exception as e:
        print(f"✗ Error: {e}")
        return False
    
    return True


if __name__ == "__main__":
    main()
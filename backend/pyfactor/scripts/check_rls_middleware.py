#!/usr/bin/env python3
"""
RLS Middleware Configuration Checker

This script checks if the Row Level Security (RLS) middleware is properly configured
in Django settings. It provides guidance on how to correctly set up the middleware
for production use.

For production use with AWS RDS and Django.
"""

import os
import sys
import importlib
import logging
from pathlib import Path

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger('rls_middleware_check')

def print_header(title):
    """Print a section header"""
    print(f"\n=== {title} ===")

def check_django_settings():
    """Check if Django settings have RLS middleware configured"""
    print_header("CHECKING DJANGO SETTINGS")
    
    # Try to import Django settings
    sys.path.append(str(Path(__file__).parent.parent))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
    
    try:
        from django.conf import settings
        
        # Look for RLS middleware
        standard_middleware = 'custom_auth.rls_middleware.RowLevelSecurityMiddleware'
        enhanced_middleware = 'custom_auth.enhanced_rls_middleware.EnhancedRowLevelSecurityMiddleware'
        
        middleware_list = getattr(settings, 'MIDDLEWARE', [])
        
        standard_found = standard_middleware in middleware_list
        enhanced_found = enhanced_middleware in middleware_list
        
        if enhanced_found:
            print("✅ Enhanced RLS middleware is configured")
            print(f"  Found: '{enhanced_middleware}'")
        elif standard_found:
            print("✅ Standard RLS middleware is configured")
            print(f"  Found: '{standard_middleware}'")
        else:
            print("❌ No RLS middleware found in settings.MIDDLEWARE")
            print("\nTo fix this, add the following to your settings.py:")
            print("\nMIDDLEWARE = [")
            print("    # ... your existing middleware")
            print(f"    '{standard_middleware}',")
            print("    # ... other middleware")
            print("]")
            
        # Check middleware order
        if standard_found or enhanced_found:
            middleware = standard_middleware if standard_found else enhanced_middleware
            position = middleware_list.index(middleware)
            
            auth_middleware = [m for m in middleware_list if 'auth' in m.lower()]
            db_middleware = [m for m in middleware_list if 'db' in m.lower()]
            
            auth_positions = [middleware_list.index(m) for m in auth_middleware if m != middleware]
            db_positions = [middleware_list.index(m) for m in db_middleware if m != middleware]
            
            order_issues = []
            
            # RLS should be after auth middleware
            if auth_positions and min(auth_positions) > position:
                order_issues.append("RLS middleware should be after authentication middleware")
            
            # RLS should be before DB middleware
            if db_positions and max(db_positions) < position:
                order_issues.append("RLS middleware should be before database middleware")
            
            if order_issues:
                print("\n⚠️ Middleware order issues:")
                for issue in order_issues:
                    print(f"  - {issue}")
                print("\nRecommended order:")
                print("1. Security/Authentication middleware")
                print("2. RLS middleware")
                print("3. Database-accessing middleware")
            else:
                print("✅ Middleware order looks good")
        
        # Check if RLS middleware class exists
        print("\nChecking middleware implementation...")
        try:
            if standard_found:
                module_path, class_name = standard_middleware.rsplit('.', 1)
                module = importlib.import_module(module_path)
                getattr(module, class_name)
                print(f"✅ RLS middleware class '{class_name}' exists")
            elif enhanced_found:
                module_path, class_name = enhanced_middleware.rsplit('.', 1)
                module = importlib.import_module(module_path)
                getattr(module, class_name)
                print(f"✅ Enhanced RLS middleware class '{class_name}' exists")
        except (ImportError, AttributeError) as e:
            print(f"❌ Error importing RLS middleware: {e}")
            print("Make sure the middleware class is properly implemented")
            
    except ImportError as e:
        print(f"❌ Error importing Django settings: {e}")
        print("Make sure Django is installed and settings.py exists")
        return False
    
    return True

def check_database_connection():
    """Check if database connection supports RLS"""
    print_header("CHECKING DATABASE CONNECTION")
    
    try:
        import django
        django.setup()
        
        from django.db import connection
        
        # Try to execute a simple query
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            result = cursor.fetchone()
            if result and result[0] == 1:
                print("✅ Database connection works")
            else:
                print("❌ Database query returned unexpected result")
            
            # Check if PostgreSQL is being used
            try:
                cursor.execute("SELECT version()")
                version = cursor.fetchone()[0]
                print(f"✅ Connected to: {version}")
                
                if "postgresql" in version.lower():
                    print("✅ Using PostgreSQL database (required for RLS)")
                    
                    # Check PostgreSQL version
                    if "9.5" in version or any(f"{i}" in version for i in range(10, 30)):
                        print("✅ PostgreSQL version supports RLS")
                    else:
                        print("⚠️ PostgreSQL version may not support RLS (requires 9.5+)")
                else:
                    print("❌ Not using PostgreSQL - RLS requires PostgreSQL")
            except Exception as e:
                print(f"❌ Error checking database version: {e}")
                
    except Exception as e:
        print(f"❌ Error connecting to database: {e}")
        print("Make sure database connection settings are correct")
        return False
    
    return True

def main():
    """Main function"""
    print("\n=== RLS MIDDLEWARE CONFIGURATION CHECK ===")
    print("Checking if Row Level Security middleware is properly configured...")
    
    settings_ok = check_django_settings()
    db_ok = check_database_connection()
    
    print_header("SUMMARY")
    if settings_ok and db_ok:
        print("✅ RLS middleware configuration looks good!")
        print("\nNext steps:")
        print("1. Ensure database RLS functions are set up (run rls_manager.py)")
        print("2. Restart Django server to apply middleware changes")
    else:
        print("⚠️ RLS middleware configuration has issues.")
        print("Please fix the problems indicated above.")
        print("\nFor detailed setup instructions, see RLS_INSTALL_GUIDE.md")
    
    return 0 if settings_ok and db_ok else 1

if __name__ == "__main__":
    sys.exit(main()) 
#!/usr/bin/env python
"""
Test Django configuration to identify startup issues
"""
import os
import sys
import traceback

# Set environment variables
os.environ['DJANGO_SETTINGS_MODULE'] = 'pyfactor.settings_eb'
os.environ['SECRET_KEY'] = 'temporary-secret-key-for-deployment'
os.environ['RDS_DB_NAME'] = 'dott_main'
os.environ['RDS_USERNAME'] = 'dott_admin'
os.environ['RDS_PASSWORD'] = 'RRfXU6uPPUbBEg1JqGTJ'
os.environ['RDS_HOSTNAME'] = 'dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com'
os.environ['RDS_PORT'] = '5432'

print("=== Django Configuration Test ===")
print(f"Python version: {sys.version}")
print(f"Current directory: {os.getcwd()}")
print(f"DJANGO_SETTINGS_MODULE: {os.environ.get('DJANGO_SETTINGS_MODULE')}")
print()

# Test 1: Import Django
print("Test 1: Importing Django...")
try:
    import django
    print(f"✓ Django imported successfully (version {django.__version__})")
except Exception as e:
    print(f"✗ Failed to import Django: {e}")
    traceback.print_exc()
    sys.exit(1)

# Test 2: Django Setup
print("\nTest 2: Django setup...")
try:
    django.setup()
    print("✓ Django setup successful")
except Exception as e:
    print(f"✗ Django setup failed: {e}")
    traceback.print_exc()
    sys.exit(1)

# Test 3: Import settings
print("\nTest 3: Importing settings...")
try:
    from django.conf import settings
    print(f"✓ Settings imported successfully")
    print(f"  - DEBUG: {settings.DEBUG}")
    print(f"  - ALLOWED_HOSTS: {settings.ALLOWED_HOSTS[:3]}..." if len(settings.ALLOWED_HOSTS) > 3 else f"  - ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
    print(f"  - INSTALLED_APPS count: {len(settings.INSTALLED_APPS)}")
    print(f"  - Health app installed: {'health' in settings.INSTALLED_APPS}")
except Exception as e:
    print(f"✗ Failed to import settings: {e}")
    traceback.print_exc()

# Test 4: Check database connection
print("\nTest 4: Testing database connection...")
try:
    from django.db import connections
    db = connections['default']
    db.ensure_connection()
    print("✓ Database connection successful")
except Exception as e:
    print(f"✗ Database connection failed: {e}")
    print("Note: This might be expected if you're not connected to AWS VPN or the RDS is not accessible")

# Test 5: Import and test health views
print("\nTest 5: Testing health check views...")
try:
    from pyfactor.health_check import health_check
    print("✓ Health check view imported successfully")
except Exception as e:
    print(f"✗ Failed to import health check view: {e}")
    traceback.print_exc()

# Test 6: Check WSGI application
print("\nTest 6: Testing WSGI application...")
try:
    from pyfactor.wsgi import application
    print("✓ WSGI application imported successfully")
except Exception as e:
    print(f"✗ Failed to import WSGI application: {e}")
    traceback.print_exc()

# Test 7: List all installed apps
print("\nTest 7: Installed apps:")
try:
    from django.conf import settings
    for app in settings.INSTALLED_APPS:
        print(f"  - {app}")
except Exception as e:
    print(f"✗ Failed to list installed apps: {e}")

print("\n=== Configuration test complete ===")
print("\nIf all tests passed, the application should run in Docker.")
print("If any tests failed, fix those issues before deploying.") 
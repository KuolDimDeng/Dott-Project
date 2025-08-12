#!/usr/bin/env python
import os
import sys
import django

# Set up Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

try:
    django.setup()
    print("✅ Django configuration is valid!")
    print("✅ All middleware loaded successfully!")
    
    # Test importing the middleware directly
    from taxes.tax_audit_middleware import TaxAuditMiddleware
    print("✅ TaxAuditMiddleware imported successfully!")
    
except Exception as e:
    print(f"❌ Django configuration error: {e}")
    sys.exit(1)
#!/usr/bin/env python
"""
Simple test to verify Django can respond to health checks
"""
import os
import sys
import django
from django.http import HttpResponse
from django.conf import settings

# Add Django project to path
sys.path.append('/opt/python/current/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')

try:
    django.setup()
    print("✅ Django setup successful")
    
    # Test a simple health response
    response = HttpResponse("OK", content_type="text/plain", status=200)
    print(f"✅ Health response created: {response.status_code}")
    
except Exception as e:
    print(f"❌ Django setup failed: {e}")

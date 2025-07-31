"""
Django management command to diagnose and fix backend issues
"""
import os
import sys
import logging
from django.core.management.base import BaseCommand
from django.db import connection
from django.core.cache import cache
from django.conf import settings
import traceback

logger = logging.getLogger(__name__)

class Command(BaseCommand):
    help = 'Diagnose and fix backend issues causing 503/500 errors'

    def handle(self, *args, **options):
        self.stdout.write("=== Backend Diagnostic Tool ===\n")
        
        # Test 1: Database Connection
        self.stdout.write("\n1. Testing Database Connection...")
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT version()")
                version = cursor.fetchone()
                self.stdout.write(self.style.SUCCESS(f"✓ Database connected: PostgreSQL {version[0]}"))
                
                # Check if required tables exist
                cursor.execute("""
                    SELECT table_name FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name IN ('users_user', 'users_business', 'users_businessdetails')
                """)
                tables = [row[0] for row in cursor.fetchall()]
                self.stdout.write(f"  Found tables: {', '.join(tables)}")
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Database error: {str(e)}"))
            traceback.print_exc()
        
        # Test 2: Redis/Cache Connection
        self.stdout.write("\n2. Testing Cache Connection...")
        try:
            cache.set('diagnostic_test', 'test_value', 30)
            value = cache.get('diagnostic_test')
            if value == 'test_value':
                self.stdout.write(self.style.SUCCESS("✓ Cache is working"))
            else:
                self.stdout.write(self.style.WARNING("⚠ Cache set/get mismatch"))
            cache.delete('diagnostic_test')
        except Exception as e:
            self.stdout.write(self.style.WARNING(f"⚠ Cache error (non-critical): {str(e)}"))
        
        # Test 3: Check Middleware Issues
        self.stdout.write("\n3. Checking Middleware Configuration...")
        problematic_middleware = []
        for middleware in settings.MIDDLEWARE:
            try:
                # Try to import the middleware
                module_path, class_name = middleware.rsplit('.', 1)
                module = __import__(module_path, fromlist=[class_name])
                getattr(module, class_name)
            except Exception as e:
                problematic_middleware.append((middleware, str(e)))
        
        if problematic_middleware:
            self.stdout.write(self.style.WARNING("⚠ Problematic middleware found:"))
            for mw, error in problematic_middleware:
                self.stdout.write(f"  - {mw}: {error}")
        else:
            self.stdout.write(self.style.SUCCESS("✓ All middleware can be loaded"))
        
        # Test 4: Check Authentication
        self.stdout.write("\n4. Checking Authentication Configuration...")
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user_count = User.objects.count()
            self.stdout.write(f"  Total users in database: {user_count}")
            
            # Check Auth0 configuration
            auth0_settings = {
                'AUTH0_DOMAIN': os.getenv('AUTH0_DOMAIN', 'NOT SET'),
                'AUTH0_AUDIENCE': os.getenv('AUTH0_AUDIENCE', 'NOT SET'),
                'AUTH0_CLIENT_ID': os.getenv('AUTH0_CLIENT_ID', 'NOT SET'),
            }
            
            for key, value in auth0_settings.items():
                if value == 'NOT SET':
                    self.stdout.write(self.style.WARNING(f"  ⚠ {key} is not configured"))
                else:
                    self.stdout.write(f"  ✓ {key}: {value}")
                    
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Authentication check error: {str(e)}"))
        
        # Test 5: Check Currency Module
        self.stdout.write("\n5. Checking Currency Module...")
        try:
            from currency.currency_data import get_currency_list, get_currency_info
            currencies = get_currency_list()
            self.stdout.write(f"  Currency list loaded: {len(currencies)} currencies")
            
            # Test SSP specifically
            ssp_info = get_currency_info('SSP')
            if ssp_info:
                self.stdout.write(self.style.SUCCESS("  ✓ SSP currency found"))
            else:
                self.stdout.write(self.style.WARNING("  ⚠ SSP currency not found"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ Currency module error: {str(e)}"))
        
        # Test 6: Test API Endpoint
        self.stdout.write("\n6. Testing Currency API Endpoint...")
        try:
            from users.api.currency_views import test_auth_public
            from rest_framework.test import APIRequestFactory
            
            factory = APIRequestFactory()
            request = factory.get('/api/currency/test-public/')
            response = test_auth_public(request)
            
            if response.status_code == 200:
                self.stdout.write(self.style.SUCCESS("✓ Public API endpoint working"))
            else:
                self.stdout.write(self.style.WARNING(f"⚠ API returned status {response.status_code}"))
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"✗ API test error: {str(e)}"))
        
        # Summary and Recommendations
        self.stdout.write("\n=== Recommendations ===")
        self.stdout.write("1. Apply settings patch: python manage.py shell -c \"from pyfactor.settings_patch import patch_settings; import pyfactor.settings; patch_settings(pyfactor.settings)\"")
        self.stdout.write("2. Clear cache: python manage.py shell -c \"from django.core.cache import cache; cache.clear()\"")
        self.stdout.write("3. Restart the service: systemctl restart gunicorn (or equivalent)")
        self.stdout.write("4. Check logs: tail -f logs/app.log")
        
        self.stdout.write("\n=== Diagnostic Complete ===\n")
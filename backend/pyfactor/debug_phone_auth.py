#!/usr/bin/env python
"""
Debug script for phone authentication issues on staging.
Run this in Render shell to identify the exact error.
"""
import os
import sys
import django
import traceback
from datetime import datetime, timedelta

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

print("=" * 60)
print("🔍 PHONE AUTH DEBUGGING SCRIPT")
print("=" * 60)

# 1. Check database connection
print("\n1️⃣ Testing Database Connection...")
try:
    from django.db import connection
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
        print("✅ Database connection successful")
        
        # Check if tables exist
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'custom_auth_phone%'
        """)
        tables = cursor.fetchall()
        print(f"✅ Found tables: {[t[0] for t in tables]}")
except Exception as e:
    print(f"❌ Database error: {e}")
    traceback.print_exc()

# 2. Check Twilio configuration
print("\n2️⃣ Checking Twilio Configuration...")
try:
    from django.conf import settings
    
    account_sid = getattr(settings, 'TWILIO_ACCOUNT_SID', None)
    auth_token = getattr(settings, 'TWILIO_AUTH_TOKEN', None)
    phone_number = getattr(settings, 'TWILIO_PHONE_NUMBER', None)
    
    print(f"Account SID: {account_sid[:10]}..." if account_sid else "❌ TWILIO_ACCOUNT_SID not set")
    print(f"Auth Token: {'***' if auth_token else '❌ TWILIO_AUTH_TOKEN not set'}")
    print(f"Phone Number: {phone_number if phone_number else '❌ TWILIO_PHONE_NUMBER not set'}")
    
    # Try to initialize Twilio client
    if account_sid and auth_token:
        try:
            from twilio.rest import Client
            client = Client(account_sid, auth_token)
            print("✅ Twilio client initialized successfully")
        except ImportError:
            print("❌ Twilio package not installed")
        except Exception as e:
            print(f"❌ Twilio initialization error: {e}")
except Exception as e:
    print(f"❌ Settings error: {e}")
    traceback.print_exc()

# 3. Test model imports
print("\n3️⃣ Testing Model Imports...")
try:
    from custom_auth.phone_otp_models import PhoneOTP, PhoneVerificationAttempt
    print("✅ Models imported successfully")
    
    # Test model operations
    count_otp = PhoneOTP.objects.count()
    count_attempts = PhoneVerificationAttempt.objects.count()
    print(f"📊 PhoneOTP records: {count_otp}")
    print(f"📊 PhoneVerificationAttempt records: {count_attempts}")
except Exception as e:
    print(f"❌ Model import error: {e}")
    traceback.print_exc()

# 4. Test utility functions
print("\n4️⃣ Testing Utility Functions...")
try:
    from custom_auth.phone_utils import format_phone_number, send_sms_via_twilio
    
    # Test phone formatting
    test_phone = "+15513488487"
    formatted = format_phone_number(test_phone)
    print(f"✅ Phone formatting works: {test_phone} -> {formatted}")
    
    # Test SMS function exists
    print(f"✅ send_sms_via_twilio function exists: {send_sms_via_twilio}")
except ImportError as e:
    print(f"❌ Import error: {e}")
    traceback.print_exc()
except Exception as e:
    print(f"❌ Utility function error: {e}")
    traceback.print_exc()

# 5. Test creating an OTP record
print("\n5️⃣ Testing OTP Creation...")
try:
    from custom_auth.phone_otp_models import PhoneOTP
    import random
    from django.utils import timezone
    
    test_otp = PhoneOTP.objects.create(
        phone_number="+15513488487",
        otp_code=str(random.randint(100000, 999999)),
        expires_at=timezone.now() + timedelta(minutes=10),
        purpose='test',
        delivery_status='test'
    )
    print(f"✅ Created test OTP: {test_otp.id}")
    
    # Clean up
    test_otp.delete()
    print("✅ Test OTP deleted")
except Exception as e:
    print(f"❌ OTP creation error: {e}")
    traceback.print_exc()

# 6. Test session service
print("\n6️⃣ Testing Session Service...")
try:
    from session_manager.services import SessionService
    print("✅ SessionService imported successfully")
    
    # Test if we can call methods
    print(f"✅ SessionService class exists: {SessionService}")
except ImportError as e:
    print(f"❌ Session service import error: {e}")
    traceback.print_exc()
except Exception as e:
    print(f"❌ Session service error: {e}")
    traceback.print_exc()

# 7. Simulate the actual send_otp flow
print("\n7️⃣ Simulating send_otp Flow...")
try:
    from custom_auth.phone_utils import format_phone_number
    from custom_auth.phone_otp_models import PhoneOTP, PhoneVerificationAttempt
    from django.utils import timezone
    from datetime import timedelta
    import random
    
    phone = "+15513488487"
    formatted_phone = format_phone_number(phone)
    print(f"📱 Testing with phone: {formatted_phone}")
    
    # Check rate limiting
    recent_attempts = PhoneVerificationAttempt.objects.filter(
        phone_number=formatted_phone,
        attempt_type='send_otp',
        created_at__gte=timezone.now() - timedelta(minutes=15)
    ).count()
    print(f"📊 Recent attempts in last 15 min: {recent_attempts}")
    
    # Check recent OTPs
    recent_otps = PhoneOTP.objects.filter(
        phone_number=formatted_phone,
        created_at__gte=timezone.now() - timedelta(minutes=1)
    ).count()
    print(f"📊 Recent OTPs in last minute: {recent_otps}")
    
    # Generate OTP
    otp_code = str(random.randint(100000, 999999))
    print(f"🔢 Generated OTP: {otp_code}")
    
    # Try to send SMS (without actually sending)
    print("\n🚀 Would send SMS with:")
    print(f"   To: {formatted_phone}")
    print(f"   Message: Your Dott verification code is: {otp_code}")
    
    print("\n✅ send_otp flow simulation successful")
    
except Exception as e:
    print(f"❌ send_otp simulation error: {e}")
    traceback.print_exc()

# 8. Check for any middleware issues
print("\n8️⃣ Checking Middleware Configuration...")
try:
    from django.conf import settings
    middleware_list = settings.MIDDLEWARE
    print(f"📊 Total middleware: {len(middleware_list)}")
    
    # Check for problematic middleware
    for mw in middleware_list:
        if 'tenant' in mw.lower():
            print(f"⚠️  Tenant middleware: {mw}")
        if 'session' in mw.lower():
            print(f"⚠️  Session middleware: {mw}")
            
    # Check TENANT_EXEMPT_PATHS
    exempt_paths = getattr(settings, 'TENANT_EXEMPT_PATHS', [])
    phone_auth_exempt = any('phone' in path for path in exempt_paths)
    print(f"\n{'✅' if phone_auth_exempt else '❌'} Phone auth in TENANT_EXEMPT_PATHS: {phone_auth_exempt}")
    if phone_auth_exempt:
        phone_paths = [p for p in exempt_paths if 'phone' in p]
        print(f"   Phone paths: {phone_paths}")
    
except Exception as e:
    print(f"❌ Middleware check error: {e}")
    traceback.print_exc()

print("\n" + "=" * 60)
print("📋 DEBUGGING COMPLETE")
print("=" * 60)
print("\nIf all checks pass but API still fails, the issue is likely:")
print("1. Middleware blocking the request")
print("2. CORS or CSRF issues")
print("3. Request data parsing problems")
print("4. Unhandled exception in view logic")
print("\nRun this script in Render shell to see the exact error!")
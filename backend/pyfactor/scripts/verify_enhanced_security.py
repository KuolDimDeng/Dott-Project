#!/usr/bin/env python
"""
Verify Enhanced Security Implementation
Checks that all security features are properly deployed
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import connection
from django.conf import settings


def check_migrations():
    """Check if security migrations have been applied"""
    print("=" * 60)
    print("CHECKING MIGRATIONS")
    print("=" * 60)
    
    with connection.cursor() as cursor:
        # Check if migration table exists
        cursor.execute("""
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name = 'django_migrations'
            );
        """)
        if not cursor.fetchone()[0]:
            print("❌ Django migrations table doesn't exist!")
            return False
            
        # Check for session_manager migrations
        cursor.execute("""
            SELECT name, applied 
            FROM django_migrations 
            WHERE app = 'session_manager'
            ORDER BY applied DESC;
        """)
        migrations = cursor.fetchall()
        
        if not migrations:
            print("❌ No session_manager migrations found!")
            return False
            
        print("✅ Session Manager Migrations:")
        for name, applied in migrations:
            print(f"   - {name} (applied: {applied})")
            
        # Check if 0002_enhanced_security exists
        migration_names = [m[0] for m in migrations]
        if '0002_enhanced_security' not in migration_names:
            print("❌ Enhanced security migration (0002_enhanced_security) not found!")
            return False
        else:
            print("✅ Enhanced security migration found!")
            
    return True


def check_security_tables():
    """Check if security tables exist"""
    print("\n" + "=" * 60)
    print("CHECKING SECURITY TABLES")
    print("=" * 60)
    
    required_tables = [
        'session_manager_devicefingerprint',
        'session_manager_sessionsecurity',
        'session_manager_devicetrust'
    ]
    
    with connection.cursor() as cursor:
        for table in required_tables:
            cursor.execute("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_schema = 'public' 
                    AND table_name = %s
                );
            """, [table])
            exists = cursor.fetchone()[0]
            
            if exists:
                # Get row count
                cursor.execute(f"SELECT COUNT(*) FROM {table};")
                count = cursor.fetchone()[0]
                print(f"✅ Table {table} exists (rows: {count})")
            else:
                print(f"❌ Table {table} does not exist!")
                return False
                
    return True


def check_security_settings():
    """Check if security settings are configured"""
    print("\n" + "=" * 60)
    print("CHECKING SECURITY SETTINGS")
    print("=" * 60)
    
    settings_to_check = [
        ('SESSION_SECURITY_ENABLE_DEVICE_FINGERPRINTING', True),
        ('SESSION_SECURITY_ENABLE_RISK_SCORING', True),
        ('SESSION_SECURITY_ENABLE_DEVICE_TRUST', True),
        ('SESSION_SECURITY_ENABLE_HEARTBEAT', True),
        ('SESSION_SECURITY_RISK_THRESHOLD_HIGH', 70),
        ('SESSION_SECURITY_RISK_THRESHOLD_MEDIUM', 50),
        ('SESSION_HEARTBEAT_INTERVAL', 60),
        ('SESSION_SECURITY_MAX_DEVICES_PER_USER', 5),
        ('SESSION_SECURITY_DEVICE_TRUST_DURATION_DAYS', 30),
        ('SESSION_SECURITY_ENABLE_EMAIL_VERIFICATION', True)
    ]
    
    all_good = True
    for setting_name, expected_value in settings_to_check:
        actual_value = getattr(settings, setting_name, None)
        if actual_value == expected_value:
            print(f"✅ {setting_name} = {actual_value}")
        else:
            print(f"❌ {setting_name} = {actual_value} (expected: {expected_value})")
            all_good = False
            
    return all_good


def check_middleware():
    """Check if security middleware is installed"""
    print("\n" + "=" * 60)
    print("CHECKING MIDDLEWARE")
    print("=" * 60)
    
    required_middleware = 'session_manager.middleware.SessionSecurityMiddleware'
    
    if required_middleware in settings.MIDDLEWARE:
        print(f"✅ Security middleware installed")
        # Find its position
        position = settings.MIDDLEWARE.index(required_middleware)
        print(f"   Position: {position} of {len(settings.MIDDLEWARE)}")
        return True
    else:
        print(f"❌ Security middleware NOT installed!")
        print("   Current middleware:")
        for i, mw in enumerate(settings.MIDDLEWARE):
            print(f"   {i}: {mw}")
        return False


def check_sample_data():
    """Check for any security data"""
    print("\n" + "=" * 60)
    print("CHECKING SECURITY DATA")
    print("=" * 60)
    
    with connection.cursor() as cursor:
        # Check for device fingerprints
        cursor.execute("SELECT COUNT(*) FROM session_manager_devicefingerprint;")
        fp_count = cursor.fetchone()[0]
        print(f"Device Fingerprints: {fp_count}")
        
        # Check for session security records
        cursor.execute("SELECT COUNT(*) FROM session_manager_sessionsecurity;")
        sec_count = cursor.fetchone()[0]
        print(f"Session Security Records: {sec_count}")
        
        # Check for device trust records
        cursor.execute("SELECT COUNT(*) FROM session_manager_devicetrust;")
        trust_count = cursor.fetchone()[0]
        print(f"Device Trust Records: {trust_count}")
        
        # Sample some data if available
        if fp_count > 0:
            cursor.execute("""
                SELECT fingerprint_hash, risk_score, created_at 
                FROM session_manager_devicefingerprint 
                ORDER BY created_at DESC 
                LIMIT 3;
            """)
            print("\nRecent Device Fingerprints:")
            for hash_val, risk, created in cursor.fetchall():
                print(f"  - Hash: {hash_val[:16]}... Risk: {risk} Created: {created}")


def main():
    """Run all verification checks"""
    print("ENHANCED SECURITY VERIFICATION")
    print("=" * 60)
    print(f"Environment: {os.environ.get('DJANGO_SETTINGS_MODULE', 'unknown')}")
    print(f"Database: {settings.DATABASES['default']['NAME']}")
    print("=" * 60)
    
    checks = [
        ("Migrations", check_migrations),
        ("Security Tables", check_security_tables),
        ("Settings", check_security_settings),
        ("Middleware", check_middleware),
    ]
    
    all_passed = True
    for check_name, check_func in checks:
        try:
            passed = check_func()
            if not passed:
                all_passed = False
        except Exception as e:
            print(f"\n❌ Error in {check_name}: {e}")
            all_passed = False
    
    # Always run data check
    try:
        check_sample_data()
    except Exception as e:
        print(f"\n❌ Error checking data: {e}")
    
    print("\n" + "=" * 60)
    if all_passed:
        print("✅ ALL SECURITY CHECKS PASSED!")
        print("\nEnhanced security features are properly deployed.")
    else:
        print("❌ SOME SECURITY CHECKS FAILED!")
        print("\nPlease review the errors above and fix them.")
        print("\nNext steps:")
        print("1. Run migrations: python manage.py migrate session_manager")
        print("2. Check settings.py for missing security configurations")
        print("3. Verify middleware is properly configured")
    print("=" * 60)
    
    return 0 if all_passed else 1


if __name__ == "__main__":
    sys.exit(main())
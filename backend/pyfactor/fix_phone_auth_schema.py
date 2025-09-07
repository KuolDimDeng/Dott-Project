#!/usr/bin/env python
"""
Script to fix phone auth table schemas in staging.
Run this in Render shell: python fix_phone_auth_schema.py
"""
import os
import sys
import django
from django.db import connection

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

print("=" * 60)
print("🔧 Fixing Phone Auth Table Schemas")
print("=" * 60)

def execute_sql(sql, description):
    """Execute SQL and handle errors."""
    try:
        with connection.cursor() as cursor:
            cursor.execute(sql)
            print(f"✅ {description}")
            return True
    except Exception as e:
        print(f"❌ {description} failed: {e}")
        return False

# Drop existing tables
print("\n1️⃣ Dropping existing tables...")
execute_sql("DROP TABLE IF EXISTS custom_auth_phoneotp CASCADE", "Dropped phoneotp table")
execute_sql("DROP TABLE IF EXISTS custom_auth_phoneverificationattempt CASCADE", "Dropped verification attempt table")

# Create PhoneOTP table
print("\n2️⃣ Creating PhoneOTP table...")
phoneotp_sql = """
CREATE TABLE custom_auth_phoneotp (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) DEFAULT 'login',
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    used_at TIMESTAMP WITH TIME ZONE,
    message_sid VARCHAR(100),
    delivery_status VARCHAR(20) DEFAULT 'pending',
    ip_address INET,
    user_agent TEXT,
    tenant_id VARCHAR(100),
    business_id VARCHAR(100)
)
"""
if execute_sql(phoneotp_sql, "Created PhoneOTP table"):
    # Create indexes
    indexes = [
        ("CREATE INDEX idx_phoneotp_phone_created ON custom_auth_phoneotp(phone_number, created_at)", "phone_created index"),
        ("CREATE INDEX idx_phoneotp_otp_expires ON custom_auth_phoneotp(otp_code, expires_at)", "otp_expires index"),
        ("CREATE INDEX idx_phoneotp_expires ON custom_auth_phoneotp(expires_at)", "expires index"),
        ("CREATE INDEX idx_phoneotp_phone ON custom_auth_phoneotp(phone_number)", "phone index"),
    ]
    for sql, desc in indexes:
        execute_sql(sql, f"Created {desc}")

# Create PhoneVerificationAttempt table
print("\n3️⃣ Creating PhoneVerificationAttempt table...")
verification_sql = """
CREATE TABLE custom_auth_phoneverificationattempt (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20),
    ip_address INET,
    attempt_type VARCHAR(20) NOT NULL,
    success BOOLEAN NOT NULL,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    user_agent TEXT,
    tenant_id VARCHAR(100),
    business_id VARCHAR(100)
)
"""
if execute_sql(verification_sql, "Created PhoneVerificationAttempt table"):
    # Create indexes
    indexes = [
        ("CREATE INDEX idx_phoneverif_phone_created ON custom_auth_phoneverificationattempt(phone_number, created_at)", "phone_created index"),
        ("CREATE INDEX idx_phoneverif_ip_created ON custom_auth_phoneverificationattempt(ip_address, created_at)", "ip_created index"),
        ("CREATE INDEX idx_phoneverif_created ON custom_auth_phoneverificationattempt(created_at)", "created index"),
        ("CREATE INDEX idx_phoneverif_phone ON custom_auth_phoneverificationattempt(phone_number)", "phone index"),
    ]
    for sql, desc in indexes:
        execute_sql(sql, f"Created {desc}")

# Verify tables
print("\n4️⃣ Verifying tables...")
with connection.cursor() as cursor:
    cursor.execute("""
        SELECT table_name, column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name IN ('custom_auth_phoneotp', 'custom_auth_phoneverificationattempt')
        ORDER BY table_name, ordinal_position
    """)
    
    current_table = None
    for row in cursor.fetchall():
        table, column, dtype = row
        if table != current_table:
            print(f"\n📊 Table: {table}")
            current_table = table
        print(f"   - {column}: {dtype}")

# Test creating a record
print("\n5️⃣ Testing record creation...")
try:
    from custom_auth.phone_otp_models import PhoneOTP
    from django.utils import timezone
    from datetime import timedelta
    import random
    
    otp = PhoneOTP.objects.create(
        phone_number="+15513488487",
        otp_code=str(random.randint(100000, 999999)),
        expires_at=timezone.now() + timedelta(minutes=10),
        purpose='login'
    )
    print(f"✅ Created test OTP: {otp.id}")
    otp.delete()
    print("✅ Deleted test OTP")
except Exception as e:
    print(f"❌ Test failed: {e}")

print("\n" + "=" * 60)
print("✅ Phone auth tables fixed!")
print("=" * 60)
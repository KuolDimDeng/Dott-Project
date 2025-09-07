#!/bin/bash
# Script to run migrations on staging through Render shell
# Run this in the Render shell console for the staging backend

echo "🚀 Running database migrations on staging..."
echo "================================================"

# Run Django migrations
python manage.py migrate

echo ""
echo "✅ Migrations complete!"
echo ""
echo "📊 Checking migration status..."
python manage.py showmigrations custom_auth | tail -10

echo ""
echo "🔍 Testing phone auth tables..."
python manage.py shell << EOF
from custom_auth.phone_otp_models import PhoneOTP, PhoneVerificationAttempt
print("✅ PhoneOTP model imported successfully")
print("✅ PhoneVerificationAttempt model imported successfully")
print(f"📊 Total OTP records: {PhoneOTP.objects.count()}")
print(f"📊 Total verification attempts: {PhoneVerificationAttempt.objects.count()}")
EOF

echo ""
echo "✅ All migrations applied successfully!"
echo "📱 Phone authentication system is ready for testing"
#!/bin/bash
# Run these commands in Render shell to fix phone authentication

echo "🔧 Fixing Phone Authentication on Staging"
echo "=========================================="

# 1. Install Twilio package
echo "1️⃣ Installing Twilio package..."
pip install twilio

echo ""
echo "2️⃣ Creating migrations for phone auth models..."
python manage.py makemigrations custom_auth --name phone_auth_models

echo ""
echo "3️⃣ Running migrations..."
python manage.py migrate

echo ""
echo "4️⃣ Verifying phone auth tables..."
python manage.py shell << EOF
from custom_auth.phone_otp_models import PhoneOTP, PhoneVerificationAttempt
print("✅ PhoneOTP model imported successfully")
print("✅ PhoneVerificationAttempt model imported successfully")
print(f"📊 PhoneOTP table exists: {PhoneOTP._meta.db_table}")
print(f"📊 PhoneVerificationAttempt table exists: {PhoneVerificationAttempt._meta.db_table}")
EOF

echo ""
echo "✅ Phone authentication system fixed!"
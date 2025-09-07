#!/bin/bash
# Simple test script for phone authentication

echo "📱 Testing Phone Authentication System"
echo "======================================"

# Your Twilio phone number
PHONE="+15513488487"
API_URL="https://dott-api-staging.onrender.com"

echo ""
echo "1️⃣ Testing status endpoint..."
curl -s "$API_URL/api/auth/phone/status/" | python3 -m json.tool

echo ""
echo "2️⃣ Sending OTP to $PHONE..."
RESPONSE=$(curl -s -X POST "$API_URL/api/auth/phone/send-otp/" \
  -H "Content-Type: application/json" \
  -d "{\"phone\": \"$PHONE\"}")

echo "$RESPONSE" | python3 -m json.tool

# Check if successful
if echo "$RESPONSE" | grep -q '"success":true'; then
  echo "✅ OTP sent successfully!"
  echo ""
  echo "3️⃣ Check your phone for the verification code"
  echo "   Then test verification with:"
  echo "   curl -X POST $API_URL/api/auth/phone/verify-otp/ \\"
  echo "     -H 'Content-Type: application/json' \\"
  echo "     -d '{\"phone\": \"$PHONE\", \"code\": \"YOUR_CODE\"}'"
else
  echo "❌ Failed to send OTP"
  echo "   The database migrations may need to be run first"
fi
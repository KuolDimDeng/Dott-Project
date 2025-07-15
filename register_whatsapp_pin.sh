#!/bin/bash

# WhatsApp Registration Script
# Usage: ./register_whatsapp_pin.sh <PIN_CODE>

if [ -z "$1" ]; then
    echo "Usage: ./register_whatsapp_pin.sh <PIN_CODE>"
    echo "Example: ./register_whatsapp_pin.sh 123456"
    exit 1
fi

PIN_CODE=$1
ACCESS_TOKEN="EAAPMAZBHELoEBPDQMgXQQXzrkNB7vIzUqQGZAe0s9Q4NIAYkOGKysoE7F7kUBzjBLsuTdoM5le7rL7zWmbFzBjGSngqi2vUDOykfvYAAteTKwl8wdZAuzmU1pr3iJNwY9QghkTFPkQheDZATvnS97i0JqAljY4OwUklUO66gZBwL2sISqhjeEg7BPTxVBfCc500Qz0HmmC2f7BF6D202uYKsQPS58toRHIUGMCVv7"
PHONE_NUMBER_ID="676188225586230"

echo "🚀 Registering WhatsApp number with PIN: $PIN_CODE"

curl -X POST "https://graph.facebook.com/v18.0/$PHONE_NUMBER_ID/register" \
-H "Authorization: Bearer $ACCESS_TOKEN" \
-H "Content-Type: application/json" \
-d "{
  \"messaging_product\": \"whatsapp\",
  \"pin\": \"$PIN_CODE\"
}"

echo ""
echo "✅ Registration complete! Now testing message sending..."

curl -X POST "https://graph.facebook.com/v18.0/$PHONE_NUMBER_ID/messages" \
-H "Authorization: Bearer $ACCESS_TOKEN" \
-H "Content-Type: application/json" \
-d '{
  "messaging_product": "whatsapp",
  "to": "15551905954",
  "type": "text",
  "text": {
    "body": "🎉 WhatsApp API is now working! This is a test message from Dott."
  }
}'
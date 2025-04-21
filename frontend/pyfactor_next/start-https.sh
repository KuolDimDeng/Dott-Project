#!/bin/bash

# Check if SSL certificates exist
CERT_DIR="../../certificates"
CERT_FILE="$CERT_DIR/localhost+1.pem"
KEY_FILE="$CERT_DIR/localhost+1-key.pem"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    echo "Error: SSL certificates not found at $CERT_DIR"
    echo "Expected certificate files: $CERT_FILE and $KEY_FILE"
    echo "Please run 'mkcert -install' and create certificates first"
    exit 1
fi

echo "Using SSL certificates:"
echo "Certificate: $CERT_FILE"
echo "Key: $KEY_FILE"

# Use the custom HTTPS server implementation
echo "Starting Next.js with HTTPS support..."
NODE_TLS_REJECT_UNAUTHORIZED=0 \
HTTPS=true \
SSL_CRT_FILE="$CERT_FILE" \
SSL_KEY_FILE="$KEY_FILE" \
PORT=3000 \
USE_DATABASE=true \
MOCK_DATA_DISABLED=true \
PROD_MODE=true \
NEXT_PUBLIC_API_URL=https://127.0.0.1:8000 \
BACKEND_API_URL=https://127.0.0.1:8000 \
NODE_OPTIONS='--max-old-space-size=4096' \
node server/https-server.js 
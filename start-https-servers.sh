#!/bin/bash
# Start both frontend and backend servers with HTTPS support

# Check if SSL certificates exist
CERT_DIR="./certificates"
CERT_FILE="$CERT_DIR/localhost+1.pem"
KEY_FILE="$CERT_DIR/localhost+1-key.pem"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    echo "Error: SSL certificates not found at $CERT_DIR"
    echo "Expected certificate files: $CERT_FILE and $KEY_FILE"
    echo "Please run 'mkcert -install' and create certificates first"
    exit 1
fi

echo "Using SSL certificates from $CERT_DIR"
echo "Certificate: $CERT_FILE"
echo "Key: $KEY_FILE"

# Make sure the start-https.sh script is executable
chmod +x frontend/pyfactor_next/start-https.sh

# Start the backend server with HTTPS in the background
echo "Starting backend server with HTTPS support..."
cd backend/pyfactor
python run_https_server_fixed.py &
BACKEND_PID=$!
cd ../..

# Wait for backend to initialize
echo "Waiting for backend to initialize..."
sleep 5

# Start the frontend with HTTPS
echo "Starting frontend with HTTPS support..."
cd frontend/pyfactor_next
./start-https.sh

# Cleanup when frontend exits
echo "Frontend server stopped, shutting down backend..."
kill -TERM $BACKEND_PID

echo "All servers have been stopped" 
#!/bin/bash
# Start the Django/Uvicorn backend server with HTTPS support

# Set working directory to the script location
cd "$(dirname "$0")"

# Activate virtual environment if it exists
if [ -d ".venv" ]; then
    echo "Activating virtual environment..."
    source .venv/bin/activate
fi

# Check if SSL certificates exist
CERT_DIR="../../certificates"
CERT_FILE="$CERT_DIR/localhost+1.pem"
KEY_FILE="$CERT_DIR/localhost+1-key.pem"

if [ ! -f "$CERT_FILE" ] || [ ! -f "$KEY_FILE" ]; then
    echo "Error: SSL certificates not found at $CERT_DIR"
    echo "Expected certificate files: $CERT_FILE and $KEY_FILE"
    echo "Please ensure mkcert has been properly set up"
    exit 1
fi

echo "Using SSL certificates from $CERT_DIR"
echo "Certificate: $CERT_FILE"
echo "Key: $KEY_FILE"

# Ensure the script is executable
chmod +x run_https_server_fixed.py

# Set environment variables for production mode
export PROD_MODE=true
export USE_DATABASE=true
export MOCK_DATA_DISABLED=true
export USE_SSL=true
export SSL_CERT_FILE="$CERT_FILE"
export SSL_KEY_FILE="$KEY_FILE"

# Run the HTTPS server
echo "Starting backend server with HTTPS support..."
python run_https_server_fixed.py

# If server exits, deactivate virtual environment
if [ -d ".venv" ]; then
    deactivate
fi 
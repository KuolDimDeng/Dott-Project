#!/bin/bash

# Production script to fix invalid tenant IDs
echo "🔧 Fixing invalid tenant IDs in production..."

# SSH into the production server and run the management command
# Adjust these values based on your deployment setup

# For Render deployment
if [ "$1" = "render" ]; then
    echo "Running on Render..."
    # You'll need to use Render's shell or run this via their dashboard
    echo "Please run this command in Render's shell:"
    echo "cd backend/pyfactor && python manage.py fix_invalid_tenant_ids"
fi

# For direct server access
if [ "$1" = "ssh" ]; then
    echo "Running via SSH..."
    SERVER="$2"
    if [ -z "$SERVER" ]; then
        echo "Usage: ./fix-tenant-ids-production.sh ssh user@server"
        exit 1
    fi
    
    ssh "$SERVER" << 'EOF'
        cd /path/to/projectx/backend/pyfactor
        source venv/bin/activate
        python manage.py fix_invalid_tenant_ids
EOF
fi

# For Docker deployment
if [ "$1" = "docker" ]; then
    echo "Running in Docker..."
    CONTAINER="$2"
    if [ -z "$CONTAINER" ]; then
        echo "Usage: ./fix-tenant-ids-production.sh docker container_name"
        exit 1
    fi
    
    docker exec -it "$CONTAINER" python /app/backend/pyfactor/manage.py fix_invalid_tenant_ids
fi

# For local testing
if [ "$1" = "local" ]; then
    echo "Running locally..."
    cd backend/pyfactor
    python manage.py fix_invalid_tenant_ids
fi

echo "Usage:"
echo "  ./fix-tenant-ids-production.sh render     - Instructions for Render"
echo "  ./fix-tenant-ids-production.sh ssh USER@SERVER - Run via SSH"
echo "  ./fix-tenant-ids-production.sh docker CONTAINER - Run in Docker"
echo "  ./fix-tenant-ids-production.sh local      - Run locally"
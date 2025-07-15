#!/bin/bash

# WhatsApp Business Migration Script
echo "🚀 Running WhatsApp Business Migrations..."
echo "========================================"

# Navigate to backend directory
cd /Users/kuoldeng/projectx/backend/pyfactor

# First, create the migrations
echo "1. Creating migrations for WhatsApp Business..."
python3 manage.py makemigrations whatsapp_business

echo -e "\n2. Showing migration plan..."
python3 manage.py showmigrations whatsapp_business

echo -e "\n3. Running migrations..."
python3 manage.py migrate whatsapp_business

echo -e "\n✅ Migrations complete!"
echo "========================================"

# Show the created tables
echo -e "\nCreated tables:"
python3 manage.py dbshell << EOF
\dt whatsapp_*;
EOF
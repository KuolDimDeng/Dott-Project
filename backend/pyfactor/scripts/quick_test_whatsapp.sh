#!/bin/bash

# Quick WhatsApp Business Test Script
echo "🚀 Quick WhatsApp Business Test..."
echo "================================"

# Navigate to backend
cd /Users/kuoldeng/projectx/backend/pyfactor

# 1. Check Python files
echo "1. Checking Python syntax..."
python3 -m py_compile whatsapp_business/models.py && echo "✓ Models OK"
python3 -m py_compile whatsapp_business/views.py && echo "✓ Views OK"
python3 -m py_compile whatsapp_business/serializers.py && echo "✓ Serializers OK"

# 2. Check for import errors
echo -e "\n2. Checking imports..."
python3 -c "
try:
    from whatsapp_business.models import WhatsAppBusinessSettings, WhatsAppProduct
    print('✓ Models import OK')
except Exception as e:
    print(f'✗ Models import error: {e}')

try:
    from whatsapp_business.serializers import WhatsAppProductSerializer
    print('✓ Serializers import OK')
except Exception as e:
    print(f'✗ Serializers import error: {e}')
"

# 3. Frontend build test
echo -e "\n3. Testing frontend build..."
cd /Users/kuoldeng/projectx/frontend/pyfactor_next

# Check key files exist
echo "Checking frontend files..."
[ -f "src/app/dashboard/components/forms/WhatsAppBusinessDashboard.js" ] && echo "✓ Dashboard component exists"
[ -f "src/app/dashboard/components/forms/WhatsAppCatalogManagement.js" ] && echo "✓ Catalog component exists"
[ -f "src/app/dashboard/components/forms/WhatsAppPaymentProcessor.js" ] && echo "✓ Payment component exists"
[ -f "src/app/dashboard/components/forms/WhatsAppOrderManagement.js" ] && echo "✓ Order component exists"
[ -f "src/utils/whatsappCountryDetection.js" ] && echo "✓ Country detection utility exists"

# 4. Check for syntax errors in JS files
echo -e "\nChecking JavaScript syntax..."
node -c src/utils/whatsappCountryDetection.js 2>/dev/null && echo "✓ Country detection JS valid"

echo -e "\n================================"
echo "✅ Quick test completed!"
echo "================================"
echo -e "\nNext steps:"
echo "1. Install any missing Python packages"
echo "2. Run migrations: python3 manage.py migrate"
echo "3. Test in development environment"
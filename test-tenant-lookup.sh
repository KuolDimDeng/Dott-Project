#!/bin/bash

echo "🧪 Testing Tenant Lookup Fix"
echo "==========================="
echo ""
echo "This script will help you test if the tenant lookup fix is working"
echo ""
echo "Instructions:"
echo "1. First, deploy the backend to Render (if not already done)"
echo "2. Clear your browser cache completely"
echo "3. Sign in with kdeng@dottapps.com"
echo "4. Watch the backend logs for these key messages:"
echo ""
echo "✅ GOOD (Fix is working):"
echo "   🔥 [USER_PROFILE] Tenant lookup by owner_id ('17') result: <Tenant: Dottapps>"
echo "   🔥 [USER_PROFILE] Final response data: {...'tenantId': '1234'...}"
echo ""
echo "❌ BAD (Fix not deployed):"
echo "   🔥 [USER_PROFILE] Tenant lookup by owner_id ('17') result: None"
echo "   🔥 [USER_PROFILE] Final response data: {...'tenantId': None...}"
echo ""
echo "📊 You can also check the database directly:"
echo "1. SSH into Render: ssh srv-xxxx@ssh.oregon.render.com"
echo "2. Access Django shell: cd /app/backend/pyfactor && python manage.py shell"
echo "3. Run these commands:"
echo ""
cat << 'EOF'
from custom_auth.models import User, Tenant
user = User.objects.get(email='kdeng@dottapps.com')
print(f"User ID: {user.id} (type: {type(user.id)})")

# Old query (might fail)
tenant_old = Tenant.objects.filter(owner_id=user.id).first()
print(f"Old query result: {tenant_old}")

# Fixed query (should work)
tenant_fixed = Tenant.objects.filter(owner_id=str(user.id)).first()
print(f"Fixed query result: {tenant_fixed}")
EOF
echo ""
echo "The fixed query should return a Tenant object, not None"
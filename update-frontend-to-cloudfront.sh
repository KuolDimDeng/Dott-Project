#!/bin/bash

echo "🔄 Updating Frontend to Use CloudFront API"
echo "========================================="

# Backup current .env.local
cd frontend/pyfactor_next
cp .env.local .env.local.backup_cloudfront_$(date +%Y%m%d_%H%M%S)

echo "📁 Created backup of current .env.local"

# Update API URLs to CloudFront
sed -i.bak 's|BACKEND_API_URL=.*|BACKEND_API_URL=https://api.dottapps.com|' .env.local
sed -i.bak 's|NEXT_PUBLIC_BACKEND_URL=.*|NEXT_PUBLIC_BACKEND_URL=https://api.dottapps.com|' .env.local  
sed -i.bak 's|NEXT_PUBLIC_API_URL=.*|NEXT_PUBLIC_API_URL=https://api.dottapps.com|' .env.local

# Add fallback URL if not exists
if ! grep -q "NEXT_PUBLIC_API_FALLBACK_URL" .env.local; then
    echo "" >> .env.local
    echo "# Backup/Fallback API (Direct EB for emergency)" >> .env.local
    echo "NEXT_PUBLIC_API_FALLBACK_URL=https://DottApp-clean.eba-dua2f3pi.us-east-1.elasticbeanstalk.com" >> .env.local
fi

# Clean up backup files
rm -f .env.local.bak

echo "✅ Updated API URLs to CloudFront:"
echo "   Primary: https://api.dottapps.com"
echo "   Fallback: https://DottApp-clean.eba-dua2f3pi.us-east-1.elasticbeanstalk.com"

echo ""
echo "📊 Current API Configuration:"
grep -E "API_URL|BACKEND" .env.local

echo ""
echo "🚀 Next Steps:"
echo "1. Restart your frontend development server"
echo "2. Test API connections"
echo "3. Deploy to production with CloudFront configuration" 
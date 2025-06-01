#!/bin/bash

# Script to update api.dottapps.com DNS to point to Render backend
set -e

echo "🔄 Updating DNS for api.dottapps.com to point to Render..."

# First, let's find the hosted zone ID for dottapps.com
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='dottapps.com.'].Id" --output text | cut -d'/' -f3)

if [ -z "$HOSTED_ZONE_ID" ]; then
    echo "❌ Could not find hosted zone for dottapps.com"
    echo "Please check your AWS credentials and permissions"
    exit 1
fi

echo "✅ Found hosted zone ID: $HOSTED_ZONE_ID"

# Create the change batch JSON
cat > dns-change.json << EOF
{
    "Comment": "Update api.dottapps.com to point to Render backend",
    "Changes": [
        {
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "api.dottapps.com",
                "Type": "CNAME",
                "TTL": 300,
                "ResourceRecords": [
                    {
                        "Value": "dott-api-y26w.onrender.com"
                    }
                ]
            }
        }
    ]
}
EOF

echo "📝 Created DNS change batch:"
cat dns-change.json

echo ""
echo "🚀 Applying DNS change..."

# Apply the change
CHANGE_ID=$(aws route53 change-resource-record-sets \
    --hosted-zone-id "$HOSTED_ZONE_ID" \
    --change-batch file://dns-change.json \
    --query "ChangeInfo.Id" \
    --output text)

echo "✅ DNS change submitted with ID: $CHANGE_ID"

echo ""
echo "⏳ Waiting for DNS propagation..."
aws route53 wait resource-record-sets-changed --id "$CHANGE_ID"

echo "✅ DNS change completed!"
echo ""
echo "🔍 Verifying new DNS record..."
dig api.dottapps.com

echo ""
echo "🎯 Next steps:"
echo "1. Add 'api.dottapps.com' as custom domain in Render dashboard"
echo "2. Wait 5-15 minutes for SSL certificate provisioning"
echo "3. Test: curl https://api.dottapps.com/health/"

# Cleanup
rm dns-change.json 
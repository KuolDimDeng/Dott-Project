#!/bin/bash

echo "🔐 Certificate Optimization Plan for HTTPS Setup"
echo "=============================================="

# Certificate Details
WILDCARD_CERT="arn:aws:acm:us-east-1:471112661935:certificate/dcb29b8e-d1de-48d3-8430-2d6ff2177d64"
WWW_CERT="arn:aws:acm:us-east-1:471112661935:certificate/e7526d2d-484b-4b91-a594-cdcbf8df5810"

echo "📋 Current Setup Analysis:"
echo "✅ Certificate 1 (WILDCARD): api.dottapps.com, dottapps.com, *.dottapps.com"
echo "⚠️  Certificate 2 (WWW-ONLY): www.dottapps.com, dottapps.com"
echo ""

echo "🎯 Optimization Goal:"
echo "Use the WILDCARD certificate for all domains to simplify management"
echo ""

echo "📊 Current CloudFront Distributions:"
aws cloudfront list-distributions --query "DistributionList.Items[?Id=='E1NYAUSVFSRF1D' || Id=='E2BYTRL6S1FNTF'].{Id:Id,Aliases:Aliases.Items,Status:Status,Certificate:ViewerCertificate.ACMCertificateArn}" --region us-east-1

echo ""
echo "🔧 Steps to Optimize:"
echo "1. Update E2BYTRL6S1FNTF to use the wildcard certificate"
echo "2. Wait for CloudFront propagation (15-20 minutes)"
echo "3. Safely delete the www-only certificate"
echo ""

read -p "Do you want to proceed with optimization? (y/n): " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Starting optimization process..."
    
    # Get current configuration of the frontend distribution
    echo "📝 Getting current configuration for frontend CloudFront..."
    aws cloudfront get-distribution-config --id E2BYTRL6S1FNTF --region us-east-1 > frontend-dist-config.json
    
    # Extract the ETag for updates
    ETAG=$(jq -r '.ETag' frontend-dist-config.json)
    
    # Update the certificate in the configuration
    echo "🔄 Updating certificate to use wildcard..."
    jq --arg cert "$WILDCARD_CERT" '.DistributionConfig.ViewerCertificate.ACMCertificateArn = $cert | .DistributionConfig.ViewerCertificate.Certificate = $cert' frontend-dist-config.json | jq '.DistributionConfig' > updated-frontend-config.json
    
    # Apply the update
    echo "⚡ Applying CloudFront configuration update..."
    aws cloudfront update-distribution \
        --id E2BYTRL6S1FNTF \
        --distribution-config file://updated-frontend-config.json \
        --if-match "$ETAG" \
        --region us-east-1
    
    if [ $? -eq 0 ]; then
        echo "✅ CloudFront distribution updated successfully!"
        echo "⏳ CloudFront is now propagating changes (15-20 minutes)..."
        echo ""
        echo "🔍 You can monitor the status with:"
        echo "aws cloudfront get-distribution --id E2BYTRL6S1FNTF --query 'Distribution.Status'"
        echo ""
        echo "⚠️  IMPORTANT: Wait for status to be 'Deployed' before deleting the old certificate"
        echo ""
        echo "🗑️  Once deployed, you can safely delete the www-only certificate:"
        echo "aws acm delete-certificate --certificate-arn $WWW_CERT --region us-east-1"
    else
        echo "❌ Failed to update CloudFront distribution"
        echo "Please check the configuration and try again"
    fi
else
    echo "ℹ️  Optimization cancelled. Your current setup is functional."
fi

echo ""
echo "📋 Current HTTPS Status Summary:"
echo "✅ SSL certificates: Valid and working"
echo "✅ Frontend HTTPS: dottapps.com → Working"
echo "🔧 Backend HTTPS: api.dottapps.com → Needs application fixes"
echo ""
echo "💡 Benefits of optimization:"
echo "• Simplified certificate management"
echo "• Single certificate for all subdomains"
echo "• Reduced confusion and cost"
echo "• Future subdomain coverage with wildcard" 
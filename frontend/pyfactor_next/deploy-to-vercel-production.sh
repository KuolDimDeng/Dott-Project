#!/bin/bash

# Production Deployment Script for Vercel
# Updated: 2025-05-24T00:10:29.073Z
# Backend URL: https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com

set -e

echo "🚀 Deploying frontend to Vercel with production backend..."

# Verify backend connection first
echo "🔍 Verifying backend connection..."
node verify_backend_connection_fixed.js

if [ $? -eq 0 ]; then
    echo "✅ Backend verified, proceeding with deployment..."
    
    # Deploy to Vercel
    echo "📦 Building and deploying to Vercel..."
    pnpm run build
    
    # Deploy to production
    vercel --prod
    
    echo "🎉 Deployment completed successfully!"
    echo "Frontend: https://www.dottapps.com"
    echo "Backend: https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com"
else
    echo "❌ Backend verification failed. Deployment aborted."
    exit 1
fi

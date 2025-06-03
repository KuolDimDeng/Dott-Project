#!/bin/bash

# Load configuration
source lightsail-config.sh

echo "============================================="
echo " 🚀 DEPLOYING TO LIGHTSAIL"
echo "============================================="

echo "ℹ️  Service Name: $SERVICE_NAME"
echo "ℹ️  Image URI: $IMAGE_URI"
echo "ℹ️  Region: $REGION"

echo ""
echo "🔧 Creating deployment configuration..."

# Create containers.json with environment variables
cat > containers.json << EOF
{
  "dott-backend": {
    "image": "$IMAGE_URI",
    "environment": {
      "SECRET_KEY": "$SECRET_KEY",
      "DJANGO_SETTINGS_MODULE": "pyfactor.settings_eb",
      "PYTHONUNBUFFERED": "1",
      "ALLOWED_HOSTS": "*",
      "CORS_ALLOW_ALL_ORIGINS": "True",
      "RDS_DB_NAME": "dott_main",
      "RDS_USERNAME": "dott_admin",
      "RDS_PASSWORD": "RRfXU6uPPUbBEg1JqGTJ",
      "RDS_HOSTNAME": "dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com",
      "RDS_PORT": "5432",
      "AWS_DEFAULT_REGION": "us-east-1",
      "AWS_COGNITO_USER_POOL_ID": "us-east-1_JPL8vGfb6",
      "AWS_COGNITO_CLIENT_ID": "1o5v84mrgn4gt87khtr179uc5b",
      "AWS_COGNITO_DOMAIN": "pyfactor-dev.auth.us-east-1.amazoncognito.com",
      "REDIS_HOST": "127.0.0.1",
      "REDIS_PORT": "6379"
    },
    "ports": {
      "8000": "HTTP"
    }
  }
}
EOF

# Create public-endpoint.json
cat > public-endpoint.json << EOF
{
  "containerName": "dott-backend",
  "containerPort": 8000,
  "healthCheck": {
    "healthyThreshold": 2,
    "unhealthyThreshold": 2,
    "timeoutSeconds": 5,
    "intervalSeconds": 30,
    "path": "/health/",
    "successCodes": "200"
  }
}
EOF

echo "📋 Configuration files created:"
echo "  - containers.json (container configuration)"
echo "  - public-endpoint.json (load balancer configuration)"

echo ""
echo "🚀 Deploying to Lightsail..."

# Deploy the container
aws lightsail create-container-service-deployment \
    --service-name "$SERVICE_NAME" \
    --containers file://containers.json \
    --public-endpoint file://public-endpoint.json \
    --region "$REGION"

if [ $? -eq 0 ]; then
    echo "✅ Deployment initiated successfully!"
    
    echo ""
    echo "============================================="
    echo " 📊 DEPLOYMENT STATUS"
    echo "============================================="
    echo "The deployment is now in progress..."
    echo "This typically takes 3-5 minutes."
    
    echo ""
    echo "🔍 Monitor deployment:"
    echo "./monitor-lightsail.sh"
    
    echo ""
    echo "🌐 Once deployed, your app will be available at:"
    echo "https://$SERVICE_URL"
    echo "Health check: https://$SERVICE_URL/health/"
    
    echo ""
    echo "============================================="
    echo " 💰 COST INFORMATION"
    echo "============================================="
    echo "Monthly cost: ~$20 (medium power)"
    echo "Includes: 1 vCPU, 2GB RAM, load balancer, SSL certificate"
    
    # Clean up temporary files
    rm -f containers.json public-endpoint.json
    
else
    echo "❌ Deployment failed"
    echo "Check the configuration files and try again."
    exit 1
fi 
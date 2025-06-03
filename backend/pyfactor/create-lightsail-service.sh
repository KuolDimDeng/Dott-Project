#!/bin/bash

echo "============================================="
echo " 🚀 CREATING LIGHTSAIL CONTAINER SERVICE"
echo "============================================="

SERVICE_NAME="dott-backend-v2"
REGION="us-east-1"
POWER="medium"  # nano, micro, small, medium, large, xlarge
SCALE=1         # Number of instances

# Generate a strong SECRET_KEY for Django
SECRET_KEY=$(python3 -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())")

echo "ℹ️  Service Name: $SERVICE_NAME"
echo "ℹ️  Region: $REGION"
echo "ℹ️  Power: $POWER (1 vCPU, 2GB RAM)"
echo "ℹ️  Scale: $SCALE instance(s)"
echo "ℹ️  Monthly Cost: ~$20/month"
echo "ℹ️  Generated Django SECRET_KEY"

echo ""
echo "🔧 Creating Lightsail container service..."

# Create the container service
aws lightsail create-container-service \
    --service-name "$SERVICE_NAME" \
    --power "$POWER" \
    --scale $SCALE \
    --region "$REGION"

if [ $? -eq 0 ]; then
    echo "✅ Lightsail container service created successfully!"
    
    echo ""
    echo "⏳ Waiting for service to be ready (this takes ~2-3 minutes)..."
    
    # Wait for service to be ready
    while true; do
        STATUS=$(aws lightsail get-container-services --service-name "$SERVICE_NAME" --region "$REGION" --query 'containerServices[0].state' --output text 2>/dev/null)
        
        if [ "$STATUS" = "READY" ]; then
            echo "✅ Service is ready!"
            break
        elif [ "$STATUS" = "FAILED" ]; then
            echo "❌ Service creation failed!"
            exit 1
        else
            echo "⏳ Status: $STATUS"
            sleep 30
        fi
    done
    
    # Get service details
    SERVICE_URL=$(aws lightsail get-container-services --service-name "$SERVICE_NAME" --region "$REGION" --query 'containerServices[0].url' --output text)
    
    echo ""
    echo "============================================="
    echo " 📋 SERVICE DETAILS"
    echo "============================================="
    echo "Service Name: $SERVICE_NAME"
    echo "Service URL: https://$SERVICE_URL"
    echo "Power: $POWER"
    echo "Scale: $SCALE"
    echo "Region: $REGION"
    
    echo ""
    echo "============================================="
    echo " 🎯 NEXT STEPS"
    echo "============================================="
    echo "1. Push your Docker image: ./push-to-lightsail.sh"
    echo "2. Deploy container: ./deploy-to-lightsail.sh"
    echo "3. Monitor deployment: ./monitor-lightsail.sh"
    
    echo ""
    echo "============================================="
    echo " 🔗 USEFUL LINKS"
    echo "============================================="
    echo "Lightsail Console: https://lightsail.aws.amazon.com/ls/webapp/home/containers"
    echo "Cost: ~$20/month for medium power"
    
    # Save service details for other scripts
    echo "SERVICE_NAME=\"$SERVICE_NAME\"" > lightsail-config.sh
    echo "REGION=\"$REGION\"" >> lightsail-config.sh
    echo "SECRET_KEY=\"$SECRET_KEY\"" >> lightsail-config.sh
    echo "SERVICE_URL=\"$SERVICE_URL\"" >> lightsail-config.sh
    
    echo ""
    echo "✅ Configuration saved to lightsail-config.sh"
    
else
    echo "❌ Failed to create Lightsail container service"
    exit 1
fi 
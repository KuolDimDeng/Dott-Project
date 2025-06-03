#!/bin/bash

# Load configuration
source lightsail-config.sh

echo "============================================="
echo " 📦 PUSHING DOCKER IMAGE TO LIGHTSAIL"
echo "============================================="

IMAGE_NAME="dott-lightsail"
IMAGE_TAG="v1"

echo "ℹ️  Service Name: $SERVICE_NAME"
echo "ℹ️  Image: $IMAGE_NAME:$IMAGE_TAG"
echo "ℹ️  Region: $REGION"

echo ""
echo "🔧 Pushing image to Lightsail container registry..."

# Push the image to Lightsail
aws lightsail push-container-image \
    --service-name "$SERVICE_NAME" \
    --label "$IMAGE_TAG" \
    --image "$IMAGE_NAME:$IMAGE_TAG" \
    --region "$REGION"

if [ $? -eq 0 ]; then
    echo "✅ Docker image pushed successfully!"
    
    # Get the image URI for deployment
    IMAGE_URI=$(aws lightsail get-container-images --service-name "$SERVICE_NAME" --region "$REGION" --query 'containerImages[0].image' --output text)
    
    echo ""
    echo "📋 Image Details:"
    echo "Image URI: $IMAGE_URI"
    
    # Save image URI to config
    echo "IMAGE_URI=\"$IMAGE_URI\"" >> lightsail-config.sh
    
    echo ""
    echo "🎯 Next Step: Deploy the container"
    echo "Run: ./deploy-to-lightsail.sh"
    
else
    echo "❌ Failed to push Docker image"
    echo ""
    echo "💡 Make sure you have built the image first:"
    echo "docker build -t $IMAGE_NAME:$IMAGE_TAG ."
    exit 1
fi 
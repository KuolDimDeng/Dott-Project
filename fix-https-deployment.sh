#!/bin/bash

echo "🔧 Fixing HTTPS environment deployment issue..."

WORKING_ENV="Dott-env-fixed"
HTTPS_ENV="Dott-env-https-final"
REGION="us-east-1"

echo "📋 Getting working environment configuration..."

# Get all environment variables from working environment
aws elasticbeanstalk describe-configuration-settings \
    --application-name "Dott" \
    --environment-name "$WORKING_ENV" \
    --region "$REGION" \
    --query 'ConfigurationSettings[0].OptionSettings[?Namespace==`aws:elasticbeanstalk:application:environment`]' \
    > working-env-vars.json

echo "🔄 Applying working configuration to HTTPS environment..."

# Apply the working environment variables to HTTPS environment
aws elasticbeanstalk update-environment \
    --environment-name "$HTTPS_ENV" \
    --option-settings file://working-env-vars.json \
    --region "$REGION"

echo "⏳ Environment update initiated. This will take 5-10 minutes..."
echo ""
echo "📊 Monitor progress:"
echo "1. AWS Console: https://console.aws.amazon.com/elasticbeanstalk/home?region=us-east-1#/environment/dashboard?environmentId=$HTTPS_ENV"
echo "2. Check health status changes"
echo ""
echo "✅ Once health shows 'Ok', test:"
echo "curl https://Dott-env-https-final.eba-yek4sdqp.us-east-1.elasticbeanstalk.com/health/"

# Cleanup
rm -f working-env-vars.json 
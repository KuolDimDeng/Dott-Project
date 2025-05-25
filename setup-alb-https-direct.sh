#!/bin/bash

# Cost-Effective Long-term HTTPS Solution: Application Load Balancer
# More cost-effective than CloudFront for typical SaaS applications

set -e

echo "🚀 Setting up Application Load Balancer with HTTPS (Cost-Effective)"
echo "=================================================================="

# Configuration
CERT_ARN="arn:aws:acm:us-east-1:471112661935:certificate/e7526d2d-484b-4b91-a594-cdcbf8df5810"
REGION="us-east-1"

echo "📋 Cost Analysis:"
echo "• ALB: ~$16-20/month (vs CloudFront: $6-16/month + complexity)"
echo "• No data transfer costs within region"
echo "• Simpler architecture, easier maintenance"
echo "• Professional SSL termination"
echo ""

# Get VPC and subnet information from existing environment
echo "🔍 Getting VPC configuration from working environment..."
VPC_ID=$(aws elasticbeanstalk describe-environment-resources \
  --environment-name "Dott-env-fixed" \
  --region "$REGION" \
  --query 'EnvironmentResources.Instances[0].Id' \
  --output text)

# Get VPC ID from instance
VPC_ID=$(aws ec2 describe-instances \
  --instance-ids "$VPC_ID" \
  --region "$REGION" \
  --query 'Reservations[0].Instances[0].VpcId' \
  --output text)

# Get public subnets
SUBNET_IDS=$(aws ec2 describe-subnets \
  --filters "Name=vpc-id,Values=$VPC_ID" "Name=map-public-ip-on-launch,Values=true" \
  --region "$REGION" \
  --query 'Subnets[*].SubnetId' \
  --output text)

echo "✅ Found VPC: $VPC_ID"
echo "✅ Found subnets: $SUBNET_IDS"

# Create security group for ALB
echo "🔒 Creating security group for ALB..."
ALB_SG_ID=$(aws ec2 create-security-group \
  --group-name "dott-api-alb-sg" \
  --description "Security group for Dott API ALB" \
  --vpc-id "$VPC_ID" \
  --region "$REGION" \
  --query 'GroupId' \
  --output text)

# Add rules to security group
aws ec2 authorize-security-group-ingress \
  --group-id "$ALB_SG_ID" \
  --protocol tcp \
  --port 80 \
  --cidr 0.0.0.0/0 \
  --region "$REGION"

aws ec2 authorize-security-group-ingress \
  --group-id "$ALB_SG_ID" \
  --protocol tcp \
  --port 443 \
  --cidr 0.0.0.0/0 \
  --region "$REGION"

echo "✅ Security group created: $ALB_SG_ID"

# Create Application Load Balancer
echo "⚖️ Creating Application Load Balancer..."
ALB_ARN=$(aws elbv2 create-load-balancer \
  --name "dott-api-alb" \
  --subnets $SUBNET_IDS \
  --security-groups "$ALB_SG_ID" \
  --scheme internet-facing \
  --type application \
  --ip-address-type ipv4 \
  --region "$REGION" \
  --query 'LoadBalancers[0].LoadBalancerArn' \
  --output text)

# Get ALB DNS name
ALB_DNS=$(aws elbv2 describe-load-balancers \
  --load-balancer-arns "$ALB_ARN" \
  --region "$REGION" \
  --query 'LoadBalancers[0].DNSName' \
  --output text)

echo "✅ ALB created: $ALB_DNS"

# Get target group from existing environment
echo "🎯 Getting target group from existing environment..."
EXISTING_TG_ARN=$(aws elasticbeanstalk describe-environment-resources \
  --environment-name "Dott-env-fixed" \
  --region "$REGION" \
  --query 'EnvironmentResources.LoadBalancers[0].Name' \
  --output text)

# Get the actual target group
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups \
  --load-balancer-arn "$EXISTING_TG_ARN" \
  --region "$REGION" \
  --query 'TargetGroups[0].TargetGroupArn' \
  --output text 2>/dev/null || echo "")

if [ -z "$TARGET_GROUP_ARN" ]; then
  echo "📝 Creating new target group..."
  # Create target group pointing to existing backend
  TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
    --name "dott-api-targets" \
    --protocol HTTP \
    --port 80 \
    --vpc-id "$VPC_ID" \
    --health-check-protocol HTTP \
    --health-check-path "/health/" \
    --health-check-interval-seconds 30 \
    --health-check-timeout-seconds 5 \
    --healthy-threshold-count 2 \
    --unhealthy-threshold-count 3 \
    --region "$REGION" \
    --query 'TargetGroups[0].TargetGroupArn' \
    --output text)
  
  # Register the existing backend as a target (by IP)
  BACKEND_IP=$(nslookup dott-env-fixed.eba-yek4sdqp.us-east-1.elasticbeanstalk.com | awk '/^Address: / { print $2 }' | tail -1)
  
  aws elbv2 register-targets \
    --target-group-arn "$TARGET_GROUP_ARN" \
    --targets Id="$BACKEND_IP",Port=80 \
    --region "$REGION"
fi

echo "✅ Target group ready: $TARGET_GROUP_ARN"

# Create HTTPS listener
echo "🔒 Creating HTTPS listener..."
aws elbv2 create-listener \
  --load-balancer-arn "$ALB_ARN" \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn="$CERT_ARN" \
  --default-actions Type=forward,TargetGroupArn="$TARGET_GROUP_ARN" \
  --region "$REGION"

# Create HTTP listener (redirect to HTTPS)
echo "🔀 Creating HTTP redirect listener..."
aws elbv2 create-listener \
  --load-balancer-arn "$ALB_ARN" \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
  --region "$REGION"

echo "✅ Listeners created!"

# Setup DNS
echo "🌐 Setting up DNS for api.dottapps.com..."
HOSTED_ZONE_ID=$(aws route53 list-hosted-zones \
  --query 'HostedZones[?Name==`dottapps.com.`].Id' \
  --output text | cut -d'/' -f3)

if [ -n "$HOSTED_ZONE_ID" ]; then
  # Create Route 53 record
  cat > route53-alb-record.json << EOF
{
  "Changes": [
    {
      "Action": "UPSERT",
      "ResourceRecordSet": {
        "Name": "api.dottapps.com",
        "Type": "CNAME",
        "TTL": 300,
        "ResourceRecords": [
          {
            "Value": "$ALB_DNS"
          }
        ]
      }
    }
  ]
}
EOF

  aws route53 change-resource-record-sets \
    --hosted-zone-id "$HOSTED_ZONE_ID" \
    --change-batch file://route53-alb-record.json
  
  rm -f route53-alb-record.json
  echo "✅ DNS record created!"
else
  echo "📝 Manual DNS setup required:"
  echo "Create CNAME: api.dottapps.com → $ALB_DNS"
fi

echo ""
echo "🎉 Cost-Effective HTTPS Setup Complete!"
echo "======================================"
echo ""
echo "📊 Your Setup:"
echo "• Application Load Balancer: $ALB_DNS"
echo "• HTTPS URL: https://api.dottapps.com"
echo "• Monthly Cost: ~$16-20 (vs $6-16 CloudFront + complexity)"
echo "• SSL Certificate: ✅ Configured"
echo "• HTTP→HTTPS Redirect: ✅ Enabled"
echo ""
echo "⏳ Ready in 2-3 minutes (vs 10-20 min for CloudFront)"
echo ""
echo "🧪 Test when ready:"
echo "curl https://api.dottapps.com/health/"
echo ""
echo "✅ This is the most cost-effective production solution!" 
#!/bin/bash

echo "============================================="
echo " 🚀 DEPLOYING TO AWS FARGATE (ECS)"
echo "============================================="

CLUSTER_NAME="dott-cluster"
SERVICE_NAME="dott-backend-service"
TASK_DEFINITION="dott-backend-task"
REGION="us-east-1"
ECR_IMAGE="471112661935.dkr.ecr.us-east-1.amazonaws.com/dott-backend:latest"

echo "ℹ️  Cluster: $CLUSTER_NAME"
echo "ℹ️  Service: $SERVICE_NAME"
echo "ℹ️  Task Definition: $TASK_DEFINITION"
echo "ℹ️  Image: $ECR_IMAGE"
echo "ℹ️  Region: $REGION"

echo ""
echo "🔧 Step 1: Creating ECS Cluster..."

# Create ECS cluster
aws ecs create-cluster \
    --cluster-name "$CLUSTER_NAME" \
    --capacity-providers FARGATE \
    --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
    --region "$REGION"

echo ""
echo "🔧 Step 2: Creating Task Definition..."

# Create task definition JSON
cat > task-definition.json << EOF
{
  "family": "$TASK_DEFINITION",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::471112661935:role/ecsTaskExecutionRole",
  "containerDefinitions": [
    {
      "name": "dott-backend",
      "image": "$ECR_IMAGE",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "essential": true,
      "environment": [
        {
          "name": "SECRET_KEY",
          "value": "django-insecure-fargate-deployment-key-$(date +%s)"
        },
        {
          "name": "DJANGO_SETTINGS_MODULE",
          "value": "pyfactor.settings_eb"
        },
        {
          "name": "PYTHONUNBUFFERED",
          "value": "1"
        },
        {
          "name": "ALLOWED_HOSTS",
          "value": "*"
        },
        {
          "name": "CORS_ALLOW_ALL_ORIGINS",
          "value": "True"
        },
        {
          "name": "RDS_DB_NAME",
          "value": "dott_main"
        },
        {
          "name": "RDS_USERNAME",
          "value": "dott_admin"
        },
        {
          "name": "RDS_PASSWORD",
          "value": "RRfXU6uPPUbBEg1JqGTJ"
        },
        {
          "name": "RDS_HOSTNAME",
          "value": "dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com"
        },
        {
          "name": "RDS_PORT",
          "value": "5432"
        },
        {
          "name": "AWS_DEFAULT_REGION",
          "value": "us-east-1"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/dott-backend",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
EOF

# Create CloudWatch log group
aws logs create-log-group \
    --log-group-name "/ecs/dott-backend" \
    --region "$REGION" 2>/dev/null || echo "Log group already exists"

# Register task definition
TASK_DEF_ARN=$(aws ecs register-task-definition \
    --cli-input-json file://task-definition.json \
    --region "$REGION" \
    --query 'taskDefinition.taskDefinitionArn' \
    --output text)

echo "✅ Task definition registered: $TASK_DEF_ARN"

echo ""
echo "🔧 Step 3: Creating ECS Service..."

# Get default VPC and subnets
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text --region "$REGION")
SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[*].SubnetId' --output text --region "$REGION")
SUBNET_1=$(echo $SUBNET_IDS | cut -d' ' -f1)
SUBNET_2=$(echo $SUBNET_IDS | cut -d' ' -f2)

echo "ℹ️  VPC: $VPC_ID"
echo "ℹ️  Subnets: $SUBNET_1, $SUBNET_2"

# Create security group
SECURITY_GROUP_ID=$(aws ec2 create-security-group \
    --group-name "dott-backend-sg" \
    --description "Security group for Dott backend" \
    --vpc-id "$VPC_ID" \
    --region "$REGION" \
    --query 'GroupId' \
    --output text 2>/dev/null || \
    aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=dott-backend-sg" "Name=vpc-id,Values=$VPC_ID" \
    --query 'SecurityGroups[0].GroupId' \
    --output text \
    --region "$REGION")

# Add inbound rule for port 8000
aws ec2 authorize-security-group-ingress \
    --group-id "$SECURITY_GROUP_ID" \
    --protocol tcp \
    --port 8000 \
    --cidr 0.0.0.0/0 \
    --region "$REGION" 2>/dev/null || echo "Security group rule already exists"

echo "ℹ️  Security Group: $SECURITY_GROUP_ID"

# Create ECS service
aws ecs create-service \
    --cluster "$CLUSTER_NAME" \
    --service-name "$SERVICE_NAME" \
    --task-definition "$TASK_DEFINITION" \
    --desired-count 1 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_1,$SUBNET_2],securityGroups=[$SECURITY_GROUP_ID],assignPublicIp=ENABLED}" \
    --region "$REGION"

echo ""
echo "✅ Fargate service created successfully!"

echo ""
echo "🔧 Step 4: Getting service details..."

# Wait a moment for service to initialize
sleep 10

# Get service details
SERVICE_ARN=$(aws ecs describe-services \
    --cluster "$CLUSTER_NAME" \
    --services "$SERVICE_NAME" \
    --region "$REGION" \
    --query 'services[0].serviceArn' \
    --output text)

echo ""
echo "============================================="
echo " 📋 DEPLOYMENT DETAILS"
echo "============================================="
echo "Cluster: $CLUSTER_NAME"
echo "Service: $SERVICE_NAME"
echo "Service ARN: $SERVICE_ARN"
echo "Task Definition: $TASK_DEFINITION"
echo "Region: $REGION"

echo ""
echo "============================================="
echo " 🎯 NEXT STEPS"
echo "============================================="
echo "1. Monitor deployment: ./monitor-fargate.sh"
echo "2. Get public IP: aws ecs describe-tasks --cluster $CLUSTER_NAME --tasks \$(aws ecs list-tasks --cluster $CLUSTER_NAME --service-name $SERVICE_NAME --query 'taskArns[0]' --output text) --query 'tasks[0].attachments[0].details[?name==\`networkInterfaceId\`].value' --output text | xargs -I {} aws ec2 describe-network-interfaces --network-interface-ids {} --query 'NetworkInterfaces[0].Association.PublicIp' --output text"

echo ""
echo "============================================="
echo " 💰 COST INFORMATION"
echo "============================================="
echo "Monthly cost: ~\$15-25 (Fargate pricing)"
echo "Includes: 0.5 vCPU, 1GB RAM, networking"

echo ""
echo "🌐 ECS Console: https://console.aws.amazon.com/ecs/home?region=$REGION#/clusters/$CLUSTER_NAME/services"

# Clean up temporary files
rm -f task-definition.json

# Save configuration
echo "CLUSTER_NAME=\"$CLUSTER_NAME\"" > fargate-config.sh
echo "SERVICE_NAME=\"$SERVICE_NAME\"" >> fargate-config.sh
echo "TASK_DEFINITION=\"$TASK_DEFINITION\"" >> fargate-config.sh
echo "REGION=\"$REGION\"" >> fargate-config.sh
echo "SECURITY_GROUP_ID=\"$SECURITY_GROUP_ID\"" >> fargate-config.sh

echo ""
echo "✅ Configuration saved to fargate-config.sh" 
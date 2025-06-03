# 🚀 Elastic Beanstalk to App Runner Migration Guide

This guide will help you migrate your Django application from AWS Elastic Beanstalk to AWS App Runner.

## 📋 Prerequisites

### Required Tools
- [x] AWS CLI configured with proper credentials
- [x] Docker Desktop installed and running
- [x] Your Django application with Dockerfile

### Current Status
- [x] ECR Repository created: `471112661935.dkr.ecr.us-east-1.amazonaws.com/dott-backend`
- [x] Failed App Runner service deleted
- [x] Deployment scripts prepared

## 🏗️ Step 1: Start Docker Desktop

**Action Required:** Start Docker Desktop on your Mac before proceeding.

```bash
# Verify Docker is running
docker ps
```

## 🐳 Step 2: Build and Push Docker Image

Once Docker is running, execute the deployment script:

```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
./deploy-to-apprunner.sh
```

This script will:
- ✅ Authenticate with ECR
- ✅ Build your Django Docker image
- ✅ Tag and push to ECR repository
- ✅ Verify the image upload

## 🏃 Step 3: Create App Runner Service

### Option A: Using AWS Console (Recommended)

1. **Navigate to App Runner Console**
   - Go to [AWS App Runner Console](https://console.aws.amazon.com/apprunner/)
   - Click "Create service"

2. **Configure Source**
   - Source: **Container registry**
   - Provider: **Amazon ECR**
   - Container image URI: `471112661935.dkr.ecr.us-east-1.amazonaws.com/dott-backend:latest`
   - Deployment trigger: **Manual**

3. **Configure Service**
   - Service name: `dott-backend`
   - Virtual CPU: **1 vCPU**
   - Memory: **2 GB**
   - Port: **8000**
   - Start command: `/app/start.sh`

4. **Environment Variables**
   Add these exact environment variables:
   ```
   ALLOWED_HOSTS = *
   CORS_ALLOW_ALL_ORIGINS = True
   CORS_ALLOW_CREDENTIALS = True
   DATABASE_HOST = dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com
   DATABASE_NAME = dott_main
   DATABASE_PASSWORD = RRfXU6uPPUbBEg1JqGTJ
   DATABASE_PORT = 5432
   DATABASE_URL = postgresql://dott_admin:RRfXU6uPPUbBEg1JqGTJ@dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com:5432/dott_main
   DATABASE_USER = dott_admin
   DEBUG = False
   DJANGO_SETTINGS_MODULE = pyfactor.settings_eb
   PORT = 8000
   PYTHONPATH = /app
   PYTHONUNBUFFERED = 1
   SECRET_KEY = t+3=29ifzne^^$626vnvq7w5f&ky7g%54=ca^q3$!#v&%ubjib
   ```

5. **Auto Scaling**
   - Concurrency: **100**
   - Min size: **1**
   - Max size: **25**

6. **Health Check**
   - Protocol: **HTTP**
   - Path: `/health/`
   - Interval: **10 seconds**
   - Timeout: **5 seconds**
   - Healthy threshold: **1**
   - Unhealthy threshold: **5**

7. **Security & Networking**
   - Instance role: `arn:aws:iam::471112661935:role/AppRunnerInstanceRole`
   - VPC connector: `dott-vpc-connector` (for database access)
   - Public endpoint: **Yes**

### Option B: Using AWS CLI

```bash
# Create service using the prepared configuration
aws apprunner create-service \
  --cli-input-json file://apprunner-service-config.json \
  --region us-east-1
```

## 🔍 Step 4: Monitor Deployment

### Check Service Status
```bash
aws apprunner list-services --region us-east-1
```

### View Logs
- Go to AWS CloudWatch Console
- Navigate to Log Groups
- Find `/aws/apprunner/dott-backend` logs

### Test Health Endpoint
Once the service is running:
```bash
curl https://your-app-runner-url.us-east-1.awsapprunner.com/health/
```

## 🔧 Step 5: Update Frontend Configuration

Update your frontend to point to the new App Runner endpoint:

1. **Find your App Runner URL**
   ```bash
   aws apprunner describe-service \
     --service-arn $(aws apprunner list-services --region us-east-1 --query "ServiceSummaryList[?ServiceName=='dott-backend'].ServiceArn" --output text) \
     --region us-east-1 \
     --query 'Service.ServiceUrl' \
     --output text
   ```

2. **Update Frontend Environment Variables**
   - Replace Elastic Beanstalk URLs with App Runner URL
   - Update CORS settings if needed

## 🗑️ Step 6: Clean Up Elastic Beanstalk (Optional)

Once App Runner is working properly:

1. **Terminate Elastic Beanstalk Environment**
   ```bash
   eb terminate your-environment-name
   ```

2. **Delete Application**
   ```bash
   eb delete-application your-app-name
   ```

## 📊 Comparison: Beanstalk vs App Runner

| Feature | Elastic Beanstalk | App Runner |
|---------|-------------------|------------|
| **Deployment** | ZIP/WAR files | Container images |
| **Scaling** | Manual/Auto based on metrics | Automatic based on requests |
| **Configuration** | Complex (.ebextensions) | Simple (environment variables) |
| **Maintenance** | EC2 instance management | Fully managed |
| **Cost** | EC2 + Load Balancer costs | Pay per request + compute |
| **Cold Starts** | Minimal | May have cold starts |
| **VPC Support** | Native | Via VPC Connector |

## ⚡ Benefits of App Runner

- **Simplified Deployment**: Just push container images
- **Automatic Scaling**: No configuration needed
- **Reduced Costs**: Pay only for actual usage
- **Less Maintenance**: No server management
- **Faster Deployments**: Container-based deployments
- **Built-in Security**: HTTPS by default

## 🚨 Troubleshooting

### Common Issues

1. **ECR Image Not Found**
   ```bash
   # Verify image exists
   aws ecr describe-images --repository-name dott-backend --region us-east-1
   ```

2. **Health Check Failures**
   - Ensure `/health/` endpoint returns 200 status
   - Check application logs in CloudWatch

3. **Database Connection Issues**
   - Verify VPC connector configuration
   - Check security group rules for RDS

4. **Environment Variable Issues**
   - Double-check all environment variables
   - Ensure no extra spaces or special characters

### Debug Commands

```bash
# Check service status
aws apprunner describe-service --service-arn YOUR_SERVICE_ARN --region us-east-1

# View recent operations
aws apprunner list-operations --service-arn YOUR_SERVICE_ARN --region us-east-1

# Check ECR image details
aws ecr describe-images --repository-name dott-backend --region us-east-1
```

## 📝 Next Steps

1. ✅ Complete the Docker image build and push
2. ✅ Create App Runner service via Console
3. ✅ Test the application thoroughly
4. ✅ Update frontend configuration
5. ✅ Monitor performance and costs
6. ⭕ Clean up Elastic Beanstalk resources

## 🎉 Success Indicators

- [ ] App Runner service status: **RUNNING**
- [ ] Health check: **HEALTHY**
- [ ] Application accessible via App Runner URL
- [ ] Database connections working
- [ ] Frontend successfully connecting to backend
- [ ] All core functionality operational

---

**Need Help?** Check the troubleshooting section or AWS App Runner documentation. 
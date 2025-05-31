# AWS App Runner Deployment Guide for Dott Backend

## 🚀 Complete Migration from Elastic Beanstalk to App Runner

### Phase 1: Build and Push Docker Image (Run Locally)

**Prerequisites**: Docker installed on your local machine

```bash
# Navigate to your project
cd /Users/kuoldeng/projectx

# Run the deployment script
./deploy-to-apprunner.sh
```

This script will:
1. ✅ Authenticate Docker with Amazon ECR
2. ✅ Build your Django Docker image
3. ✅ Tag and push to ECR repository: `471112661935.dkr.ecr.us-east-1.amazonaws.com/dott-backend:latest`

### Phase 2: Setup App Runner Service

```bash
# Run the complete App Runner setup
./setup-apprunner.sh
```

This script will:
1. ✅ Create IAM roles for App Runner
2. ✅ Create VPC connector for database access
3. ✅ Create App Runner service with all configurations
4. ✅ Wait for service to be ready
5. ✅ Return your application URL

## 📋 What's Configured

### 🌐 **Network Configuration**
- **VPC**: Connected to your existing VPC (`vpc-0564a66b550c7063e`)
- **Subnets**: Uses your RDS subnets for database access
- **Security**: Automatic security group configuration

### 🔧 **Service Configuration**
- **CPU**: 1 vCPU
- **Memory**: 2 GB
- **Port**: 8000
- **Health Check**: `/health/` endpoint
- **Auto Scaling**: 1-10 instances based on traffic

### 🔑 **Environment Variables** (All Set Automatically)
```
DJANGO_SETTINGS_MODULE=pyfactor.settings_eb
PYTHONUNBUFFERED=1
PORT=8000
ALLOWED_HOSTS=*
DEBUG=False
SECRET_KEY=t+3=29ifzne^^$626vnvq7w5f&ky7g%54=ca^q3$!#v&%ubjib
DATABASE_URL=postgresql://dott_admin:RRfXU6uPPUbBEg1JqGTJ@dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com:5432/dott_main
DATABASE_HOST=dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com
DATABASE_NAME=dott_main
DATABASE_USER=dott_admin
DATABASE_PASSWORD=RRfXU6uPPUbBEg1JqGTJ
DATABASE_PORT=5432
CORS_ALLOW_ALL_ORIGINS=True
CORS_ALLOW_CREDENTIALS=True
```

## 🆚 Comparison: What You're Gaining

| Feature | Elastic Beanstalk | App Runner |
|---------|------------------|------------|
| **Setup Time** | ❌ Hours/Days | ✅ 15 minutes |
| **Configuration Files** | ❌ Multiple complex files | ✅ Single apprunner.yaml |
| **Troubleshooting** | ❌ Very difficult | ✅ Clear logs & errors |
| **Deployment Speed** | ❌ 5-10 minutes | ✅ 2-3 minutes |
| **Auto HTTPS** | ❌ Manual ALB setup | ✅ Automatic |
| **Auto Scaling** | ⚠️ Manual configuration | ✅ Built-in |
| **Cost when idle** | ❌ Always running | ✅ Scales to zero |

## 🎯 Expected Results

After successful deployment:

1. **🌐 Your App URL**: `https://random-string.us-east-1.awsapprunner.com`
2. **🏥 Health Check**: `https://your-url/health/` (should return JSON)
3. **📊 Admin Panel**: `https://your-url/admin/`
4. **🔗 API Endpoints**: All your existing endpoints work immediately

## 🔄 How to Deploy Updates

```bash
# 1. Make your code changes
# 2. Build and push new image
./deploy-to-apprunner.sh

# 3. Trigger deployment
aws apprunner start-deployment --service-arn YOUR_SERVICE_ARN --region us-east-1
```

## 📱 Monitoring Your Service

1. **AWS Console**: https://console.aws.amazon.com/apprunner/home?region=us-east-1
2. **CloudWatch Logs**: Automatic log streaming
3. **Metrics**: CPU, Memory, Request count automatically tracked

## 🛠️ Troubleshooting

### If the script fails:
1. **Check AWS CLI**: `aws sts get-caller-identity`
2. **Check Permissions**: Ensure your AWS user has App Runner permissions
3. **Check VPC**: Ensure your VPC and subnets exist

### If the service is unhealthy:
1. **Check Logs**: App Runner console → Service → Logs
2. **Check Health Endpoint**: Ensure `/health/` returns 200 OK
3. **Check Environment Variables**: Verify database connection

## 💰 Cost Estimation

- **App Runner**: ~$30-60/month
- **ECR Storage**: ~$1-2/month
- **Data Transfer**: Minimal

**Total**: ~$35-65/month (scales with usage)

## 🎉 Benefits You'll Experience

1. **✅ No more configuration hell** - Single YAML file
2. **✅ Faster deployments** - 2-3 minutes vs 10+ minutes
3. **✅ Better error messages** - Clear logs and debugging
4. **✅ Automatic HTTPS** - No certificate management
5. **✅ Cost optimization** - Scales down when not used
6. **✅ Zero maintenance** - No EC2 instances to manage

## 🚨 Important Notes

1. **Run Phase 1 locally** - Requires Docker on your machine
2. **Phase 2 can run anywhere** - Uses AWS CLI only
3. **Backup your data** - Although we're not changing the database
4. **Test thoroughly** - Verify all endpoints work after migration

Your Django application will be much more reliable and easier to manage with App Runner! 🚀
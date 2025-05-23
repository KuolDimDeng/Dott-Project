# 🚀 Dott API Gateway Deployment Guide

**Complete setup for Dott application with AWS API Gateway and Cognito integration**

Created: 2025-05-22  
Last Updated: 2025-05-22  
Application: **Dott** (formerly PyFactor)  

---

## 📋 Overview

This guide walks you through deploying AWS API Gateway for the **Dott** application, providing centralized authentication, rate limiting, and secure API access for your Next.js frontend and Django backend.

### 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   API Gateway   │    │   Backend       │
│   (Next.js)     │◄──►│   + Cognito     │◄──►│   (Django)      │
│                 │    │   Authorization │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### ✨ Features Included

- **🔐 Cognito Authorization**: All endpoints protected with JWT tokens
- **🎯 Payroll API Routes**: `/payroll/reports`, `/payroll/run`, `/payroll/export-report`, `/payroll/settings`
- **🏢 Business API Proxy**: Routes to Django backend at `https://api.dottapps.com`
- **📝 Onboarding API Proxy**: Complete user onboarding flow
- **⚡ Rate Limiting**: 50 req/sec burst, 100 req burst limit, 10K daily quota
- **🌐 CORS Support**: Proper headers for web application
- **📊 Usage Analytics**: Built-in AWS API monitoring

---

## 🛠️ Prerequisites

### Required Tools
```bash
# AWS CLI v2
aws --version  # Should be 2.x.x

# jq for JSON processing
brew install jq  # macOS
```

### AWS Configuration
```bash
# Configure AWS credentials
aws configure

# Verify access
aws sts get-caller-identity
```

### Environment Variables
```bash
# Set these in your shell or .bashrc/.zshrc
export AWS_REGION="us-east-1"
export COGNITO_USER_POOL_ID="us-east-1_JPL8vGfb6"  # Dott's Cognito User Pool
export DJANGO_BACKEND_URL="https://api.dottapps.com"
export NEXTJS_API_URL="https://your-nextjs-deployment.vercel.app"
```

---

## 🚀 Deployment Steps

### Step 1: Deploy API Gateway

```bash
# Navigate to frontend directory
cd frontend/pyfactor_next

# Make deployment script executable
chmod +x deploy-api-gateway.sh

# Deploy to production environment
./deploy-api-gateway.sh production

# Or deploy to staging
./deploy-api-gateway.sh staging
```

**Expected Output:**
```
🚀 Starting Dott API Gateway Deployment...
📋 Deployment Configuration:
   Stack Name: dott-api-gateway
   Environment: production
   AWS Region: us-east-1
   Cognito User Pool ID: us-east-1_JPL8vGfb6
   Django Backend URL: https://api.dottapps.com
   Next.js API URL: https://your-nextjs-deployment.vercel.app

✅ Pre-deployment checks passed
📝 Preparing CloudFormation parameters...
🆕 Stack does not exist - creating new stack...
⏳ Waiting for stack create to complete...
✅ Stack create completed successfully!

🎉 Dott API Gateway deployed successfully!
🌐 API Gateway URL: https://abc123def.execute-api.us-east-1.amazonaws.com/production
```

### Step 2: Update Frontend Configuration

```bash
# Use the API Gateway URL from Step 1
API_GATEWAY_URL="https://abc123def.execute-api.us-east-1.amazonaws.com/production"

# Update frontend configuration
./update-api-config.sh "$API_GATEWAY_URL" production
```

### Step 3: Rebuild and Deploy Frontend

```bash
# Build with updated API Gateway configuration
pnpm run build:production-fast

# Deploy to your hosting platform (Vercel, S3, etc.)
# For S3 + CloudFront:
./deploy.sh production
```

---

## 🔧 Configuration Files

### CloudFormation Template
- **File**: `infrastructure/api-gateway.yml`
- **Purpose**: Defines API Gateway, Cognito authorizer, and route configurations
- **Resources**: 25+ AWS resources including API Gateway, methods, authorizers

### Deployment Scripts
- **`deploy-api-gateway.sh`**: Main CloudFormation deployment script
- **`update-api-config.sh`**: Updates frontend configuration files
- **`deploy.sh`**: Frontend deployment to S3/CloudFront

### Environment Files
- **`.env.production`**: Production environment variables
- **`production.env`**: Template for production configuration
- **`src/config/api-endpoints.js`**: API endpoint mappings

---

## 🛡️ Security Configuration

### Authentication Flow
1. User logs in via Cognito hosted UI
2. Frontend receives JWT token
3. All API requests include `Authorization: Bearer <token>` header
4. API Gateway validates token against Cognito User Pool
5. Valid requests forwarded to backend services

### Rate Limiting
```yaml
Throttle:
  BurstLimit: 100    # Max concurrent requests
  RateLimit: 50      # Requests per second
Quota:
  Limit: 10000       # Daily request limit
  Period: DAY
```

### CORS Headers
```yaml
Access-Control-Allow-Origin: '*'
Access-Control-Allow-Headers: 'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
Access-Control-Allow-Methods: 'GET,POST,PUT,DELETE,OPTIONS'
```

---

## 🔗 API Endpoints

### Payroll APIs (Next.js Routes)
```
POST /payroll/reports        → Frontend API route
POST /payroll/run           → Frontend API route
POST /payroll/export-report → Frontend API route
GET  /payroll/settings      → Frontend API route
POST /payroll/settings      → Frontend API route
```

### Business APIs (Django Backend)
```
ANY /business/{proxy+}      → https://api.dottapps.com/api/business/{proxy}
```

### Onboarding APIs (Django Backend)
```
ANY /onboarding/{proxy+}    → https://api.dottapps.com/api/onboarding/{proxy}
```

---

## 🧪 Testing

### Basic Connectivity Test
```bash
# Test API Gateway health
curl -I https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/production

# Should return 403 Forbidden (requires authentication)
```

### Authenticated Request Test
```bash
# Get Cognito token (replace with your method)
TOKEN="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

# Test payroll endpoint
curl -X POST \
  https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/production/payroll/reports \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"period": "2024-01"}'
```

### Frontend Integration Test
```bash
# Run the included test script
node test-auth-flow.js
```

---

## 📊 Monitoring and Analytics

### CloudWatch Metrics
- **Request Count**: Total API requests
- **Error Rate**: 4xx/5xx responses
- **Latency**: Response times
- **Throttles**: Rate-limited requests

### Access via AWS Console
1. Navigate to API Gateway console
2. Select "Dott-API-production"
3. Go to Monitoring tab
4. View real-time metrics

### CLI Monitoring
```bash
# Get API Gateway metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ApiGateway \
  --metric-name Count \
  --dimensions Name=ApiName,Value=Dott-API-production \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-02T00:00:00Z \
  --period 3600 \
  --statistics Sum
```

---

## 🔄 Updates and Maintenance

### Updating API Gateway
```bash
# Make changes to infrastructure/api-gateway.yml
# Then redeploy:
./deploy-api-gateway.sh production
```

### Adding New Endpoints
1. Update `infrastructure/api-gateway.yml`
2. Add new resource and method definitions
3. Update CORS if needed
4. Redeploy stack

### Scaling Considerations
- **Rate Limits**: Adjust based on usage patterns
- **Cognito Limits**: Consider multiple user pools for scale
- **Cache TTL**: Add caching for read-heavy endpoints

---

## 🚨 Troubleshooting

### Common Issues

#### 403 Forbidden Error
```bash
# Check token validity
aws cognito-idp get-user --access-token YOUR_TOKEN

# Verify User Pool ID in deployment
aws cognito-idp describe-user-pool --user-pool-id us-east-1_JPL8vGfb6
```

#### 502 Bad Gateway
```bash
# Check backend service health
curl -I https://api.dottapps.com/health

# Verify Next.js deployment
curl -I https://your-nextjs-deployment.vercel.app/api/health
```

#### CORS Issues
```bash
# Test OPTIONS request
curl -X OPTIONS \
  https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/production/payroll/reports \
  -H "Origin: https://dott.app" \
  -v
```

### Debug Commands
```bash
# View CloudFormation stack events
aws cloudformation describe-stack-events --stack-name dott-api-gateway

# Check API Gateway logs
aws logs describe-log-groups --log-group-name-prefix /aws/apigateway/

# Test Cognito integration
aws cognito-idp admin-get-user \
  --user-pool-id us-east-1_JPL8vGfb6 \
  --username test@example.com
```

---

## 💰 Cost Estimation

### API Gateway Pricing (us-east-1)
- **Requests**: $3.50 per million API calls
- **Data Transfer**: $0.09 per GB out

### Example Monthly Cost (100K requests)
```
API Calls:     100,000 × $0.0000035 = $0.35
Data Transfer: 10GB × $0.09        = $0.90
Total:                             = $1.25/month
```

### Cost Optimization
- Use caching to reduce backend calls
- Implement request/response compression
- Monitor and adjust rate limits

---

## 📚 Additional Resources

### AWS Documentation
- [API Gateway Developer Guide](https://docs.aws.amazon.com/apigateway/)
- [Cognito Developer Guide](https://docs.aws.amazon.com/cognito/)
- [CloudFormation User Guide](https://docs.aws.amazon.com/cloudformation/)

### Dott Application Resources
- [Frontend Documentation](./README.md)
- [API Documentation](./docs/api-reference.md)
- [Deployment Guide](./IMPLEMENTATION_COMPLETE.md)

---

## 🎯 Next Steps

1. **✅ Deploy API Gateway** - Use the deployment script
2. **✅ Update Frontend Config** - Point to API Gateway URLs
3. **✅ Test Integration** - Verify all endpoints work
4. **📈 Monitor Usage** - Set up CloudWatch alarms
5. **🔒 Security Review** - Audit access patterns
6. **🚀 Performance Optimization** - Fine-tune rate limits

---

**🎉 Your Dott API Gateway is now ready for production!**

For support or questions, refer to the troubleshooting section or check the CloudFormation stack events for detailed deployment information. 
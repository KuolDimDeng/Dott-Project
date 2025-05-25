# Complete Deployment Guide - Backend & Frontend
Date: 2025-05-23 18:08:37
Status: Ready for Production Deployment

## Overview
This guide provides step-by-step instructions to deploy your fixed backend to AWS Elastic Beanstalk and update your frontend to use the production backend URL.

## Issues Resolved
✅ **Backend**: Fixed `aws:elasticbeanstalk:environment:proxy:staticfiles` configuration error  
✅ **Frontend**: Prepared scripts to update backend URL after deployment  
✅ **Documentation**: Created comprehensive script registries and backups  
✅ **Version Control**: All scripts follow Version0001_<description>_<target> naming  

---

## Part 1: Backend Deployment (AWS Elastic Beanstalk)

### Current Status
- ✅ Deployment package created: `backend/pyfactor/dottapps-docker-fixed-20250523-180626.zip`
- ✅ Size: 42M (optimized for Docker deployment)
- ✅ All problematic configurations removed
- ✅ Docker configuration updated for nginx static file serving

### Deploy to AWS Elastic Beanstalk

#### Option A: AWS Console (Recommended)
1. **Navigate to Elastic Beanstalk Console**
   - Go to: https://console.aws.amazon.com/elasticbeanstalk/
   - Select your region: `us-east-1` (N. Virginia)
   - Click on: `DottApps-env`

2. **Upload New Version**
   - Click "Upload and deploy"
   - Select file: `backend/pyfactor/dottapps-docker-fixed-20250523-180626.zip`
   - Version label: `v20250523-docker-fixed`
   - Description: "Fixed Docker deployment - removed proxy:staticfiles config"
   - Click "Deploy"

3. **Monitor Deployment**
   - Watch the Events tab for deployment progress
   - Expected time: 5-10 minutes
   - Look for "Environment update completed successfully"

#### Option B: EB CLI
```bash
cd backend/pyfactor
eb deploy --staged
```

### Expected Results
- ✅ No more "Invalid option specification" errors
- ✅ Static files served via whitenoise within container
- ✅ Environment health: Ready (Green)
- ✅ Backend accessible at: `https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com`

---

## Part 2: Frontend URL Updates (After Backend Success)

### Prerequisites
- ✅ Backend deployment completed successfully
- ✅ Backend health status: Ready/OK
- ✅ Backend URL confirmed accessible

### Execute Frontend Updates

1. **Get Your Backend URL**
   ```bash
   # Your backend URL will be:
   # https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com
   ```

2. **Run Frontend Update Script**
   ```bash
   cd frontend/pyfactor_next
   node scripts/Version0001_update_backend_url_deployment.js https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com
   ```

3. **Verify Backend Connection**
   ```bash
   # Script will create this verification tool:
   node verify_backend_connection.js
   ```

4. **Deploy to Vercel Production**
   ```bash
   # Script will create this deployment tool:
   ./deploy-to-vercel-production.sh
   ```

### Frontend Changes Made
- ✅ `.env.local` updated with production backend URL
- ✅ API configuration files updated
- ✅ Next.js configuration updated for API proxying
- ✅ Backend connection verification script created
- ✅ Production deployment script created

---

## Part 3: Verification & Testing

### Backend Health Check
1. **Direct URL Test**
   ```bash
   curl -k https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com/health/
   ```

2. **AWS Console Check**
   - Environment health: Should be "Ready" (Green)
   - No error events in the Events tab
   - Application responding to requests

### Frontend Integration Test
1. **Local Development Test**
   ```bash
   cd frontend/pyfactor_next
   pnpm run dev
   # Test API calls to production backend
   ```

2. **Production Deployment Test**
   - Frontend: https://www.dottapps.com
   - Backend: https://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com
   - Test authentication flow
   - Test tenant isolation
   - Test CORS functionality

---

## File Locations & Backups

### Backend Files
- **Deployment Package**: `backend/pyfactor/dottapps-docker-fixed-20250523-180626.zip`
- **Script Registry**: `backend/pyfactor/scripts/SCRIPT_REGISTRY.md`
- **Backups**: All modified files backed up with timestamp `20250523_180619`

### Frontend Files
- **Update Script**: `frontend/pyfactor_next/scripts/Version0001_update_backend_url_deployment.js`
- **Script Registry**: `frontend/pyfactor_next/scripts/SCRIPT_REGISTRY.md`
- **Backups**: Will be created in `frontend/pyfactor_next/frontend_file_backups/`

---

## Next Steps After Deployment

1. **Monitor Backend Performance**
   - Check CloudWatch logs for any errors
   - Monitor response times and health metrics
   - Verify RDS connectivity and tenant isolation

2. **Test Frontend-Backend Integration**
   - User authentication via AWS Cognito
   - API calls with tenant isolation
   - Custom:tenant_ID attribute handling (using CognitoAttributes utility)

3. **Update DNS/Domain Settings** (if needed)
   - Ensure www.dottapps.com points to production frontend
   - Update any CORS settings if domain changes

---

## Troubleshooting

### Backend Issues
- **Check**: AWS Elastic Beanstalk Events tab
- **Logs**: Download full logs from EB console
- **Health**: Monitor application health dashboard

### Frontend Issues
- **Connection**: Run `node verify_backend_connection.js`
- **CORS**: Check browser console for CORS errors
- **Environment**: Verify `.env.local` configuration

### Support Resources
- **Backend Script Registry**: `backend/pyfactor/scripts/SCRIPT_REGISTRY.md`
- **Frontend Script Registry**: `frontend/pyfactor_next/scripts/SCRIPT_REGISTRY.md`
- **Deployment Fix Summary**: `backend/pyfactor/DOCKER_DEPLOYMENT_FIX_SUMMARY_20250523_180619.md`

---

## Success Criteria
✅ Backend: No deployment errors, health status "Ready"  
✅ Frontend: Successfully deployed to www.dottapps.com  
✅ Integration: API calls working between frontend and backend  
✅ Security: Tenant isolation and authentication working  
✅ Performance: Reasonable response times and no errors  

**Your deployment is now ready to proceed!**

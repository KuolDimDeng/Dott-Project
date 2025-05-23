# 🚀 AWS Amplify Deployment Guide

## ✅ Pre-Deployment Checklist

Your Next.js app is **ready for AWS Amplify!** Here's what's already configured:

- ✅ **AWS Amplify dependencies** installed
- ✅ **Cognito authentication** configured (matches backend)
- ✅ **Production build scripts** ready
- ✅ **TypeScript & Tailwind** setup
- ✅ **Next.js 15.3** with App Router
- ✅ **Build configuration** optimized for Amplify

## 🔧 Step 1: Update API URLs (CRITICAL)

Before deployment, ensure your backend API is accessible:

### Current Backend Status:
- ✅ **Django API**: Working on Elastic Beanstalk
- ✅ **Database**: PostgreSQL RDS connected
- ✅ **SSL Certificate**: Ready for dottapps.com domains

### API URL Options:
1. **Testing**: Use EB URL directly
   ```
   NEXT_PUBLIC_API_URL=http://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com
   ```

2. **Production**: Use custom domain (requires DNS setup)
   ```
   NEXT_PUBLIC_API_URL=https://api.dottapps.com
   ```

## 🌐 Step 2: Deploy to AWS Amplify

### Option A: AWS Console (Recommended)

1. **Login to AWS Console**
   - Go to AWS Amplify service
   - Click "Create app"

2. **Connect Repository**
   - Choose "Deploy without Git provider" or connect your GitHub repo
   - Select the `frontend/pyfactor_next` directory

3. **Configure Build Settings**
   - Amplify will auto-detect the `amplify.yml` file
   - Use the provided build specification

4. **Set Environment Variables**
   Copy these variables from `amplify.env.example`:
   ```
   NEXT_PUBLIC_API_URL=http://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com
   BACKEND_API_URL=http://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com
   USE_DATABASE=true
   MOCK_DATA_DISABLED=true
   PROD_MODE=true
   NODE_ENV=production
   NODE_OPTIONS=--max-old-space-size=8192
   ```

5. **Review and Deploy**
   - Click "Save and deploy"
   - Wait for build to complete (5-10 minutes)

### Option B: Amplify CLI

```bash
# Install Amplify CLI
npm install -g @aws-amplify/cli

# Initialize Amplify
cd frontend/pyfactor_next
amplify init

# Add hosting
amplify add hosting

# Deploy
amplify publish
```

## 🔗 Step 3: Configure Custom Domain

### After Initial Deployment:

1. **Get Amplify URL**
   - Note the auto-generated URL (e.g., `https://main.d1234567890.amplifyapp.com`)

2. **Set up DNS Records**
   In your domain registrar (where dottapps.com is managed):
   ```
   Type: CNAME
   Name: @ (or www)
   Value: main.d1234567890.amplifyapp.com
   TTL: 300
   ```

3. **Configure in Amplify Console**
   - Go to "Domain management"
   - Add custom domain: `dottapps.com`
   - Follow the SSL certificate setup

## 🔧 Step 4: Backend DNS Configuration

After frontend deployment, configure backend DNS:

```
Type: CNAME
Name: api
Value: DottApps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com
TTL: 300
```

## 🎯 Final Architecture

```
Frontend: https://dottapps.com (AWS Amplify)
    ↓
Backend: https://api.dottapps.com (Elastic Beanstalk)
    ↓
Database: PostgreSQL RDS
```

## 🛠️ Build Commands Reference

```bash
# Local testing with production config
pnpm run build:production

# Local development
pnpm run dev

# Local HTTPS development
pnpm run dev:https
```

## 🚨 Troubleshooting

### Build Errors:
- **Memory issues**: Ensure `NODE_OPTIONS=--max-old-space-size=8192`
- **Module errors**: Check that all stubs in `src/utils/stubs/` exist

### API Connection Issues:
- **CORS errors**: Ensure backend ALLOWED_HOSTS includes frontend domain
- **SSL errors**: Use HTTP URLs for testing, HTTPS for production

### Authentication Issues:
- **Cognito errors**: Verify `amplifyconfiguration.json` matches backend

## ✅ Success Criteria

Your deployment is successful when:
- ✅ Frontend loads at your custom domain
- ✅ Authentication works (login/register)
- ✅ API calls to backend succeed
- ✅ No console errors in browser
- ✅ SSL certificates working

## 🔄 Continuous Deployment

Once connected to Git:
- ✅ Auto-deploy on push to main branch
- ✅ Branch-based deployments
- ✅ Build logs and monitoring

---

**Next Steps**: Ready to deploy? Start with Step 1 above! 🚀 
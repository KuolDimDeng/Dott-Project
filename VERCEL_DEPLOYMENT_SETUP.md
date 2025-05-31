# Vercel Deployment Automation Setup

This repository is now configured to automatically deploy to Vercel whenever you commit or push code. Here's how it works:

## 🚀 Automatic Deployment Methods

### 1. Git Hooks (Local)
- **Post-commit hook**: Triggers deployment after every commit
- **Pre-push hook**: Triggers deployment when pushing to production branches (`main`, `master`, `production`, `Dott-Main`)

### 2. GitHub Actions (Recommended)
- Deploys automatically when pushing to production branches
- Creates preview deployments for pull requests
- More reliable than local git hooks
- Provides deployment status and comments on PRs

### 3. Manual Deployment Script
Use the provided script for manual deployments:
```bash
# Deploy to production
./deploy-vercel.sh production

# Deploy to preview
./deploy-vercel.sh preview
```

## 🔧 Setup Requirements

### For Git Hooks to Work:
1. **Vercel CLI must be installed globally:**
   ```bash
   npm install -g vercel
   ```

2. **Authenticate with Vercel:**
   ```bash
   vercel login
   ```

3. **Link your project:**
   ```bash
   cd frontend/pyfactor_next
   vercel link
   ```

### For GitHub Actions to Work:
1. **Add these secrets to your GitHub repository:**
   - `VERCEL_TOKEN`: Your Vercel authentication token
   - `VERCEL_ORG_ID`: Your Vercel organization ID
   - `VERCEL_PROJECT_ID`: Your Vercel project ID

2. **Get your Vercel credentials:**
   ```bash
   # Get your token
   vercel login
   
   # Get org and project IDs
   cd frontend/pyfactor_next
   vercel link
   cat .vercel/project.json
   ```

## 📁 Project Structure

```
projectx/
├── vercel.json                          # Main Vercel config
├── frontend/pyfactor_next/
│   ├── .vercel/project.json            # Vercel project settings
│   └── [Next.js project files]
├── .husky/_/
│   ├── post-commit                     # Local git hook
│   └── pre-push                        # Local git hook
├── .github/workflows/
│   └── vercel-deploy.yml               # GitHub Actions workflow
└── deploy-vercel.sh                    # Manual deployment script
```

## 🎯 How Deployments Trigger

### Production Deployments:
- Push to `main`, `master`, `production`, or `Dott-Main` branches
- Manual trigger via GitHub Actions
- Manual run of `./deploy-vercel.sh production`

### Preview Deployments:
- Pull requests to main branches
- Push to feature branches (via git hooks)
- Manual run of `./deploy-vercel.sh preview`

## 🐛 Troubleshooting

### Git Hooks Not Working?
1. Check if Vercel CLI is installed: `vercel --version`
2. Check if hooks are executable: `ls -la .husky/_/`
3. Re-authenticate: `vercel login`

### GitHub Actions Failing?
1. Verify secrets are set in GitHub repository settings
2. Check if `pnpm-lock.yaml` exists in `frontend/pyfactor_next/`
3. Verify Vercel project is properly linked

### API Routing Issues Fixed:
- Updated `[tenantId]/[...slug]/page.js` to ignore API routes
- Now `/api/auth/login` works correctly with Auth0
- System routes (`_next`, `favicon.ico`, etc.) are also ignored

## 🔗 Useful Commands

```bash
# Check deployment status
vercel ls

# View deployment logs
vercel logs [deployment-url]

# Test local deployment
./deploy-vercel.sh preview

# Force production deployment
./deploy-vercel.sh production
```

## 📝 Monitoring

- **Vercel Dashboard**: https://vercel.com/dashboard
- **Deployment logs**: Available in the Vercel dashboard
- **Local logs**: Check `deployment.log` file
- **GitHub Actions**: Check the Actions tab in your GitHub repository

---

✨ **Your repository is now set up for automatic Vercel deployments!** 
# 🤖 Automated Deployment Options

**No manual clicking required!** 🚀 Choose your preferred automated approach:

## 🎯 Quick Start

You have **2 automated scripts** ready to go:

### Option 1: Full Amplify (Recommended)
```bash
./deploy-to-amplify.sh --test
```

### Option 2: Simple S3 Hosting  
```bash
./deploy-simple.sh
```

## 📋 Prerequisites (One-time setup)

1. **AWS CLI configured**:
   ```bash
   aws configure
   # Enter your AWS credentials
   ```

2. **That's it!** Scripts handle everything else automatically.

## 🚀 Option 1: Full AWS Amplify (`deploy-to-amplify.sh`)

**What it does:**
- ✅ Installs Amplify CLI automatically
- ✅ Configures your app for production
- ✅ Sets up hosting with CDN
- ✅ Handles SSL certificates
- ✅ Provides custom domain support
- ✅ Enables continuous deployment

**Usage:**
```bash
# Deploy with test API (works immediately)
./deploy-to-amplify.sh --test

# Deploy with production API (requires DNS setup)
./deploy-to-amplify.sh --production

# Skip dependency installation (faster)
./deploy-to-amplify.sh --skip-install --test

# Interactive mode (asks which API to use)
./deploy-to-amplify.sh
```

**Result:** Full-featured deployment at `https://xyz.amplifyapp.com`

---

## ⚡ Option 2: Simple S3 Hosting (`deploy-simple.sh`)

**What it does:**
- ✅ Builds your app for production
- ✅ Creates S3 bucket automatically  
- ✅ Uploads and configures static hosting
- ✅ Sets up proper caching headers
- ✅ **Super fast deployment (2-3 minutes)**

**Usage:**
```bash
./deploy-simple.sh
```

**Result:** Static website at `http://bucket-name.s3-website-us-east-1.amazonaws.com`

---

## 🎯 Which Option to Choose?

| Feature | Amplify Script | S3 Script |
|---------|---------------|-----------|
| **Speed** | 8-10 minutes | 2-3 minutes |
| **SSL Certificate** | ✅ Automatic | ❌ Manual setup |
| **Custom Domain** | ✅ Easy setup | ❌ Requires CloudFront |
| **CDN/Performance** | ✅ Built-in | ❌ Manual setup |
| **Continuous Deployment** | ✅ Yes | ❌ No |
| **Complexity** | Medium | Simple |

**Recommendation:** 
- **First deployment:** Use `deploy-simple.sh` for quick testing
- **Production:** Use `deploy-to-amplify.sh --test` for full features

## 🔧 Troubleshooting

### AWS Credentials Error:
```bash
aws configure
# Enter your Access Key ID, Secret Key, Region (us-east-1)
```

### Build Errors:
```bash
# Clear cache and try again
rm -rf .next node_modules/.cache
pnpm install
```

### Script Permission Error:
```bash
chmod +x deploy-to-amplify.sh deploy-simple.sh
```

## 🎉 After Deployment

Both scripts will:
- ✅ Show you the live URL
- ✅ Offer to open it in your browser
- ✅ Provide next steps for custom domain

**Your backend is already running at:**
`http://dottapps-env.eba-3m4eq7bw.us-east-1.elasticbeanstalk.com`

---

**🚀 Ready to deploy? Pick a script and run it!** 
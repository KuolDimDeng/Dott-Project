#!/bin/bash

# Direct Deployment to Amplify for Dott App
echo "🚀 Direct deployment to Amplify for dottapps.com"
echo "==============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

APP_ID="d1v0w1avi9aszs"
BRANCH_NAME="main"

# Step 1: Create deployment package
print_status "Creating deployment package..."
rm -rf deploy-package
mkdir -p deploy-package

# Build the application
print_status "Building Next.js application..."
export NODE_ENV=production
export NEXT_PUBLIC_API_URL=https://uonwc77x38.execute-api.us-east-1.amazonaws.com/production
export BACKEND_API_URL=https://uonwc77x38.execute-api.us-east-1.amazonaws.com/production
export USE_DATABASE=true
export MOCK_DATA_DISABLED=true
export PROD_MODE=true

pnpm run build

if [ $? -ne 0 ]; then
    print_error "Build failed"
    exit 1
fi

print_success "Build completed successfully"

# Step 2: Create a proper static export for Amplify
print_status "Creating static export..."
cp -r .next/static deploy-package/
cp -r .next/server/app deploy-package/
cp -r .next/server/pages deploy-package/ 2>/dev/null || echo "No pages directory"

# Create index.html from the app root
if [ -f ".next/server/app/page.html" ]; then
    cp .next/server/app/page.html deploy-package/index.html
elif [ -f ".next/server/app/index.html" ]; then
    cp .next/server/app/index.html deploy-package/index.html
else
    print_warning "No index.html found, creating a redirect page"
    cat > deploy-package/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>Dott - Business Management Platform</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 40px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
        }
        .logo { font-size: 3rem; margin-bottom: 20px; }
        .loading { font-size: 1.2rem; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🏢 Dott</div>
        <h1>Welcome to Dott</h1>
        <p>Business Management Platform</p>
        <div class="loading">Loading your dashboard...</div>
    </div>
    <script>
        // Redirect to authentication if needed
        setTimeout(() => {
            window.location.href = '/auth/login';
        }, 2000);
    </script>
</body>
</html>
EOF
fi

print_success "Static export created"

# Step 3: Create a simple zip package
print_status "Creating deployment zip..."
cd deploy-package
zip -r ../dott-deployment.zip . -x "*.DS_Store"
cd ..

print_success "Deployment package created: dott-deployment.zip"

# Step 4: Use AWS CLI to create a manual deployment
print_status "Starting manual deployment..."

# Create a deployment using AWS CLI
JOB_ID=$(aws amplify start-deployment \
    --app-id "$APP_ID" \
    --branch-name "$BRANCH_NAME" \
    --source-url "file://$(pwd)/dott-deployment.zip" \
    --query "jobId" \
    --output text 2>/dev/null)

if [ -z "$JOB_ID" ] || [ "$JOB_ID" == "None" ]; then
    print_warning "Direct deployment failed, trying job creation..."
    
    # Alternative: try creating a job without source URL
    JOB_ID=$(aws amplify start-job \
        --app-id "$APP_ID" \
        --branch-name "$BRANCH_NAME" \
        --job-type "MANUAL" \
        --query "jobSummary.jobId" \
        --output text 2>/dev/null)
    
    if [ -z "$JOB_ID" ] || [ "$JOB_ID" == "None" ]; then
        print_error "Failed to start deployment"
        print_status "Manual upload required:"
        print_status "1. Go to: https://console.aws.amazon.com/amplify/home#/apps/$APP_ID"
        print_status "2. Click 'Deploy without Git'"
        print_status "3. Upload: dott-deployment.zip"
        exit 1
    fi
fi

print_success "Deployment started! Job ID: $JOB_ID"

# Step 5: Monitor deployment
print_status "Monitoring deployment progress..."

for i in {1..20}; do
    STATUS=$(aws amplify get-job \
        --app-id "$APP_ID" \
        --branch-name "$BRANCH_NAME" \
        --job-id "$JOB_ID" \
        --query "job.summary.status" \
        --output text 2>/dev/null)
    
    case $STATUS in
        "SUCCEED")
            print_success "🎉 Deployment completed successfully!"
            print_success "Your app should now be live at: https://dottapps.com"
            print_success "Amplify URL: https://$BRANCH_NAME.$APP_ID.amplifyapp.com"
            exit 0
            ;;
        "FAILED")
            print_error "❌ Deployment failed"
            print_status "Check logs at: https://console.aws.amazon.com/amplify/home#/apps/$APP_ID/$BRANCH_NAME/$JOB_ID"
            exit 1
            ;;
        "RUNNING"|"PENDING")
            print_status "Deployment in progress... ($STATUS)"
            ;;
        *)
            print_warning "Unknown status: $STATUS"
            ;;
    esac
    
    sleep 15
done

print_warning "Deployment is taking longer than expected"
print_status "Check status at: https://console.aws.amazon.com/amplify/home#/apps/$APP_ID"
print_status "App ID: $APP_ID"
print_status "Job ID: $JOB_ID" 
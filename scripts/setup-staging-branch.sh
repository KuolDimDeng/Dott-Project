#!/bin/bash

echo "========================================="
echo "Setting Up Staging Branch & Workflow"
echo "========================================="

# Create staging branch from main
echo "Step 1: Creating staging branch from main..."
git checkout main
git pull origin main
git checkout -b staging
git push -u origin staging

echo "✅ Staging branch created"

# Set up branch protection (requires GitHub CLI)
echo ""
echo "Step 2: Setting up branch protection..."
echo "Do you have GitHub CLI installed? (y/n)"
read -r HAS_GH_CLI

if [ "$HAS_GH_CLI" = "y" ]; then
    # Protect main branch
    gh api repos/:owner/:repo/branches/main/protection \
      --method PUT \
      --field required_status_checks='{"strict":true,"contexts":["test"]}' \
      --field enforce_admins=false \
      --field required_pull_request_reviews='{"required_approving_review_count":1}' \
      --field restrictions=null
    
    echo "✅ Branch protection configured"
else
    echo "ℹ️  Please manually configure branch protection in GitHub settings:"
    echo "   - Require pull request reviews before merging"
    echo "   - Require status checks to pass"
    echo "   - Include administrators"
fi

echo ""
echo "========================================="
echo "✅ Staging Setup Complete!"
echo "========================================="
echo ""
echo "Workflow:"
echo "1. Develop features on feature branches"
echo "2. Create PR to staging branch for testing"
echo "3. Auto-deploy to staging environment"
echo "4. Test thoroughly in staging"
echo "5. Create PR from staging to main for production"
echo "6. Auto-deploy to production"
echo ""
echo "Branch structure:"
echo "  main (production)"
echo "  ├── staging (testing)"
echo "  └── feature/* (development)"
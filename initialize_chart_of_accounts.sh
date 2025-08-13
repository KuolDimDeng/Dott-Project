#!/bin/bash

echo "========================================"
echo "Initializing Chart of Accounts for Production User"
echo "========================================"

cd /Users/kuoldeng/projectx

# Add any changes
git add -A

# Commit if there are changes
if ! git diff-index --quiet HEAD --; then
    git commit -m "Initialize Chart of Accounts for production users"
fi

# Push to main
echo "Pushing to production..."
git push origin main

echo ""
echo "========================================"
echo "Deployment complete!"
echo "========================================"
echo ""
echo "IMPORTANT: The Chart of Accounts initialization is set up to run automatically."
echo ""
echo "What happens now:"
echo "1. When you access the Chart of Accounts page"
echo "2. The system will check if accounts exist"
echo "3. If no accounts exist, it will automatically initialize them"
echo "4. You should see 47 standard accounts created"
echo ""
echo "If accounts still don't appear:"
echo "1. Go to Render dashboard"
echo "2. Open the dott-api service shell"
echo "3. Run: python manage.py initialize_chart_of_accounts --email kuoldimdeng@outlook.com"
echo ""
echo "The accounts include:"
echo "- Assets (Cash, Accounts Receivable, Inventory, etc.)"
echo "- Liabilities (Accounts Payable, Loans, Credit Cards, etc.)"
echo "- Equity (Owner's Equity, Retained Earnings, etc.)"
echo "- Revenue (Sales, Service Revenue, etc.)"
echo "- Expenses (Salaries, Rent, Utilities, etc.)"
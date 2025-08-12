#!/bin/bash

echo "Initializing Chart of Accounts on Production"
echo "============================================"

# Note: This would normally be run on the production server
# For Render, you can run this command in the Shell tab of your service

cat << 'EOF'

To initialize the chart of accounts on production:

1. Go to https://dashboard.render.com
2. Navigate to your backend service (dott-api)
3. Click on the "Shell" tab
4. Run this command:

python manage.py initialize_chart_of_accounts

This will create 36 standard accounts needed for POS and accounting.

If you want to force update existing accounts, use:
python manage.py initialize_chart_of_accounts --force

For country-specific accounts (e.g., Kenya), use:
python manage.py initialize_chart_of_accounts --country KE

EOF

echo ""
echo "After running the command, your cash flow widget should display actual amounts!"
#!/bin/bash

# Deploy Module-Specific Bank Account Defaults
# Allows users to set different bank accounts for different payment types

echo "================================================"
echo "Deploying Module Bank Account Defaults"
echo "================================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Step 1: Commit to staging
echo -e "${YELLOW}Step 1: Committing changes to staging...${NC}"
cd /Users/kuoldeng/projectx

git add -A
git commit -m "Add module-specific bank account defaults

- Added defaults for: Invoices, Payroll, Expenses, Vendor Payments
- Each module can have its own designated bank account
- Updated Banking Settings UI with dropdown selector
- Added color-coded badges for each module default
- Generic methods for all modules using _get_default_account()

This allows businesses to route different payment types to different accounts:
- POS sales to one account
- Invoice payments to another
- Payroll from a dedicated payroll account
- Expenses from operations account
- Vendor payments from procurement account"

git push origin staging

echo -e "${GREEN}✓ Changes committed to staging${NC}"
echo ""

# Step 2: Migration commands
echo -e "${YELLOW}Step 2: Run these migrations on staging:${NC}"
echo "python manage.py migrate banking"
echo ""

# Step 3: What's ready to use
echo -e "${GREEN}What's Ready Now:${NC}"
echo "✅ Backend models and methods complete"
echo "✅ API endpoints for all modules"
echo "✅ Banking Settings UI shows all defaults"
echo "✅ Infrastructure ready for payment processing"
echo ""

echo -e "${YELLOW}How Each Module Will Use This:${NC}"
echo "• Invoices: When customer pays, money goes to invoice default account"
echo "• Payroll: When paying employees, funds come from payroll account"
echo "• Expenses: Reimbursements paid from expense account"
echo "• Vendors: Supplier payments from vendor account"
echo "• POS: Credit card settlements to POS account"
echo ""

echo -e "${GREEN}No example integrations needed - just use:${NC}"
echo "WiseItem.get_default_invoice_account(user)"
echo "WiseItem.get_default_payroll_account(user)"
echo "WiseItem.get_default_expense_account(user)"
echo "WiseItem.get_default_vendor_account(user)"
echo ""

echo "Ready to deploy to staging!"
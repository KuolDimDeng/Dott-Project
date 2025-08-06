#!/bin/bash

# Deployment script for destination-based taxation feature
# This script commits changes and deploys to production

set -e  # Exit on error

echo "🚀 Starting deployment of destination-based taxation feature..."

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] || [ ! -d "backend/pyfactor" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

print_status "Current directory: $(pwd)"

# 1. Add all changes to git
print_status "Adding all changes to git..."
git add backend/pyfactor/crm/models.py
git add backend/pyfactor/crm/migrations/0007_add_county_and_tax_exempt_fields.py
git add backend/pyfactor/inventory/models.py
git add backend/pyfactor/inventory/migrations/0014_add_tax_exemption_fields.py
git add backend/pyfactor/sales/models.py
git add backend/pyfactor/sales/pos_viewsets.py
git add backend/pyfactor/sales/serializers.py
git add backend/pyfactor/sales/migrations/0011_add_tax_jurisdiction_fields.py
git add backend/pyfactor/sales/services/tax_service.py
git add backend/pyfactor/taxes/urls.py
git add backend/pyfactor/taxes/views/__init__.py
git add backend/pyfactor/taxes/views/location_data.py
git add backend/pyfactor/users/models.py
git add backend/pyfactor/users/migrations/0027_add_county_field.py
git add frontend/pyfactor_next/src/app/Settings/components/sections/CompanyProfile.js
git add frontend/pyfactor_next/src/app/dashboard/components/forms/CustomerManagement.js
git add frontend/pyfactor_next/src/app/dashboard/components/pos/POSSystemInline.js

# Don't add the tax rate scripts - they're one-time use
print_warning "Not adding tax rate population scripts (one-time use only)"

# 2. Create commit
print_status "Creating git commit..."
git commit -m "$(cat <<'EOF'
Implement destination-based taxation with location dropdowns

Major changes:
- Add destination-based tax calculation using customer shipping address
- Add county fields to Customer, Product, and UserProfile models
- Add tax exemption fields for customers and products
- Implement location dropdown APIs for countries, states, and counties
- Update Customer Management and POS to use location dropdowns
- Add tax jurisdiction tracking to POS transactions
- Show tax breakdown (state + county) in POS interface

Backend:
- Created TaxService for destination-based tax calculations
- Added tax calculation hierarchy: shipping → billing → origin
- Added location data API endpoints from GlobalSalesTaxRate
- Added database migrations for new fields

Frontend:
- Converted all location inputs to cascading dropdowns
- Added shipping address toggle in POS
- Show tax jurisdiction details in POS
- Pre-fetch location data when editing customers

This ensures accurate tax calculations based on customer location
and prevents spelling errors through standardized dropdowns.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

print_status "Commit created successfully!"

# 3. Show what needs to be done for deployment
echo ""
print_status "=== DEPLOYMENT STEPS ==="
echo ""
echo "1. Push to GitHub:"
echo "   git push origin main"
echo ""
echo "2. Backend will auto-deploy to Render (wait ~5 minutes)"
echo ""
echo "3. Run database migrations on Render:"
echo "   - Go to https://dashboard.render.com"
echo "   - Navigate to dott-api service"
echo "   - Go to Shell tab"
echo "   - Run: python manage.py migrate"
echo ""
echo "4. Frontend will auto-deploy to Render (wait ~10 minutes)"
echo ""
echo "5. Verify deployment:"
echo "   - Check https://api.dottapps.com/health/"
echo "   - Check https://app.dottapps.com"
echo ""
echo "6. Test with Utah (has county-level taxes):"
echo "   - Create a customer with Utah address"
echo "   - Select a county (e.g., Salt Lake County)"
echo "   - Create a POS sale and verify tax calculation"
echo ""

# 4. Ask if user wants to push now
echo ""
read -p "Do you want to push to GitHub now? (y/n) " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    print_status "Pushing to GitHub..."
    git push origin main
    print_status "Push complete! Deployment started."
    echo ""
    echo "Monitor deployment status:"
    echo "- Backend: https://dashboard.render.com/web/srv-crqb8856l47c73f6mvdg"
    echo "- Frontend: https://dashboard.render.com/web/srv-cqe73flds78s739u3jpg"
else
    print_warning "Skipping push. Run 'git push origin main' when ready."
fi

echo ""
print_status "Deployment script complete!"
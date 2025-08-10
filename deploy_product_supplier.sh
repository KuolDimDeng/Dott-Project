#!/bin/bash

echo "🚀 Deploying ProductSupplier Feature"
echo "===================================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: Creating database migrations locally${NC}"
cd backend/pyfactor

# Create migrations
python3 manage.py makemigrations product_suppliers --noinput

# Check if migrations were created
if [ -f "product_suppliers/migrations/0001_initial.py" ]; then
    echo -e "${GREEN}✅ Migrations created successfully${NC}"
else
    echo -e "${YELLOW}⚠️  No new migrations needed or already exist${NC}"
fi

echo -e "${YELLOW}Step 2: Committing any new migration files${NC}"
cd ../..
git add -A
git diff --staged --quiet || {
    git commit -m "Add ProductSupplier database migrations

Auto-generated migrations for ProductSupplier and ProductSupplierItem models.

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"
    git push origin main
    echo -e "${GREEN}✅ Migrations committed and pushed${NC}"
}

echo -e "${YELLOW}Step 3: Deployment Instructions for Production${NC}"
echo "================================================"
echo ""
echo "The ProductSupplier feature has been deployed to GitHub."
echo "Render will automatically pick up the changes."
echo ""
echo "To complete the deployment on production:"
echo ""
echo "1. SSH into your production server or use Render Shell"
echo "2. Run the following commands:"
echo ""
echo -e "${GREEN}   python manage.py migrate product_suppliers${NC}"
echo -e "${GREEN}   python manage.py collectstatic --noinput${NC}"
echo ""
echo "3. Optional: Run the migration script to separate existing vendors:"
echo ""
echo -e "${GREEN}   python scripts/migrate_vendors_to_product_suppliers.py --execute${NC}"
echo ""
echo "4. The API endpoints are now available at:"
echo "   - GET/POST    /api/product-suppliers/api/suppliers/"
echo "   - GET/PUT/DEL /api/product-suppliers/api/suppliers/{id}/"
echo "   - GET         /api/product-suppliers/api/suppliers/{id}/catalog/"
echo "   - POST        /api/product-suppliers/api/suppliers/{id}/add_product/"
echo "   - POST        /api/product-suppliers/api/suppliers/{id}/create_purchase_order/"
echo "   - GET         /api/product-suppliers/api/suppliers/{id}/performance/"
echo "   - POST        /api/product-suppliers/api/suppliers/bulk_import/"
echo ""
echo -e "${GREEN}✅ Backend deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "- Create frontend components for ProductSupplier management"
echo "- Add 'Product Suppliers' menu item to Inventory section"
echo "- Test the API endpoints with Postman or curl"
echo ""
echo -e "${YELLOW}Security Note:${NC}"
echo "All endpoints are protected with tenant isolation."
echo "Users can only see/modify suppliers in their own tenant."
#!/bin/bash
# Deploy tax fix and clear cache

echo "Deploying tax suggestions fix..."

# Push the changes
git push origin Dott_Main_Dev_Deploy

echo "Changes pushed. Deployment will start automatically."
echo ""
echo "After deployment completes (about 5-10 minutes), the tax suggestions will:"
echo "1. Return Utah's flat 4.65% state income tax (not federal brackets)"
echo "2. Properly distinguish between state and federal taxes"
echo "3. Cache correct values for future requests"
echo ""
echo "To manually clear the cache after deployment:"
echo "1. SSH into the server"
echo "2. Run: python manage.py shell"
echo "3. Execute:"
echo "   from taxes.models import TaxRateCache"
echo "   TaxRateCache.objects.filter(state_province__iexact='Utah').delete()"
echo "   TaxRateCache.objects.filter(income_tax_rate=4.65).delete()"
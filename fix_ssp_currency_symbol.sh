#!/bin/bash

echo "======================================="
echo "Fix SSP Currency Symbol in Database"
echo "======================================="

cat << 'EOF' > /tmp/fix_ssp_symbol.py
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'pyfactor.settings')
django.setup()

from django.db import transaction
from users.models import BusinessDetails
from currency.currency_data import get_currency_info

print("="*60)
print("FIXING SSP CURRENCY SYMBOL")
print("="*60)

# Get correct currency info
ssp_info = get_currency_info('SSP')
print(f"\n✅ Correct SSP info from currency_data.py:")
print(f"   Name: {ssp_info['name']}")
print(f"   Symbol: {ssp_info['symbol']}")
print(f"   Decimal Places: {ssp_info['decimal_places']}")

# Find all businesses with SSP currency
ssp_businesses = BusinessDetails.objects.filter(preferred_currency_code='SSP')
total = ssp_businesses.count()

if total == 0:
    print("\nNo businesses found with SSP currency.")
else:
    print(f"\n📊 Found {total} businesses with SSP currency")
    
    # Check how many have wrong symbol
    wrong_symbol = ssp_businesses.filter(preferred_currency_symbol='£').count()
    if wrong_symbol > 0:
        print(f"❌ {wrong_symbol} businesses have wrong symbol (£)")
        
        # Fix them
        with transaction.atomic():
            updated = ssp_businesses.filter(preferred_currency_symbol='£').update(
                preferred_currency_symbol='SSP'
            )
            print(f"✅ Fixed {updated} businesses - changed £ to SSP")
    
    # Also check for any null or empty symbols
    null_symbol = ssp_businesses.filter(preferred_currency_symbol__isnull=True).count()
    empty_symbol = ssp_businesses.filter(preferred_currency_symbol='').count()
    
    if null_symbol > 0 or empty_symbol > 0:
        print(f"\n⚠️  Found {null_symbol + empty_symbol} businesses with null/empty symbol")
        with transaction.atomic():
            # Fix null symbols
            ssp_businesses.filter(preferred_currency_symbol__isnull=True).update(
                preferred_currency_symbol='SSP'
            )
            # Fix empty symbols
            ssp_businesses.filter(preferred_currency_symbol='').update(
                preferred_currency_symbol='SSP'
            )
            print(f"✅ Fixed null/empty symbols")
    
    # Verify the fix
    print("\n📊 Final status:")
    for business in ssp_businesses[:5]:  # Show first 5
        print(f"   {business.business.name if hasattr(business, 'business') else 'Unknown'}: {business.preferred_currency_symbol}")

# Also check for any SDG (Sudanese Pound) that might be confused
sdg_businesses = BusinessDetails.objects.filter(preferred_currency_code='SDG')
if sdg_businesses.exists():
    print(f"\n📊 Found {sdg_businesses.count()} businesses with SDG (Sudanese Pound)")
    print("   Note: SDG correctly uses £ symbol, SSP uses SSP text as symbol")

print("\n" + "="*60)
print("✅ Currency symbol fix completed!")
print("="*60)
EOF

echo ""
echo "Script created at: /tmp/fix_ssp_symbol.py"
echo ""
echo "======================================="
echo "To run this fix:"
echo "======================================="
echo ""
echo "1. In STAGING shell:"
echo "   python /tmp/fix_ssp_symbol.py"
echo ""
echo "2. In PRODUCTION shell:"
echo "   python /tmp/fix_ssp_symbol.py"
echo ""
echo "3. After running, users need to:"
echo "   - Refresh their browser (Ctrl+R or Cmd+R)"
echo "   - Or clear cache if symbol persists"
echo ""
echo "======================================="
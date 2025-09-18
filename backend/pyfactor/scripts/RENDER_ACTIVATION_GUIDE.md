# Render Shell Activation Guide for Improved Featuring System

## Prerequisites Completed
✅ Marketplace migration 0010 - Fields created via SQL
✅ Inventory migration conflicts - Resolved
✅ Menu migration - Fields already exist
✅ Database fields manually created

## Step 1: Fake the Menu Migration
```bash
python manage.py migrate menu 0004_add_featuring_fields --fake
```

## Step 2: Run the Activation Script

### Option A: Use the Simple Script (Recommended)
```bash
cd /app
python backend/pyfactor/scripts/activate_featuring_simple.py
```

### Option B: Run in Django Shell
```bash
python manage.py shell
```

Then paste this code:
```python
from django.utils import timezone
from django.db import transaction
from marketplace.models import BusinessListing
from inventory.models import Product
from menu.models import MenuItem
from custom_auth.models import User
from decimal import Decimal
from datetime import timedelta

with transaction.atomic():
    # Populate tenant UUIDs
    print("Populating Tenant UUIDs...")
    for listing in BusinessListing.objects.all():
        try:
            user = User.objects.get(id=listing.business_id)
            if user.tenant_id and not listing.tenant_uuid:
                listing.tenant_uuid = user.tenant_id
                listing.save()
                print(f"Updated {user.business_name}")
        except User.DoesNotExist:
            continue

    # Activate featuring for Juba
    print("Activating featuring...")
    businesses = BusinessListing.objects.filter(
        is_visible_in_marketplace=True,
        city__iexact='Juba'
    )[:10]

    for idx, listing in enumerate(businesses):
        listing.is_featured = True
        listing.featured_until = timezone.now().date() + timedelta(days=30)
        listing.featuring_score = Decimal('75.00') + (idx * 5)
        listing.save()
        print(f"Featured {listing.business.business_name if listing.business else listing.id}")

print("✅ Activation complete!")
```

## Step 3: Test the Endpoints

### Test Featured Businesses
```bash
curl "https://staging.dottapps.com/api/marketplace/consumer-search/featured/?city=Juba&country=SS"
```

### Test Featured Items
```bash
curl "https://staging.dottapps.com/api/marketplace/consumer-search/featured_items/?city=Juba&country=SS"
```

### Test in Django Shell
```bash
python manage.py shell
```

```python
from marketplace.featuring_service import FeaturingService

# Test featuring
businesses, metadata = FeaturingService.get_featured_businesses(
    city='Juba', country='SS', limit=10
)
print(f"Found {len(businesses)} featured businesses")
print(f"Tiers: {metadata.get('tiers_used')}")

# Test featured items
items, meta = FeaturingService.get_featured_items(
    city='Juba', country='SS', limit=10
)
print(f"Found {len(items)} featured items")
```

## Step 4: Clear Cache
```bash
python manage.py shell
```

```python
from django.core.cache import cache
cache.clear()
print("Cache cleared!")
```

## Troubleshooting

### If script fails with module error:
```bash
# Run from /app directory
cd /app
export PYTHONPATH=/app/backend/pyfactor:$PYTHONPATH
python backend/pyfactor/scripts/activate_featuring_simple.py
```

### If migrations are still problematic:
```bash
# Check migration status
python manage.py showmigrations marketplace
python manage.py showmigrations menu

# Fake specific migrations if needed
python manage.py migrate marketplace 0010 --fake
python manage.py migrate menu 0004_add_featuring_fields --fake
```

### Verify database fields exist:
```bash
python manage.py dbshell
```

```sql
\d marketplace_businesslisting;
-- Should see: tenant_uuid, trust_score, featuring_score, etc.
```

## Expected Results
- ✅ Businesses in Juba marked as featured
- ✅ Trust scores calculated for all businesses
- ✅ Tenant UUIDs populated
- ✅ Featured products and menu items activated
- ✅ Multi-tier featuring algorithm active
- ✅ Location fallback working for areas with few businesses

## API Endpoints to Test
- `/api/marketplace/consumer-search/featured/` - Featured businesses
- `/api/marketplace/consumer-search/featured_items/` - Featured products/menu items
- `/api/marketplace/consumer-search/marketplace_businesses/` - All businesses with fallback
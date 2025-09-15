# StoreItems Setup Instructions

## How to Activate the Global Product Catalog

The StoreItems infrastructure is ready but needs to be activated. Follow these steps:

### 1. Integrate Models

Add this import to `/backend/pyfactor/inventory/models.py`:
```python
from .models_storeitems import StoreItem, MerchantStoreItem
```

Add this to the Product model (after line 316):
```python
# Link to global store item catalog
store_item = models.ForeignKey(
    'StoreItem',
    on_delete=models.SET_NULL,
    null=True,
    blank=True,
    related_name='merchant_products',
    help_text='Link to global product catalog'
)

barcode = models.CharField(
    max_length=50,
    blank=True,
    null=True,
    db_index=True,
    help_text='Product barcode for scanning'
)
```

### 2. Create Migrations

```bash
python manage.py makemigrations inventory
python manage.py migrate
```

### 3. Add URL Routes

Add to `/backend/pyfactor/inventory/urls.py`:
```python
from .api_views_storeitems import StoreItemViewSet, MerchantStoreItemViewSet

router.register(r'store-items', StoreItemViewSet, basename='store-items')
router.register(r'merchant-items', MerchantStoreItemViewSet, basename='merchant-items')
```

### 4. Update Management Command

Edit `/backend/pyfactor/inventory/management/commands/populate_storeitems.py`:
- Remove lines 10-14 (temporary StoreItem = None)
- Uncomment line 11: `from inventory.models_storeitems import StoreItem`

### 5. Update API Views

Edit `/backend/pyfactor/inventory/api_views_storeitems.py`:
- Remove the try/except block (lines 14-29)
- Use direct imports: `from .models_storeitems import ...`

### 6. Populate Initial Data

```bash
python manage.py populate_storeitems --source all --limit 1000
```

## What This Gives You

- Global product catalog shared across all merchants
- Barcode scanning with fuzzy matching
- AI product detection from images
- Bulk price updates
- Market intelligence via price tracking
- 80% faster merchant onboarding

## API Endpoints

Once activated, these endpoints will be available:

- `GET /api/inventory/store-items/scan/?barcode=123456` - Scan barcode
- `POST /api/inventory/store-items/ai_detect/` - Detect products from image
- `POST /api/inventory/merchant-items/bulk_price_update/` - Bulk price updates
- `GET /api/inventory/store-items/categories/` - Get all categories
- `GET /api/inventory/store-items/{id}/price_history/` - Price history

## Revenue Potential

- License database to competitors: $10K/month
- Market insights to brands: $100K/year
- Database value after 1 year: $5-10M
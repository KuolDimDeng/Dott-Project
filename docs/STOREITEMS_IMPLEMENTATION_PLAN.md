# StoreItems Implementation Plan
*Building on Existing Inventory System*

## Overview
Enhance the existing inventory system with a global product catalog (StoreItems) that provides:
- Shared product database across all merchants
- AI-powered product recognition
- Barcode scanning with fallback
- Smart pricing suggestions
- Bulk operations

## Architecture Integration

### Current System
```
Inventory (existing)
├── Product (merchant-specific)
├── Category
├── Supplier
└── Location
```

### Enhanced System
```
Inventory (enhanced)
├── Product (merchant-specific)
│   └── Links to → StoreItem (global)
├── StoreItem (NEW - global catalog)
├── Category (existing)
├── Supplier (existing)
└── Location (existing)
```

## Phase 1: Database Foundation (Week 1)

### Step 1: Create StoreItems Models
```python
# backend/pyfactor/inventory/models_storeitems.py

class StoreItem(models.Model):
    """Global product catalog - shared across all tenants"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    barcode = models.CharField(max_length=50, unique=True, db_index=True)
    name = models.CharField(max_length=255, db_index=True)
    brand = models.CharField(max_length=100, blank=True, null=True)
    category = models.CharField(max_length=100, db_index=True)
    subcategory = models.CharField(max_length=100, blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)
    unit = models.CharField(max_length=50, blank=True, null=True)
    verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'store_items'
        indexes = [
            models.Index(fields=['barcode']),
            models.Index(fields=['name', 'brand']),
            models.Index(fields=['category']),
        ]

class Product(TenantAwareModel):
    """Enhanced existing Product model - links to StoreItem"""
    # Existing fields remain unchanged
    store_item = models.ForeignKey(
        StoreItem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='merchant_products'
    )
    # Local merchant pricing
    sell_price = models.DecimalField(max_digits=10, decimal_places=2)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, null=True)
    stock_quantity = models.IntegerField(default=0)
```

### Step 2: Data Migration
```python
# backend/pyfactor/inventory/migrations/add_storeitems.py
python manage.py makemigrations inventory
python manage.py migrate
```

### Step 3: Populate Initial Data
```python
# backend/pyfactor/inventory/management/commands/populate_storeitems.py
python manage.py populate_storeitems --source openfoodfacts --limit 10000
```

## Phase 2: API Development (Week 1-2)

### Step 4: StoreItems API Endpoints
```python
# backend/pyfactor/inventory/api_views_storeitems.py

class StoreItemViewSet(viewsets.ModelViewSet):
    """Global store items - no tenant filtering"""

    @action(methods=['get'], detail=False)
    def scan(self, request):
        """Scan barcode and return product or suggestions"""
        barcode = request.GET.get('barcode')
        # Check global catalog
        # Return product or AI suggestions

    @action(methods=['post'], detail=False)
    def ai_detect(self, request):
        """AI detection from image"""
        image = request.FILES['image']
        # Use Claude Vision API
        # Return detected products

    @action(methods=['get'], detail=False)
    def search(self, request):
        """Smart search with autocomplete"""
        query = request.GET.get('q')
        # Search by name, brand, barcode
        # Return suggestions
```

### Step 5: Enhanced Product API
```python
# backend/pyfactor/inventory/api_views.py

class ProductViewSet(TenantAwareViewSet):
    """Enhanced merchant products with StoreItem integration"""

    @action(methods=['post'], detail=False)
    def bulk_price_update(self, request):
        """Update prices in bulk"""
        # By category, percentage, formula

    @action(methods=['get'], detail=False)
    def price_suggestions(self, request):
        """Get area average prices"""
        # Based on location and product
```

## Phase 3: Frontend Integration (Week 2)

### Step 6: Enhance Inventory Page
```javascript
// frontend/pyfactor_next/src/app/inventory/components/BarcodeScanner.js
const BarcodeScanner = () => {
  const handleScan = async (barcode) => {
    const result = await api.get(`/api/inventory/store-items/scan?barcode=${barcode}`);
    if (result.found) {
      // Auto-fill product form
    } else {
      // Show add new product
    }
  };
};
```

### Step 7: AI Product Recognition
```javascript
// frontend/pyfactor_next/src/app/inventory/components/AIProductDetector.js
const AIProductDetector = () => {
  const detectProducts = async (image) => {
    const formData = new FormData();
    formData.append('image', image);
    const products = await api.post('/api/inventory/store-items/ai-detect', formData);
    // Show detected products for confirmation
  };
};
```

### Step 8: Bulk Operations UI
```javascript
// frontend/pyfactor_next/src/app/inventory/components/BulkPriceManager.js
const BulkPriceManager = () => {
  return (
    <div>
      <Button onClick={() => updateByCategory('Beverages', '+10%')}>
        Increase all Beverages by 10%
      </Button>
      <Button onClick={() => updateByFormula('cost * 1.3')}>
        Set 30% markup on all
      </Button>
    </div>
  );
};
```

## Phase 4: Mobile App Integration (Week 2-3)

### Step 9: React Native Scanner
```javascript
// mobile/DottAppNative/src/screens/inventory/BarcodeScanScreen.js
import { Camera } from 'expo-camera';
import { BarCodeScanner } from 'expo-barcode-scanner';

const BarcodeScanScreen = () => {
  const handleBarCodeScanned = async ({ data }) => {
    const product = await api.scanStoreItem(data);
    navigation.navigate('ProductDetail', { product });
  };
};
```

### Step 10: Mobile Inventory Management
```javascript
// mobile/DottAppNative/src/screens/inventory/InventoryScreen.js
const InventoryScreen = () => {
  return (
    <View>
      <TouchableOpacity onPress={openScanner}>
        <Text>📸 Scan Product</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={bulkImport}>
        <Text>📦 Bulk Import</Text>
      </TouchableOpacity>
      <ProductList products={products} />
    </View>
  );
};
```

## Phase 5: AI Integration (Week 3)

### Step 11: Claude Vision Integration
```python
# backend/pyfactor/inventory/services/ai_service.py
from anthropic import Anthropic

class AIProductService:
    def detect_products(self, image):
        client = Anthropic(api_key=settings.CLAUDE_API_KEY)
        response = client.messages.create(
            model="claude-3-opus-20240229",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": "Identify all products in this image"},
                    {"type": "image", "source": {"type": "base64", "data": image_base64}}
                ]
            }]
        )
        return self.parse_products(response)
```

## Phase 6: Testing & Launch (Week 4)

### Step 12: Pilot Testing
- Select 10 diverse merchants
- Track adoption metrics
- Gather feedback
- Iterate on UX

### Step 13: Production Launch
- Staged rollout (10% → 50% → 100%)
- Monitor performance
- Support documentation
- Marketing campaign

## Success Metrics

### Technical Metrics
- Scan success rate: >90%
- API response time: <500ms
- Product match rate: >80%
- Database growth: 1000+ products/week

### Business Metrics
- Merchant adoption: 80% in first month
- Setup time reduction: 80% (2 hours → 20 minutes)
- Daily active usage: 70%
- Support tickets: <5% of users

## Key Files to Modify

### Backend
- `/backend/pyfactor/inventory/models.py` - Add StoreItem model
- `/backend/pyfactor/inventory/api_views.py` - Add new endpoints
- `/backend/pyfactor/inventory/serializers.py` - StoreItem serializers
- `/backend/pyfactor/inventory/urls.py` - New routes

### Frontend
- `/frontend/pyfactor_next/src/app/inventory/page.js` - Add scanner button
- `/frontend/pyfactor_next/src/app/inventory/components/` - New components
- `/frontend/pyfactor_next/src/app/api/inventory/` - API routes

### Mobile
- `/mobile/DottAppNative/src/screens/inventory/` - Scanner screens
- `/mobile/DottAppNative/src/services/inventoryApi.js` - API integration

## Implementation Priority

1. **Week 1**: Database + Basic API
2. **Week 2**: Frontend Scanner + Search
3. **Week 3**: AI Detection + Bulk Operations
4. **Week 4**: Testing + Launch

## Risk Mitigation

- **Data Quality**: 3-merchant verification system
- **Performance**: Redis caching for popular items
- **Offline**: Local SQLite cache on mobile
- **Adoption**: Free feature, instant value

## Revenue Opportunities

### Direct (Future)
- License database to competitors: $10K/month
- Market insights to brands: $100K/year
- API access to researchers: $5K/month

### Indirect (Immediate)
- Faster onboarding → Lower CAC
- Better UX → Higher retention
- Network effects → Viral growth

## Next Steps

1. Create StoreItem model in existing inventory app
2. Run migrations on staging database
3. Import initial 1000 products from Open Food Facts
4. Build barcode scanner component
5. Test with internal team

This plan integrates seamlessly with your existing inventory system, enhancing rather than replacing it.
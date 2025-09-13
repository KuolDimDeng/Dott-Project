# Marketplace Business Detail Guide
*Last Updated: 2025-09-13*

## Overview
This guide documents how the marketplace business detail system works, common issues, and solutions.

## System Architecture

### Database Structure
```
marketplace_businesslisting (UUID primary key)
    ├── id (UUID) - The business listing ID used in API calls
    ├── business_id (Integer FK) - References custom_auth_user.id
    ├── business_type (String) - e.g., RESTAURANT_CAFE
    ├── is_visible_in_marketplace (Boolean) - Must be true for public access
    └── is_open_now (Boolean) - Business open/closed status

custom_auth_user
    ├── id (Integer) - User ID
    ├── email (String)
    ├── auth0_sub (String) - Auth0 subject ID
    └── tenant_id (UUID) - Used for menu items lookup

menu_items
    ├── id (UUID)
    ├── tenant_id (UUID FK) - Links to user's tenant
    ├── name (String)
    ├── price (Decimal)
    └── is_available (Boolean)
```

## API Endpoints

### Business Detail Endpoint
```
GET /api/marketplace/business/{listing_id}/public/
```
- **listing_id**: The UUID from marketplace_businesslisting.id
- Returns 404 if business is not published (is_visible_in_marketplace = false)

### Business Products/Menu Items
```
GET /api/marketplace/business/{listing_id}/products/
```
- Returns menu items for restaurant businesses
- Returns products for retail businesses

## Common Issues and Solutions

### Issue 1: 404 Error - Business Not Found
**Symptom**: API returns 404 when fetching business details
```
Error: Request failed with status code 404
URL: /api/marketplace/business/ba8d366c-9b29-41bc-a770-031d975aab77/public/
```

**Causes**:
1. Business listing doesn't exist with that ID
2. Business is not published (is_visible_in_marketplace = false)
3. Using wrong ID type (Auth0 sub instead of listing ID)

**Solution**:
1. Verify the business listing ID exists in database
2. Ensure is_visible_in_marketplace = true
3. Use the marketplace_businesslisting.id, not user ID or Auth0 sub

### Issue 2: Menu Items Not Showing
**Symptom**: Restaurant business shows no menu items in menu tab

**Causes**:
1. Menu items linked by tenant_id, not business_id
2. Business type not properly detected
3. API call failing silently

**Solution**:
```javascript
// Correct way to load menu items
const businessData = await marketplaceApi.getBusinessDetails(businessId);
// Use the listing ID for products/menu
const menuData = await marketplaceApi.getBusinessProducts(businessId);
```

## Database Queries for Debugging

### Check if Business Exists and is Published
```sql
-- Find business by listing ID
SELECT
    bl.id as listing_id,
    bl.business_id,
    u.email,
    bl.business_type,
    bl.is_visible_in_marketplace,
    bl.is_open_now
FROM marketplace_businesslisting bl
JOIN custom_auth_user u ON u.id = bl.business_id
WHERE bl.id = 'YOUR_LISTING_ID_HERE';

-- Find all published businesses
SELECT id, business_id, business_type
FROM marketplace_businesslisting
WHERE is_visible_in_marketplace = true;
```

### Check Menu Items for a Business
```sql
-- Get user's tenant_id first
SELECT id, email, tenant_id
FROM custom_auth_user
WHERE id = BUSINESS_USER_ID;

-- Then check menu items
SELECT COUNT(*) as menu_item_count
FROM menu_items
WHERE tenant_id = 'TENANT_ID_HERE';

-- Get menu item details
SELECT id, name, price, is_available
FROM menu_items
WHERE tenant_id = 'TENANT_ID_HERE'
LIMIT 10;
```

## Testing in Staging Environment

### Current Valid Test Business (as of 2025-09-13)
- **Listing ID**: `73bd98d0-6084-4fe7-8a69-2899dd03a57f`
- **Email**: support@dottapps.com
- **Business Type**: RESTAURANT_CAFE
- **Menu Items**: 3 items (Jollof Rice, Chicken, Jill)
- **Status**: Published and Open

### How to Access Staging Database
```bash
# SSH into Render service
# Go to Render Dashboard > dott-api-staging > Shell

# Access PostgreSQL
python manage.py dbshell

# Run queries to debug
```

## Mobile App Implementation

### BusinessDetailScreen.js Error Handling
```javascript
const loadBusinessDetails = async () => {
  setLoading(true);
  try {
    const businessData = await marketplaceApi.getBusinessDetails(businessId);
    setBusiness(businessData);

    // Load menu items for restaurants
    if (businessData?.business_type?.includes('RESTAURANT')) {
      const productsData = await marketplaceApi.getBusinessProducts(businessId);
      setMenuItems(productsData?.products || []);
    }
  } catch (error) {
    if (error.response?.status === 404) {
      Alert.alert(
        'Business Not Found',
        'This business is not available in the marketplace.',
        [{ text: 'Go Back', onPress: () => navigation.goBack() }]
      );
    }
  } finally {
    setLoading(false);
  }
};
```

## Key Points to Remember

1. **Always use marketplace_businesslisting.id** for API calls, not user IDs
2. **Business must be published** (is_visible_in_marketplace = true) for public access
3. **Menu items are linked by tenant_id**, not business_id
4. **Check business_type** to determine if menu items should be loaded
5. **Handle 404 errors gracefully** with user-friendly messages

## Related Files
- Backend: `/backend/pyfactor/marketplace/views.py`
- Mobile: `/mobile/DottAppNative/src/screens/BusinessDetailScreen.js`
- API Service: `/mobile/DottAppNative/src/services/marketplaceApi.js`
- Serializers: `/backend/pyfactor/marketplace/serializers.py`
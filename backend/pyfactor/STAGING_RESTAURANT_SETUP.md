# Restaurant Inventory Setup for Staging

## Steps to Run in Render Shell

### 1. First, run the migration to add new inventory fields:
```bash
python manage.py migrate inventory
```

### 2. Then run the setup command to configure restaurant inventory:
```bash
python manage.py setup_restaurant_inventory
```

This will:
- Update support@dottapps.com to RESTAURANT_CAFE business type
- Add 10 restaurant-specific inventory items (ingredients, supplies, etc.)
- Configure the business for restaurant operations

### 3. Optional: Clear existing products first
If you want to start fresh with only restaurant items:
```bash
python manage.py setup_restaurant_inventory --clear-existing
```

### 4. To update a different user:
```bash
python manage.py setup_restaurant_inventory --email=other@example.com
```

## What This Changes

1. **Business Type**: Changes to RESTAURANT_CAFE
2. **Inventory Terminology**: 
   - "Inventory" → "Ingredients & Supplies"
   - "Product" → "Ingredient"
3. **New Fields Available**:
   - Expiry dates
   - Storage temperatures
   - Allergen information
4. **Sample Items Added**:
   - Fresh vegetables (tomatoes, lettuce)
   - Proteins (chicken breast)
   - Beverages (coffee beans, milk)
   - Packaging supplies
   - Cleaning supplies

## Mobile App Testing

After running these commands, the mobile app will:
- Show "Ingredients & Supplies" instead of "Inventory" in the menu
- Display restaurant-specific fields when adding/editing items
- Show expiry date warnings for perishable items
- Enable temperature tracking features

## Verification

To verify the changes worked:
```bash
python manage.py shell
>>> from users.models import User, Business
>>> user = User.objects.get(email='support@dottapps.com')
>>> business = Business.objects.get(tenant=user.tenant)
>>> print(f"Business Type: {business.business_type}")
>>> print(f"Products: {user.tenant.products.count()}")
```
# UI/UX Standards Guide

*Last Updated: 2025-01-26*

## Icon Standards for Page Titles

### Overview
All page titles in the application should use SVG icons from Heroicons library, matching the professional style established in the Settings page. This ensures consistency across the application.

### Implementation

#### 1. Import the Icon
```javascript
import { IconName } from '@heroicons/react/24/outline';
```

#### 2. Page Title Structure
```jsx
<h1 className="text-2xl font-bold text-black mb-4 flex items-center">
  <IconName className="h-6 w-6 text-blue-600 mr-2" />
  Page Title
</h1>
```

### Standard Icon Styling
- **Size**: `h-6 w-6` (24x24 pixels)
- **Color**: `text-blue-600` (Tailwind blue-600)
- **Spacing**: `mr-2` (8px right margin)
- **Container**: `flex items-center` (for vertical alignment)

### Icon Mapping Reference

| Module | Page | Icon | Import Name |
|--------|------|------|-------------|
| **Sales** | Product Management | 📦 → Cube | `CubeIcon` |
| **Sales** | Service Management | 🛠️ → Wrench/Screwdriver | `WrenchScrewdriverIcon` |
| **Sales** | Sales Order Management | 🛒 → Shopping Cart | `ShoppingCartIcon` |
| **Sales** | Customer Management | 👥 → User Group | `UserGroupIcon` |
| **Sales** | Invoice Management | 📄 → Document | `DocumentTextIcon` |
| **Sales** | Estimate Management | 📋 → Clipboard List | `ClipboardDocumentListIcon` |
| **Settings** | Settings Management | ⚙️ → Cog | `CogIcon` |
| **HR** | Employee Management | 👥 → Users | `UsersIcon` |
| **Reports** | Reports Dashboard | 📊 → Chart | `ChartBarIcon` |
| **Finance** | Payment Management | 💳 → Credit Card | `CreditCardIcon` |
| **Finance** | Expense Management | 💰 → Banknotes | `BanknotesIcon` |
| **Inventory** | Inventory Management | 📦 → Cube | `CubeIcon` |
| **Inventory** | Supplier Management | 🚚 → Truck | `TruckIcon` |
| **Inventory** | Location Management | 🏢 → Building | `BuildingOfficeIcon` |
| **Dashboard** | Main Dashboard | 🏠 → Home | `HomeIcon` |
| **Analytics** | Analytics Dashboard | 📈 → Chart | `ChartBarIcon` |

### Example Implementations

#### Before (Emoji Style) ❌
```jsx
<h1 className="text-2xl font-bold text-black mb-4">
  📦 Product Management
</h1>
```

#### After (Heroicons Style) ✅
```jsx
import { CubeIcon } from '@heroicons/react/24/outline';

<h1 className="text-2xl font-bold text-black mb-4 flex items-center">
  <CubeIcon className="h-6 w-6 text-blue-600 mr-2" />
  Product Management
</h1>
```

### Finding the Right Icon

1. Browse Heroicons at: https://heroicons.com/
2. Use the outline variant for consistency: `@heroicons/react/24/outline`
3. Choose icons that clearly represent the page's function
4. When in doubt, reference the Settings page implementation

### Color Variations

While blue-600 is the standard, certain contexts may use different colors:

- **Success/Active**: `text-green-600`
- **Warning**: `text-yellow-600`
- **Error/Delete**: `text-red-600`
- **Neutral**: `text-gray-600`

Always use blue-600 for page titles unless there's a specific UX reason for variation.

### Migration Checklist

When updating a page from emoji to Heroicons:

- [ ] Import the appropriate icon from `@heroicons/react/24/outline`
- [ ] Add `flex items-center` to the h1 className
- [ ] Add the icon component with standard styling
- [ ] Remove the emoji from the title text
- [ ] Test that the icon displays correctly
- [ ] Verify icon aligns properly with text

### Do's and Don'ts

✅ **DO**:
- Use consistent 24x24 icon size (h-6 w-6)
- Maintain blue-600 color for all page titles
- Use outline variants for consistency
- Follow the established pattern from Settings page

❌ **DON'T**:
- Mix emoji and SVG icons
- Use filled/solid icon variants for page titles
- Change icon sizes arbitrarily
- Use different colors without UX justification

### Related Documentation
- Heroicons Library: https://heroicons.com/
- Tailwind CSS Colors: https://tailwindcss.com/docs/customizing-colors
- Settings Page Reference: `/src/app/Settings/components/SettingsManagement.js`
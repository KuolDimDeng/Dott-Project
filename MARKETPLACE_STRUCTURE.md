# Marketplace Structure Documentation

## IMPORTANT: Clear Naming Convention

### NEW FILE NAMING (Clear and Explicit)
- **Business Mode**: `mobile-business-menu.html` (formerly mobile-menu.html)
- **Consumer Mode**: `mobile-consumer-menu.html` (formerly mobile-marketplace-consumer.html)

### Core Understanding
- **The business menu page (`mobile-business-menu.html`) IS the Business Mode**
- When users sign in, they land on the business menu, which is their business dashboard/marketplace
- Both modes are equal main menus, not sub-pages of each other

### Two-Mode System

#### 1. Business Mode (`mobile-business-menu.html`)
- **This is the default landing page after sign-in**
- Navy blue header theme
- Contains all business features:
  - POS
  - Inventory
  - Expense/Purchases
  - Jobs
  - Marketplace
  - Dashboard
  - Messages
  - WhatsApp
  - Transactions
  - Customers
  - HR
  - Services
  - Smart Insights
  - Payroll
  - Filing Taxes
  - Transport
- Has marketplace mode switcher to go to Consumer Mode

#### 2. Consumer Mode (`mobile-consumer-menu.html`)
- **Separate page from main menu**
- **SAME header structure as business mode but with DARK GREEN theme (#064e3b)**
- Has the SAME marketplace mode toggle switcher
- Consumer marketplace UI includes:
  - Search bar with "Discover..." placeholder
  - Stories section (WeChat-inspired)
  - Featured Deals carousel
  - Quick Actions grid (Food, Shopping, Transport, Health, etc.)
  - Near You section with business listings
- When user clicks "Business" in the toggle, they go back to main menu

### Navigation Flow
1. User signs in → Lands on **Business Menu (`mobile-business-menu.html`)**
2. User clicks "Consumer" in marketplace toggle → Goes to **Consumer Menu (`mobile-consumer-menu.html`)**
3. User clicks "Business" in consumer mode → Returns to **Business Menu (`mobile-business-menu.html`)**

### Key Design Requirements
- Both modes have identical marketplace mode switcher section
- Consumer mode header must match business mode header structure
- Only difference is the color theme:
  - Business Mode: Navy blue (#1e3a8a)
  - Consumer Mode: Dark green (#064e3b)
- Consumer mode has WeChat-inspired marketplace UI
- Business mode has the full menu of business management features

### File Structure
- Business Mode: `mobile-business-menu.html` (the business menu with all business features)
- Consumer Mode: `mobile-consumer-menu.html` (the consumer marketplace experience)

## Remember
**Both files are main menu pages for their respective modes. They are equal in hierarchy and importance. The naming now makes this crystal clear:**
- `mobile-business-menu.html` = Business mode main menu
- `mobile-consumer-menu.html` = Consumer mode main menu
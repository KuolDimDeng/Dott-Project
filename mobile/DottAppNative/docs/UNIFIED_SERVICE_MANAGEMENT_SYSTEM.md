# Unified Service Management System Documentation
*Last Updated: 2025-01-06*

## Overview
A comprehensive business type configuration system that dynamically adapts the mobile app's business mode based on the user's business type. Supports 100+ business types with tailored features and menu items.

## Architecture Components

### 1. Business Type Configuration (`src/utils/businessTypeConfig.js`)
Central configuration defining features and behavior for each business type.

#### Key Features per Business Type:
- **navigation**: Map navigation capabilities
- **calendar**: Appointment scheduling
- **inventory**: Stock management
- **chat**: Customer messaging
- **reviews**: Customer feedback
- **promotions**: Marketing features
- **analytics**: Business insights
- **payments**: Payment processing
- **documents**: Document management
- **employees**: Staff management

#### Navigation Modes:
- `single-destination`: For services going to one location (plumber, electrician)
- `multi-stop`: For delivery services with multiple drops
- `pickup-dropoff`: For transport services (taxi, courier)
- `fixed-location`: For businesses customers come to (restaurants, retail)

### 2. Business Context (`src/context/BusinessContext.js`)
Global state management for business operations.

#### State Properties:
```javascript
{
  businessType: 'COURIER',           // User's business type
  businessName: 'John's Delivery',   // Optional for individuals
  entityType: 'INDIVIDUAL',          // or 'SMALL_BUSINESS', etc.
  isBusinessMode: false,              // Toggle consumer/business mode
  isOnline: false,                    // Accepting orders
  activeOrders: [],                   // Current orders
  todayStats: { earnings, jobs, hours },
  weekStats: { earnings, jobs, hours }
}
```

### 3. Business Dashboard (`src/screens/business/BusinessDashboard.js`)
Dynamic dashboard that adapts based on business type configuration.

#### Dynamic Elements:
- **Quick Actions**: Show/hide based on features (Schedule, Navigate, Messages)
- **Stats Cards**: Display relevant metrics for business type
- **Menu Items**: Dynamically generated from configuration
- **Online Toggle**: For service providers to control availability

### 4. Navigation Helper (`src/utils/navigationHelper.js`)
Handles map integration across different apps and platforms.

#### Capabilities:
- Multi-app support (Google Maps, Apple Maps, Waze)
- Single and multi-waypoint navigation
- Distance calculation and formatting
- Location sharing
- Automatic fallback to web maps

### 5. Calendar Service (`src/utils/calendarService.js`)
Native calendar integration for appointment management.

#### Features:
- Create/update/delete appointments
- Recurring appointments
- Conflict detection
- Reminder notifications
- ICS export format
- Integration with device calendar

## Business Type Examples

### Courier/Delivery Driver
When a user registers as a COURIER, they will see:

**Dashboard Features:**
- Online/Offline toggle (prominent)
- Active deliveries counter
- Today's earnings and deliveries
- Navigation quick action button

**Menu Items:**
- Active Deliveries (with badge showing count)
- Delivery History
- Earnings & Payments
- Navigation Settings
- Customer Reviews
- Vehicle Management

**Special Features:**
- Multi-stop navigation for delivery routes
- Real-time order notifications
- Pickup and dropoff tracking
- Delivery confirmation photos

### Plumber/Electrician
**Dashboard Features:**
- Today's appointments
- Navigate to next job button
- Materials/inventory tracker

**Menu Items:**
- Today's Schedule
- Job History
- Quotes & Invoices
- Customer Management
- Reviews

**Special Features:**
- Single-destination navigation
- Calendar integration for appointments
- Job duration tracking
- Before/after photos

### Restaurant/Cafe
**Dashboard Features:**
- Active orders
- Today's sales
- Table management (if applicable)

**Menu Items:**
- Orders Management
- Menu Management
- Customer Reviews
- Promotions
- Analytics

**Special Features:**
- Fixed location (customers come to them)
- Order status updates
- Kitchen display system integration

## Implementation Flow

### 1. User Registration
```javascript
// User selects business type during registration
businessType: 'COURIER'
entityType: 'INDIVIDUAL'
```

### 2. Context Initialization
```javascript
// BusinessContext loads configuration
const config = getBusinessTypeConfig('COURIER');
// Returns courier-specific features and menu
```

### 3. Dashboard Rendering
```javascript
// Dashboard checks features
hasFeature('navigation') // true for courier
hasFeature('inventory')  // false for courier

// Gets menu items
getMenuItems() // Returns courier-specific menu
```

### 4. Business Mode Toggle
When user switches to business mode:
1. Dashboard loads with business-specific UI
2. Online/offline toggle becomes available
3. Business menu items appear
4. Consumer features hidden

## API Integration

### Backend Endpoints Required:
```javascript
// Business registration
POST /api/business/register
{
  entity_type: "INDIVIDUAL",
  business_type: "COURIER",
  business_name: "Optional for individuals",
  registration_status: "INFORMAL"
}

// Get business features
GET /api/business/features
// Returns enabled features based on business type

// Update online status
PATCH /api/business/status
{ is_online: true }

// Get active orders
GET /api/business/orders/active
// Returns orders based on business type
```

## Testing Checklist

### For Courier Business Type:
- [ ] User registers as Individual > Transport & Delivery > Courier
- [ ] Business mode shows courier-specific dashboard
- [ ] Online/offline toggle works
- [ ] Navigation button opens map apps
- [ ] Active deliveries section visible
- [ ] Multi-stop route planning available

### For Service Providers (Plumber, etc.):
- [ ] Calendar integration for appointments
- [ ] Single destination navigation
- [ ] Job tracking features
- [ ] Customer management

### For Retail/Restaurant:
- [ ] Fixed location mode
- [ ] Order management
- [ ] Inventory tracking (if applicable)
- [ ] Customer reviews

## Configuration Addition Guide

To add a new business type:

1. Add to `businessTypes.js` constants:
```javascript
{ value: 'NEW_TYPE', label: 'New Business Type' }
```

2. Add configuration in `businessTypeConfig.js`:
```javascript
case 'NEW_TYPE':
  return {
    label: 'New Business Type',
    features: {
      navigation: true,
      calendar: false,
      // ... other features
    },
    navigationMode: 'single-destination',
    menuItems: [
      // ... menu configuration
    ]
  };
```

3. Backend support for new type's specific features

## Security Considerations

- Business type determines available API endpoints
- Role-based access control for features
- Location permissions required for navigation
- Calendar permissions for appointment features

## Performance Optimizations

- Lazy load business-specific modules
- Cache business configuration
- Minimize API calls using context state
- Background location updates for active services

## Future Enhancements

1. **AI-Powered Routing**: Optimize delivery routes
2. **Predictive Scheduling**: Suggest appointment times
3. **Dynamic Pricing**: Surge pricing for transport
4. **Team Management**: For businesses with employees
5. **Analytics Dashboard**: Business insights
6. **Integration Hub**: Third-party service connections
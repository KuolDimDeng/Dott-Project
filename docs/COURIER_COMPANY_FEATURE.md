# Courier Company Management Feature (Future Implementation)

## Overview
This feature allows the platform to partner with third-party courier companies to handle deliveries in specific regions or cities. Currently **DISABLED** by default and designed for future activation.

## Key Components

### 1. Database Models

#### CourierCompany
- Represents a courier company that can manage multiple couriers
- Tracks company details, coverage areas, commission rates, and performance metrics
- Supports multiple cities and countries
- Includes API integration fields for webhooks and tracking

#### CourierCompanyBranch
- Branch offices of courier companies in different cities
- Manages local operations and capacity
- Tracks branch-specific metrics

#### CourierProfile (Enhanced)
- Supports both independent couriers and company employees
- Links to courier company and branch when applicable
- Employment type tracking (independent/company/partner)

#### DeliveryOrder (Enhanced)
- Can be assigned to courier companies
- Tracks company assignment separately from individual courier
- Company-specific tracking numbers

### 2. Commission Structure

**For Independent Couriers:**
- Platform: 25%
- Courier: 75%

**For Company Couriers (Future):**
- Platform: 15% (from company)
- Company: 85% (company then pays their couriers based on their agreement, typically 70%)
- This creates a win-win: companies get volume, platform gets reduced operations

### 3. Feature Flag

Located in `settings.py`:
```python
ENABLE_COURIER_COMPANIES = False  # Set to True to enable
```

## Implementation Status

### ✅ Completed
- Database models for companies and branches
- Company assignment logic in DeliveryOrder
- Company-aware earnings tracking
- Priority-based company selection algorithm
- Coverage area management (cities and countries)
- Feature flag for enabling/disabling

### 🔄 Future Work Needed
- Admin interface for managing courier companies
- API endpoints for company registration and management
- Webhook integration for real-time updates
- Company dashboard for managing their couriers
- Automated payout processing for companies
- Company performance analytics
- Mobile app support for company couriers

## How It Works (When Enabled)

1. **Company Registration**
   - Courier companies apply through admin panel
   - Provide coverage areas, fleet details, insurance
   - Admin verifies and approves

2. **Delivery Assignment**
   - System checks if companies are enabled (`ENABLE_COURIER_COMPANIES`)
   - Finds best company based on coverage and priority
   - Assigns delivery to company or falls back to independent couriers

3. **Company Management**
   - Companies receive delivery notifications via webhook
   - Assign their own couriers internally
   - Update delivery status via API

4. **Payments**
   - Platform takes lower commission (15%) from companies
   - Companies handle courier payments internally
   - Weekly/monthly settlement with companies

## Use Cases

### Scenario 1: Single Company Exclusivity
- DHL Express gets exclusive rights for Nairobi
- All Nairobi deliveries auto-assigned to DHL
- Platform takes 15%, DHL manages operations

### Scenario 2: Multiple Companies Competition
- 3 companies operate in Lagos
- System selects based on:
  - Priority rank (contractual)
  - Performance rating
  - Current capacity

### Scenario 3: Hybrid Model
- Companies handle business deliveries
- Independent couriers handle consumer deliveries
- Flexible assignment based on package type

## Activation Checklist

When ready to activate this feature:

1. [ ] Set `ENABLE_COURIER_COMPANIES = True` in settings
2. [ ] Run migrations to create company tables
3. [ ] Configure admin interface for company management
4. [ ] Set up webhook endpoints for company integration
5. [ ] Update mobile apps to support company couriers
6. [ ] Create company onboarding documentation
7. [ ] Set up payment processing for companies
8. [ ] Configure monitoring and analytics

## API Integration (Future)

Companies will integrate via REST API:

```python
# Example webhook payload to company
{
    "delivery_id": "uuid",
    "pickup": {
        "address": "...",
        "lat": 0.0,
        "lng": 0.0,
        "contact": "..."
    },
    "delivery": {
        "address": "...",
        "lat": 0.0,
        "lng": 0.0,
        "contact": "..."
    },
    "package": {
        "type": "parcel",
        "weight_kg": 2.5,
        "value": 50.00
    },
    "fee": 10.00,
    "company_earnings": 8.50
}
```

## Benefits

### For Platform
- Reduced operational overhead
- Guaranteed service coverage
- Professional delivery standards
- Lower customer acquisition cost

### For Courier Companies
- Steady stream of deliveries
- Integration with established platform
- Reduced marketing costs
- Access to payment infrastructure

### For Customers
- More reliable service
- Professional couriers
- Better tracking
- Consistent experience

## Risk Mitigation

- **Quality Control**: Performance metrics and ratings
- **Fallback**: Can disable companies and use independent couriers
- **Contracts**: Clear SLAs and termination clauses
- **Insurance**: Companies must maintain proper insurance
- **Compliance**: Regular audits and verification

## Notes

- Feature is designed to be backward compatible
- Existing independent courier system remains unchanged
- Can be enabled/disabled per region or globally
- All company-related fields are nullable for compatibility
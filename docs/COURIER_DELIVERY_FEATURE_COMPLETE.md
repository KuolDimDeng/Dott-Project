# Complete Courier Delivery Feature Documentation

## Overview
The Courier Delivery Feature enables businesses to register as couriers and provide delivery services through the Dott platform. This integrates with the existing marketplace, allowing consumers to order products and have them delivered by verified couriers.

## Architecture

### 1. Backend (Django)
- **Location**: `/backend/pyfactor/couriers/`
- **Database**: PostgreSQL with courier-specific tables
- **API**: RESTful endpoints at `/api/couriers/`

### 2. Mobile App (React Native)
- **Location**: `/mobile/DottAppNative/`
- **Services**: `courierApi.js` for API integration
- **Screens**: Business registration flow with courier options

## Core Components

### Database Models

#### 1. CourierProfile
- Links users to their courier business
- Tracks vehicle information (bicycle, motorcycle, car, van, truck, scooter)
- Manages availability status (online, busy, offline, break)
- Stores verification documents and status
- Performance metrics and ratings
- Earnings and payout information
- Trust levels (1-5) for progressive responsibility

#### 2. DeliveryOrder
- Connects consumers, businesses, and couriers
- Tracks package details and delivery requirements
- Real-time status updates
- Location tracking for pickup/delivery
- Fee calculation and distribution
- Support for tips and surge pricing

#### 3. CourierEarnings
- Period-based earnings tracking
- Breakdown of base, surge, tips, bonuses
- Payout management (bank, M-Pesa, cash)
- Support for both independent and company couriers

#### 4. DeliveryTracking
- Real-time GPS tracking
- Speed and heading information
- Historical route data
- Timestamp for each location update

#### 5. CourierCompany (Future Feature - Disabled)
- Third-party courier company management
- Multi-city operations
- Custom commission rates
- API integration support
- Currently disabled via `ENABLE_COURIER_COMPANIES = False`

#### 6. CourierCompanyBranch (Future Feature - Disabled)
- Local branch management
- City-specific operations
- Capacity management

## Registration Flow

### Step 1: Business Information
- Business name
- Business type (must select "Transport/Delivery")
- Legal structure
- City and country
- Phone number

### Step 2: Identity Verification
- ID type selection (National ID, Passport, Voter ID)
- ID number
- Upload ID front/back photos
- Selfie with ID for fraud prevention

### Step 3: Vehicle & License Information (Courier-specific)
- Vehicle type selection
- Vehicle registration number
- Vehicle details (make, model, year, color)
- Driver's license number and expiry
- Upload license front/back photos

### Step 4: Service & Payment Settings
- Service radius (km)
- Payment acceptance options
- Preferred payout method (M-Pesa, bank, cash)
- Emergency contact information

## API Endpoints

### Courier Management
- `POST /api/couriers/couriers/register/` - Register as courier
- `GET /api/couriers/couriers/me/` - Get courier profile
- `PATCH /api/couriers/couriers/me/` - Update profile
- `POST /api/couriers/couriers/update_status/` - Go online/offline
- `GET /api/couriers/couriers/dashboard/` - Courier dashboard

### Delivery Operations
- `GET /api/couriers/deliveries/` - List available deliveries
- `POST /api/couriers/deliveries/{id}/accept/` - Accept delivery
- `POST /api/couriers/deliveries/{id}/update_status/` - Update delivery status
- `POST /api/couriers/deliveries/{id}/add_tracking/` - Add GPS tracking point
- `GET /api/couriers/deliveries/{id}/tracking/` - Get delivery tracking

### Earnings & Payouts
- `GET /api/couriers/earnings/` - View earnings
- `POST /api/couriers/earnings/request_payout/` - Request payout

### Consumer Features
- `POST /api/couriers/nearby/find/` - Find nearby couriers
- `POST /api/couriers/deliveries/` - Request delivery

## Commission Structure

### Current (Independent Couriers)
- **Platform Fee**: 25% of delivery fee
- **Courier Earnings**: 75% of delivery fee
- **Tips**: 100% to courier

### Future (When Courier Companies Enabled)
- **Platform Fee**: 15% from company
- **Company Revenue**: 85% of delivery fee
- **Company to Courier**: Typically 70% (company decides)

## Status Flow

### Delivery Lifecycle
1. `pending` - Looking for courier
2. `courier_assigned` - Courier accepted
3. `courier_heading_pickup` - En route to pickup
4. `arrived_at_pickup` - At pickup location
5. `package_picked` - Package collected
6. `in_transit` - Delivering
7. `arrived_at_delivery` - At delivery location
8. `delivered` - Completed
9. `cancelled`/`failed` - Unsuccessful

### Courier Availability
- `online` - Available for deliveries
- `busy` - On active delivery
- `offline` - Not available
- `break` - Temporary break

## Trust Level System

### Level 1: New Courier
- Just registered
- Limited to low-value orders
- Cannot handle cash

### Level 2: Basic (5+ deliveries)
- Average rating ≥ 4.0
- Can handle moderate value orders

### Level 3: Verified (50+ deliveries)
- Average rating ≥ 4.3
- Identity fully verified
- Can handle cash payments

### Level 4: Trusted (200+ deliveries)
- Average rating ≥ 4.5
- High-value orders allowed
- Priority in delivery assignment

### Level 5: Elite (500+ deliveries)
- Average rating ≥ 4.7
- Highest priority
- Maximum order values
- Special bonuses available

## Security Features

### Identity Verification
- Government ID required
- Selfie with ID for biometric verification
- License verification for vehicle operators
- Background check support (criminal record)

### Document Storage
- Base64 encoded images
- Secure storage in PostgreSQL
- Audit trail for all document uploads

### Location Privacy
- Location only tracked during active deliveries
- Historical data retained for disputes
- Customer addresses hidden until pickup confirmed

## Payment Methods

### Courier Payouts
- **M-Pesa**: Default for Kenya/Africa
- **Bank Transfer**: For verified accounts
- **Cash Pickup**: Emergency option

### Customer Payments
- Credit/Debit cards via Stripe
- M-Pesa integration
- Cash on delivery (COD) for trusted couriers

## Mobile App Integration

### Courier Features
- Real-time availability toggle
- Delivery request notifications
- Turn-by-turn navigation
- Earnings dashboard
- Performance metrics

### Consumer Features
- Find nearby couriers
- Track delivery in real-time
- In-app chat with courier
- Rate and tip courier

## Performance Metrics

### Courier Metrics
- Total deliveries
- Success rate
- Average rating
- On-time percentage
- Total earnings

### Platform Metrics
- Active couriers by city
- Average delivery time
- Customer satisfaction
- Platform revenue

## Future Enhancements

### Phase 1: Courier Companies (Ready but Disabled)
- Partner with DHL, FedEx, local companies
- Company manages their own couriers
- Reduced platform fees for volume
- Already implemented, awaiting activation

### Phase 2: Advanced Features
- Route optimization
- Batch deliveries
- Scheduled pickups
- Express delivery options
- Cold chain support

### Phase 3: Expansion
- International shipping
- Drone delivery pilots
- Autonomous vehicle integration
- Warehouse partnerships

## Configuration

### Environment Variables
```bash
# Feature Flags
ENABLE_COURIER_COMPANIES=False  # Set True to enable companies

# Commission Rates (0-100)
PLATFORM_COMMISSION_RATE=25
SURGE_MULTIPLIER_MAX=2.0
```

### Django Settings
```python
# In settings.py
INSTALLED_APPS = [
    ...
    'couriers.apps.CouriersConfig',
    ...
]

# Feature flag for courier companies
ENABLE_COURIER_COMPANIES = False
```

## Testing

### Test Accounts
- Create test courier account via registration flow
- Use test vehicle registration: "TEST001"
- Test coordinates: Juba, South Sudan

### API Testing
```bash
# Register as courier
curl -X POST https://staging.dottapps.com/api/couriers/couriers/register/ \
  -H "Cookie: sid=YOUR_SESSION_ID" \
  -d '{
    "business_name": "Test Courier",
    "business_type": "Transport/Delivery",
    "vehicle_type": "motorcycle",
    ...
  }'

# Go online
curl -X POST https://staging.dottapps.com/api/couriers/couriers/update_status/ \
  -H "Cookie: sid=YOUR_SESSION_ID" \
  -d '{"availability_status": "online"}'
```

## Deployment

### Migration Script
```bash
cd /backend/pyfactor
python scripts/migrate_courier_feature.py
```

### Verification
```bash
# Check tables created
python manage.py dbshell
\dt courier*
```

## Monitoring

### Key Metrics to Track
- Registration conversion rate
- Average time to first delivery
- Courier retention rate
- Delivery success rate
- Customer complaints
- Average delivery time by city

### Alerts
- High cancellation rate (>10%)
- Low courier availability (<5 per city)
- Failed payouts
- Document verification backlog

## Support

### Common Issues

#### Courier Can't Go Online
- Check vehicle documents uploaded
- Verify identity verification complete
- Ensure location permissions granted

#### Delivery Not Assigned
- Check courier availability status
- Verify service radius settings
- Ensure courier trust level sufficient

#### Payout Failed
- Verify payment method details
- Check minimum payout threshold
- Ensure no pending disputes

## Revenue Model

### Platform Revenue Sources
1. **Delivery Commission**: 25% of delivery fee
2. **Surge Pricing**: Additional revenue during peak times
3. **Business Subscriptions**: Monthly fees for high-volume businesses
4. **Priority Placement**: Couriers pay for better visibility

### Courier Revenue Opportunities
1. **Base Delivery Fee**: 75% of customer payment
2. **Tips**: 100% retained
3. **Surge Bonuses**: Extra earnings during peak
4. **Volume Bonuses**: Rewards for high activity
5. **Referral Bonuses**: For bringing new couriers

## Legal & Compliance

### Required Documentation
- Business registration
- Tax identification
- Insurance (vehicle operators)
- Background checks
- Health certificates (food delivery)

### Platform Responsibilities
- Verify courier identity
- Maintain insurance records
- Process payments correctly
- Handle customer disputes
- Ensure data privacy

### Courier Responsibilities
- Maintain valid licenses
- Keep insurance current
- Follow traffic laws
- Maintain vehicle safety
- Protect customer data

## Success Metrics

### Launch Goals
- 100 registered couriers in first month
- 1000 successful deliveries
- 4.5+ average rating
- <30 minute average delivery time
- <5% cancellation rate

### Long-term Goals
- 1000+ active couriers
- 100,000 monthly deliveries
- Profitability within 6 months
- Expansion to 10 cities
- Partnership with 5+ courier companies
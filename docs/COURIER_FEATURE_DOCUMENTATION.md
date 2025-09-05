# Courier Delivery Feature Documentation
*Last Updated: 2025-09-05*

## Overview
The Courier feature enables businesses to register as couriers (delivery drivers) to deliver consumer products and services within the Dott marketplace platform. This feature supports various vehicle types including bicycles, motorcycles (boda bodas), cars, vans, and trucks, making it suitable for diverse African markets.

## Architecture

### Backend (Django)
- **App Location**: `/backend/pyfactor/couriers/`
- **Models**: CourierProfile, CourierCompany, CourierCompanyBranch, DeliveryOrder
- **API Endpoints**: `/api/couriers/` (registration, dashboard, status updates, deliveries)
- **Feature Flag**: `ENABLE_COURIER_COMPANIES = False` (for future company partnerships)

### Mobile App (React Native)
- **Registration Screen**: `/mobile/DottAppNative/src/screens/consumer/BusinessRegistrationScreen.js`
- **API Service**: `/mobile/DottAppNative/src/services/courierApi.js`
- **Navigation**: Consumer Account → "I have a business" → Transport/Delivery

## Key Features

### 1. Courier Registration
- Multi-step registration flow with document uploads
- Required documents:
  - Government ID (base64 encoded image)
  - Driver's License (for motorized vehicles)
  - Vehicle Registration
  - Selfie for verification
- Vehicle types supported:
  - Bicycle (no license required)
  - Motorcycle (including boda bodas)
  - Car
  - Van
  - Truck
  - Scooter

### 2. Verification System
- Progressive trust levels (1-5 stars)
- Document verification by admin
- Background check support
- Trust score affects delivery assignments

### 3. Delivery Management
- Real-time status updates (assigned, picked_up, in_transit, delivered)
- GPS tracking capability
- Delivery proof (signature/photo)
- Customer rating system

### 4. Communication Features
- Chat integration with consumers
- Voice/video call support (via existing chat system)
- In-app messaging during active deliveries

### 5. Earnings & Payments
- 75% commission to courier, 25% platform fee
- Daily/weekly/monthly earnings tracking
- Integrated with existing payment systems (Stripe, M-Pesa)
- Automatic settlement processing

### 6. Future Capability: Courier Companies
- Support for courier companies (DHL, FedEx, local companies)
- Company branch management
- Company-wide commission rates
- Currently disabled via feature flag

## Database Schema

### CourierProfile Model
```python
- user: OneToOne with User
- vehicle_type: CharField (bicycle, motorcycle, car, van, truck, scooter)
- vehicle_registration: CharField
- drivers_license: CharField (optional for bicycles)
- government_id: TextField (base64 image)
- selfie_verification: TextField (base64 image)
- is_verified: BooleanField
- is_available: BooleanField
- current_location: JSONField
- service_areas: ArrayField
- trust_level: IntegerField (1-5)
- total_deliveries: IntegerField
- average_rating: DecimalField
- total_earnings: DecimalField
- commission_rate: DecimalField (default 75%)
```

### DeliveryOrder Model
```python
- courier: ForeignKey to CourierProfile
- consumer_order: OneToOne with ConsumerOrder
- status: CharField (assigned, picked_up, in_transit, delivered, cancelled)
- pickup/delivery locations and times
- delivery_proof: TextField
- customer_signature: TextField
- delivery_fee: DecimalField
- courier_earnings: DecimalField (75% of fee)
- platform_fee: DecimalField (25% of fee)
```

## API Endpoints

### Registration
- `POST /api/couriers/register/` - Register as courier with documents

### Dashboard
- `GET /api/couriers/dashboard/` - Courier statistics and earnings

### Status Management
- `POST /api/couriers/status/` - Update availability status

### Deliveries
- `GET /api/couriers/available-deliveries/` - List deliveries in service area
- `POST /api/couriers/accept-delivery/` - Accept a delivery
- `POST /api/couriers/update-delivery-status/` - Update delivery progress

## Mobile App Integration

### Registration Flow
1. User navigates to Account → "I have a business"
2. Selects "Transport/Delivery" as business type
3. Enters vehicle information
4. Uploads required documents
5. Submits for verification
6. Receives notification when approved

### Courier Mode
- Accessed through Business menu
- Toggle availability status
- View available deliveries
- Track active deliveries
- Communicate with customers
- View earnings dashboard

## Revenue Model
- **Platform Fee**: 25% of delivery fee
- **Courier Commission**: 75% of delivery fee
- **Settlement**: Daily automatic processing
- **Payment Methods**: Direct to bank (via Wise) or mobile money

## Security & Verification
- Government ID verification
- Selfie matching for identity confirmation
- Vehicle registration validation
- Background check integration ready
- Progressive trust system based on performance

## Regional Considerations
- Supports boda boda (motorcycle taxis) common in East Africa
- No license required for bicycle couriers
- Multi-language support ready
- Local payment methods (M-Pesa, MTN Mobile Money)

## Future Enhancements
- Courier company partnerships (disabled by default)
- Route optimization
- Batch delivery support
- Insurance integration
- Real-time GPS tracking
- Heat map for high-demand areas

## Testing
### Mobile App
1. Sign in as consumer
2. Go to Account → "I have a business"
3. Select "Transport/Delivery"
4. Complete registration
5. Switch to Business mode
6. Access Courier Dashboard

### Backend
```bash
# Test courier registration
curl -X POST https://staging.dottapps.com/api/couriers/register/ \
  -H "Authorization: Bearer {token}" \
  -d '{"vehicle_type": "motorcycle", ...}'

# Get courier dashboard
curl https://staging.dottapps.com/api/couriers/dashboard/ \
  -H "Authorization: Bearer {token}"
```

## Configuration
### Environment Variables
```
ENABLE_COURIER_COMPANIES=false  # Enable when ready for company partnerships
COURIER_COMMISSION_RATE=0.75    # 75% to courier
PLATFORM_FEE_RATE=0.25          # 25% platform fee
```

### Feature Flags
- `ENABLE_COURIER_COMPANIES`: Enables courier company features (default: False)
- Set to True when ready to onboard courier companies like DHL, FedEx

## Database Tables Created
```sql
-- Created directly via dbshell due to migration conflicts
CREATE TABLE courier_profiles (...);
CREATE TABLE couriers_couriercompany (...);
CREATE TABLE delivery_orders (...);
```

## Key Files
- Backend models: `/backend/pyfactor/couriers/models.py`
- Backend views: `/backend/pyfactor/couriers/views.py`
- Backend serializers: `/backend/pyfactor/couriers/serializers.py`
- Mobile registration: `/mobile/DottAppNative/src/screens/consumer/BusinessRegistrationScreen.js`
- Mobile API: `/mobile/DottAppNative/src/services/courierApi.js`
- Settings: `/backend/pyfactor/pyfactor/settings.py`

## Notes
- Terminology changed from "drivers" to "couriers" for inclusivity
- Supports non-motorized delivery (bicycles, walking)
- Integrated with existing marketplace, chat, and payment systems
- Tables created manually due to migration dependency issues
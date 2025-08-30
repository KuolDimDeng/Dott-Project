# Dott Marketplace Feature Documentation
*Last Updated: 2025-08-30*

## Overview
The Dott Marketplace transforms the platform into a complete e-commerce ecosystem where businesses can list their products/services and consumers can discover, chat with, and order from businesses globally.

## Architecture

### Dual-Mode System
- **Business Mode**: Manage listings, handle orders, chat with customers
- **Consumer Mode**: Search businesses, browse products, place orders, chat with businesses
- Users can switch between modes seamlessly

### Technology Stack
- **Backend**: Django + Django REST Framework
- **Real-time**: Django Channels (WebSockets)
- **Frontend**: React/Next.js
- **Payments**: Stripe (worldwide) + M-Pesa (Kenya)
- **Database**: PostgreSQL

## Core Features

### 1. Business Listings
- Businesses create profiles with:
  - Business information and description
  - Product/service catalog
  - Business hours
  - Delivery scope (local/national/international/digital)
  - Location for proximity-based discovery
  - Categories and search tags

### 2. Consumer Discovery
- Location-aware search
- Category browsing (Food, Shopping, Transport, Health, Beauty, etc.)
- Filter by delivery capability
- Sort by distance, rating, or popularity
- Favorite businesses for quick access

### 3. Real-time Chat System
- WebSocket-based instant messaging
- Chat between consumers and businesses
- Message types: text, image, product, order
- Unread message counts
- Chat-to-order conversion
- Template messages for businesses

### 4. Order Management
- Create orders from chat or directly
- Order tracking with status updates:
  - Pending → Confirmed → Preparing → Ready → Delivered
- Delivery notes and special instructions
- Order history and reordering
- Cancellation and refund support

### 5. Payment Integration
- **Global**: Stripe card payments
- **Kenya**: M-Pesa mobile money
- **Platform Fee**: 2.5% on all transactions
- **Features**:
  - Payment intents for secure processing
  - Refund processing
  - Payment method detection by country
  - Stripe Connect for business payouts

## API Endpoints

### Consumer Endpoints
```
# Search & Discovery
GET/POST /api/marketplace/consumer/search/
GET     /api/marketplace/consumer/categories/
POST    /api/marketplace/consumer/update-location/

# Orders
GET     /api/marketplace/consumer/orders/
POST    /api/marketplace/consumer/orders/
GET     /api/marketplace/consumer/orders/{id}/
POST    /api/marketplace/consumer/orders/{id}/cancel/
GET     /api/marketplace/consumer/recent-orders/

# Favorites
GET     /api/marketplace/consumer/favorites/
POST    /api/marketplace/consumer/favorites/toggle/
GET     /api/marketplace/consumer/favorites/check/{business_id}/

# Payments
POST    /api/marketplace/consumer/payments/create-intent/
POST    /api/marketplace/consumer/payments/mpesa/
POST    /api/marketplace/consumer/payments/confirm/
POST    /api/marketplace/consumer/payments/refund/
GET     /api/marketplace/consumer/payments/methods/
```

### Business Endpoints
```
# Listing Management
GET/POST /api/marketplace/business/my-listing/
POST    /api/marketplace/business/update-delivery/
GET     /api/marketplace/business/{id}/public/
GET     /api/marketplace/business/{id}/products/
GET     /api/marketplace/business/{id}/services/
```

### Chat Endpoints
```
# REST API
GET     /api/chat/conversations/
POST    /api/chat/conversations/
GET     /api/chat/conversations/{id}/
GET     /api/chat/conversations/{id}/messages/
POST    /api/chat/conversations/{id}/messages/

# WebSocket
ws://   /ws/chat/{conversation_id}/
```

## Database Models

### Core Models
- **BusinessListing**: Business marketplace profiles
- **ConsumerProfile**: Consumer preferences and history
- **ConsumerOrder**: Order records
- **OrderReview**: Post-order reviews
- **ChatConversation**: Chat sessions
- **ChatMessage**: Individual messages
- **BusinessSearch**: Search analytics

### Key Fields

#### BusinessListing
- business (User FK)
- primary_category
- delivery_scope
- business_hours (JSON)
- latitude/longitude
- average_rating
- total_orders
- is_verified

#### ConsumerOrder
- order_number (unique)
- consumer/business (User FKs)
- items (JSON)
- total_amount
- order_status
- payment_status
- payment_intent_id (Stripe)
- payment_transaction_id (M-Pesa)

## Payment Flow

### Stripe (Card Payments)
1. Create payment intent → Get client secret
2. Frontend confirms payment with Stripe
3. Backend verifies payment status
4. Order confirmed and business notified
5. Platform fee (2.5%) automatically deducted

### M-Pesa (Kenya)
1. User enters phone number
2. Payment request sent to phone
3. User approves on phone
4. Backend confirms transaction
5. Order confirmed

## WebSocket Chat Protocol

### Connection
```javascript
ws://api.dottapps.com/ws/chat/{conversation_id}/
```

### Message Format
```json
{
  "type": "chat.message",
  "message": {
    "id": "uuid",
    "text": "Hello",
    "sender": "user_id",
    "timestamp": "2025-08-30T10:00:00Z"
  }
}
```

## Security Features
- Session-based authentication
- Tenant isolation for multi-tenancy
- HTTPS/WSS encryption
- Payment data never stored locally
- Rate limiting on API endpoints

## Deployment Configuration

### Environment Variables
```bash
# Existing variables plus:
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_EXPRESS_ACCOUNT_ID=acct_...

# For M-Pesa (when ready)
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_PASSKEY=...
MPESA_SHORTCODE=...

# Redis for WebSockets
REDIS_URL=redis://...
```

### Django Settings
- Added apps: `marketplace`, `chat`, `channels`
- Configured CHANNEL_LAYERS for WebSockets
- ASGI configuration for WebSocket support

## Migration Instructions for Render

### Step 1: Access Render Shell
1. Go to your Render dashboard
2. Navigate to your backend service (dott-api)
3. Click on "Shell" tab

### Step 2: Run Migrations
```bash
# In Render shell, run:
cd /app
python manage.py makemigrations marketplace chat
python manage.py migrate
```

### Step 3: Verify
```bash
# Check migrations were applied:
python manage.py showmigrations marketplace
python manage.py showmigrations chat
```

### Step 4: Restart Service
- Go to Render dashboard
- Click "Manual Deploy" → "Deploy latest commit"
- Or click "Restart service"

## Testing the Marketplace

### Test Business Listing Creation
```bash
curl -X POST https://api.dottapps.com/api/marketplace/business/my-listing/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "primary_category": "food_beverage",
    "delivery_scope": "local",
    "description": "Test restaurant"
  }'
```

### Test Consumer Search
```bash
curl https://api.dottapps.com/api/marketplace/consumer/search/?q=food \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Monitoring & Analytics

### Key Metrics to Track
- Total businesses registered
- Active consumers
- Orders per day
- Average order value
- Platform fee revenue
- Chat-to-order conversion rate
- Search-to-order conversion rate

### Database Indexes
Optimized for:
- Location-based queries
- Category filtering
- Order lookups
- Chat message retrieval

## Future Enhancements

### Phase 2 (Planned)
- [ ] Delivery tracking integration
- [ ] Multi-language support
- [ ] Push notifications
- [ ] Advanced analytics dashboard
- [ ] Promotional campaigns
- [ ] Loyalty programs

### Phase 3 (Planned)
- [ ] AI-powered recommendations
- [ ] Voice ordering
- [ ] Augmented reality product view
- [ ] Blockchain payment options
- [ ] Social commerce features

## Troubleshooting

### Common Issues

#### WebSocket Connection Failed
- Check REDIS_URL is configured
- Verify ASGI server is running
- Check ALLOWED_HOSTS includes WebSocket domain

#### Payment Processing Error
- Verify Stripe keys are correct
- Check webhook endpoints are accessible
- Ensure STRIPE_EXPRESS_ACCOUNT_ID is set

#### Migration Errors
- Drop and recreate migrations if needed:
```bash
rm -rf marketplace/migrations/
rm -rf chat/migrations/
python manage.py makemigrations marketplace chat
python manage.py migrate --fake-initial
```

## Support
For issues or questions about the marketplace:
- Technical: Check `/backend/pyfactor/docs/TROUBLESHOOTING.md`
- Business: Contact product team
- Urgent: Check Sentry for error logs
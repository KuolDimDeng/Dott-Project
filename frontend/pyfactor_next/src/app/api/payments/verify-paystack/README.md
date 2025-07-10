# Paystack Payment Verification API

This endpoint verifies Paystack payments and updates user subscriptions.

## Endpoint
`POST /api/payments/verify-paystack`

## Request Body
```json
{
  "reference": "paystack_payment_reference"
}
```

## Environment Variables Required
- `PAYSTACK_SECRET_KEY`: Your Paystack secret key
- `NEXT_PUBLIC_API_URL`: Backend API URL (defaults to https://api.dottapps.com)

## Flow
1. Receives payment reference from client
2. Verifies payment status with Paystack API
3. Extracts subscription details from payment metadata
4. Updates user subscription in backend
5. Returns verification result

## Response
### Success
```json
{
  "success": true,
  "message": "Payment verified and subscription activated successfully",
  "subscription": {
    "id": "sub_123",
    "status": "active"
  },
  "payment": {
    "reference": "ref_123",
    "amount": 15,
    "currency": "USD",
    "paid_at": "2025-01-10T10:00:00Z"
  }
}
```

### Error
```json
{
  "error": "Error message",
  "payment_status": "failed"
}
```

## Integration Notes
- Payment amounts from Paystack are in minor units (kobo/cents)
- Metadata must include `plan` and `billing_cycle` fields
- Uses session-based authentication (sid/session_token cookie)
- Implements rate limiting for payment endpoints
- Critical errors are logged for manual intervention

## Backend Integration
The endpoint expects the backend to have a `/api/payments/update-subscription/` endpoint that accepts:
- `payment_reference`
- `payment_method`
- `plan`
- `billing_cycle`
- `amount`
- `currency`
- `payment_data` (Paystack-specific details)
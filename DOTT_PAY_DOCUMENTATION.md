# Dott Pay QR Payment System Documentation

## Overview
Dott Pay is a revolutionary QR-based payment system that enables instant, secure transactions between consumers and businesses. Similar to China's Alipay and WeChat Pay, each consumer has a unique QR code linked to their preferred payment methods.

## System Architecture

### Core Components
1. **Consumer QR Code**: Unique identifier linked to payment methods
2. **Business Scanner**: Mobile app QR scanner for merchants
3. **Payment Processing**: Secure backend API for transaction processing
4. **Security Layer**: Encryption, limits, and fraud detection

## User Flow

### For Consumers
1. Open Dott app → Settings → Payment Methods
2. View personal QR code
3. Link cards, M-Pesa, or MTN Mobile Money
4. Present QR code to merchant for payment
5. Auto-approve small transactions, manual approval for large ones

### For Businesses
1. Open POS screen in business mode
2. Add items to cart
3. Select "Dott Pay" as payment method
4. Scan customer's QR code
5. Payment processes instantly
6. Receipt generated automatically

## Technical Implementation

### Backend Structure

#### Models (`/backend/pyfactor/payments/models_dott_pay.py`)
```python
DottPayProfile:
  - qr_code_id: Unique identifier
  - daily_limit: Transaction limits
  - default_payment_method: Preferred payment
  - security settings: PIN, biometric, 2FA

DottPayTransaction:
  - Real-time processing
  - Fee calculation
  - Gateway integration
  - Status tracking

DottPaySecurityLog:
  - Audit trail
  - Risk scoring
  - Fraud detection
```

#### API Endpoints (`/payments/dott-pay/`)
- `GET /profile/my/` - Get user's Dott Pay profile
- `GET /profile/qr-code/` - Get QR code data
- `POST /profile/limits/` - Update transaction limits
- `POST /profile/payment-method/` - Set default payment
- `GET /profile/transactions/` - Transaction history
- `POST /merchant/scan/` - Process QR payment
- `GET /merchant/status/` - Check transaction status

### Mobile Integration

#### React Native Components
1. **PaymentMethodsScreen** (`/mobile/DottAppNative/src/screens/PaymentMethodsScreen.js`)
   - QR code display
   - Payment method management
   - Card/Mobile money linking

2. **QRScanner** (`/mobile/DottAppNative/src/components/QRScanner.js`)
   - Camera integration
   - QR validation
   - Payment confirmation UI

3. **POSScreen** (`/mobile/DottAppNative/src/screens/business/POSScreen.js`)
   - Dott Pay integration
   - Transaction processing
   - Receipt generation

#### API Service (`/mobile/DottAppNative/src/services/dottPayApi.js`)
- Profile management
- Payment processing
- Security settings
- Transaction history

## Security Features

### Multi-Layer Protection
1. **QR Code Security**
   - 60-second expiration
   - Encrypted payload
   - Version control
   - Unique identifiers

2. **Transaction Limits**
   - Daily spending limits
   - Single transaction limits
   - Auto-approval thresholds
   - Manual approval for high-value

3. **Authentication**
   - Optional PIN for high-value
   - Biometric support
   - Two-factor authentication
   - Device fingerprinting

4. **Audit & Monitoring**
   - Complete audit trail
   - Risk scoring
   - Suspicious activity detection
   - Real-time alerts

## Payment Methods Supported

### Credit/Debit Cards (via Stripe)
- Visa, Mastercard, American Express
- Tokenized for security
- 2.9% + $0.30 gateway fee
- PCI compliant

### Mobile Money
- **M-Pesa** (Kenya, Tanzania, etc.)
- **MTN Mobile Money** (Uganda, Ghana, etc.)
- 2% platform fee
- Instant processing

### Bank Accounts (Future)
- ACH transfers
- Wire transfers
- Direct debit

## Fee Structure

### Platform Fees
- **Dott Pay transactions**: 0.5% platform fee
- **Card payments**: 2.9% + $0.30 (Stripe) + 0.5% platform
- **Mobile money**: 2% total
- **Net to merchant**: Amount - fees

### Example Transaction
- Customer pays: $100
- Card fee (Stripe): $3.20
- Platform fee: $0.50
- Merchant receives: $96.30

## Database Migration

Run migration to create Dott Pay tables:
```bash
cd /backend/pyfactor
python manage.py migrate payments
```

## Environment Variables

No additional environment variables required. Uses existing:
- `STRIPE_SECRET_KEY` - For card processing
- `MPESA_*` - For M-Pesa integration
- `MTN_*` - For MTN Mobile Money

## Testing

### Development Testing
1. Mock QR scanner in development mode
2. Test QR code: "Simulate Scan" button
3. Test payment methods without real cards

### API Testing
```bash
# Test QR generation
curl -X GET https://staging.dottapps.com/api/payments/dott-pay/profile/qr-code/

# Test payment processing
curl -X POST https://staging.dottapps.com/api/payments/dott-pay/merchant/scan/ \
  -d '{"qr_data": "...", "amount": 10.00}'
```

## Troubleshooting

### Common Issues

1. **QR Code Not Generating**
   - Check user authentication
   - Verify Dott Pay profile exists
   - Check API connectivity

2. **Payment Failing**
   - Verify payment method is linked
   - Check transaction limits
   - Confirm merchant account active

3. **Scanner Not Working**
   - Check camera permissions
   - Verify QR code format
   - Test with mock scanner first

## Future Enhancements

### Phase 2 (Q2 2025)
- [ ] Offline payment capability
- [ ] NFC tap-to-pay
- [ ] Recurring payments
- [ ] Split payments

### Phase 3 (Q3 2025)
- [ ] Loyalty points integration
- [ ] Cashback rewards
- [ ] P2P transfers
- [ ] International payments

### Phase 4 (Q4 2025)
- [ ] Cryptocurrency support
- [ ] Voice-activated payments
- [ ] AI fraud detection
- [ ] Predictive analytics

## Competitive Advantages

### vs Traditional Card Payments
- No card required
- Instant processing
- Lower fees
- Better security

### vs Cash
- Digital receipts
- Transaction history
- No change needed
- Hygiene benefits

### vs Other Digital Wallets
- Universal QR standard
- Multi-payment method
- Integrated with POS
- Works offline (future)

## Market Opportunity

### Target Markets
1. **Retail**: Fast checkout
2. **Restaurants**: Table payments
3. **Transport**: Tap and go
4. **Services**: Instant billing

### Geographic Expansion
- **Phase 1**: East Africa (Kenya, Uganda, Tanzania)
- **Phase 2**: West Africa (Nigeria, Ghana)
- **Phase 3**: Southern Africa (South Africa, Zimbabwe)
- **Phase 4**: Global expansion

## Success Metrics

### KPIs to Track
- Transaction volume
- Average transaction value
- Payment success rate
- User adoption rate
- Merchant satisfaction
- Processing time
- Fraud rate
- Customer retention

## Support & Resources

### Documentation
- API Reference: `/docs/api/dott-pay/`
- Integration Guide: `/docs/integration/dott-pay/`
- Security Best Practices: `/docs/security/dott-pay/`

### Contact
- Technical Support: support@dottapps.com
- Integration Help: developers@dottapps.com
- Security Issues: security@dottapps.com

## Conclusion

Dott Pay represents the future of payments in emerging markets, combining the convenience of QR codes with the security of modern payment infrastructure. By enabling instant, secure transactions without physical cards or cash, Dott Pay empowers both consumers and businesses to participate in the digital economy.

---

*"Scan. Pay. Done."* - The Dott Pay Promise

## Appendix

### QR Code Format
```json
{
  "userId": "uuid",
  "qrId": "uuid",
  "userEmail": "user@example.com",
  "timestamp": 1234567890000,
  "version": "1.0",
  "type": "DOTT_PAY"
}
```

### Transaction Response
```json
{
  "success": true,
  "transaction_id": "DOTT-20250108-ABC123",
  "status": "approved",
  "amount": "100.00",
  "currency": "USD",
  "consumer": {
    "email": "customer@example.com",
    "id": "user-uuid"
  },
  "net_amount": "96.30",
  "fees": {
    "platform": "0.50",
    "gateway": "3.20"
  }
}
```

### Error Codes
- `QR001`: Invalid QR code format
- `QR002`: QR code expired
- `PAY001`: Insufficient funds
- `PAY002`: Transaction limit exceeded
- `PAY003`: Payment method not found
- `SEC001`: Authentication required
- `SEC002`: Suspicious activity detected
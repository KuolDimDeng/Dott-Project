# Production Mobile Money Payment Setup

## ⚠️ CRITICAL: Production vs Staging Separation

### Staging Environment (Current)
```bash
# For staging.dottapps.com
PAYMENT_TEST_MODE=True
FIELD_ENCRYPTION_KEY=KEW5YU-eunM16piy00EEY6tUtNI4MlFeJDM_vkx0utg=
MOMO_SANDBOX_SUBSCRIPTION_KEY=326d22e6674c4d0e93831b138f4d6407
```

### Production Environment (When Ready)
```bash
# For api.dottapps.com (DIFFERENT KEYS!)
PAYMENT_TEST_MODE=False
FIELD_ENCRYPTION_KEY=KW4GChRsJQyXtlvPyEXBlh9XGKsf3PG7sJO4bNuP9mM=  # NEW KEY!
MOMO_PRODUCTION_SUBSCRIPTION_KEY=<get_from_mtn_production>
MOMO_PRODUCTION_API_USER=<get_from_mtn_production>
MOMO_PRODUCTION_API_KEY=<get_from_mtn_production>
```

## Steps to Go Live with Production

### 1. Register for Production API Access

#### MTN MoMo Production
1. Go to https://momodeveloper.mtn.com
2. Complete KYC (Know Your Customer) verification
3. Submit business documents:
   - Business registration
   - Bank account details
   - Tax registration
4. Wait for approval (typically 5-10 business days)
5. You'll receive:
   - Production Subscription Key
   - Production API User
   - Production API Key

#### M-Pesa Production (Safaricom)
1. Go to https://developer.safaricom.co.ke
2. Create a production app
3. Submit for Go-Live approval with:
   - Business registration documents
   - Integration test results
   - Security questionnaire
4. After approval, you'll get:
   - Production Consumer Key
   - Production Consumer Secret
   - Your Business Shortcode
   - Production Passkey

### 2. Configure Production Webhooks

#### MTN MoMo Webhooks
```
Production Callback URL: https://api.dottapps.com/api/payments/mobile-money/webhook/
```

#### M-Pesa Webhooks
```
Validation URL: https://api.dottapps.com/api/payments/mobile-money/webhook/validate/
Confirmation URL: https://api.dottapps.com/api/payments/mobile-money/webhook/confirm/
```

### 3. Add to Render Production

1. Go to https://dashboard.render.com
2. Select `dott-api` (production service)
3. Navigate to Environment tab
4. Add these variables:

| Variable | Value | Description |
|----------|-------|-------------|
| `PAYMENT_TEST_MODE` | `False` | Enables production mode |
| `FIELD_ENCRYPTION_KEY` | `KW4GChRsJQyXtlvPyEXBlh9XGKsf3PG7sJO4bNuP9mM=` | Production encryption key |
| `MOMO_PRODUCTION_SUBSCRIPTION_KEY` | Your production key | From MTN |
| `MOMO_PRODUCTION_API_USER` | Your API user | From MTN |
| `MOMO_PRODUCTION_API_KEY` | Your API key | From MTN |
| `MPESA_CONSUMER_KEY` | Your consumer key | From Safaricom |
| `MPESA_CONSUMER_SECRET` | Your consumer secret | From Safaricom |
| `MPESA_SHORTCODE` | Your business code | From Safaricom |
| `MPESA_PASSKEY` | Your passkey | From Safaricom |

### 4. Update Backend Code for Production

The backend already handles both environments. It checks:
```python
if settings.PAYMENT_TEST_MODE:
    # Use sandbox credentials
else:
    # Use production credentials
```

### 5. Production Checklist

Before going live, ensure:

- [ ] Production API credentials obtained from MTN/Safaricom
- [ ] Different encryption keys for staging vs production
- [ ] Webhook URLs registered with providers
- [ ] SSL certificate valid on api.dottapps.com
- [ ] Error logging configured (Sentry)
- [ ] Database backups enabled
- [ ] Rate limiting configured
- [ ] Security headers in place
- [ ] Transaction monitoring setup
- [ ] Reconciliation process defined

## Security Best Practices

### 1. Key Management
- **NEVER** commit production keys to Git
- Use different keys for each environment
- Rotate keys every 90 days
- Store backup keys securely

### 2. Monitoring
- Set up alerts for failed payments
- Monitor webhook failures
- Track platform fee collection
- Daily reconciliation reports

### 3. Compliance
- PCI DSS compliance (for card data)
- Data protection regulations
- Financial services regulations
- Keep audit logs

## Testing Production

### Safe Production Testing
1. Start with small amounts (minimum allowed)
2. Test during business hours
3. Have rollback plan ready
4. Monitor first 24 hours closely

### Test Commands
```bash
# Test MTN MoMo Production
curl -X POST https://api.dottapps.com/api/payments/mobile-money/initialize/ \
  -H "Authorization: Bearer PRODUCTION_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "256700000000",
    "amount": "1000",
    "provider": "mtn_momo",
    "currency": "UGX"
  }'

# Check status
curl -X GET https://api.dottapps.com/api/payments/mobile-money/status/REFERENCE_ID/ \
  -H "Authorization: Bearer PRODUCTION_TOKEN"
```

## Emergency Procedures

### If Production Keys Are Compromised
1. Immediately change `PAYMENT_TEST_MODE=True` to disable production
2. Generate new encryption key
3. Contact MTN/Safaricom to reset API credentials
4. Review transaction logs for unauthorized activity
5. Notify affected customers if needed

### Rollback Procedure
```bash
# In Render Dashboard
1. Set PAYMENT_TEST_MODE=True
2. Service will auto-restart in sandbox mode
3. Investigate and fix issues
4. Re-enable production when resolved
```

## Support Contacts

### MTN MoMo Support
- Email: momodeveloper@mtn.com
- Portal: https://momodeveloper.mtn.com/support

### M-Pesa Support
- Email: apisupport@safaricom.co.ke
- Portal: https://developer.safaricom.co.ke/support

## Revenue & Fees

### Platform Fees (Your Revenue)
- Mobile Money: 2% of transaction
- Example: UGX 10,000 payment = UGX 200 platform fee

### Provider Fees (They Charge)
- MTN MoMo: ~1-2% (varies by country)
- M-Pesa: 0.5-1.5% (varies by amount)

### Net Revenue
Your profit = Platform fee - Provider fee
Example: 2% - 1% = 1% net revenue per transaction

---

**Remember**: Production handles real money. Test thoroughly in staging first!
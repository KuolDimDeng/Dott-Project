# Mobile Money Environment Variables Setup

## Generated Environment Variables

```bash
PAYMENT_TEST_MODE=True  # Set to False for production
FIELD_ENCRYPTION_KEY=KEW5YU-eunM16piy00EEY6tUtNI4MlFeJDM_vkx0utg=
MOMO_SANDBOX_SUBSCRIPTION_KEY=326d22e6674c4d0e93831b138f4d6407
```

## Adding to Render (Staging/Production)

### 1. Log into Render Dashboard
- Go to https://dashboard.render.com
- Select your backend service (dott-api or dott-api-staging)

### 2. Navigate to Environment Variables
- Click on "Environment" tab
- Click "Add Environment Variable"

### 3. Add Each Variable
Add these one by one:

| Key | Value | Notes |
|-----|--------|------|
| `PAYMENT_TEST_MODE` | `True` | Set to `False` for production |
| `FIELD_ENCRYPTION_KEY` | `KEW5YU-eunM16piy00EEY6tUtNI4MlFeJDM_vkx0utg=` | Keep this secret! |
| `MOMO_SANDBOX_SUBSCRIPTION_KEY` | `326d22e6674c4d0e93831b138f4d6407` | Your MTN MoMo API key |

### 4. Optional: M-Pesa Credentials
When you get your M-Pesa credentials, add:

| Key | Value | Notes |
|-----|--------|------|
| `MPESA_CONSUMER_KEY` | `your_key_here` | From Safaricom developer portal |
| `MPESA_CONSUMER_SECRET` | `your_secret_here` | Keep secret! |
| `MPESA_SHORTCODE` | `174379` | Sandbox: 174379, Production: your business shortcode |
| `MPESA_PASSKEY` | `bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919` | Sandbox passkey |

## Testing Your Integration

### 1. Test MTN MoMo Payment
```bash
curl -X POST https://staging.dottapps.com/api/payments/mobile-money/initialize/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "46733123450",
    "amount": "10.00",
    "provider": "mtn_momo",
    "currency": "EUR",
    "message": "Test payment"
  }'
```

### 2. Check Payment Status
```bash
curl -X GET https://staging.dottapps.com/api/payments/mobile-money/status/REFERENCE_ID/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Security Notes

⚠️ **IMPORTANT**: 
- Never commit the `FIELD_ENCRYPTION_KEY` to git
- Keep your production keys separate from sandbox keys
- Rotate encryption keys periodically
- Use different keys for staging and production

## Encryption Key Regeneration

If you need a new encryption key:

```python
from cryptography.fernet import Fernet
new_key = Fernet.generate_key()
print(new_key.decode())
```

## Troubleshooting

### Issue: "Encryption key not configured"
**Solution**: Ensure `FIELD_ENCRYPTION_KEY` is set in environment variables

### Issue: "MTN MoMo authentication failed"
**Solution**: Check `MOMO_SANDBOX_SUBSCRIPTION_KEY` is correct

### Issue: "Payment test mode not set"
**Solution**: Add `PAYMENT_TEST_MODE=True` for sandbox testing

## Next Steps

1. ✅ Environment variables added to local .env
2. ⬜ Add variables to Render staging environment
3. ⬜ Test MTN MoMo payment in mobile app
4. ⬜ Test M-Pesa payment (when credentials available)
5. ⬜ Monitor webhook callbacks
6. ⬜ Set up production credentials when ready
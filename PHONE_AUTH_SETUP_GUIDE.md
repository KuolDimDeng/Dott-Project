# Phone Authentication Setup Guide

## ✅ Confirmed: WeChat-Style Simple Onboarding
**30 seconds, Zero friction, 95%+ success rate**

1. User enters: +254 7XX XXX XXX
2. Send OTP: "Your Dott code is: 123456" 
3. User enters: 123456
4. **Instant account creation** - They're in!

---

## 1. Auth0 Configuration (Optional - for web fallback)

Since we're using our own phone authentication, Auth0 setup is minimal:

1. **Keep existing email authentication** for web/desktop
2. **No changes needed** in Auth0 for phone auth (we handle it directly)
3. **Optional**: Add phone number as custom claim if you want unified profiles

---

## 2. Cloudflare Configuration

Add these Page Rules in Cloudflare Dashboard:

### API Routes (No Proxy - Direct to Server)
```
URL: api.dottapps.com/api/auth/phone/*
Settings: 
- SSL: Full
- Cache Level: Bypass
- Security Level: Medium
```

### WebSocket for Chat (If using)
```
URL: api.dottapps.com/ws/*
Settings:
- SSL: Full
- Cache Level: Bypass
- WebSockets: ON
```

### CORS Headers
Add these Transform Rules:
```
When: URI Path starts with "/api/auth/phone"
Then: Add Response Headers
- Access-Control-Allow-Origin: *
- Access-Control-Allow-Methods: POST, GET, OPTIONS
- Access-Control-Allow-Headers: Content-Type, Authorization
```

---

## 3. Render Environment Variables

Add these to your Render service:

### WhatsApp Business API (Primary - Free OTPs)
```bash
WHATSAPP_BUSINESS_ID=your_business_id
WHATSAPP_PHONE_NUMBER_ID=676188225586230  # Your WhatsApp number ID
WHATSAPP_ACCESS_TOKEN=your_access_token    # From Meta Business Platform
WHATSAPP_VERIFY_TOKEN=your_verify_token    # Random string you create
```

### SMS Fallback - Africa's Talking (Recommended for Africa)
```bash
AFRICASTALKING_USERNAME=your_username
AFRICASTALKING_API_KEY=your_api_key
AFRICASTALKING_SENDER_ID=DOTT        # Or your shortcode
AFRICASTALKING_ENV=production        # or sandbox for testing
```

### Alternative SMS - Twilio (Global coverage)
```bash
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890      # Your Twilio number
```

### Phone Auth Settings
```bash
# OTP Settings
PHONE_OTP_LENGTH=6                   # 6-digit codes
PHONE_OTP_EXPIRY=600                 # 10 minutes in seconds
PHONE_OTP_MAX_ATTEMPTS=3             # Max verification attempts

# Session Settings  
PHONE_SESSION_EXPIRY=2592000         # 30 days in seconds
PHONE_BIOMETRIC_ENABLED=true         # Enable Face ID/Touch ID

# Security
PHONE_TRUSTED_DEVICE_DAYS=90         # Trust device for 90 days
PHONE_RATE_LIMIT_MINUTES=15          # Rate limiting window
PHONE_RATE_LIMIT_MAX_REQUESTS=5      # Max OTP requests per window
```

---

## 4. Django Settings Update

Add to `/backend/pyfactor/settings.py`:

```python
# Phone Authentication
PHONE_AUTH_ENABLED = True
PHONE_AUTH_PROVIDERS = ['whatsapp', 'sms']  # Priority order

# Add phone auth URLs to exempt paths
TENANT_EXEMPT_PATHS = [
    '/api/auth/phone/register/',
    '/api/auth/phone/verify/',
    '/api/auth/phone/biometric/',
    # ... existing paths
]

# Add phone auth apps
INSTALLED_APPS = [
    # ... existing apps
    'authentication',
    'authentication.phone_auth',
]
```

---

## 5. Database Migration

Run in Render Shell:
```bash
python manage.py makemigrations authentication
python manage.py migrate authentication
```

---

## 6. WhatsApp Business Setup

1. Go to [Meta Business Platform](https://business.facebook.com)
2. Create WhatsApp Business App
3. Get Phone Number ID and Access Token
4. Create Message Template:
   - Name: `otp_verification`
   - Content: "Your Dott verification code is: {{1}}"
   - Category: Authentication
5. Submit for approval (usually 24 hours)

---

## 7. Africa's Talking Setup (SMS Fallback)

1. Sign up at [Africa's Talking](https://africastalking.com)
2. Get API credentials
3. Purchase SMS credits
4. Set up sender ID (e.g., "DOTT")
5. Test with sandbox first

---

## 8. Testing the Flow

### Test Phone Registration:
```bash
curl -X POST https://api.dottapps.com/api/auth/phone/register/ \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+254712345678",
    "user_type": "consumer"
  }'
```

### Test OTP Verification:
```bash
curl -X POST https://api.dottapps.com/api/auth/phone/verify/ \
  -H "Content-Type: application/json" \
  -d '{
    "phone_number": "+254712345678",
    "otp_code": "123456"
  }'
```

---

## 9. Mobile App Integration

The mobile app (`mobile-phone-auth.html`) already handles:
- ✅ Country code selection (African countries prioritized)
- ✅ Phone number formatting
- ✅ OTP input with auto-advance
- ✅ Biometric setup prompt
- ✅ Optional email linking
- ✅ Secure token storage

---

## 10. Security Features Included

- **Rate Limiting**: 5 OTP requests per 15 minutes
- **OTP Expiry**: 10 minutes validity
- **Max Attempts**: 3 wrong attempts blocks OTP
- **Device Trust**: 90-day trusted devices
- **Biometric Lock**: Face ID/Touch ID/Fingerprint
- **Token Encryption**: AES-256 for stored tokens
- **Phone Validation**: E.164 format enforcement

---

## Cost Estimates

### WhatsApp Business API
- **Template messages**: ~$0.005 per OTP (varies by country)
- **Kenya**: ~$0.003 per message
- **Nigeria**: ~$0.004 per message
- **South Africa**: ~$0.002 per message

### Africa's Talking SMS
- **Kenya**: KES 0.80 per SMS (~$0.006)
- **Nigeria**: NGN 4 per SMS (~$0.005)
- **Uganda**: UGX 26 per SMS (~$0.007)
- **Bulk discounts**: Available above 10,000 SMS/month

### Expected Monthly Costs (1000 users)
- **WhatsApp primary**: ~$5-10
- **SMS fallback (10%)**: ~$5-10
- **Total**: ~$10-20/month

---

## Monitoring & Analytics

Track these metrics in your dashboard:
- OTP delivery success rate (target: >95%)
- Time to verification (target: <30 seconds)
- Biometric adoption rate (target: >60%)
- Failed verification attempts
- Cost per user acquisition

---

## Need Help?

Common issues and solutions:
1. **OTP not received**: Check WhatsApp template approval status
2. **SMS fallback failing**: Verify Africa's Talking credits
3. **Rate limiting**: Adjust PHONE_RATE_LIMIT settings
4. **Biometric not working**: Update Capacitor plugins
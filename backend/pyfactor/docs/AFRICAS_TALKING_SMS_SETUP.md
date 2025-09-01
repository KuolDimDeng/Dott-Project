# Africa's Talking SMS Integration Setup Guide

## 📱 Overview

This document explains how to set up SMS integration with Africa's Talking API for the business contact feature. When customers want to contact placeholder businesses, we send SMS via Africa's Talking to invite them to join Dott.

## 🚀 Features Implemented

- **Customer-to-Business SMS**: Automatic SMS when customer shows interest
- **Hybrid Registration**: Show context but let business enter fresh data
- **Delivery Tracking**: Monitor SMS delivery status
- **Opt-out Handling**: Respect STOP requests
- **Rate Limiting**: Prevent spam (24-hour cooldown)
- **Multi-country Support**: Kenya (+254), South Sudan (+211), Uganda (+256), etc.

## 📋 Prerequisites

1. **Africa's Talking Account**
   - Sign up at: https://account.africastalking.com/
   - Get API key and username
   - Add credits to your account

2. **Sender ID (Optional but Recommended)**
   - Apply for custom sender ID like "DOTT" or "DottApp"
   - Requires business verification
   - Takes 1-3 business days

## ⚙️ Environment Configuration

Add these variables to your `.env` file:

```bash
# Africa's Talking SMS Configuration
AFRICAS_TALKING_API_KEY=atsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxx
AFRICAS_TALKING_USERNAME=sandbox  # Use 'sandbox' for testing, your username for production
SMS_SENDER_ID=DOTT  # Your approved sender ID
```

### Getting Your Credentials

1. **API Key**:
   - Login to Africa's Talking dashboard
   - Go to "Apps" → Create new app or use existing
   - Copy the API Key (starts with `atsk_`)

2. **Username**:
   - For testing: Use `sandbox`
   - For production: Your actual username (usually your business name)

3. **Sender ID**:
   - Default: Uses your phone number
   - Custom: Apply for branded sender ID (recommended)

## 🗄️ Database Setup

Run migrations to create the required tables:

```bash
# Add 'business' to INSTALLED_APPS in settings.py
python manage.py makemigrations business
python manage.py migrate
```

### Database Tables Created

- `placeholder_businesses` - Scraped business data
- `business_contact_logs` - SMS contact history
- `sms_opt_outs` - Businesses that replied STOP
- `business_leads` - Interested businesses

## 🔗 API Endpoints

### Send Contact SMS
```http
POST /api/business/send-contact-sms
Content-Type: application/json
Authorization: Bearer <session_token>

{
  "businessPhone": "+254701234567",
  "businessName": "Mama Lucy Restaurant",
  "businessId": "ph1", 
  "businessCountry": "KE",
  "customerRequest": "I want to order ugali and fish",
  "businessAddress": "Kenyatta Avenue, Nairobi",
  "businessCategory": "Food & Dining",
  "source": "google_places"
}
```

### Response
```json
{
  "success": true,
  "messageId": "ATXid_xxxxxxxxxxxxx",
  "estimatedDelivery": "within 1-2 minutes", 
  "cost": "KES 1.00",
  "status": "SMS sent successfully"
}
```

## 📱 SMS Message Template

The hybrid approach SMS template:

```
Hi Mama Lucy Restaurant! 📱

A customer is interested in your business:

👤 Customer: John Doe
💬 Request: "I want to order ugali and fish"
📍 Location: Kenyatta Avenue, Nairobi

🚀 Join Dott to serve this customer and grow your business!

✅ Accept payments (Card, M-Pesa)
✅ Manage orders & inventory
✅ Reach more customers

👉 Sign up here: https://app.dottapps.com/signup?ref=ph1&type=customer-referral&source=sms

Reply STOP to opt out.
---
Dott Business Platform
```

## 🔧 Frontend Integration

The frontend automatically calls the backend API:

```javascript
// Customer clicks placeholder business
const response = await fetch('/api/business/send-contact-sms', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken')
    },
    credentials: 'include',
    body: JSON.stringify({
        businessPhone: '+254701234567',
        businessName: 'Mama Lucy Restaurant',
        // ... other fields
    })
});
```

## 🎯 Testing

### 1. Sandbox Testing
```bash
# Use sandbox credentials
AFRICAS_TALKING_USERNAME=sandbox
AFRICAS_TALKING_API_KEY=your_sandbox_key
```

### 2. Test SMS
- Use your own phone number for testing
- Check Africa's Talking dashboard for delivery status
- Verify SMS content and links work

### 3. Production Testing
- Test with real business numbers
- Monitor opt-out responses
- Check delivery rates and costs

## 📊 Monitoring & Analytics

### SMS Delivery Status
- Check `business_contact_logs` table
- Monitor `sms_status` field: 'sent', 'delivered', 'failed'
- Use Africa's Talking delivery webhooks for real-time updates

### Key Metrics to Track
- SMS delivery rate
- Business response rate (replies)
- Conversion rate (SMS → signup)
- Opt-out rate
- Cost per conversion

## 🛡️ Security & Compliance

### Rate Limiting
- 24-hour cooldown between contacts to same business
- Prevents customer spam
- Configurable in `_check_recent_contact()`

### Opt-out Handling
- All SMS include "Reply STOP to opt out"
- STOP responses processed via webhook
- Opted-out businesses never contacted again

### Data Protection
- Business phone numbers encrypted in transit
- Log retention: 90 days (configurable)
- GDPR compliant data handling

## 💰 Cost Optimization

### Africa's Talking Pricing (Approximate)
- Kenya (KES): ~1.00 per SMS
- Uganda (UGX): ~50 per SMS  
- Tanzania (TZS): ~50 per SMS
- Nigeria (NGN): ~4.00 per SMS

### Cost Control
- Set monthly SMS budget alerts
- Monitor high-cost destinations
- Implement customer SMS limits

## 🚨 Error Handling

### Common Errors
1. **Invalid Phone Number**: Return user-friendly error
2. **SMS Credits Exhausted**: Alert admins, graceful degradation
3. **API Rate Limits**: Retry with exponential backoff
4. **Delivery Failures**: Log and attempt alternative channels

### Error Codes
- `SMS_NOT_CONFIGURED`: Missing API credentials
- `INVALID_PHONE`: Wrong phone number format
- `RATE_LIMITED`: Customer contacted business recently
- `SMS_DELIVERY_FAILED`: Africa's Talking delivery failed
- `SMS_SERVICE_ERROR`: Unexpected API error

## 🔄 Webhooks Setup

### Delivery Status Webhook
```http
POST /api/business/sms-delivery-callback
{
  "id": "ATXid_xxxxx",
  "status": "Success"  // or "Failed"
}
```

### SMS Reply Webhook  
```http
POST /api/business/sms-reply-callback
{
  "from": "+254701234567",
  "text": "STOP",
  "date": "2025-01-01T10:00:00Z"
}
```

## 📈 Scaling Considerations

### High Volume (1000+ SMS/day)
- Use Africa's Talking premium account
- Implement message queuing (Redis/Celery)
- Add SMS provider failover (Twilio backup)
- Optimize database queries with indexing

### Multi-country Support
- Different SMS providers per region
- Currency-specific pricing
- Local compliance requirements
- Time zone aware scheduling

## 🐛 Troubleshooting

### SMS Not Sending
1. Check API credentials in Django admin
2. Verify account has sufficient credits
3. Test with sandbox environment first
4. Check Africa's Talking dashboard logs

### High Delivery Failures
1. Validate phone number formats
2. Check sender ID approval status  
3. Review message content for spam triggers
4. Monitor Africa's Talking status page

### Integration Issues
1. Verify Django app in INSTALLED_APPS
2. Run database migrations
3. Check URL routing configuration
4. Review Django logs for errors

## 📞 Support

- **Africa's Talking Support**: support@africastalking.com
- **Documentation**: https://developers.africastalking.com/
- **Status Page**: https://africastalking.statuspage.io/

## 🔗 Related Documentation

- [Business Registration Landing Page](./BUSINESS_REGISTRATION_LANDING.md)
- [Marketplace Feature Documentation](./MARKETPLACE_FEATURE_DOCUMENTATION.md)
- [SMS Compliance Guide](./SMS_COMPLIANCE_GUIDE.md)
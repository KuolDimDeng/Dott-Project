# WhatsApp Business API Integration Documentation

## Overview
Dott integrates with WhatsApp Business API to enable business owners to send invitations and notifications via WhatsApp.

## Meta App Configuration

### App Details
- **App ID**: 1068741974830721
- **App Mode**: Development
- **App Type**: Business
- **Phone Number ID**: 676188225586230
- **WhatsApp Business Account ID**: 1513500473389693
- **Test Number**: +1 555 190 5954

### Environment Variables (Backend Only)
Add these to your Render Backend environment:
```bash
WHATSAPP_ACCESS_TOKEN=<your-access-token>
WHATSAPP_PHONE_NUMBER_ID=676188225586230
```

## Getting Started

### 1. Generate Access Token
1. Go to Meta Business Platform
2. Navigate to your WhatsApp app
3. Click "Generate access token"
4. Select your WhatsApp Business Account
5. Copy the token immediately (expires in 24 hours for development)

### 2. Add to Render Backend
1. Go to Render Dashboard
2. Select your backend service (dott-api)
3. Navigate to Environment → Environment Variables
4. Add the variables above
5. Save and deploy

### 3. Test the Integration
1. Navigate to Dashboard → "Invite a Business Owner"
2. Select WhatsApp as the invitation method
3. Enter a phone number with country code (e.g., +13855007716)
4. Send the invitation

## API Endpoints

### Send WhatsApp Invitation
```
POST /api/invitations/whatsapp/
```

Request body:
```json
{
  "phoneNumber": "+1234567890",
  "message": "Your invitation message",
  "senderName": "John Doe",
  "senderEmail": "john@example.com"
}
```

Response:
```json
{
  "success": true,
  "message": "WhatsApp invitation sent successfully",
  "messageId": "wamid.xxx"
}
```

## Implementation Details

### Backend Service
Location: `/backend/pyfactor/communications/whatsapp_service.py`

Key methods:
- `send_text_message()`: Send plain text messages
- `send_template_message()`: Send template messages (for future use)

### Frontend Integration
- UI Component: `/src/app/dashboard/components/invite/InviteAFriend.js`
- API Route: `/src/app/api/invite/whatsapp/route.js`

## Message Templates (Future)

### Invoice Notification Template
```
Hi {{1}}, your invoice {{2}} for {{3}} is ready.
View and pay here: {{4}}
```

### Payment Confirmation Template
```
Payment received! Amount: {{1}}
Reference: {{2}}
Thank you for your business!
```

### Appointment Reminder Template
```
Reminder: You have an appointment with {{1}} on {{2}} at {{3}}.
Location: {{4}}
```

## Testing with cURL

### Send Test Message
```bash
curl -X POST https://graph.facebook.com/v18.0/676188225586230/messages \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "13855007716",
    "type": "text",
    "text": {
      "body": "Hello from Dott!"
    }
  }'
```

## Production Checklist

1. **Add Payment Method**: Required for sending messages after free tier
2. **Verify Business Number**: Replace test number with your business number
3. **Create Message Templates**: Submit templates for approval
4. **Set Up Webhooks**: Configure webhooks for message status
5. **Get Permanent Token**: Generate system user token for production
6. **Enable Error Logging**: Monitor failed messages

## Troubleshooting

### Common Issues

1. **"WhatsApp service is temporarily unavailable"**
   - Check if `WHATSAPP_ACCESS_TOKEN` is set in backend environment
   - Verify token hasn't expired (24hr for development)

2. **"Invalid phone number"**
   - Ensure phone number includes country code
   - Format: +1234567890 (with +)

3. **"Failed to send WhatsApp message"**
   - Check API response in backend logs
   - Verify phone number is registered with WhatsApp
   - Ensure message doesn't violate WhatsApp policies

### Debug Commands

Check backend logs:
```bash
# In Render
render logs --service dott-api --tail
```

Test backend service:
```bash
python manage.py shell
from communications.whatsapp_service import whatsapp_service
whatsapp_service.is_configured()  # Should return True
```

## Security Considerations

1. **Access Token**: Never commit to code, use environment variables only
2. **Phone Numbers**: Validate and sanitize all input
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Message Content**: Follow WhatsApp Business Policy
5. **User Consent**: Ensure users opt-in to receive WhatsApp messages

## Future Enhancements

1. **Template Messages**: Pre-approved templates for common notifications
2. **Media Messages**: Support for images and documents
3. **Interactive Messages**: Buttons and quick replies
4. **Webhook Integration**: Real-time message status updates
5. **Analytics**: Track message delivery and engagement

## Support

For WhatsApp Business API issues:
- Meta Business Help Center: https://business.facebook.com/business/help
- WhatsApp Business API Documentation: https://developers.facebook.com/docs/whatsapp

For Dott integration issues:
- Check backend logs in Render
- Review this documentation
- Contact Dott support team
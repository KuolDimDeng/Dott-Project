# Wise Currency Integration Setup Guide

## Overview
This guide shows how to set up Wise API for automatic currency conversion with a 1% markup for revenue.

## Step 1: Create Wise Business Account

1. Go to [wise.com](https://wise.com) and create a business account
2. Complete business verification (usually takes 1-2 business days)
3. Add money to your account in multiple currencies you want to support

## Step 2: Generate API Credentials

1. Login to your Wise account
2. Go to **Settings** → **API tokens**
3. Click **Create token**
4. Select **Full access** or **Read** (depending on your needs)
5. Copy the API token (starts with `live_` for production)

## Step 3: Get Profile ID

1. Make a test API call to get your profile ID:
```bash
curl -X GET https://api.wise.com/v1/profiles \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```

2. Copy the `id` from the response - this is your Profile ID

## Step 4: Configure Environment Variables

Add these to your production environment:

```bash
# Wise API Configuration
WISE_API_TOKEN=live_xxxxxxxxxxxxxxxx
WISE_PROFILE_ID=12345678
```

For development, you can use sandbox credentials:
```bash
WISE_API_TOKEN=sandbox_xxxxxxxxxxxxxxxx
WISE_PROFILE_ID=12345678
```

## Step 5: Supported Currencies

The system currently supports these currencies:

### Africa
- **KES** (Kenya Shilling) - KSh
- **NGN** (Nigerian Naira) - ₦  
- **GHS** (Ghanaian Cedi) - GH₵
- **ZAR** (South African Rand) - R
- **UGX** (Ugandan Shilling) - USh
- **TZS** (Tanzanian Shilling) - TSh
- **RWF** (Rwandan Franc) - RWF
- **ETB** (Ethiopian Birr) - ETB
- **EGP** (Egyptian Pound) - E£
- **MAD** (Moroccan Dirham) - MAD

### Asia
- **INR** (Indian Rupee) - ₹
- **BDT** (Bangladeshi Taka) - ৳
- **PKR** (Pakistani Rupee) - Rs
- **PHP** (Philippine Peso) - ₱
- **IDR** (Indonesian Rupiah) - Rp
- **VND** (Vietnamese Dong) - ₫

### Latin America
- **BRL** (Brazilian Real) - R$
- **MXN** (Mexican Peso) - $
- **COP** (Colombian Peso) - $
- **ARS** (Argentine Peso) - $
- **PEN** (Peruvian Sol) - S/
- **CLP** (Chilean Peso) - $

## Step 6: How It Works

### Currency Conversion Flow
1. User visits pricing page from Kenya (VPN or actual location)
2. System detects country code = KE
3. Wise API converts USD prices to KES using current rates
4. System adds 1% markup for currency conversion revenue
5. Prices displayed in KES (e.g., "KSh 750/month")

### Example Conversion
- USD price: $15/month
- Wise rate: 1 USD = 129.5 KES
- Wise conversion: 15 × 129.5 = KSh 1,942.50
- Your markup (1%): KSh 1,942.50 × 1.01 = **KSh 1,962**
- **Revenue**: KSh 19.50 per month per user

### Annual Revenue Potential
If you have 1,000 Kenyan subscribers:
- Monthly markup revenue: KSh 19,500 (~$150)
- Annual markup revenue: KSh 234,000 (~$1,800)

## Step 7: Testing

### Test Conversion API
```bash
curl -X POST https://api.wise.com/v1/quotes \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "sourceCurrency": "USD",
    "targetCurrency": "KES",
    "sourceAmount": 15,
    "profile": YOUR_PROFILE_ID
  }'
```

### Test with VPN
1. Connect to Kenya VPN
2. Visit your pricing page
3. Verify prices show in KES
4. Check developer tools for API response

## Step 8: Monitoring

### Exchange Rate Caching
- Rates cached for 5 minutes to reduce API calls
- Cache key: `wise_rate_USD_KES_15`
- Monitor cache hit rates

### API Usage Tracking
- Track Wise API calls in logs
- Monitor for failed conversions
- Set up alerts for API errors

### Revenue Tracking
```sql
-- Track currency conversion revenue
SELECT 
  currency,
  COUNT(*) as subscriptions,
  SUM(local_amount - usd_equivalent) as markup_revenue
FROM subscriptions 
WHERE currency != 'USD'
GROUP BY currency;
```

## Step 9: Cost Management

### Wise API Pricing
- **Quote requests**: Free
- **Currency conversion**: 0.35% - 2% fee
- **Monthly API fee**: Free for first 100 requests

### Revenue Model
- **Your markup**: 1% on all conversions
- **Wise fee**: ~0.5% average
- **Net profit**: ~0.5% on all foreign transactions

## Step 10: Fallback Strategy

If Wise API fails:
1. System logs warning
2. Falls back to USD pricing
3. User sees normal USD prices
4. No impact on user experience

## Step 11: Adding New Currencies

To add a new currency (e.g., Thai Baht):

1. Update `COUNTRY_CURRENCIES` in `wise_integration.py`:
```python
'TH': 'THB',  # Thai Baht
```

2. Add currency symbol in `_format_currency()`:
```python
'THB': '฿',
```

3. Test conversion and deploy

## Support and Troubleshooting

### Common Issues

**Issue**: Wise API returns 401 Unauthorized
**Solution**: Check API token is valid and has correct permissions

**Issue**: No exchange rate available
**Solution**: Verify currency pair is supported by Wise

**Issue**: Rates seem outdated
**Solution**: Clear cache or reduce cache duration

### Wise Support
- Email: api@wise.com
- Documentation: https://docs.wise.com/api/
- Status page: https://status.wise.com/

## Security Notes
- Never commit API tokens to code
- Use environment variables only
- Rotate tokens periodically
- Monitor for unauthorized usage

This setup will automatically show local currency prices to users from supported countries while generating additional revenue through currency conversion markup.
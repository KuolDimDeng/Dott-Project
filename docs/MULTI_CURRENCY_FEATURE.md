# Multi-Currency Feature Documentation

## Overview

The Multi-Currency feature enables businesses to display invoices, quotes, and other financial documents in their preferred local currency while maintaining USD as the settlement currency for all payments. This feature supports 170+ world currencies with real-time exchange rates.

## Key Features

### 1. Currency Selection
- **Location**: Settings → Business → Currency Preferences
- **Options**: 170+ world currencies with search functionality
- **Default**: USD (US Dollar)
- **Storage**: Preferences saved to BusinessDetails model

### 2. Display Options
Businesses can control where USD equivalents are shown:
- **Show USD on Invoices**: Display USD amount in parentheses
- **Show USD on Quotes**: Display USD amount in parentheses  
- **Show USD on Reports**: Display USD amount in parentheses

### 3. Exchange Rate Service
- **Primary API**: Wise API (not configured yet)
- **Fallback API**: CurrencyAPI (configured)
- **Caching**: 4 hours for stable currencies, 1 hour for volatile currencies
- **Volatile Currencies**: VES, ZWL, SSP, LBP, SYP, IRR, ARS

### 4. Dashboard Currency Indicator
- **Location**: Top navigation bar, next to language selector
- **Display**: 3-letter currency code (e.g., "KES", "NGN", "EUR")
- **Update**: Changes immediately when currency preference is updated

## Technical Implementation

### Backend Components

#### Models
```python
# BusinessDetails model fields
preferred_currency_code = CharField(max_length=3, default='USD')
preferred_currency_name = CharField(max_length=50, default='US Dollar')
currency_updated_at = DateTimeField(null=True, blank=True)
show_usd_on_invoices = BooleanField(default=True)
show_usd_on_quotes = BooleanField(default=True)
show_usd_on_reports = BooleanField(default=False)
```

#### Exchange Rate Service
- **File**: `/backend/pyfactor/currency/exchange_rate_service.py`
- **Class**: `ExchangeRateService`
- **Methods**:
  - `get_exchange_rate(from_currency, to_currency)`: Get current rate
  - `convert_amount(amount, from_currency, to_currency)`: Convert amounts
  - `is_rate_outdated(timestamp, currency)`: Check if rate needs refresh

#### API Endpoints
- `GET /api/currency/list/`: Get all available currencies
- `GET /api/currency/preferences/`: Get current preferences
- `PUT /api/currency/preferences/`: Update preferences
- `POST /api/currency/exchange-rate/`: Get exchange rate

### Frontend Components

#### Currency Preferences UI
- **File**: `/src/app/Settings/components/sections/CurrencyPreferences.js`
- **Features**:
  - Currency dropdown with 170+ options
  - Toggle switches for USD display
  - Confirmation modal for currency changes
  - Real-time exchange rate preview

#### Currency-Aware Components
1. **CurrencyAwareInvoicePreview.js**: Multi-currency invoice display
2. **CurrencyAwareEstimatePreview.js**: Multi-currency quote display
3. **CurrencyAwareInvoicePaymentModal.js**: Payment flow with USD conversion
4. **CurrencyIndicator.js**: Dashboard currency display

#### Currency Formatter Utility
- **File**: `/src/utils/currencyFormatter.js`
- **Functions**:
  - `formatCurrency(amount, currencyCode, options)`: Format with proper symbols
  - `formatCurrencyWithPreferences(amount, preferences, options)`: Context-aware formatting
  - `getAllCurrencies()`: Get currency list for dropdowns

### Email Templates

#### Currency-Aware Email Service
- **File**: `/backend/pyfactor/communications/currency_email_service.py`
- **Templates**:
  - Invoice emails with local currency display
  - Quote emails with currency context
  - Payment confirmations with conversion details

## User Experience

### For Business Owners

1. **Initial Setup**:
   - Navigate to Settings → Business → Currency Preferences
   - Select preferred currency from dropdown
   - Configure USD display options
   - Confirm changes

2. **Creating Documents**:
   - Enter amounts in USD (as before)
   - System automatically converts to local currency for display
   - Preview shows amounts in selected currency

3. **Viewing Documents**:
   - All amounts displayed in local currency
   - Optional USD amounts in parentheses
   - Clear payment processing notes

### For Customers

1. **Invoice Receipt**:
   - See familiar local currency amounts
   - Understand USD payment requirement
   - Clear exchange rate information

2. **Payment Process**:
   - View invoice in local currency
   - See USD payment amount clearly
   - Confirm understanding before payment
   - Receive confirmation in both currencies

## Payment Flow

### Non-USD Currency Payment
1. Customer views invoice: "KES 131,870"
2. Clicks "Pay Now"
3. Sees payment details:
   - Invoice Amount: KES 131,870
   - Payment Amount: $1,000.00 USD
   - Exchange Rate: 1 USD = 131.87 KES
4. Must check confirmation box
5. Processes payment in USD
6. Receives confirmation with both amounts

### USD Currency Payment
- Standard flow without conversion
- No confirmation checkbox required
- Single currency display

## Configuration

### Environment Variables

#### Backend (Render)
```bash
# Currency API (Required)
CURRENCY_API_KEY=cur_live_jE7Pw20yFxMkRhfGR8cmwEFHP8HB2JCQOUEOg0lc

# Wise API (Optional - not configured yet)
WISE_API_KEY=your_wise_api_key_here
```

#### Frontend
No additional environment variables required.

### Database Migration
```bash
python manage.py migrate users
```

## Best Practices

### For Businesses
1. **Transparent Pricing**: Always show USD equivalent if dealing internationally
2. **Update Regularly**: Review currency settings quarterly
3. **Clear Communication**: Explain payment currency in quotes/invoices
4. **Consistent Display**: Use same settings across all documents

### For Developers
1. **Always Use Utilities**: Use `currencyFormatter.js` for consistent formatting
2. **Handle Failures**: Gracefully fallback to USD if APIs fail
3. **Cache Wisely**: Respect cache durations for API limits
4. **Test Edge Cases**: Test with volatile currencies and offline scenarios

## Troubleshooting

### Common Issues

1. **Exchange Rate Not Loading**
   - Check CURRENCY_API_KEY in environment
   - Verify internet connectivity
   - Check API rate limits

2. **Wrong Currency Display**
   - Clear browser cache
   - Verify preferences saved correctly
   - Check currency_code in database

3. **Payment Amount Mismatch**
   - Exchange rates update every 4 hours
   - Volatile currencies may fluctuate
   - Always show current rate at payment

### Debug Steps
1. Check browser console for API errors
2. Verify currency preferences: `/api/currency/preferences`
3. Test exchange rate API: `/api/currency/exchange-rate`
4. Check backend logs for service errors

## Future Enhancements

### Planned Features
1. **Wise API Integration**: Better rates and more currency pairs
2. **Historical Rates**: Track rate changes over time
3. **Multi-Currency Payments**: Accept payments in local currencies
4. **Automatic Conversion**: Convert existing documents to new currency
5. **Rate Alerts**: Notify when rates change significantly

### Technical Improvements
1. **WebSocket Updates**: Real-time rate updates
2. **Offline Support**: Cache more rates locally
3. **Bulk Operations**: Update multiple documents at once
4. **API Rate Limiting**: Implement proper backoff strategies

## Security Considerations

1. **Rate Manipulation**: Always verify rates server-side
2. **Currency Locking**: Lock currency during payment process
3. **Audit Trail**: Log all currency conversions
4. **PCI Compliance**: No currency data in payment tokens
5. **Access Control**: Only owners/admins can change currency

## API Usage Examples

### Get Currency Preferences
```javascript
const response = await fetch('/api/currency/preferences');
const data = await response.json();
console.log(data.preferences);
// { currency_code: 'KES', show_usd_on_invoices: true, ... }
```

### Update Currency
```javascript
const response = await fetch('/api/currency/preferences', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ currency_code: 'EUR' })
});
```

### Get Exchange Rate
```javascript
const response = await fetch('/api/currency/exchange-rate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    from_currency: 'USD',
    to_currency: 'KES',
    amount: 100
  })
});
```

## Support

For issues or questions:
1. Check this documentation
2. Review troubleshooting section
3. Contact support with:
   - Currency preference settings
   - Error messages
   - Transaction IDs (for payment issues)
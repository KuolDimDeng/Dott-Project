# Banking Integration Documentation
*Last Updated: 2025-08-09*

## Overview
Dott's banking integration provides two methods for connecting bank accounts:
1. **Plaid** - For supported countries (US, CA, GB, FR, ES, NL, IE, DE, etc.)
2. **Wise via Stripe Connect** - For all other countries (80+ countries)

## Architecture

### Country Detection Flow
1. User's country is detected from their business profile
2. System determines which banking provider to use:
   - Plaid countries: Shows Plaid integration
   - Non-Plaid countries: Shows Wise integration

### Key Components

#### Frontend
- `/src/app/Settings/banking/components/BankingDashboard.js` - Main banking settings page
- `/src/app/Settings/banking/components/WiseConnector.js` - Wise bank connection form
- `/src/app/Settings/banking/components/ConnectedBanks.js` - List of connected accounts
- `/src/app/Settings/banking/components/AddBankAccount.js` - Add bank account wrapper

#### Backend
- `/backend/pyfactor/banking/api/wise_views.py` - Wise integration endpoints
- `/backend/pyfactor/banking/models.py` - Banking models (BankAccount, WiseItem, PaymentSettlement)
- `/backend/pyfactor/banking/urls.py` - URL routing

## API Endpoints

### Wise Banking Endpoints
```
GET  /api/banking/wise/method/          - Get available banking method for user's country
POST /api/banking/wise/connect/         - Connect a Wise bank account
GET  /api/banking/connections/          - List all bank connections
GET  /api/banking/connections/{id}/     - Get specific connection
PATCH /api/banking/connections/{id}/    - Update connection (e.g., set primary)
DELETE /api/banking/connections/{id}/   - Delete connection
POST /api/banking/wise/setup/           - Set up Wise account (alternative method)
GET  /api/banking/wise/account/         - Get Wise account details
GET  /api/banking/wise/settlements/     - Get payment settlements
GET  /api/banking/wise/quote/           - Get transfer fee quote
POST /api/banking/wise/process-settlement/ - Manually process settlement
```

## Data Models

### BankAccount
- Core model for all bank accounts
- Fields: user, bank_name, account_number, balance, account_type, last_synced
- Uses GenericForeignKey to link to integration (PlaidItem or WiseItem)
- **Note**: Uses `last_synced` instead of `created_at`

### WiseItem
- Stores Wise-specific bank information
- Sensitive data (full account numbers) stored in Stripe
- Only last 4 digits stored locally
- Fields: bank_name, bank_country, account_holder_name, currency, account_number_last4, etc.

### PaymentSettlement
- Tracks payments that need to be settled to user bank accounts
- Includes fee calculations (Stripe, Platform, Wise)
- Status: pending → processing → completed/failed

## Security Features

1. **Data Storage**
   - Full account numbers never stored locally
   - Sensitive data encrypted and stored in Stripe Connect
   - Only last 4 digits displayed for identification

2. **Authentication**
   - Session-based authentication required
   - Tenant isolation enforced
   - User can only access their own bank accounts

3. **Fee Structure**
   - Stripe: 2.9% + $0.30
   - Platform: 0.1% + $0.30 (profit margin)
   - Wise: Variable (~$1.20 estimated)

## Common Issues & Solutions

### Issue 1: 500 Error on Bank Connections
**Cause**: BankAccount model doesn't have `created_at` field
**Solution**: Use `last_synced` field instead

### Issue 2: Field Name Mismatches
**Cause**: Backend returns different field names than frontend expects
**Solution**: Map fields in frontend:
- `bank_name` (backend) → `account_nickname` (frontend display)
- `last4` (backend) → `account_last4` (frontend display)
- `connection_id` (backend) → `id` (frontend)

### Issue 3: Country Detection
**Cause**: User country not properly set
**Solution**: Check multiple sources:
1. session user data
2. /api/users/me endpoint
3. business_country field

### Issue 4: Delete Connection 404
**Cause**: Connection ID not properly passed
**Solution**: Ensure UUID is used, not numeric ID

## Test Data for Development

### Test Bank Account (Wise)
```json
{
  "account_nickname": "Test Business Account",
  "bank_name": "Test Bank",
  "account_holder_name": "Test Business Owner",
  "account_type": "checking",
  "currency": "USD",
  "country": "SS",  // or any non-Plaid country
  "account_number": "1234567890",
  "routing_number": "123456789",  // US only
  "sort_code": "123456",          // UK only
  "ifsc_code": "SBIN0000123",     // India only
  "iban": "DE89370400440532013000" // EU countries
}
```

## Settlement Process

### Flow
1. Customer makes payment via Stripe
2. Payment recorded as PaymentSettlement (pending)
3. Daily cron job or manual trigger processes settlements
4. Funds transferred to user's Wise account
5. Settlement marked as completed

### Minimum Settlement
- Default: $10 (configurable)
- Prevents excessive transfer fees on small amounts

## Environment Variables Required
```bash
STRIPE_SECRET_KEY=sk_...
STRIPE_EXPRESS_ACCOUNT_ID=acct_1RkYGFC77wwa4lUB
WISE_API_KEY=<optional-for-better-rates>
```

## Deployment Notes

1. **Database Migrations**: Not always needed if only removing unused fields
2. **Frontend Build**: Next.js will rebuild automatically on Render
3. **Backend**: Django restarts automatically on code changes
4. **Testing**: Always test with actual user session to ensure proper country detection

## Future Enhancements

1. **Real Wise API Integration**: Currently using Stripe Connect as intermediary
2. **Multi-currency Support**: Allow users to hold multiple currency accounts
3. **Automated Reconciliation**: Match bank transactions with platform transactions
4. **Bulk Settlements**: Process multiple small payments together
5. **Settlement Scheduling**: Allow users to set settlement frequency

## Support Contacts

For issues with banking integration:
1. Check error logs in Render dashboard
2. Review this documentation
3. Check CLAUDE.md for project-specific configurations
4. Report issues at https://github.com/anthropics/claude-code/issues
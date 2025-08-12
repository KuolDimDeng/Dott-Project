# Global Tax Rate System Documentation

## Overview
This system pre-populates tax rates for all countries worldwide and makes them immediately available when users complete onboarding. The data is updated weekly to ensure accuracy.

## Architecture

### Database Model
- **Model**: `GlobalSalesTaxRate` in `taxes/models.py`
- **Table**: `taxes_globalsalestaxrate`
- **Key Fields**:
  - `country`: Country code (e.g., US, CA, GB)
  - `tax_type`: Type of tax (sales_tax, vat, gst, consumption_tax, none)
  - `rate`: Decimal tax rate (0.0875 = 8.75%)
  - `ai_populated`: Whether populated by AI
  - `ai_confidence_score`: Confidence level (0-1)
  - `manually_verified`: Whether manually verified

### API Endpoints
- **Lookup**: `/api/taxes/global-rates/lookup/`
  - Methods: GET, POST
  - Returns tax rate for specified country
  - Used by POS system automatically
- **Statistics**: `/api/taxes/global-rates/statistics/`
  - Returns overall tax rate statistics

## Setup Instructions

### 1. Initial Population (First Time Only)
```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
python3 manage.py populate_all_countries
```

This populates tax rates for all ~195 countries. Takes 10-15 minutes.

### 2. Test Population (Development)
```bash
cd /Users/kuoldeng/projectx/backend/pyfactor/scripts
python3 test_tax_population.py
```

This adds sample data for testing without API calls.

### 3. Weekly Updates
Use the provided script:
```bash
cd /Users/kuoldeng/projectx/backend/pyfactor/scripts
./update_tax_rates.sh
```

### 4. Set Up Cron Job (Production)
Add to crontab (`crontab -e`):
```bash
# Weekly tax rate update - runs every Sunday at 2:00 AM
0 2 * * 0 /path/to/update_tax_rates.sh >> /path/to/logs/tax_update.log 2>&1
```

## Environment Variables Required
```bash
# Claude API key for tax rate lookups
CLAUDE_API_KEY=sk-ant-api03-...
# Or use dedicated tax API key
CLAUDE_TAX_API_KEY=sk-ant-api03-...
```

## POS Integration
The POS system automatically:
1. Fetches user's business location
2. Looks up pre-populated tax rate
3. Displays rate with disclaimer
4. Allows manual editing

### POS API Flow
```javascript
// POS makes request to:
POST /api/pos/tax-rate/
// Which internally calls:
POST /api/taxes/global-rates/lookup/
{
  "country": "US",
  "region_code": "CA"  // Optional
}
```

## Management Commands

### Populate All Countries
```bash
python3 manage.py populate_all_countries [options]
  --batch-size N     Process N countries in parallel (default: 5)
  --delay SECONDS    Delay between batches (default: 1.0)
  --limit N          Limit to N countries (for testing)
  --update-existing  Update existing rates
```

### Weekly Update
```bash
python3 manage.py weekly_tax_update [options]
  --force-all        Update all rates regardless of last update
  --days-old N       Only update rates older than N days (default: 7)
  --batch-size N     Process N countries in parallel (default: 5)
```

## Testing

### Test API Access
```bash
cd /Users/kuoldeng/projectx/backend/pyfactor/scripts
python3 test_tax_api_access.py
```

### Test Dashboard Access
```bash
cd /Users/kuoldeng/projectx/backend/pyfactor/scripts
python3 test_dashboard_tax_access.py
```

## Data Flow
1. **Initial Population**: Script fetches rates for all countries via Claude AI
2. **Storage**: Rates stored in PostgreSQL with metadata
3. **Access**: POS/Dashboard queries pre-populated data instantly
4. **Updates**: Weekly script updates all rates to stay current

## Important Notes
- All rates include AI disclaimer in POS
- Users can manually override any rate
- Zero-rate countries (e.g., UAE) are properly handled
- System gracefully handles missing data with 0% default

## Troubleshooting

### No Claude API Key
Ensure `CLAUDE_API_KEY` is set in environment or `.env` file

### Migration Issues
```bash
python3 manage.py migrate taxes
```

### Rate Not Found
Check if country code is valid ISO 3166-1 alpha-2 code

### Weekly Update Failing
- Check cron logs: `/path/to/logs/tax_update.log`
- Verify API key is still valid
- Check rate limits haven't been exceeded
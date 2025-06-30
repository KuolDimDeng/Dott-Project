# Sales Tax E-Filing Implementation

This module provides comprehensive sales tax e-filing functionality for the top 20 US states by sales tax revenue.

## Overview

The e-filing implementation includes:
- State-specific handlers for each of the top 20 states
- Sales tax calculation with multi-location support
- Exemption handling and special rate calculations
- State-specific validation rules
- API integration placeholders for actual e-filing

## Supported States

The following states are supported with full e-filing handlers:

| State | Code | Form Number | Base Rate | Due Day |
|-------|------|-------------|-----------|---------|
| California | CA | BOE-401-A | 7.25% | 31st |
| Texas | TX | 01-114 | 6.25% | 20th |
| Florida | FL | DR-15 | 6.00% | 20th |
| New York | NY | ST-100 | 4.00% | 20th |
| Pennsylvania | PA | PA-3 | 6.00% | 20th |
| Illinois | IL | ST-1 | 6.25% | 20th |
| Ohio | OH | UST-1 | 5.75% | 23rd |
| North Carolina | NC | E-500 | 4.75% | 15th |
| Georgia | GA | ST-3 | 4.00% | 20th |
| New Jersey | NJ | ST-51 | 6.625% | 20th |
| Virginia | VA | ST-9 | 4.30% | 20th |
| Washington | WA | Combined Excise | 6.50% | 25th |
| Massachusetts | MA | ST-9 | 6.25% | 20th |
| Arizona | AZ | TPT-2 | 5.60% | 20th |
| Maryland | MD | Form 202 | 6.00% | 20th |
| Michigan | MI | 5080 | 6.00% | 20th |
| Tennessee | TN | SLS 450 | 7.00% | 20th |
| Indiana | IN | ST-103 | 7.00% | 30th |
| Wisconsin | WI | ST-12 | 5.00% | 31st |
| Colorado | CO | DR 0100 | 2.90% | 20th |

## Architecture

### State Handlers (`state_handlers.py`)

Each state has a dedicated handler class that inherits from `BaseStateHandler`:

```python
handler = get_state_handler('CA')  # Returns CaliforniaHandler instance
```

Each handler provides:
- `get_filing_frequency(annual_revenue)` - Determines if filing is monthly, quarterly, or annual
- `get_form_requirements()` - Returns state-specific form details
- `validate_filing_data(data)` - Validates data against state requirements
- `calculate_due_date(period_end)` - Calculates when filing is due
- `get_api_endpoints()` - Returns API endpoints for e-filing

### Sales Tax Calculator (`sales_tax_calculator.py`)

The calculator handles:
- Multi-location tax calculations
- Exemption processing
- Special rate calculations (groceries, clothing, etc.)
- State-specific report generation

```python
calculator = SalesTaxCalculator(tenant_id, 'CA')
result = calculator.calculate_taxable_sales(start_date, end_date, location_ids)
```

## API Endpoints

The e-filing module exposes the following REST API endpoints:

### Get Supported States
```
GET /api/taxes/efiling/supported_states/
```
Returns list of states with e-filing support.

### Get State Requirements
```
GET /api/taxes/efiling/state_requirements/?state_code=CA&annual_revenue=500000
```
Returns filing requirements, frequency, and next due date for a state.

### Calculate Tax
```
POST /api/taxes/efiling/calculate_tax/
{
    "state_code": "CA",
    "start_date": "2024-01-01",
    "end_date": "2024-01-31",
    "location_ids": ["loc-id-1", "loc-id-2"]
}
```
Calculates sales tax for the specified period and locations.

### Validate Filing Data
```
POST /api/taxes/efiling/validate_filing/
{
    "state_code": "CA",
    "filing_data": {
        "gross_sales": "10000",
        "taxable_sales": "8000",
        "tax_collected": "580",
        "seller_permit_number": "123-456789",
        "district_taxes": [...]
    }
}
```
Validates filing data against state requirements.

### Generate Report
```
POST /api/taxes/efiling/generate_report/
{
    "state_code": "CA",
    "filing_data": {...}
}
```
Generates a state-specific e-filing report.

### Validate Locations
```
POST /api/taxes/efiling/validate_locations/
{
    "state_code": "CO",
    "location_ids": ["loc-id-1", "loc-id-2"]
}
```
Validates if multiple locations can be filed together.

### Get Filing Checklist
```
GET /api/taxes/efiling/filing_checklist/?state_code=CA
```
Returns a checklist of required documents for filing.

## Database Models

The State model has been enhanced with e-filing fields:

```python
class State(TaxJurisdiction):
    # E-filing configuration
    e_file_api_base_url = models.URLField()
    e_file_api_version = models.CharField()
    e_file_formats = models.CharField()  # 'XML,JSON'
    
    # Tax rates and thresholds
    base_tax_rate = models.DecimalField()
    filing_frequency_thresholds = JSONField()
    
    # Filing requirements
    form_number = models.CharField()
    form_name = models.CharField()
    filing_due_day = models.IntegerField()
    vendor_discount_rate = models.DecimalField()
    
    # Special features
    has_district_taxes = models.BooleanField()
    has_home_rule_cities = models.BooleanField()
    requires_location_reporting = models.BooleanField()
```

## Testing

Run the test command to verify the implementation:

```bash
# Test all states
python manage.py test_efiling

# Test specific state
python manage.py test_efiling --state CA --tenant-id test-tenant-001
```

## Integration Notes

### API Integration
Each state handler includes placeholder API endpoints. To integrate with actual state e-filing systems:

1. Obtain API credentials from each state
2. Implement authentication methods (OAuth, API keys, etc.)
3. Map the standardized data format to state-specific XML/JSON schemas
4. Handle response parsing and error handling

### Security Considerations
- Store API credentials securely (use environment variables)
- Implement rate limiting to avoid API throttling
- Log all e-filing submissions for audit purposes
- Encrypt sensitive tax data in transit and at rest

### Next Steps
1. Implement actual API integrations for each state
2. Add support for remaining states beyond the top 20
3. Implement automated filing schedule management
4. Add support for amended returns
5. Integrate with payment processing for tax payments

## State-Specific Notes

### California (CA)
- Requires district tax breakdown
- Schedule A attachment for district taxes
- Seller's permit format: XXX-XXXXXX

### Texas (TX)
- 0.5% prepayment discount for timely filing
- Taxpayer number: 11 digits
- Outlet number: 7 digits

### Florida (FL)
- 2.5% collection allowance (max $30)
- Certificate format: XX-XXXXXXXXXXX-X
- Discretionary sales surtax (county-specific)

### New York (NY)
- MCTD tax for certain counties
- Requires Schedule A and B for jurisdiction breakdown
- Certificate of Authority: 8 digits

### Colorado (CO)
- Home-rule cities require separate filing
- Lowest state rate at 2.9%
- Account format: XXXXXXXX-XXXX

### Washington (WA)
- Combined return includes B&O tax
- No income tax but has B&O tax
- UBI number: 9 digits

## Support

For questions or issues with the e-filing implementation, please contact the development team.
# Country Payment Gateway Mapping

## Overview

This document describes the enhanced Country Payment Gateway mapping system, which associates countries with multiple payment gateways in order of priority. This mapping is used by the Connect to Bank feature to determine which payment gateway options to offer based on a user's business country (stored as a custom attribute in Cognito).

## Implementation Details

### Models

The mapping is implemented through three models in `banking/models.py`:

1. **Country** 
   - `name`: Full name of the country (e.g., "United States")
   - `code`: ISO 2-letter country code (e.g., "US")

2. **PaymentGateway**
   - `name`: Name of the payment gateway provider, one of:
     - WISE
     - STRIPE
     - PLAID
     - DLOCAL
     - PAYPAL
     - MERCADO_PAGO
     - RAZORPAY
     - IYZICO
     - M_PESA

3. **CountryPaymentGateway** (Relationship Model)
   - `country`: Foreign key to Country
   - `gateway`: Foreign key to PaymentGateway
   - `priority`: Integer priority level (1-4), where:
     - 1 = Primary
     - 2 = Secondary
     - 3 = Tertiary
     - 4 = Quaternary

### Utility Function

To use this mapping, you can call the utility function in `banking/utils.py`:

```python
from banking.utils import get_payment_gateway_for_country

# Get all payment gateways for a specific country
gateways = get_payment_gateway_for_country('US')
# Returns: {'primary': 'PLAID', 'secondary': 'WISE', 'tertiary': 'STRIPE', 'quaternary': 'PAYPAL'}

# Access the primary gateway
primary_gateway = gateways['primary']  # Returns 'PLAID'
```

This function will:
1. Look up the country code in the database
2. Return a dictionary containing all available payment gateways for the country
3. Default to WISE as the primary if no matching country is found

### Connect to Bank Integration

When a user connects to their bank, the system will:

1. Retrieve the user's business country from their Cognito custom:businesscountry attribute
2. Call `get_payment_gateway_for_country` with this country code
3. Present the user with gateway options in order of priority
4. Connect to the bank using the selected gateway

## Gateway Distribution

The mapping now includes the following payment gateway distribution:

- **Plaid**: Primary gateway for countries where it's supported, including US, Canada, UK, and EU countries
- **Wise**: Primary gateway for most countries where Plaid is not available; secondary for countries with Plaid
- **Stripe**: Secondary or tertiary gateway for most countries globally
- **PayPal**: Tertiary or quaternary gateway for most countries globally
- **DLocal**: Primary gateway for most countries in Latin America, Africa, and the Middle East where Plaid is not available
- **Mercado Pago**: Used for Latin American countries
- **Razorpay**: Used for India
- **iyzico**: Used for Turkey
- **M-Pesa**: Used for Kenya

## Maintenance

The gateway mappings can be updated by modifying the CSV file and running the script:

```
python backend/pyfactor/scripts/Version0004_Update_Country_Payment_Gateway_Model.py
```

Or by directly editing the CSV file:
```
backend/pyfactor/scripts/country_gateway_mapping.csv
```

## Version History

| Version | Date       | Description                                |
|---------|------------|--------------------------------------------|
| 1.0     | 2024-05-30 | Initial implementation                     |
| 2.0     | 2024-05-30 | Updated to support multiple gateways       |
| 2.1     | 2025-04-28 | Prioritized Plaid in supported countries   | 
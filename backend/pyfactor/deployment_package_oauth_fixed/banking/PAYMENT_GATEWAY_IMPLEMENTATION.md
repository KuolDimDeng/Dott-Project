# Payment Gateway Implementation for Connect to Bank

## Summary

This document describes the implementation of an enhanced country-based payment gateway selection system for the Connect to Bank feature. The system allows the application to offer multiple payment gateway options (Plaid, Wise, Stripe, PayPal, DLocal, etc.) in order of priority based on the user's business country as stored in their Cognito attributes.

## Implementation Details

### Components Created/Modified

1. **Country Model** (`banking/models.py`)
   - Stores country information (name, code)

2. **PaymentGateway Model** (`banking/models.py`)
   - Stores payment gateway information
   - Includes support for Wise, Stripe, PayPal, DLocal, Plaid, Mercado Pago, Razorpay, iyzico, and M-Pesa

3. **CountryPaymentGateway Model** (`banking/models.py`)
   - Maps countries to payment gateways with priority levels
   - Supports up to four gateways per country (primary, secondary, tertiary, quaternary)

4. **Utility Functions** (`banking/utils.py`)
   - `get_payment_gateway_for_country`: Returns all available payment gateways for a given country in order of priority

5. **Helper Function** (`banking/views.py`)
   - `get_user_country_from_cognito`: Extracts the user's business country from Cognito attributes

6. **Population Script** (`scripts/Version0004_Update_Country_Payment_Gateway_Model.py`)
   - Creates and populates the Country, PaymentGateway, and CountryPaymentGateway models
   - Includes a comprehensive database of 195 countries with up to four gateways per country

7. **Documentation**
   - `banking/COUNTRY_PAYMENT_GATEWAY.md`: Explains the mapping system
   - `banking/PAYMENT_GATEWAY_IMPLEMENTATION.md` (this file): Overall implementation details

## How It Works

1. When a user initiates the Connect to Bank process, the system:
   - Retrieves the user's business country from Cognito attributes (`custom:businesscountry`)
   - Looks up the available payment gateways for that country using the CountryPaymentGateway model
   - Presents the user with gateway options in order of priority
   - Connects to the bank using the selected gateway

2. Default behavior:
   - If no country is found or there's an error, defaults to Wise as the primary gateway
   - Logs appropriate warnings for monitoring and troubleshooting

## Integration with Connect to Bank

The Connect to Bank feature now uses the following workflow:

1. User clicks "Connect to Bank" in the Banking menu
2. System retrieves user's country from Cognito
3. System determines available payment gateways for that country
4. System presents the gateway options with the primary option pre-selected
5. User selects a gateway and completes the connection process
6. Bank account is successfully linked with the selected integration provider

## Gateway Selection Logic

The country-to-gateway mapping follows these general guidelines:

- **Plaid**: Primary gateway for supported markets (US, Canada, UK, EU countries)
- **Wise**: Primary gateway for most countries where Plaid is not available; secondary gateway for countries with Plaid
- **Stripe**: Secondary or tertiary gateway for most countries globally
- **PayPal**: Tertiary or quaternary gateway for most countries globally
- **DLocal**: Primary gateway for most Latin American, African, and Middle Eastern countries where Plaid is not available
- **Specialized Gateways**: Mercado Pago (Latin America), Razorpay (India), iyzico (Turkey), M-Pesa (Kenya)

## Maintenance

To update the gateway mappings:

1. Edit the CSV file: `scripts/country_gateway_mapping.csv`
2. Run the script to update the database:
   ```
   python backend/pyfactor/scripts/Version0004_Update_Country_Payment_Gateway_Model.py
   ```

## Future Enhancements

Potential future enhancements to this system:

1. Admin interface for managing country-gateway mappings
2. Integration with more payment gateways
3. User-specific gateway preferences stored in their profile
4. Performance metrics tracking for each gateway
5. Automatic fallback mechanism if primary gateway is unavailable

## Version History

| Version | Date       | Description                                |
|---------|------------|--------------------------------------------|
| 1.0     | 2024-05-30 | Initial implementation                     |
| 2.0     | 2024-05-30 | Updated to support multiple gateways       |
| 2.1     | 2025-04-28 | Prioritized Plaid in supported countries   | 
# Payroll Management

## Overview
The Payroll Management component provides comprehensive functionality for managing company payroll operations. It features a tabbed interface that separates payroll execution from configuration settings.

## Features

### Run Payroll Tab
- **Scheduled Payrolls**: View upcoming scheduled payroll runs
- **Connected Bank Accounts**: Select source accounts for payroll funding
- **Pay Period Selection**: Choose from different pay period types (monthly, bi-weekly, custom)
- **Employee Selection**: Select specific employees for payroll processing
- **Payroll Calculation**: Calculate payroll with taxes and deductions before confirmation
- **Payroll Summary**: Review detailed payroll information before final processing
- **Stripe Connect Integration**: Process payments directly from owner's account to employee accounts

### Payroll Settings Tab
- **Payroll Authorizations**: Designate which employees can run payroll
- **Tax Information**: Configure business tax IDs (EIN, state tax IDs, country-specific IDs)
- **Pay Schedule**: Set default pay frequency and schedule
- **Additional Settings**: Configure automatic payroll runs, tax calculations, and deposit methods

## Technical Details

### Dependencies
- React hooks for state management
- date-fns for date manipulation
- Tailwind CSS for styling
- Stripe Connect for payment processing
- AWS Cognito for user attributes and authorization

### API Endpoints
The component communicates with several backend endpoints:
- `/api/payroll/pay-periods/`: Fetch pay period information
- `/api/payroll/scheduled-runs/`: Get scheduled payroll runs
- `/api/banking/accounts/`: Retrieve connected bank accounts
- `/api/hr/employees/`: Get employee information
- `/api/payroll/calculate/`: Calculate payroll before execution
- `/api/payroll/run/`: Execute payroll payments
- `/api/payroll/settings/`: Manage payroll settings

### Data Flow
1. User selects payroll period and employees
2. System calculates gross pay, taxes, and deductions
3. User reviews payroll summary
4. On confirmation, system executes payments via Stripe Connect
5. Transaction records are created for accounting purposes

## Security Considerations
- Only business owners and designated administrators can access payroll settings
- Payroll execution requires specific authorization
- All payment information is processed securely through Stripe
- Tax information is encrypted in transit and at rest

## Usage Notes
- Business country information is pulled from Cognito attributes
- Employee bank information must be configured for direct deposit
- Tax calculations follow the regulations of the business's country
- Proper authorization is required to run payroll or modify settings

## Version History
- v1.0 (2025-06-05): Initial implementation with tabbed interface
- v1.1 (2025-06-15): Added Stripe Connect integration
- v1.2 (2025-06-28): Enhanced payroll settings and authorization controls 
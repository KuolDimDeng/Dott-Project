# Pay Settings Components

This directory contains components used for configuring payroll and payment settings in the PyFactor system. These components are accessible to administrators and owners through the PaySettings interface.

## Components

### PayCycles.js

The PayCycles component allows administrators to configure payment cycles for the company, including:

- Setting up different pay frequencies (weekly, bi-weekly, monthly)
- Configuring pay days and period start/end dates
- Marking default payment cycles

### BankAccounts.js

The BankAccounts component provides interfaces for managing company bank accounts used for payroll:

- Adding new bank accounts
- Editing existing account details
- Setting primary accounts for payroll processing
- Managing account types and payment information

### TaxSettings.js

The TaxSettings component handles all tax-related configuration:

- Setting up company tax IDs (Federal EIN, State, Local)
- Configuring default tax withholding settings
- Managing tax filing frequency and methods
- Providing tax rate override capabilities for special cases

### GeneralSettings.js

The GeneralSettings component manages miscellaneous payroll configuration:

- Setting payroll processing and cutoff days
- Configuring payment methods (direct deposit, check, digital wallets)
- Managing employee self-service options
- Setting up notification preferences
- Configuring payroll lock periods and correction workflows

## Usage

These components are imported by the parent `PaySettings.js` component, which renders them as tabs in the PaySettings interface.

## Version History

| Date | Version | Description |
|------|---------|-------------|
| 2023-07-15 | 1.0 | Initial creation of components |

## Notes

- All components use simulated API calls for demonstration purposes
- In production, these would connect to actual backend services
- Components require proper permissions (owner/admin) to access and modify settings 
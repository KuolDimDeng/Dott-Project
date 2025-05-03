# Add Information Tab to Employee Portal

## Overview
This script adds a new "Information" tab to the Employee Portal in the dashboard. The Information tab will be positioned first (before Personal Information and Employee Management tabs) and provides owners with information about payment options for themselves and their staff based on their business's legal structure and country.

## Features
- Displays payment options based on `custom:legalstructure` and `custom:businesscountry` Cognito attributes
- Shows tax consequences for different payment methods
- Provides options for paying staff based on country
- Supports multiple countries (USA, UK, Canada, Australia) and various legal structures for each
- User-friendly UI with clear sections and loading states

## Installation

### Prerequisites
- Node.js installed
- Access to the project repository

### Running the Script
To run this script and apply the changes, execute the following command from the project root:

```bash
node scripts/Version0001_AddInformationTab/Version0001_AddInformationTab.js
```

> **Note:** This script uses ES modules (import/export) instead of CommonJS (require) since the project is configured with `"type": "module"` in package.json.

The script will:
1. Create a backup of the original file
2. Add the new InformationTab component
3. Add the Information tab to the navigation bar
4. Update the tab content section to display the Information tab
5. Set Information as the default tab

## Changes Made
This script modifies `src/app/dashboard/components/forms/EmployeeManagement.js` to:

1. Add a new `InformationTab` component that:
   - Fetches user data from Cognito including legal structure and business country
   - Determines appropriate payment options based on these attributes
   - Displays tax consequences and staff payment options

2. Update the tab navigation to include the new Information tab
   - Positions the Information tab first
   - Sets Information as the default active tab

3. Update the tab content section to render the Information tab when selected

## Backup
A backup of the original file is created in `scripts/Version0001_AddInformationTab/` with a timestamp before any changes are made.

## Testing
After running the script, verify that:
- The Information tab appears first in the Employee Portal
- It displays correctly based on the user's legal structure and business country
- All other tabs continue to function normally

## Reverting
If needed, you can revert to the original file by copying the backup file back to the original location.

## Author
Created by AI Assistant on 2025-04-28 
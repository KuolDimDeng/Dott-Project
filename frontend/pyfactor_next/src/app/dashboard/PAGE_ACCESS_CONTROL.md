# Page-Level Access Control

## Overview

This document describes the implementation of page-level access control in the application. This approach restricts access to specific pages based on user privileges, rather than hiding menu items in the navigation bar.

## Implementation Details

### Components and Utilities

1. **AccessRestricted Component** - Displays a message when a user doesn't have access to a page.
2. **pageAccess.js Utility** - Provides functions to check and manage page access privileges.
3. **withPageAccess HOC** - Higher-order component that wraps page components to enforce access control.

### How It Works

1. User navigates to a page through the menu (all menu items are visible to all users).
2. The wrapped page component checks if the user has the required privileges.
3. If the user has access, the page is displayed normally.
4. If the user doesn't have access, the AccessRestricted component is shown instead.

### Using Page Access Control

To add page access control to a page:

```jsx
// Import the HOC and access levels
import withPageAccess from '../components/withPageAccess';
import { PAGE_ACCESS } from '@/utils/pageAccess';

// Define your page component
function MyPage() {
  // Page implementation...
}

// Export the component wrapped with access control
export default withPageAccess(MyPage, PAGE_ACCESS.PRODUCTS);
```

### Access Levels

The following access levels are defined in `PAGE_ACCESS`:

- DASHBOARD - Dashboard page (always accessible)
- PRODUCTS - Product management
- INVENTORY - Inventory management
- SALES - Sales management
- PURCHASES - Purchases management
- ACCOUNTING - Accounting functions
- BANKING - Banking operations
- PAYROLL - Payroll management
- REPORTS - Reports viewing
- ANALYSIS - Data analysis
- TAXES - Tax management
- CRM - Customer relationship management
- TRANSPORT - Transport management
- HR - Human resources
- EMPLOYEE_MANAGEMENT - Employee management
- SETTINGS - Settings page (always accessible)
- BILLING - Billing management

## Troubleshooting

If page access is not working as expected:

1. Check browser console for errors
2. Verify that user privileges are being loaded correctly
3. Check that `hasPageAccess` is being called with the correct access level

## Future Improvements

- Cache access decisions to improve performance
- Add more granular access controls for specific actions within pages
- Implement a UI for administrators to manage page access for users

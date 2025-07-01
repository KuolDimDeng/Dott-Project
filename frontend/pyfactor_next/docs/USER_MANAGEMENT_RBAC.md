# User Management with Role-Based Access Control (RBAC)

## Overview

The enhanced user management system provides comprehensive role-based access control with granular page permissions for USER role members.

## Features

### 1. **Role Hierarchy**
- **OWNER**: Full access to all features and settings
- **ADMIN**: Can manage users and most settings (except owner-specific features)
- **USER**: Standard access with customizable page permissions

### 2. **User Invitation Flow**

When inviting a new user:

1. **Basic Information**
   - Email address (required)
   - First name (required)
   - Last name (required)
   - Role selection

2. **Page Permissions (USER role only)**
   - When "USER" role is selected, a comprehensive page permissions interface appears
   - Shows all menu items and their sub-pages from the application
   - Four permission levels per page:
     - **Read**: View the page content
     - **Write**: Create new entries
     - **Edit**: Modify existing entries
     - **Delete**: Remove entries
   - Batch actions: "All Read" and "All Write" buttons for each menu section
   - Expandable/collapsible sections for better organization

### 3. **Menu Structure Coverage**

The permission system covers all main menu items:
- Dashboard
- Calendar
- Sales (Products, Services, Customers, Estimates, Orders, Invoices, Reports)
- Inventory (Dashboard, Stock Adjustments, Locations, Suppliers, Reports)
- Payments (Dashboard, Receive/Make Payments, Methods, Recurring, Refunds, etc.)
- Purchases (Dashboard, Vendors, Purchase Orders, Bills, Expenses, etc.)
- Accounting (Dashboard, Chart of Accounts, Journal Entries, General Ledger, etc.)
- Banking (Dashboard, Connect to Bank, Transactions, Reconciliation, etc.)
- HR (Dashboard, Employees, Timesheets, Pay, Benefits, Reports, Performance)
- Payroll (Dashboard, Run Payroll, Transactions, Reports)
- Taxes (Dashboard, Settings, Filing, Reports)
- Reports (Various financial and operational reports)
- Analytics
- Smart Insight

### 4. **Implementation Details**

#### Frontend Components

1. **UserManagementEnhanced.js**
   - Main component for user management
   - Handles user listing, search, and filtering
   - Manages invitation modal with permissions UI
   - Integrates with Auth0 for user authentication

2. **Permission Selection UI**
   - Hierarchical display of menu items
   - Checkbox matrix for Read/Write/Edit/Delete permissions
   - Visual feedback for selected permissions
   - Expandable sections for better UX

#### Backend Integration

1. **API Endpoints**
   - `/api/auth/invite-user`: Send user invitations with permissions
   - `/api/auth/update-user-role`: Update user roles
   - `/api/auth/remove-user`: Remove users from organization
   - `/api/auth/rbac/users/`: Full RBAC user management
   - `/api/auth/rbac/invitations/`: Invitation management

2. **Security Features**
   - Backend enforces tenant isolation
   - All permissions verified server-side
   - Auth0 integration for secure authentication
   - Session-based auth with no token exposure

### 5. **User Experience Flow**

1. **For Admins/Owners**:
   - Navigate to Settings → User Management
   - Click "Invite User" button
   - Fill in user details
   - Select role (Owner/Admin/User)
   - If "User" role selected, configure page permissions
   - Send invitation

2. **For Invited Users**:
   - Receive email invitation
   - Set up password through Auth0
   - Log in to the application
   - See only the menu items and pages they have access to
   - Permissions automatically enforced throughout the app

### 6. **Permission Enforcement**

- **Frontend**: Menu items and routes filtered based on permissions
- **Backend**: API endpoints validate permissions before data access
- **Middleware**: Route protection at navigation level
- **Component Level**: UI elements hidden/disabled based on permissions

### 7. **Best Practices**

1. **Principle of Least Privilege**: Grant only necessary permissions
2. **Regular Audits**: Review user permissions periodically
3. **Role Templates**: Consider creating standard permission sets
4. **Documentation**: Document permission requirements for each role

## Technical Architecture

### Permission Storage
```javascript
{
  page_permissions: [
    {
      page_id: "sales-products",
      can_read: true,
      can_write: true,
      can_edit: true,
      can_delete: false
    },
    // ... more permissions
  ]
}
```

### Menu Filtering
- Uses `usePermissions` hook to check access
- `canAccessRoute()` function validates page access
- Dynamic menu rendering based on permissions

### Integration Points
- **Auth0**: User authentication and invitation flow
- **Django Backend**: Permission storage and validation
- **React Frontend**: Dynamic UI based on permissions
- **PostgreSQL with RLS**: Database-level security

## Future Enhancements

1. **Permission Templates**: Pre-defined permission sets for common roles
2. **Bulk User Management**: Import/export users with permissions
3. **Permission History**: Audit trail of permission changes
4. **Department-based Permissions**: Group permissions by department
5. **Time-based Access**: Temporary permission grants
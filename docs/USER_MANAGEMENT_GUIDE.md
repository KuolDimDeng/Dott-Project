# User Management Guide

## Overview
The user management system allows administrators to directly create users with specific roles and page-level permissions. Users can be linked to existing employee records or have new employee records created automatically.

## Key Features

### 1. Direct User Creation
- No invitation process - users are created immediately
- Auto-generated secure passwords
- Password reset email sent automatically
- Users can log in immediately after receiving the email

### 2. Employee Linking Options
Three options when creating a user:
- **No employee record**: For external users or consultants
- **Create new employee**: Creates both user and employee records
- **Link to existing employee**: Associates user account with existing HR record

### 3. Page-Level Permissions
Granular control over what pages/modules users can access:
- HR (Employees, Timesheets)
- Sales (Invoices, Quotes, Customers)
- Inventory (Products, Stock)
- Accounting (Bills, Expenses, Reports)
- And more...

### 4. Role-Based Access
- **OWNER**: Full system access (cannot be created by others)
- **ADMIN**: Can manage users and most system settings
- **USER**: Limited access based on assigned permissions

## How to Add a User

1. Navigate to Settings → User Management
2. Click "Add User" button
3. Enter user email address
4. Select role (ADMIN or USER)
5. Choose employee option:
   - No employee record needed
   - Create new employee record (enter department, job title, employment type)
   - Link to existing employee (select from dropdown)
6. For USER role, select page permissions
7. Click "Add User"

## Technical Implementation

### Frontend Changes
- `/src/app/Settings/components/sections/UserManagement.js`
  - Renamed "Invite User" to "Add User"
  - Added employee linking UI
  - Radio buttons for employee options
  - Dropdown for existing employees

### API Endpoints
- `POST /api/user-management/create`
  - Creates Auth0 user
  - Creates backend database user
  - Links to employee if requested
  - Sends password reset email

### Backend Endpoints
- `POST /api/auth/rbac/direct-users/create/`
  - Creates user in database
  - Sets page permissions
  - Links or creates employee
- `POST /api/auth/rbac/direct-users/check-exists/`
  - Validates email uniqueness

### Permission Enforcement
- **Middleware Level**: Checks permissions before page load
- **Component Level**: ProtectedRoute wrapper
- **Navigation Level**: Menu items filtered by permissions
- **API Level**: Backend validates all requests

## Security Considerations

1. **Password Security**
   - 16-character auto-generated passwords
   - Must contain uppercase, lowercase, numbers, and symbols
   - Passwords are temporary and must be reset

2. **Tenant Isolation**
   - Users are automatically assigned to creator's tenant
   - Business ID set to match tenant ID
   - Cross-tenant access prevented at database level

3. **Permission Validation**
   - Only OWNER and ADMIN can create users
   - Page permissions validated on both frontend and backend
   - Employee linking restricted to same business

## Best Practices

1. **Employee Records First**
   - Create employee records in HR before user accounts
   - Useful for payroll processing without system access
   - Link accounts later when access is needed

2. **Minimal Permissions**
   - Start with minimal permissions
   - Add more as needed
   - Review permissions regularly

3. **Department-Based Permissions**
   - HR department employees get HR module access
   - Sales employees get sales module access
   - Accounting employees get financial modules

## Troubleshooting

### User Can't Log In
- Check if password reset email was received
- Verify email address is correct
- Check spam folder
- Resend password reset if needed

### Missing Permissions
- Review user's assigned permissions
- Check if user role is correct
- Verify page permissions are saved
- Check employee role sync if linked

### Employee Not in Dropdown
- Verify employee exists in HR module
- Check employee doesn't already have user account
- Ensure employee is in same business/tenant

### API Errors
- Check Auth0 M2M credentials are configured
- Verify backend service is running
- Check network connectivity
- Review error logs for details
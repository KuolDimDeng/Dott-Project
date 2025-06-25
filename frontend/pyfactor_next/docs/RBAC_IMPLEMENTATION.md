# Role-Based Access Control (RBAC) Implementation

## Overview

This document describes the comprehensive Role-Based Access Control system implemented for the Dott application. The system provides granular permission management at the page level with three distinct user roles.

## User Roles

### 1. OWNER
- **Description**: The person who signs up for the account (first user)
- **Access Level**: Full access to ALL features and pages
- **Exclusive Rights**:
  - Subscription management (`/settings/subscription`)
  - Account closure (`/settings/close-account`)
  - Can create/manage ADMIN users
- **Restrictions**: None

### 2. ADMIN
- **Description**: Administrative users with near-full access
- **Access Level**: Full access to all pages EXCEPT owner-exclusive pages
- **Capabilities**:
  - Can create and manage USER accounts
  - Can assign any permissions to users
  - Full access to all business operations
- **Restrictions**:
  - Cannot access billing/subscription pages
  - Cannot close the account
  - Cannot modify OWNER users

### 3. USER
- **Description**: Regular users with restricted access
- **Access Level**: Only pages explicitly granted by OWNER/ADMIN
- **Permissions**: Granular control per page:
  - **Read**: View page content
  - **Write**: Create new items
  - **Edit**: Modify existing items
  - **Delete**: Remove items
- **Restrictions**: No access to system settings or user management

## Page Categories

### 📊 General
- Dashboard (`/dashboard`)

### 💰 Sales
- Products (`/dashboard/products`)
- Services (`/dashboard/services`)
- Customers (`/dashboard/customers`)
- Estimates (`/dashboard/estimates`)
- Invoices (`/dashboard/invoices`)
- Inventory (`/dashboard/inventory`)

### 💳 Finance
- Payments (`/dashboard/payments`)
- Expenses (`/dashboard/expenses`)
- Reports (`/dashboard/reports`)

### 👥 HR
- Employees (`/dashboard/employees`)
- Payroll (`/dashboard/payroll`)
- Timesheets (`/dashboard/timesheets`)
- Benefits (`/dashboard/benefits`)

### ⚙️ System
- Settings (`/settings`)
- User Management (`/settings/users`) - OWNER/ADMIN only
- Subscription (`/settings/subscription`) - OWNER only
- Account Closure (`/settings/close-account`) - OWNER only

## Technical Implementation

### Backend (Django)

#### Models
```python
# PagePermission - Defines available pages
class PagePermission(models.Model):
    name = models.CharField(max_length=100)
    path = models.CharField(max_length=255)
    category = models.CharField(max_length=50)
    description = models.TextField()

# UserPageAccess - User's permissions for each page
class UserPageAccess(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    page = models.ForeignKey(PagePermission, on_delete=models.CASCADE)
    can_read = models.BooleanField(default=True)
    can_write = models.BooleanField(default=False)
    can_edit = models.BooleanField(default=False)
    can_delete = models.BooleanField(default=False)

# UserInvitation - Pending user invitations
class UserInvitation(models.Model):
    email = models.EmailField()
    role = models.CharField(max_length=20)
    invited_by = models.ForeignKey(User, on_delete=models.CASCADE)
    tenant = models.ForeignKey(Tenant, on_delete=models.CASCADE)
    invitation_token = models.CharField(max_length=255)
    page_permissions = models.JSONField()
    status = models.CharField(max_length=20)
```

#### API Endpoints
- `GET /api/auth/rbac/users/` - List all users
- `POST /api/auth/rbac/users/{id}/update_permissions/` - Update user permissions
- `GET /api/auth/rbac/pages/` - List all available pages
- `POST /api/auth/rbac/invitations/` - Create invitation
- `POST /api/auth/rbac/invitations/verify/` - Verify invitation
- `POST /api/auth/rbac/invitations/accept/` - Accept invitation

### Frontend (Next.js)

#### Key Components

1. **User Management Page** (`/settings/users/page.js`)
   - Lists all users with roles and status
   - Invite new users with email
   - Edit permissions for existing users
   - Manage pending invitations

2. **Permission Middleware** (`/middleware.js` + `/middleware/permissionChecker.js`)
   - Checks permissions on every request
   - Redirects unauthorized users to access denied page
   - Caches session data for performance

3. **Access Denied Page** (`/access-denied/page.js`)
   - Shows clear reason for denial
   - Provides navigation options
   - Option to request access

4. **Menu Filtering** (`/dashboard/components/lists/listItems.js`)
   - Dynamically filters menu items based on permissions
   - Hides entire sections if no access
   - Uses `usePermissions` hook

#### Hooks and Utilities

1. **usePermissions Hook** (`/hooks/usePermissions.js`)
   ```javascript
   const { 
     canAccessRoute, 
     canPerform,
     isOwner,
     isAdmin,
     isOwnerOrAdmin 
   } = usePermissions();
   ```

2. **ProtectedRoute Component** (`/components/ProtectedRoute.js`)
   - Wraps components that need protection
   - Handles loading states
   - Redirects on permission failure

## User Invitation Flow

### 1. Admin Creates Invitation
- Admin/Owner goes to Settings → Users
- Clicks "Invite User" button
- Enters email and selects role
- For USER role, selects specific page permissions
- System creates invitation record

### 2. Auth0 Integration
- Creates user in Auth0 with temporary password
- Sends password reset email as invitation
- Email contains link to accept invitation

### 3. User Accepts Invitation
- User clicks link in email
- Sets their password via Auth0
- System validates invitation token
- Creates user account with assigned permissions
- User is redirected to dashboard

### 4. Permission Assignment
- Permissions are stored in Django database
- Each page access has granular controls
- Changes take effect immediately

## Security Features

1. **Server-Side Validation**
   - All permission checks happen on backend
   - Frontend filtering is for UX only
   - API endpoints validate permissions

2. **Session Management**
   - Permissions cached in session
   - Clear cache on permission changes
   - Automatic session refresh

3. **Audit Trail**
   - All permission changes logged
   - Invitation history maintained
   - User activity tracking ready

## Best Practices

### For Administrators

1. **Principle of Least Privilege**
   - Only grant necessary permissions
   - Start with read-only access
   - Add write/edit/delete as needed

2. **Department-Based Access**
   - Sales team: Sales category pages
   - Finance team: Finance category pages
   - HR team: HR category pages

3. **Regular Reviews**
   - Periodically review user permissions
   - Remove access for inactive users
   - Update permissions as roles change

### For Developers

1. **Adding New Pages**
   - Add to Django migration
   - Update permission checker
   - Add to menu with path property

2. **Checking Permissions**
   ```javascript
   // In components
   const { canAccessRoute } = usePermissions();
   if (!canAccessRoute('/dashboard/products')) {
     return <AccessDenied />;
   }
   
   // For specific actions
   if (!canPerform('/dashboard/products', 'delete')) {
     disableDeleteButton();
   }
   ```

3. **Protected API Calls**
   - Backend validates all requests
   - Include user context in API calls
   - Handle 403 responses gracefully

## Troubleshooting

### Common Issues

1. **User Can't See Menu Items**
   - Check if user has read permission for those pages
   - Verify role assignment
   - Clear browser cache

2. **Access Denied Errors**
   - Confirm user permissions in database
   - Check for typos in path definitions
   - Verify middleware is running

3. **Invitation Not Working**
   - Check Auth0 Management API credentials
   - Verify email delivery settings
   - Check invitation expiry (7 days)

### Debug Mode

Enable debug logging:
```javascript
// In permissionChecker.js
console.log('[PermissionChecker] Checking permissions for:', {
  pathname,
  userRole: sessionData?.user?.role,
  hasPermissions: !!sessionData?.user?.permissions
});
```

## Migration Guide

### Setting Up RBAC for Existing Installation

1. **Run Migrations**
   ```bash
   python manage.py migrate
   ```

2. **First User Becomes Owner**
   - Migration automatically sets first user as OWNER
   - Check with: `User.objects.filter(role='OWNER').exists()`

3. **Assign Roles to Existing Users**
   - Default role is USER
   - Manually update via Django admin or API

4. **Test Permissions**
   - Create test user with limited access
   - Verify menu filtering works
   - Test access denied redirects

## Future Enhancements

1. **Role Templates**
   - Pre-defined permission sets
   - Quick assignment for common roles
   - Custom templates per organization

2. **Bulk Operations**
   - Import users from CSV
   - Bulk permission updates
   - Export permission reports

3. **Advanced Features**
   - Time-based permissions
   - IP-based restrictions
   - Multi-factor authentication requirements

4. **Audit Improvements**
   - Detailed activity logs
   - Permission change history
   - Compliance reports

## API Reference

See `/backend/pyfactor/custom_auth/views/rbac_views.py` for complete API documentation.

## Related Documentation

- [Authentication Flow](./AUTHENTICATION_FLOW.md)
- [Session Management](./SESSION_MANAGEMENT_V2.md)
- [Security Best Practices](./SECURITY.md)
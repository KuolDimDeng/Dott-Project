# User Management API System

## Overview

This User Management API provides industry-standard user access control, separate from HR employee management. It integrates with Auth0 for identity management and supports multi-tenant architecture with granular permissions.

## Key Distinctions

### User Management vs HR Employee Management
- **User Management**: Controls application access, authentication, and permissions
- **HR Employee Management**: Manages actual company employees for payroll and HR

### Data Sources
- **Auth0**: Identity provider for authentication and user records
- **Local Database**: Tenant associations, roles, and permissions
- **Invitation System**: Pending invites and onboarding tracking

## API Endpoints

### 1. Main Users Endpoint
```
GET  /api/user-management/users       # List all users for tenant
POST /api/user-management/users       # Create new user (internal use)
```

### 2. Individual User Management
```
GET    /api/user-management/users/[id]              # Get user details
PUT    /api/user-management/users/[id]              # Update user
DELETE /api/user-management/users/[id]              # Remove user from tenant
```

### 3. Invitation System
```
POST /api/user-management/invite                           # Send invitation
POST /api/user-management/users/[id]/resend-invite        # Resend invitation
GET  /api/user-management/accept-invitation?token=xxx     # Validate invitation
POST /api/user-management/accept-invitation               # Accept invitation
```

### 4. Permission Management
```
GET /api/user-management/users/[id]/permissions    # Get user permissions
PUT /api/user-management/users/[id]/permissions    # Update permissions
```

## Features

### 🔐 Industry-Standard Security
- **Auth0 Integration**: Professional identity management
- **Tenant Isolation**: Users properly scoped to tenants
- **Role-Based Access Control**: OWNER, ADMIN, USER roles
- **Granular Permissions**: 80+ specific page/feature permissions

### 👥 Invitation Flow
1. **Invite**: Admin sends invitation via Auth0
2. **Email**: User receives password reset email as invitation
3. **Accept**: User sets password and completes profile
4. **Onboard**: User gains access with assigned permissions

### 🛡️ Permission System
- **Smart Toggling**: Parent/child permission relationships
- **Role Inheritance**: Base permissions from role + explicit permissions
- **Validation**: Prevents invalid permission combinations

### 📊 Comprehensive Menu Structure
- **14 Main Sections**: Create New, Dashboard, Sales, Inventory, etc.
- **80+ Permissions**: Granular control over features
- **Hierarchical**: Parent menus auto-select children

## Data Flow

### User Creation Flow
```
1. Admin invites user → Auth0 user created
2. Invitation email sent → Password reset link
3. User accepts invite → Profile completed
4. Local record created → Tenant association established
5. User can login → Permissions enforced
```

### Permission Enforcement
```
Frontend → Check user permissions → Allow/deny access
Backend → Validate session → Apply tenant context → Enforce RLS
```

## Role Hierarchy

### OWNER
- **Access**: All features and permissions
- **Can**: Manage all users, change roles, delete admins
- **Cannot**: Delete own account

### ADMIN  
- **Access**: Most features except sensitive operations
- **Can**: Invite users, manage USER role permissions
- **Cannot**: Manage other admins/owners, change own role

### USER
- **Access**: Basic dashboard and assigned permissions
- **Can**: View assigned features only
- **Cannot**: Invite users, manage others

## Integration Points

### Auth0 Integration
- **Management API**: User CRUD operations
- **Metadata Storage**: Roles, permissions, tenant associations
- **Password Reset**: Used as invitation mechanism
- **Email Verification**: Triggers user activation

### Local Database Integration
- **User Records**: Tenant-scoped user data
- **Invitation Tracking**: Pending invites and acceptance
- **Permission Cache**: Fast permission lookups
- **Audit Trail**: User management actions

### Frontend Integration
- **Smart Permissions**: Auto-check parent/child relationships
- **Real-time Updates**: Immediate UI updates after changes
- **Error Handling**: Graceful fallbacks for API failures
- **Loading States**: Professional loading indicators

## Security Features

### 🔒 Authentication
- **Session Validation**: Every request validated
- **Tenant Context**: Automatic tenant isolation
- **RBAC Enforcement**: Role-based access control

### 🚫 Rate Limiting
- **Invitation Resends**: Max 5 per day, 5-minute intervals
- **Failed Attempts**: Progressive backoff
- **Token Expiry**: 7-day invitation validity

### 🛡️ Data Protection
- **Tenant Isolation**: Users cannot access other tenants
- **Permission Validation**: Server-side enforcement
- **Audit Logging**: All user management actions logged

## Configuration

### Environment Variables Required
```bash
AUTH0_DOMAIN=your-domain.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret
AUTH0_AUDIENCE=https://api.yourdomain.com
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Database Schema (Mock - Replace with Actual)
```sql
-- Local user records table
CREATE TABLE tenant_users (
  id VARCHAR(255) PRIMARY KEY,
  auth0_id VARCHAR(255) UNIQUE,
  email VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  permissions JSON,
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Invitation tracking table
CREATE TABLE user_invitations (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL,
  permissions JSON,
  token VARCHAR(255) UNIQUE,
  status VARCHAR(50) DEFAULT 'pending',
  invited_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  accepted_at TIMESTAMP
);
```

## Usage Examples

### Frontend Integration
```javascript
// Fetch users for current tenant
const users = await fetch('/api/user-management/users').then(r => r.json());

// Invite new user
await fetch('/api/user-management/invite', {
  method: 'POST',
  body: JSON.stringify({
    email: 'newuser@example.com',
    role: 'USER',
    permissions: ['sales-dashboard', 'create-new-pos'],
    send_invite: true
  })
});

// Update user permissions
await fetch(`/api/user-management/users/${userId}/permissions`, {
  method: 'PUT',
  body: JSON.stringify({
    permissions: ['sales', 'inventory-dashboard'],
    role: 'ADMIN'
  })
});
```

### Smart Permission Toggling
```javascript
// When user checks "Point of Sale" → "Create New" automatically gets checked
// When user checks "Create New" → All 9 submenu items get checked
// When user unchecks last submenu item → Parent gets unchecked
```

## Error Handling

### Common Error Responses
```json
{
  "error": "Authentication required",
  "status": 401
}

{
  "error": "Insufficient permissions",
  "status": 403
}

{
  "error": "User already exists in this tenant",
  "status": 409
}

{
  "error": "Invalid or expired invitation token",
  "status": 400
}
```

## Next Steps

### Immediate Implementation
1. **Replace Mock Functions**: Connect to actual database and session management
2. **Error Handling**: Implement comprehensive error handling
3. **Logging**: Add structured logging for audit trails
4. **Testing**: Add unit and integration tests

### Future Enhancements
1. **Bulk Operations**: Bulk user invites/updates
2. **Advanced Permissions**: Time-based and conditional permissions
3. **SSO Integration**: Enterprise SSO support
4. **Audit Dashboard**: User management audit interface
5. **API Documentation**: OpenAPI/Swagger documentation

## Support

For issues or questions about the User Management API:
1. Check error logs for detailed error messages
2. Verify Auth0 configuration and credentials
3. Ensure database schema matches expectations
4. Test with mock data first before connecting to production systems

This system provides a robust foundation for enterprise-grade user management with proper separation between application users and employee records.
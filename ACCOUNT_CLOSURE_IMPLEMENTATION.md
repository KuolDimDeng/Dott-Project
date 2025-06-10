# Account Closure Implementation

## Overview

This document describes the implementation of proper account closure functionality with soft deletion, audit logging, and authentication prevention for deleted accounts.

## What Happens When a User Closes Their Account

### 1. **Soft Deletion (Database)**
- User record is marked with `is_deleted = True`
- `deleted_at` timestamp is recorded
- `deletion_reason` and `deletion_feedback` are stored
- User is marked as `is_active = False`
- **Data is retained for compliance/audit purposes**

### 2. **Audit Log Creation**
- A permanent record is created in `custom_auth_account_deletion_log` table
- Includes:
  - User email and ID
  - Tenant ID
  - Auth0 subject ID
  - Deletion reason and feedback
  - IP address and user agent
  - Timestamp
  - Success/failure status for each deletion step

### 3. **Tenant Deactivation** (if user is owner)
- Tenant is marked as `is_active = False`
- `deactivated_at` timestamp is recorded
- Prevents access to tenant resources

### 4. **Auth0 Deletion** (optional)
- If Auth0 Management API credentials are configured
- User is deleted from Auth0
- Prevents future Auth0 authentication

### 5. **Session Invalidation**
- All active sessions are terminated
- All auth cookies are cleared
- User is immediately logged out

## Authentication Prevention

When a deleted user tries to sign in:

1. Auth0 authentication succeeds (if not deleted from Auth0)
2. Django backend checks `is_deleted` flag
3. Authentication is rejected with message: "This account has been closed. Please contact support if you need assistance."
4. User cannot access the application

## Database Schema Changes

### User Model (`custom_auth_user`)
```sql
-- Soft delete fields
is_deleted BOOLEAN DEFAULT FALSE
deleted_at TIMESTAMP WITH TIME ZONE NULL
deletion_reason VARCHAR(255) NULL
deletion_feedback TEXT NULL
deletion_initiated_by VARCHAR(255) NULL
```

### Account Deletion Log (`custom_auth_account_deletion_log`)
```sql
id UUID PRIMARY KEY
user_email VARCHAR(254) NOT NULL
user_id INTEGER NOT NULL
tenant_id UUID NULL
auth0_sub VARCHAR(255) NULL
deletion_date TIMESTAMP WITH TIME ZONE NOT NULL
deletion_reason VARCHAR(255) NULL
deletion_feedback TEXT NULL
deletion_initiated_by VARCHAR(255) NOT NULL
auth0_deleted BOOLEAN DEFAULT FALSE
database_deleted BOOLEAN DEFAULT FALSE
tenant_deleted BOOLEAN DEFAULT FALSE
deletion_errors JSONB NULL
ip_address INET NULL
user_agent TEXT NULL
```

## API Endpoints

### Backend: `/api/users/close-account/`
- Method: POST
- Authentication: Required
- Request body:
  ```json
  {
    "reason": "Too expensive",
    "feedback": "Optional feedback text"
  }
  ```
- Response:
  ```json
  {
    "success": true,
    "message": "Your account has been closed successfully.",
    "details": {
      "account_closed": true,
      "data_retained_for_compliance": true,
      "auth0_deleted": false,
      "sessions_cleared": true,
      "deletion_log_id": "uuid",
      "timestamp": "2025-01-06T..."
    }
  }
  ```

### Frontend: `/api/user/close-account`
- Handles the full deletion flow
- Coordinates backend and Auth0 deletion
- Clears all cookies and sessions

## Configuration

### Environment Variables
- `AUTH0_MANAGEMENT_CLIENT_ID`: Auth0 Management API client ID
- `AUTH0_MANAGEMENT_CLIENT_SECRET`: Auth0 Management API client secret

Without these, Auth0 deletion will be skipped (soft delete only).

## Compliance and Data Retention

- User data is **soft deleted** (marked as deleted but retained)
- This allows for:
  - Compliance with data retention regulations
  - Account recovery if needed
  - Audit trail for security
  - Analytics on why users leave

## Testing

Run the test script to verify deleted accounts cannot sign in:
```bash
cd backend/pyfactor
python test_deleted_account_prevention.py
```

## Migration

Apply database changes:
```bash
cd backend/pyfactor
./apply_account_deletion_fields.sh
```

## Security Considerations

1. **Soft deletion** prevents immediate data loss
2. **Audit logs** track all deletion attempts
3. **IP and user agent** logging for security analysis
4. **Auth0 deletion** is optional and may fail gracefully
5. **Session invalidation** ensures immediate logout

## Future Enhancements

1. Account recovery period (e.g., 30 days)
2. Admin interface for viewing deletion logs
3. Automated data purging after retention period
4. Email confirmation before deletion
5. Export user data before deletion (GDPR compliance)
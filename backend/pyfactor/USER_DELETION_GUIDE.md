# User Deletion System Guide

This guide explains the comprehensive user deletion system for the Dott application.

## Overview

The user deletion system provides multiple ways to remove users and their data:
- **Soft Delete**: Mark users as deleted but retain data (recoverable)
- **Hard Delete**: Permanently remove all user data (irreversible)
- **Auth0 Integration**: Delete users from both database and Auth0
- **Batch Operations**: Delete or restore multiple users at once

## ⚠️ WARNING: Batch Operations

Batch deletion operations are EXTREMELY DANGEROUS and should only be used in:
- Development environments
- Test environments  
- Complete system reset scenarios

NEVER use batch deletion in production without proper backups and authorization!

## Available Scripts

### 1. `comprehensive_user_deletion.py`
The main deletion script with full relationship analysis and cascade deletion.

**Features:**
- Analyzes all foreign key relationships
- Handles proper deletion order
- Creates audit logs
- Supports both soft and hard delete

**Usage:**
```bash
python scripts/comprehensive_user_deletion.py user@example.com --analyze
python scripts/comprehensive_user_deletion.py user@example.com --soft
python scripts/comprehensive_user_deletion.py user@example.com --hard
python scripts/comprehensive_user_deletion.py user@example.com --restore
```

### 2. `quick_user_soft_delete.py`
Simplified script for quick soft deletions.

**Usage in Django shell:**
```python
from scripts.quick_user_soft_delete import soft_delete_user, restore_user
soft_delete_user('user@example.com')
restore_user('user@example.com')
```

### 3. `user_deletion_with_auth0.py`
Handles deletion from both database and Auth0.

**Usage:**
```python
from scripts.user_deletion_with_auth0 import delete_user_complete
delete_user_complete('user@example.com', delete_from_auth0=True, hard_delete=False)
```

## Django Management Command

The easiest way to delete users is through the Django management command:

```bash
# Soft delete (default)
python manage.py delete_user user@example.com

# Hard delete
python manage.py delete_user user@example.com --hard

# Delete without Auth0
python manage.py delete_user user@example.com --no-auth0

# Analyze relationships only
python manage.py delete_user user@example.com --analyze

# List all soft-deleted users
python manage.py delete_user --list

# Restore a soft-deleted user
python manage.py delete_user --restore user@example.com

# Check user status
python manage.py delete_user --status user@example.com
```

## Deletion Process

### Soft Delete
1. Mark user as `is_deleted=True`
2. Set `deleted_at` timestamp
3. Deactivate all sessions
4. Mark tenant as inactive (if owner)
5. Create audit log
6. User can be restored later

### Hard Delete
1. Analyze all relationships
2. Delete in proper order:
   - Profile relations (Reports, Integrations)
   - Direct relations (Employee, BusinessMember)
   - Session data
   - Business data (Subscriptions, BusinessDetails)
   - Tenant data (if owner)
   - Finally, the User record
3. Create permanent audit log
4. Cannot be reversed

## Related Models

The deletion system handles these models:
- **User**: Core user account
- **Tenant**: Organization/company
- **UserSession**: Active sessions
- **OnboardingProgress**: Onboarding status
- **UserProfile**: User profile data
- **BusinessDetails**: Business information
- **BusinessMember**: Team members
- **Employee**: HR records
- **Subscription**: Payment subscriptions
- **Report**: Generated reports
- **Integration**: Third-party integrations
- **AccountDeletionLog**: Audit trail

## Audit Logging

All deletions are logged in `AccountDeletionLog` with:
- User email and ID
- Tenant ID
- Auth0 subject ID
- Deletion reason
- Who initiated (user/admin/system)
- Deletion type (soft/hard)
- Timestamp
- Any errors encountered

## Recovery

### Restoring Soft-Deleted Users
```bash
python manage.py delete_user --restore user@example.com
```

This will:
- Set `is_deleted=False`
- Clear deletion timestamps
- Reactivate tenant (if applicable)
- Create restoration log

### Important Notes
- Hard deletion is permanent and cannot be undone
- Soft-deleted users cannot log in
- Tenant data becomes inactive when owner is deleted
- Sessions are immediately invalidated
- Auth0 deletion requires proper credentials in settings

## Error Handling

The system handles:
- Missing users gracefully
- Foreign key constraint violations
- Auth0 API failures
- Transaction rollbacks on error
- Comprehensive error logging

## Security Considerations

- Only admins should have access to deletion commands
- Audit logs are permanent records
- Consider data retention policies
- GDPR compliance through complete deletion
- Auth0 sync ensures complete removal

## Batch Operations

### Delete All Users

**Script**: `delete_all_users.py`

Delete all users at once (with safety checks):

```bash
# Soft delete all users (recoverable)
python scripts/delete_all_users.py --soft

# Hard delete all users (PERMANENT)
python scripts/delete_all_users.py --hard --confirm "DELETE ALL USERS"

# Include superusers
python scripts/delete_all_users.py --soft --include-superusers

# Skip environment check (DANGEROUS)
python scripts/delete_all_users.py --soft --force
```

**Django Management Command**:
```bash
# Analyze impact
python manage.py delete_all_users --analyze

# Soft delete all users
python manage.py delete_all_users --soft

# Hard delete with confirmation
python manage.py delete_all_users --hard --confirm

# Include superusers
python manage.py delete_all_users --soft --include-superusers
```

### Restore All Users

**Script**: `restore_all_users.py`

Restore all soft-deleted users:

```bash
# Dry run (see what would be restored)
python scripts/restore_all_users.py --dry-run

# Restore all soft-deleted users
python scripts/restore_all_users.py

# Also restore deactivated tenants
python scripts/restore_all_users.py --include-tenants
```

## Safety Features

### Environment Detection
- Scripts detect production environments
- Blocks dangerous operations by default
- Requires `--force` flag to override

### Confirmation Requirements
- Soft delete: Type "DELETE"
- Hard delete: Type "DELETE ALL USERS"
- Hard delete all: Type "DELETE ALL USERS PERMANENTLY"
- Batch operations require explicit confirmation

### Exclusions
- Superusers excluded by default from batch operations
- Use `--include-superusers` to include them

### Batch Processing
- Processes users in batches to avoid memory issues
- Shows progress during operation
- Creates comprehensive audit logs

## Demo Script

Run the interactive demo:
```bash
python scripts/delete_user_demo.py
```

This provides a menu-driven interface for all deletion operations.

## Best Practices

1. **Always backup before batch operations**
2. **Test in development first**
3. **Use soft delete when possible**
4. **Review audit logs after operations**
5. **Never use --force in production**
6. **Keep superuser accounts protected**
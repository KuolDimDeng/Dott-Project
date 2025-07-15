# User Creation Atomic Transactions

## Overview
This document describes the atomic transaction implementation for user creation to prevent orphaned database records when Auth0 integration fails.

## Problem
Previously, when creating a new user through the admin panel:
1. User record was created in the database
2. Auth0 user creation or password reset email failed
3. Database user remained, creating an orphaned record
4. Subsequent attempts failed with "user already exists" errors

## Solution
Implemented proper atomic transaction handling with these changes:

### 1. Transaction Decorator
The `create_user` method in `DirectUserCreationViewSet` already had `@transaction.atomic` decorator, ensuring all database operations are wrapped in a transaction.

### 2. Auth0 Error Propagation
Modified the Auth0 integration to properly propagate errors:

```python
# Before: Errors were caught and returned None
except Exception as auth0_error:
    logger.error(f"[DirectUserCreation] Auth0 integration error: {str(auth0_error)}")
    return None

# After: Errors are re-raised to trigger rollback
except Exception as auth0_error:
    logger.error(f"[DirectUserCreation] Auth0 integration error: {str(auth0_error)}")
    raise Exception(f"Auth0 integration failed: {str(auth0_error)}")
```

### 3. Savepoint for Password Reset Token
Added a nested transaction for password reset token creation to handle database state issues:

```python
# Use a savepoint to handle token creation separately
from django.db import transaction
with transaction.atomic():
    PasswordResetToken.objects.create(
        user=user,
        token=reset_token,
        expires_at=timezone.now() + timedelta(hours=24)
    )
```

## How It Works

1. **Entire operation wrapped in transaction**: The `@transaction.atomic` decorator ensures all database changes are atomic
2. **Auth0 failures trigger rollback**: Any Auth0 error is re-raised, causing Django to rollback the transaction
3. **No orphaned records**: If any step fails, the entire user creation is rolled back

## Error Handling Flow

```
Start Transaction
    ↓
Create User in Database
    ↓
Create Employee (if requested)
    ↓
Create Page Permissions
    ↓
Create Auth0 User
    ↓ (if fails)
Raise Exception → Rollback Transaction → No Database Changes
    ↓ (if succeeds)
Update User with Auth0 ID
    ↓
Send Password Reset Email
    ↓ (if fails)
Raise Exception → Rollback Transaction → No Database Changes
    ↓ (if succeeds)
Commit Transaction → User Created Successfully
```

## Cleanup Scripts

### 1. Test Transaction Rollback
`/backend/pyfactor/scripts/test_user_creation_rollback.py`
- Tests that transactions are properly rolled back on failure

### 2. Cleanup Orphaned Users
`/backend/pyfactor/scripts/cleanup_orphaned_users.py`
- Identifies users with `pending_` auth0_sub values
- Safely removes orphaned user records

## Usage

### Running Cleanup
```bash
cd /backend/pyfactor/scripts
python cleanup_orphaned_users.py

# Or cleanup specific user
python cleanup_orphaned_users.py user@example.com
```

### Testing Rollback
```bash
cd /backend/pyfactor/scripts
python test_user_creation_rollback.py
```

## Benefits

1. **No orphaned records**: Failed user creations don't leave database records
2. **Clean retry**: Users can retry creation with the same email after failure
3. **Data integrity**: All-or-nothing approach ensures consistency
4. **Better error handling**: Clear error messages when creation fails

## Implementation Date
January 15, 2025
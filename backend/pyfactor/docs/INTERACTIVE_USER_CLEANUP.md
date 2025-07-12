# Interactive User Cleanup Tool

## Overview
The Interactive User Cleanup Tool provides a safe, menu-driven interface for deleting users from the Dott database. It supports both individual user deletion by email and complete database cleanup.

## Location
`/backend/pyfactor/scripts/interactive_user_cleanup.py`

## Features

### 1. Delete Specific User by Email
- Prompts for user email address
- Verifies user exists before deletion
- Shows user ID and email for confirmation
- Requires explicit confirmation before proceeding
- Handles all 64 dependent tables in correct order
- Provides success/failure feedback

### 2. Delete ALL Users (Danger Zone)
- Shows total user count as warning
- Requires typing "DELETE ALL USERS" exactly
- Requires secondary "yes" confirmation
- Deletes all data from all tables
- Cannot be undone

### 3. List All Users
- Displays all users in database
- Shows ID, Email, and Username
- Formatted table output
- Useful for verification

### 4. Menu-Driven Interface
- Clear numbered options
- Persistent menu until exit
- Error handling for invalid choices
- Graceful exit option

## Usage

### Prerequisites
- DATABASE_URL environment variable must be set
- Python 3.x with psycopg2 installed
- Appropriate database permissions

### Running the Script
```bash
cd /backend/pyfactor/scripts
python interactive_user_cleanup.py
```

### Example Session
```
🧹 Dott Database User Cleanup Tool
==================================================

📊 Current users in database: 5

🔧 Options:
1. Delete specific user by email
2. Delete ALL users (⚠️  DANGER)
3. List all users
4. Exit

Enter your choice (1-4): 1

Enter email address of user to delete: test@example.com

🎯 Found user: test@example.com (ID: 123)
Are you sure you want to delete this user? (yes/no): yes
🔍 Starting deletion process...
✅ Successfully deleted user: test@example.com
```

## Technical Details

### Deletion Order
The script follows a specific deletion order to handle foreign key constraints:

1. Financial records (transactions, journal entries, etc.)
2. Payroll records (pay stubs, runs, salaries, etc.)
3. Tax records (filings, payments, codes)
4. Sales records (invoices, quotes, payments)
5. Purchase records (bills, purchase orders)
6. Inventory records (products, stock levels)
7. Basic records (accounts, customers, vendors)
8. HR records (leave requests, departments)
9. System records (notifications, audit logs)
10. Core records (employees, businesses, auth_user)

### Safety Features
- Email validation for specific user deletion
- User existence check before deletion
- Confirmation prompts for all deletions
- Double confirmation for "delete all" operation
- Transaction-based deletion (rollback on error)
- Clear error messages

### Error Handling
- Database connection errors
- Missing DATABASE_URL
- User not found errors
- Foreign key constraint violations
- Transaction rollback on failure

## Security Considerations
- Requires database credentials via DATABASE_URL
- Should only be run by authorized administrators
- All deletions are permanent and cannot be undone
- Audit trail through Django admin logs (if applicable)

## Troubleshooting

### Common Issues

1. **DATABASE_URL not set**
   ```
   ERROR: DATABASE_URL environment variable not set
   ```
   Solution: Export DATABASE_URL before running

2. **Connection failed**
   ```
   ERROR: Failed to connect to database: [error details]
   ```
   Solution: Check database URL and network connectivity

3. **User not found**
   ```
   ❌ User with email 'xxx@example.com' not found
   ```
   Solution: Verify email address, use option 3 to list users

4. **Foreign key constraint error**
   - Should not occur as script handles deletion order
   - If occurs, check for new tables not included in script

## Future Enhancements
- Batch user deletion by domain
- Soft delete option
- Export user data before deletion
- Dry run mode
- Logging to file
- Date range filtering
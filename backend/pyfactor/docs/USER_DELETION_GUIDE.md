# User Deletion Guide

This guide explains how to safely delete users from the Dott application database, handling all foreign key dependencies.

## Quick Start

### Method 1: Python Script (Recommended)
```bash
# Interactive mode
python scripts/delete_user_comprehensive.py

# Command-line mode
python scripts/delete_user_comprehensive.py user@example.com

# Dry run (see what would be deleted)
python scripts/delete_user_comprehensive.py user@example.com --dry-run

# Skip confirmation
python scripts/delete_user_comprehensive.py user@example.com --no-confirm
```

### Method 2: Shell Script
```bash
# Make executable
chmod +x scripts/delete_user.sh

# Run with menu
./scripts/delete_user.sh

# Direct deletion
DB_PASSWORD='your_password' ./scripts/delete_user.sh user@example.com
```

### Method 3: Direct SQL
```bash
# Connect to database
PGPASSWORD='your_password' psql "sslmode=require host=your_host dbname=your_db user=your_user"

# Run the deletion
\i scripts/delete_user.sql
```

## Tables Affected

When deleting a user, the following tables are cleaned:

### Session & Security
- `user_sessions` - Active user sessions
- `session_events` - Session activity logs
- `session_security` - Session security tokens
- `audit_log` - Audit trail entries

### User Profile
- `users_userprofile` - Extended user profile
- `hr_employee` - Employee records

### Application Data
- `smart_insights_credittransaction` - AI credit transactions
- `smart_insights_usercredit` - AI credit balance
- `notifications_notification` - User notifications
- `taxes_taxfiling` - Tax filing records
- `banking_bankaccount` - Bank accounts
- `payments_payment` - Payment records
- `whatsapp_business_whatsappmessage` - WhatsApp messages
- `data_export_exportrequest` - Export requests
- `communications_communication` - Communications

### Created By References (Optional)
The following tables contain `created_by_id` references. By default, these are NOT deleted to preserve business data:
- `events_event`
- `sales_customer`
- `sales_invoice`
- `inventory_product`
- `purchases_purchaseorder`
- `vendors_vendor`
- `finance_transaction`
- `payroll_payrollrun`
- `analysis_analysisreport`
- `jobs_job`
- `crm_contact`
- `transport_vehicle`

## Order of Deletion

Due to foreign key constraints, records must be deleted in this specific order:

1. Smart Insights transactions
2. Smart Insights credits
3. Audit logs
4. Session events (via session_id)
5. Session security (via session_id)
6. User sessions
7. User profile
8. HR employee record
9. Notifications
10. Other user-specific data
11. Finally, the user record itself

## Using the Python Script

### Features
- **Interactive mode**: Guides you through the process
- **Dry run**: Shows what would be deleted without making changes
- **Confirmation**: Requires typing 'DELETE' to confirm
- **Transaction safety**: All deletions in a single transaction
- **Detailed logging**: Shows each table being cleaned
- **Error handling**: Continues even if some tables don't exist

### Examples

```python
# Import and use in your own scripts
from delete_user_comprehensive import UserDeletion

deleter = UserDeletion()

# Delete with confirmation
deleter.delete_user('user@example.com', confirm=True)

# Dry run
deleter.delete_user('user@example.com', dry_run=True)

# Delete without confirmation (dangerous!)
deleter.delete_user('user@example.com', confirm=False)
```

## Using the SQL Script

1. Edit `scripts/delete_user.sql`
2. Replace `'USER_EMAIL_HERE'` with the actual email
3. Change `ROLLBACK` to `COMMIT` at the end (line ~180)
4. Run the script:

```bash
psql -d dott_production -f scripts/delete_user.sql
```

## Production Database Connection

```bash
# Connection parameters
DB_HOST=dpg-d0u3s349c44c73a8m3rg-a.oregon-postgres.render.com
DB_NAME=dott_production
DB_USER=dott_user
DB_PORT=5432

# Connect with psql
PGPASSWORD='your_password' psql "sslmode=require host=$DB_HOST dbname=$DB_NAME user=$DB_USER port=$DB_PORT"
```

## Safety Features

1. **Transaction Wrapper**: All deletions happen in a transaction
2. **Dry Run Mode**: Test what would be deleted first
3. **Confirmation Required**: Must type 'DELETE' to confirm
4. **Rollback by Default**: SQL script has ROLLBACK by default
5. **Detailed Logging**: See exactly what's being deleted
6. **Error Recovery**: Continues even if some tables don't exist

## Common Issues

### Foreign Key Violations
If you get foreign key errors, check for tables we might have missed:
```sql
SELECT 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND ccu.table_name = 'custom_auth_user';
```

### User Not Found
The user might already be deleted or the email might be incorrect. Check with:
```sql
SELECT id, email, date_joined FROM custom_auth_user WHERE email ILIKE '%part_of_email%';
```

### Permission Denied
Ensure your database user has DELETE permissions on all affected tables.

## Testing

Always test on a development database first:

1. Create a test user
2. Add some data for that user
3. Run the deletion script
4. Verify all data is removed

## Audit Trail

Consider keeping an audit log before deletion:
```sql
-- Save user data before deletion
INSERT INTO deleted_users_audit (user_id, email, deleted_at, deleted_by, user_data)
SELECT id, email, NOW(), current_user, row_to_json(u.*)
FROM custom_auth_user u
WHERE email = 'user@example.com';
```

## Recovery

There is NO automatic recovery after deletion. Always:
1. Backup the database before bulk deletions
2. Use dry-run mode first
3. Keep audit logs of deletions

## Support

For issues or questions:
1. Check the error messages carefully
2. Verify foreign key dependencies
3. Test on development first
4. Keep backups before deletion
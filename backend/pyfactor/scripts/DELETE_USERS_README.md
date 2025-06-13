# Delete All Users Scripts

This directory contains scripts to delete ALL users and their associated data from the Render backend database.

⚠️ **WARNING**: These scripts will permanently delete ALL user data. This action is IRREVERSIBLE!

## Available Scripts

### 1. `delete_all_users_and_data.sql`
A comprehensive SQL script with transaction control and detailed logging.

**Features:**
- Shows current data before deletion
- Deletes data in correct order to avoid FK constraint violations
- Uses a transaction (requires manual COMMIT)
- Provides detailed progress information
- Verifies deletion was successful

**Usage:**
```bash
# Using Django's dbshell
cd /Users/kuoldeng/projectx/backend/pyfactor
python manage.py dbshell < scripts/delete_all_users_and_data.sql

# Then manually type COMMIT; or ROLLBACK;

# Or using psql directly
psql -U your_username -d your_database -f scripts/delete_all_users_and_data.sql
```

### 2. `execute_delete_all_users.py`
A Python script that uses Django's ORM for safe deletion with confirmations.

**Features:**
- Requires explicit confirmation
- Uses Django transactions
- Handles missing tables gracefully
- Shows progress for each table
- Asks for final commit confirmation

**Usage:**
```bash
cd /Users/kuoldeng/projectx/backend/pyfactor

# Method 1: Direct execution
python scripts/execute_delete_all_users.py

# Method 2: Through Django shell
python manage.py shell < scripts/execute_delete_all_users.py
```

### 3. `delete_all_users_simple.sql`
A simpler SQL script that auto-executes without transaction control.

**Features:**
- No transaction control (auto-commits)
- Simpler output
- Faster execution
- Less safe (no rollback option)

**Usage:**
```bash
cd /Users/kuoldeng/projectx/backend/pyfactor
python manage.py dbshell < scripts/delete_all_users_simple.sql
```

## Data Deletion Order

The scripts delete data in this order to respect foreign key constraints:

1. **Application Data** (leaf nodes)
   - Finance transactions, journal entries, accounts
   - Reports
   - HR/Payroll data (if exists)
   - Inventory/Sales/Purchases (if exists)
   - Banking data (if exists)
   - CRM data (if exists)

2. **User-Related Data**
   - User menu privileges
   - Business members
   - Subscriptions
   - Business details
   - Onboarding progress
   - User profiles

3. **Core Business Data**
   - Businesses
   - Account deletion logs

4. **Authentication Data**
   - Users (custom_auth_user)
   - Tenants (custom_auth_tenant)

## Safety Recommendations

1. **Always backup your database first!**
   ```bash
   pg_dump your_database > backup_before_deletion.sql
   ```

2. **Use the transactional script first** (`delete_all_users_and_data.sql`)
   - Review the data that will be deleted
   - Only COMMIT if you're absolutely sure

3. **Test in a non-production environment first**

4. **Verify the deletion worked correctly**
   - Check that all tables are empty
   - Ensure your application handles the empty state properly

## Troubleshooting

If you encounter foreign key constraint errors:
1. Check if there are additional tables with FK relationships
2. Add them to the deletion scripts in the correct order
3. Consider using CASCADE in your FK definitions

If tables don't exist:
- The scripts handle missing tables gracefully
- Check your migrations are up to date

## Recovery

If you need to recover after deletion:
1. Restore from your backup: `psql -U username -d database < backup.sql`
2. Check the `custom_auth_account_deletion_log` table (if not deleted) for audit trail

Remember: These scripts delete ALL user data. Use with extreme caution!
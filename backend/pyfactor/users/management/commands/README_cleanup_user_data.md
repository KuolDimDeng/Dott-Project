# Cleanup User Data Command

This Django management command completely removes a user and all associated data from the system.

## Usage

```bash
# Basic usage
python manage.py cleanup_user_data <email>

# Skip confirmation prompt
python manage.py cleanup_user_data <email> --force

# Preview what would be deleted without actually deleting
python manage.py cleanup_user_data <email> --dry-run
```

## Example

```bash
# Clean up user kdeng@dottapps.com
python manage.py cleanup_user_data kdeng@dottapps.com

# Preview cleanup without deleting
python manage.py cleanup_user_data kdeng@dottapps.com --dry-run

# Force cleanup without confirmation
python manage.py cleanup_user_data kdeng@dottapps.com --force
```

## What Gets Deleted

1. **User Account** - The CustomUser record
2. **Tenants** - All tenants associated with the user
3. **Tenant Data** - All records in tables with tenant relationships:
   - Products
   - Services  
   - Customers
   - Invoices
   - Bills
   - Payments
   - Inventory
   - Orders
   - And all other tenant-related data
4. **User-Specific Data**:
   - Notification recipients
   - Smart insights credit transactions
   - Sessions
   - TenantUser relationships

## Safety Features

- Requires confirmation before deletion (unless --force is used)
- Shows a summary of all data that will be deleted
- Uses database transactions - if any part fails, nothing is deleted
- Dry-run mode to preview changes without deleting

## Note

This command permanently deletes all data. Make sure you have backups if needed before running this command.
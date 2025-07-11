# Database Cleanup Guide

## Overview
This guide documents the process of cleaning up test user data from the Dott production database. The cleanup was performed on 2025-07-11 and successfully removed all test users.

## Users Removed
1. jubacargovillage@gmail.com
2. aluelddeng1@gmail.com  
3. tobi_6686@hotmail.com
4. senh.yeung@gmail.com
5. synodosdrama@gmail.com
6. support@dottapps.com
7. kdeng@dottapps.com

## Technical Details

### Database Structure
- User table: `custom_auth_user` (not `users_customuser` or `auth_user`)
- Total referencing tables: 64
- Foreign key constraints required deletion in dependency order

### Key Challenges Resolved
1. **Table naming**: Initial scripts used wrong table name (`users_customuser` instead of `custom_auth_user`)
2. **Foreign key dependencies**: Multiple levels of dependencies required careful ordering
3. **Type mismatches**: Some tables had UUID fields that couldn't reference integer user IDs
4. **Session management**: Complex relationships between session_events, user_sessions, and users

### Deletion Order
1. Session events and user sessions
2. Audit logs and admin logs
3. Smart insights data (transactions, query logs, usage)
4. Event data
5. Notifications and recipients
6. User profiles and onboarding data
7. Subscriptions and tax data
8. Inventory, CRM, and sales data
9. Business data and tenant schemas
10. Finally, user records

### Scripts Created
- `cleanup_test_users.sql` - Initial attempt (had wrong table names)
- `complete_cleanup_all_users.sql` - First complete version
- `safe_cleanup_all_users.sql` - Safe version with existence checks
- `complete_user_removal_updated.sql` - Updated with correct dependencies
- `final_user_cleanup.sql` - Final working version used in production

### Production Access
Database accessed via SSH to Render production server:
```bash
ssh srv-cqfp78o8fa8c73fg8f40@ssh.oregon.render.com
```

### Verification
After cleanup:
- 0 users remaining in custom_auth_user
- 0 businesses remaining in users_business
- 0 tenant schemas remaining
- Database vacuumed to reclaim space

## Important Notes
1. Always verify table names before running deletion scripts
2. Check foreign key dependencies using information_schema
3. Use transactions (BEGIN/COMMIT) for safety
4. Run VACUUM ANALYZE after large deletions
5. Test scripts with SELECT COUNT(*) before DELETE operations

## Future Recommendations
1. Implement soft deletes for user data
2. Add CASCADE DELETE constraints where appropriate
3. Create regular cleanup jobs for orphaned data
4. Consider archiving instead of deleting for audit purposes
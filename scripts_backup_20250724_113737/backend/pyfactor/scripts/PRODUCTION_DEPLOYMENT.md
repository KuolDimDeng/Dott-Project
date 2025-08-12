# RLS Fix Production Deployment Guide

This document provides guidelines for safely deploying and running the Row Level Security (RLS) fix scripts in a production environment.

## Prerequisites

- PostgreSQL 9.5+ (scripts have been tested on PostgreSQL 16.3)
- Python 3.7+ with psycopg2 package installed
- Database user with sufficient privileges to modify table permissions and RLS policies

## Pre-Deployment Checklist

1. **Create a Database Backup**

    ```bash
    # Using pg_dump to create a backup
    pg_dump -h <host> -U <username> -d <database> -F c -f rls_backup_$(date +%Y%m%d).dump
    ```

2. **Create a Production Environment File**

    Create a file named `production.env` with the following content:

    ```
    DB_NAME=your_production_db
    DB_USER=your_production_user
    DB_PASSWORD=your_secure_password
    DB_HOST=your.production.host
    DB_PORT=5432
    ```

3. **Verify Database Connectivity**

    ```bash
    # Test connection using psql
    psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT version();"
    ```

4. **Schedule Maintenance Window**

    Choose a low-traffic period for applying the fixes. RLS modifications are non-blocking operations but may affect query plans temporarily.

## Deployment Steps

### 1. Copy Scripts to Production Server

```bash
# Example using scp
scp -r /path/to/backend/pyfactor/scripts user@production-server:/destination/path/
```

### 2. Run in Dry-Run Mode First

```bash
cd /destination/path
./fix_rls.sh --env=production.env
```

Review the output and logs carefully. This will not make any changes but will show what would be fixed.

### 3. Apply Fixes

```bash
./fix_rls.sh --env=production.env --apply
```

This will apply all the necessary RLS fixes to your database.

### 4. Verify Changes

```bash
# Review log file
less /destination/path/backend/pyfactor/logs/rls_fix_runner_TIMESTAMP.log

# Manually verify some RLS policies
psql -h $DB_HOST -U $DB_USER -d $DB_NAME -c "SELECT * FROM pg_policies;"

# Test RLS isolation
psql -h $DB_HOST -U $DB_USER -d $DB_NAME
```

In the psql console:
```sql
SET app.current_tenant_id TO 'tenant1';
SELECT COUNT(*) FROM rls_test_table;

SET app.current_tenant_id TO 'tenant2';
SELECT COUNT(*) FROM rls_test_table;
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**

    Verify your database credentials and ensure the database user has sufficient privileges.

2. **Missing Tenant ID Column**

    Some tables may not have a `tenant_id` column. These tables will be skipped by the script.

3. **Database User Has BYPASSRLS**

    If the database user has BYPASSRLS privilege, RLS will not be applied to that user. The script should detect and fix this.

4. **RLS Not Working After Fixes**

    If RLS still doesn't work after applying fixes:
    - Check if the database user is the owner of the table (owners bypass RLS unless FORCE is enabled)
    - Verify that FORCE ROW LEVEL SECURITY is enabled on all tables
    - Check the log files for any errors or warnings

### Recovery Procedure

If something goes wrong, you can restore from the backup:

```bash
# Stop application
systemctl stop your-application.service

# Restore database
pg_restore -h <host> -U <username> -d <database> -c rls_backup_YYYYMMDD.dump

# Start application
systemctl start your-application.service
```

## Post-Deployment Steps

1. **Update Application Configuration**

    Ensure your application is properly configured to use RLS:

    ```python
    # Example middleware code for Django
    class RLSMiddleware:
        def __init__(self, get_response):
            self.get_response = get_response

        def __call__(self, request):
            # Set tenant context based on authenticated user
            if request.user.is_authenticated:
                with connection.cursor() as cursor:
                    cursor.execute(
                        "SELECT set_tenant_context(%s)", 
                        [str(request.user.tenant_id)]
                    )
            return self.get_response(request)
    ```

2. **Monitor Database Performance**

    After enabling RLS, monitor database performance to ensure there's no significant impact:

    ```sql
    SELECT query, calls, total_time, mean_time
    FROM pg_stat_statements
    ORDER BY mean_time DESC
    LIMIT 10;
    ```

3. **Schedule Regular Checks**

    Set up a cron job to run the checker script weekly:

    ```bash
    # Add to crontab
    0 2 * * 0 /destination/path/fix_rls.sh --env=production.env > /var/log/rls_check.log 2>&1
    ```

## Security Considerations

1. **Protect Environment Files**

    Ensure your environment files with database credentials are properly secured:

    ```bash
    chmod 600 production.env
    ```

2. **Use Least Privilege Accounts**

    Use a database user with the minimal required privileges for running the scripts.

3. **Audit Trail**

    Keep the log files for auditing purposes:

    ```bash
    # Archive logs
    tar -czf rls_logs_$(date +%Y%m%d).tar.gz /destination/path/backend/pyfactor/logs/
    ```

## Contact

For questions or issues, contact the system administrator or database administrator. 
# Onboarding Testing Tools

This directory contains tools to test and monitor the onboarding process, particularly focusing on the database schema creation and migration process.

## Overview

We've created three tools to help test and debug the onboarding process:

1. **test_onboarding_flow.py**: Simulates the complete onboarding flow from business info submission to dashboard access
2. **monitor_migrations.py**: Monitors database migrations in real-time
3. **test_and_monitor.sh**: Shell script to run both tools simultaneously

These tools help you observe what's happening with migrations during the onboarding process without having to manually go through the UI.

## Prerequisites

- Python 3.8+
- Django
- PostgreSQL
- `tabulate` package for the migration monitor (`pip install tabulate`)

## Usage

### Test Onboarding Flow

This script simulates the complete onboarding flow programmatically:

```bash
python scripts/test_onboarding_flow.py [--email user@example.com] [--password password] [--debug]
```

Options:
- `--email`: Email to use for testing (default: test_user@example.com)
- `--password`: Password to use for testing (default: Test123!)
- `--debug`: Enable debug logging

The script will:
1. Create or reset a test user
2. Submit business information
3. Submit subscription information (free plan)
4. Complete the onboarding process
5. Access the dashboard to trigger schema setup
6. Monitor the schema setup task until completion
7. Check the final database status

### Monitor Migrations

This script monitors database migrations in real-time:

```bash
python scripts/monitor_migrations.py [--interval 1] [--schema schema_name]
```

Options:
- `--interval`: Polling interval in seconds (default: 1)
- `--schema`: Specific schema to monitor (default: monitor all schemas)

The script will:
1. Display a table of all schemas with their status
2. Show table counts, row counts, and schema sizes
3. Display tenant information and onboarding status
4. Detect and report changes in real-time
5. Continue running until you press Ctrl+C

### Combined Testing

The shell script runs both tools simultaneously:

```bash
./scripts/test_and_monitor.sh [--email user@example.com] [--password password] [--debug] [--interval 2] [--schema schema_name]
```

Options:
- `--email`: Email to use for testing (default: test_user@example.com)
- `--password`: Password to use for testing (default: Test123!)
- `--debug`: Enable debug logging for the test script
- `--interval`: Polling interval in seconds for the monitor (default: 2)
- `--schema`: Specific schema to monitor

## What to Look For

When running these tools, pay attention to:

1. **Schema Creation Timing**: The schema should be created quickly during business info submission, but without running migrations
2. **Migration Timing**: Migrations should only run when the dashboard is accessed
3. **Table Creation**: Tables should be created in batches as migrations run
4. **Connection Count**: The number of database connections during migration
5. **Error Messages**: Any errors that occur during the process

## Troubleshooting

If you encounter issues:

1. Check the log files:
   - `onboarding_test.log`: Log file for the test script
   - `migration_monitor.log`: Log file for the monitor script

2. Common issues:
   - **Connection errors**: Make sure the database is running and accessible
   - **Authentication errors**: Check that the test user can be created/authenticated
   - **Task failures**: Check the Celery logs for more details on task failures
   - **Missing tables**: Ensure migrations are running correctly

3. Debugging tips:
   - Use the `--debug` flag for more detailed logging
   - Monitor the Celery worker logs alongside these tools
   - Check the PostgreSQL logs for any database errors

## Example Output

### Migration Monitor

```
====================================================================================================
Migration Monitor - 2025-03-11 09:45:23.456789 (Running for: 0:01:30.123456)
====================================================================================================
+-------------------------------+--------+-----------+----------+--------------------+------------+-------------+------------------+-------------+
| Schema                        | Tables | Total Rows | Size     | Owner             | DB Status  | Setup Status | Onboarding Status | Connections |
+===============================+========+===========+==========+====================+============+=============+==================+=============+
| tenant_1c3d0919_7eea_45db_... | 5      | 12        | 256 kB   | test@example.com  | not_created | pending     | business-info    | 2           |
+-------------------------------+--------+-----------+----------+--------------------+------------+-------------+------------------+-------------+
====================================================================================================

Changes detected:
  - New tables in tenant_1c3d0919_7eea_45db_...: users_user, users_userprofile
  - Setup status changed for tenant_1c3d0919_7eea_45db_...: pending -> in_progress
```

### Test Onboarding Flow

```
INFO - Starting onboarding flow test
INFO - Setting up test user: test_user@example.com
INFO - Found existing user: 420a0080-ca4c-4e4c-be9f-a664f02666d2
INFO - Resetting onboarding state for user: 420a0080-ca4c-4e4c-be9f-a664f02666d2
INFO - Dropping schema: tenant_420a0080_ca4c_4e4c_be9f_a664f02666d2
INFO - Authenticating with API
INFO - Authentication successful
INFO - Submitting business info
INFO - Business info submitted successfully
INFO - Business ID: 41b1308c-a49b-4552-9a8e-b66cdbc7f9bd
INFO - Checking database status after business info submission
INFO - Tenant: 1c3d0919-7eea-45db-8578-ba4d9a186c32
INFO - Schema name: tenant_1c3d0919_7eea_45db_8578_ba4d9a186c32
INFO - Database status: not_created
INFO - Setup status: deferred
INFO - Schema exists: True
INFO - Tables in schema: 0
INFO - Submitting subscription info
INFO - Subscription info submitted successfully
INFO - Completing onboarding
INFO - Onboarding completed successfully
INFO - Accessing dashboard to trigger schema setup
INFO - Dashboard access successful, schema setup triggered
INFO - Schema setup task ID: 6a7d896c-09c8-40e1-bb44-c6bf18adff29
INFO - Monitoring task status: 6a7d896c-09c8-40e1-bb44-c6bf18adff29
INFO - Task status: STARTED, Progress: 5%
INFO - Task status: PROGRESS, Progress: 25%
INFO - Task status: PROGRESS, Progress: 50%
INFO - Task status: PROGRESS, Progress: 75%
INFO - Task status: SUCCESS, Progress: 100%
INFO - Task completed successfully
INFO - Final database status check
INFO - Tenant: 1c3d0919-7eea-45db-8578-ba4d9a186c32
INFO - Schema name: tenant_1c3d0919_7eea_45db_8578_ba4d9a186c32
INFO - Database status: active
INFO - Setup status: complete
INFO - Schema exists: True
INFO - Tables in schema: 42
INFO - Onboarding flow test completed successfully
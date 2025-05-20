# PostgreSQL Row Level Security (RLS) Tools

This directory contains tools to diagnose and fix Row Level Security (RLS) issues in PostgreSQL databases.

## Overview

Row Level Security (RLS) is a PostgreSQL feature that restricts which rows a user can see when querying a table. Our application uses RLS for tenant isolation in a multi-tenant environment. These tools help ensure that RLS is properly configured and working correctly.

## Available Tools

### 1. Automated Fix Script

The easiest way to fix RLS issues is to use the automated fix script:

```bash
# Run in dry-run mode (no changes made)
./fix_rls.sh

# Run in apply mode (changes will be made to the database)
./fix_rls.sh --apply

# Run with verbose output
./fix_rls.sh --verbose

# Use a specific environment file
./fix_rls.sh --env=/path/to/env.file
```

This script will:
1. Check database user permissions
2. Fix RLS permissions
3. Apply FORCE RLS to all tables
4. Verify RLS is properly enabled

### 2. Individual Tools

If you prefer to run tools individually:

#### Check Database User Permissions

Identifies user permissions issues that might affect RLS functionality:

```bash
python check_db_user_permissions.py
```

#### Fix RLS Permissions

Applies necessary RLS permissions fixes:

```bash
# Dry run
python fix_rls_permissions.py

# Apply fixes
python fix_rls_permissions.py --apply
```

#### Apply FORCE RLS

Ensures FORCE ROW LEVEL SECURITY is applied to all tables with tenant_id:

```bash
python fix_rls_force.py
```

#### Check RLS Enabled

Verifies that RLS is properly enabled:

```bash
python check_rls_enabled.py
```

## Configuration

### Environment Variables

These scripts use environment variables for database connection. You can set these in your environment or they will use defaults:

- `DB_NAME`: Database name (default: "dott_main")
- `DB_USER`: Database user (default: "dott_admin")
- `DB_PASSWORD`: Database password
- `DB_HOST`: Database host (default: "dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com")
- `DB_PORT`: Database port (default: "5432")

### Setting Environment Variables Directly

For production use, you can set these variables directly:

```bash
export DB_NAME="your_production_db"
export DB_USER="your_production_user"
export DB_PASSWORD="your_secure_password"
export DB_HOST="your.production.host"
export DB_PORT="5432"
```

### Using an Environment File

For convenience, you can also create an environment file with these variables:

```
DB_NAME=your_production_db
DB_USER=your_production_user
DB_PASSWORD=your_secure_password
DB_HOST=your.production.host
DB_PORT=5432
```

Then run the script with:

```bash
./fix_rls.sh --env=/path/to/your/env.file
```

## Best Practices for Production

1. **Always run in dry-run mode first** to see what changes would be made
2. **Back up your database** before applying fixes
3. **Run during low-traffic periods** to minimize impact
4. **Use a dedicated environment file** with production credentials
5. **Check logs** after running to verify everything worked as expected

## Logs

All tools create detailed logs in the `../logs/` directory. Check these logs for detailed information about what was done and any errors encountered.

## Troubleshooting

If RLS still doesn't work after running these tools, consult the `RLS_TROUBLESHOOTING.md` file for additional guidance.

## PostgreSQL Versions

These tools are designed for PostgreSQL 9.5+ which supports Row Level Security. They have been specifically tested with PostgreSQL 16.3.

## Contact

If you encounter issues with these tools, contact the system administrator. 
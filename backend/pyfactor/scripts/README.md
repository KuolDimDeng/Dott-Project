# Database Management Scripts

This directory contains scripts for managing the multi-tenant database system.

## Remove All Tenants

The `remove_all_tenants.py` script removes all tenants from the dott_main database.

### What it does:
1. Lists all tenants in the database
2. Deletes all tenant records
3. Drops all tenant schemas

### Usage:

```bash
# Run the script directly
cd backend/pyfactor
python scripts/remove_all_tenants.py [--force]
```

Options:
- `--force`: Skip confirmation prompt (use with caution)

**WARNING**: This will permanently delete all tenant data! Without the `--force` flag, the script will ask for confirmation before proceeding.

## Initialize Database Tables

The `initialize_database_tables.py` script initializes tables in an existing database.

### What it does:
1. Checks if the database exists (must be created first in AWS console)
2. Runs all migrations to create the necessary tables
3. Sets up proper permissions
4. Lists all created tables

### Usage:

```bash
# Run the script directly
cd backend/pyfactor
python scripts/initialize_database_tables.py [database_name] [--force]
```

Options:
- `database_name`: Name of the database to initialize (optional, defaults to the one in settings.py)
- `--force`: Skip confirmation prompts (use with caution)

If `database_name` is not provided, it will use the name from settings.py.

### Example:

```bash
# Initialize tables in a database named "dott_new"
python scripts/initialize_database_tables.py dott_new
```

## Workflow for Setting Up a New Database

1. Create the database in AWS console
2. Run the initialize_database_tables.py script to create all tables
3. The database is now ready for tenant creation

## Workflow for Cleaning Up Tenants

1. Run the remove_all_tenants.py script to remove all tenants
2. Confirm by typing 'DELETE ALL TENANTS' when prompted (or use --force to skip confirmation)
3. All tenant data will be removed, but the database structure remains intact
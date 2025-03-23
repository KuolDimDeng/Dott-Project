# Tenant Schema Consolidation

This document explains how to use the tenant schema consolidation script to fix the issue of multiple tenant schemas being created for the same business owner.

## Overview

The consolidation script:
1. Finds all tenant schemas in the system
2. Groups them by business owner
3. Identifies owners with multiple tenant schemas
4. Consolidates schemas by keeping the oldest one and updating all references to the newer ones

## Usage

```bash
# First run in dry-run mode to see what changes would be made
python manage.py consolidate_tenants --dry-run

# Run for a specific tenant ID
python manage.py consolidate_tenants --tenant-id=b7fee399-ffca-4151-b636-94ccb65b3cd0 --dry-run

# Run for a specific user by email
python manage.py consolidate_tenants --user-email=user@example.com --dry-run

# Run for real (without --dry-run) to make actual changes
python manage.py consolidate_tenants
```

## How It Works

1. The script finds all tenant schemas and their owners
2. For each owner with multiple schemas:
   - The oldest schema is kept as the primary one
   - Users referencing the newer schemas are updated to use the primary schema
   - Data from the newer schemas could be migrated to the primary one (limited implementation)
   - The newer schemas are marked for deletion

## Prerequisites

- The `public.deleted_schemas` table must exist (created by migration)
- Django admin access to run management commands

## Monitoring

Check the logs for detailed information about the consolidation process. 
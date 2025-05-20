# Database Synchronization Solution

This document describes the solution for synchronizing database configurations between Django and Next.js in the PyFactor application.

## Problem Statement

The application uses two different database connections:

1. **Django Backend**: Connects to AWS RDS at `dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com`
2. **Next.js API Routes**: Connect to local PostgreSQL at `localhost`

This discrepancy causes tenant records created in one environment to be invisible to the other, leading to issues with tenant initialization during onboarding.

## Solution Overview

We've implemented a multi-faceted solution to address this issue:

1. **Configurable Database Connection**: Added support for switching between local and remote database configurations
2. **Database Synchronization Script**: Created a Python script to sync tenant data between databases
3. **Synchronization API Endpoint**: Added a Next.js API route to trigger synchronization from the frontend
4. **Database Testing Endpoint**: Created an endpoint to test and compare both database configurations

## Implementation Details

### 1. Configurable Database Connection

We've updated the database configuration module to support both local and AWS RDS connections:

- Added environment variable `USE_DJANGO_DB` to control which database is used
- Created separate configuration sets for local and Django database connections
- Added functions to test both connections for diagnostic purposes

**File:** `/frontend/pyfactor_next/src/app/api/tenant/db-config.js`

```javascript
export function getDbConfig(useDjangoDb = false) {
  // Determine which defaults to use
  const useDjango = useDjangoDb || process.env.USE_DJANGO_DB === 'true';
  const defaults = useDjango ? DJANGO_DB_DEFAULTS : LOCAL_DB_DEFAULTS;
  
  // Return appropriate configuration...
}
```

### 2. Database Synchronization Script

We've created a Python script that can synchronize tenant data between the two databases:

- Fetches tenant records from both databases
- Compares records and identifies differences
- Synchronizes missing records in either direction
- Can be run from command line or triggered via API

**File:** `/backend/pyfactor/scripts/sync_tenant_data.py`

```python
def sync_databases(direction='both'):
    """Synchronize tenant data between databases"""
    # Ensure tables exist in both databases
    create_tenant_table(LOCAL_DB)
    create_tenant_table(DJANGO_DB)
    
    # Get tenants from both databases
    local_tenants = get_tenants_from_db(LOCAL_DB)
    django_tenants = get_tenants_from_db(DJANGO_DB)
    
    # Synchronize based on direction...
```

### 3. Synchronization API Endpoint

We've added a Next.js API endpoint that triggers the synchronization script:

- Executes the Python script via child_process
- Supports customizing the synchronization direction
- Returns detailed results to the caller

**File:** `/frontend/pyfactor_next/src/app/api/tenant/sync-databases/route.js`

```javascript
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const direction = searchParams.get('direction') || 'both';
  
  // Execute synchronization...
}
```

### 4. Database Testing Endpoint

We've added an endpoint to test and compare both database configurations:

- Tests both local and Django database connections
- Returns detailed information about both connections
- Helps diagnose configuration issues

**File:** `/frontend/pyfactor_next/src/app/api/tenant/test-database/route.js`

```javascript
export async function GET(request) {
  try {
    const results = await testBothDatabases();
    return NextResponse.json(results);
  } catch (error) {
    // Error handling...
  }
}
```

## Usage

### Testing Database Connections

To test both database connections:

```
GET /api/tenant/test-database
```

This will return a JSON response with details about both connections.

### Synchronizing Databases

To synchronize tenant data between databases:

```
GET /api/tenant/sync-databases?direction=both
```

**Direction Options:**
- `both` (default): Sync in both directions
- `to-django`: Copy local-only tenants to Django database
- `to-local`: Copy Django-only tenants to local database

### Running Synchronization Manually

You can also run the synchronization script directly:

```bash
cd /backend/pyfactor/scripts
python sync_tenant_data.py --direction both
```

## Recommended Configuration

For development, we recommend one of two approaches:

1. **Local-First Development**:
   - Set `USE_DJANGO_DB=false` (default)
   - Run the sync script whenever you need to pull remote data
   - Good for offline development and more control

2. **Django-First Development**:
   - Set `USE_DJANGO_DB=true`
   - Both Django and Next.js will use the AWS RDS database
   - Good for team environments where data consistency is critical

## Environment Variables

To control database connections, use these environment variables:

```
# Use Django database for Next.js API routes
USE_DJANGO_DB=true

# Django database connection
DJANGO_DB_HOST=dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com
DJANGO_DB_NAME=dott_main
DJANGO_DB_USER=postgres
DJANGO_DB_PASSWORD=postgres
DJANGO_DB_PORT=5432

# Local database connection
POSTGRES_HOST=localhost
POSTGRES_DB=dott_main
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_PORT=5432
```

## Future Improvements

1. **Automatic Synchronization**: Add a scheduled task to synchronize databases automatically
2. **Database Migration**: Consider migrating both applications to use the same database
3. **Environment Configuration**: Add environment-specific database configurations for development, staging, and production
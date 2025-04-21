# Tenant Initialization and Sign-In Process Fixes

## Overview

This document describes issues found in the tenant initialization and sign-in process and the fixes that were implemented to address them.

## Issues Identified

During the sign-in process, the following errors were observed:

1. **SQL Syntax Error**:
   ```
   [SERVER:ERROR] [no-tenant] [API] [InitializeTenant] Error setting up RLS: error: syntax error at or near "$1"
   ```

2. **Database Connection Pool Errors**:
   ```
   [SERVER:ERROR] [no-tenant] [API] [InitializeTenant] Database connection error: Error: Cannot use a pool after calling end on the pool
   [SERVER:ERROR] [no-tenant] [API] [InitializeTenant] Error closing pool: Error: Called end on pool more than once
   ```

3. **Logo Image Loading Error**:
   ```
   GET https://localhost:3000/_next/image?url=/logo.png&w=48&q=75 [HTTP/1.1 400 Bad Request]
   ```

## Root Causes

### 1. SQL Syntax Error

In the file `src/app/api/tenant/initialize-tenant/route.js`, the code was attempting to use a parameterized query for a PostgreSQL SET command, which is not supported for SET commands:

```javascript
await connection.query(`
  SET app.current_tenant_id = $1;
`, [tenantId]);
```

PostgreSQL does not support parameter placeholders ($1, $2, etc.) in SET commands.

### 2. Database Connection Pool Errors

The database connection pool was being closed multiple times in different code paths:

1. It was closed in the main `finally` block at the end of the function
2. It was also being closed in error handlers
3. There was no tracking of whether the pool had already been closed

### 3. Logo Image Loading Error

Auth pages were referencing inconsistent logo paths:
- Some pages referenced `/logo.png`
- Others referenced `/pyfactor-logo.png`
- The actual logo file was located at `/static/images/PyfactorLandingpage.png`

## Implemented Fixes

### 1. SQL Syntax Fix

The parameterized query was replaced with direct string interpolation:

```javascript
await connection.query(`SET app.current_tenant_id = '${tenantId}';`);
```

This approach properly sets the tenant context in PostgreSQL.

### 2. Database Connection Pool Fix

1. Added a `poolClosed` flag to track the pool state
2. Modified the pool closing logic to check if the pool was already closed:

```javascript
if (pool && !poolClosed) {
  try {
    await pool.end();
    poolClosed = true;
    logger.debug('[InitializeTenant] Database connection pool closed');
  } catch (poolError) {
    logger.error('[InitializeTenant] Error closing pool:', poolError);
  }
}
```

### 3. Logo Image Loading Fix

Updated all auth page components to use a consistent logo path:

```javascript
// Before
<Image src="/logo.png" alt="Logo" width={48} height={48} />

// After
<Image src="/static/images/PyfactorLandingpage.png" alt="Logo" width={48} height={48} />
```

## Implementation

The fixes were implemented in three separate scripts:

1. `scripts/Version0001_Fix_PostgreSQL_Tenant_Initialization.js`
2. `scripts/Version0002_Fix_Database_Pool_Connection_Errors.js`
3. `scripts/Version0003_Fix_Logo_Image_Loading.js`

Each script includes:
- A backup mechanism to save the original files
- Error handling for robust execution
- Verification of applied changes

Additionally, a combined script `scripts/RunAllFixes.js` was created to apply all fixes in sequence.

## Verification

After applying these fixes:

1. The sign-in process should successfully initialize tenant records in the database
2. No SQL syntax errors or connection pool errors should appear in the logs
3. The logo should load correctly on all authentication pages

## Running the Fixes

To run the fixes, execute:

```bash
node scripts/RunAllFixes.js
```

Or run the individual scripts:

```bash
node scripts/Version0001_Fix_PostgreSQL_Tenant_Initialization.js
node scripts/Version0002_Fix_Database_Pool_Connection_Errors.js
node scripts/Version0003_Fix_Logo_Image_Loading.js
```

After running the fixes, restart the Next.js server:

```bash
pnpm run dev:https
``` 
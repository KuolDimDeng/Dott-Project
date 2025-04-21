# Script Registry

This document tracks the purpose and execution status of maintenance and fix scripts in the project.

## Frontend Scripts

| Script | Purpose | Date | Status | Issues Addressed |
|--------|---------|------|--------|-----------------|
| Version0001_Fix_PostgreSQL_Tenant_Initialization.js | Fix SQL syntax error in tenant initialization process | 2025-04-21 | Ready for execution | SQL syntax error with parameterized queries in SET commands |
| Version0002_Fix_Database_Pool_Connection_Errors.js | Fix database connection pool errors | 2025-04-21 | Ready for execution | "Cannot use a pool after calling end on the pool" and "Called end on pool more than once" errors |
| Version0003_Fix_Logo_Image_Loading.js | Fix logo image loading in auth pages | 2025-04-21 | Ready for execution | 400 Bad Request error when loading logo.png |

## How to Run Scripts

To run a script, use Node.js from the project root directory:

```bash
node scripts/Version0001_Fix_PostgreSQL_Tenant_Initialization.js
```

## Script Details

### Version0001_Fix_PostgreSQL_Tenant_Initialization.js

This script fixes a SQL syntax error in the tenant initialization process. The error occurs in the PostgreSQL command that attempts to set the tenant context using a parameterized query, which is not supported for SET commands.

**File affected:**
- src/app/api/tenant/initialize-tenant/route.js

**Fix details:**
- Replaces `await connection.query(\`SET app.current_tenant_id = $1;\`, [tenantId]);` 
- With `await connection.query(\`SET app.current_tenant_id = '${tenantId}';\`);`

### Version0002_Fix_Database_Pool_Connection_Errors.js

This script fixes database connection pool errors that occur during tenant initialization. The issue is that the pool is being closed multiple times in different places, causing errors.

**File affected:**
- src/app/api/tenant/initialize-tenant/route.js

**Fix details:**
- Adds a `poolClosed` flag to track pool state
- Modifies pool closing logic to check the flag before attempting to close
- Prevents multiple pool closures during error handling

### Version0003_Fix_Logo_Image_Loading.js

This script fixes logo image loading issues in authentication pages. It updates all references to use a consistent, existing image path.

**Files affected:**
- src/app/auth/signin/page.js
- src/app/auth/signup/page.js
- src/app/auth/verify-email/page.js
- src/app/auth/verify-employee/page.js

**Fix details:**
- Replaces references to "/logo.png" and "/pyfactor-logo.png"
- With "/static/images/PyfactorLandingpage.png"
- Ensures consistent logo display across all authentication pages

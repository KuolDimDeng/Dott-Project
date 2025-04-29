# Payroll API

This folder contains API routes for handling payroll operations. All payroll functions exclusively use AWS RDS for data storage and retrieval with no mock data.

## Database Configuration

All payroll operations use a direct connection to AWS RDS with the following configuration:

- **Host**: `dott-dev.c12qgo6m085e.us-east-1.rds.amazonaws.com`
- **Database**: `dott_main`
- **Schema Pattern**: `tenant_<uuid>` (tenant-specific schemas)

## API Routes

### `/api/payroll/settings`

- **GET**: Retrieves payroll settings from AWS RDS
- **POST**: Saves payroll settings to AWS RDS

### `/api/payroll/run`

- **POST**: Processes a payroll run using AWS RDS

### `/api/payroll/calculate`

- **POST**: Calculates payroll without finalizing it

### `/api/payroll/reports`

- **GET**: Generates payroll reports from AWS RDS data

## Security

All routes implement:

- Authentication check using `getAuthenticatedUser`
- Permission checks for payroll operations
- Tenant isolation using schema-based multi-tenancy

## Headers

All API requests include these headers to ensure AWS RDS usage:

```
X-Data-Source: AWS_RDS
X-Database-Only: true
X-Use-Mock-Data: false
X-Payroll-RDS: true
```

## Middleware

The middleware in `/src/middleware/db-connections.js` ensures that all payroll API routes use AWS RDS by:

1. Detecting payroll-related routes
2. Adding the required headers to enforce AWS RDS usage
3. Blocking any attempt to use mock data

## Transactions

All database operations that involve multiple changes use PostgreSQL transactions to ensure data consistency. The pattern used is:

```javascript
// Begin transaction
const client = await pool.connect();
try {
  await client.query('BEGIN');
  
  // Perform database operations
  
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
}
```

## Error Handling

All API routes implement proper error handling with:

- Detailed error logging via the `serverLogger`
- Appropriate HTTP status codes
- Client-friendly error messages

## Implementation Details

### Database Schema

The payroll functionality relies on these main tables:

1. `payroll_runs` - Tracks payroll execution
2. `payroll_transactions` - Individual employee payments
3. `payroll_settings` - Company-wide payroll configuration
4. `payroll_authorized_users` - Users with payroll permissions

### Connection Pooling

The API uses connection pooling to optimize database performance:

- Each request creates a pool with appropriate settings
- Connections are properly closed after use
- Pool parameters are optimized for serverless environment 
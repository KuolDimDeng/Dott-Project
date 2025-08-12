# Memory Issue Fix for Dashboard Loading

## Problem Description

The dashboard is not loading and the server is running out of memory. This is caused by several issues:

1. **Connection Leaks**: The application is creating too many database connections without properly closing them.
2. **Inefficient Schema Creation**: The schema creation process is not optimized and consumes too much memory.
3. **Connection Pool Configuration**: The connection pool is configured to allow too many connections.
4. **Missing Connection Cleanup**: Connections are not being properly cleaned up after use.
5. **Inefficient Migration Process**: The migration process during schema creation is not optimized.

## Solution

We've created several scripts to fix these issues:

1. `fix_memory_issue.py`: A comprehensive script that addresses all the issues.
2. `optimize_connection_handling.py`: Focuses on optimizing database connection handling.
3. `optimize_schema_creation.py`: Focuses on optimizing the schema creation process.
4. `run_all_optimizations.py`: Runs all the optimization scripts in the correct order.

## How to Fix

To fix the memory issue, run the following command:

```bash
cd backend/pyfactor
python scripts/run_all_optimizations.py
```

This will:
1. Fix memory issues by optimizing connection handling
2. Optimize the schema creation process
3. Restart the server

## Technical Details

### Connection Handling Optimizations

- Reduced maximum connections from 50 to 20
- Added connection cleanup in middleware
- Optimized connection pool configuration
- Added connection timeouts
- Added connection cache size limits

### Schema Creation Optimizations

- Added memory optimization to close connections before schema creation
- Added statement and lock timeouts
- Optimized migration process
- Added better error handling and cleanup
- Added transaction support for schema creation

### Other Optimizations

- Fixed tenant model to properly handle schema creation
- Cleaned up corrupted schemas
- Added connection cleanup in context managers
- Optimized database router

## Monitoring

After applying these fixes, monitor the server's memory usage and database connections. You can use the following commands:

```bash
# Check memory usage
ps -o pid,rss,command ax | grep python

# Check database connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity WHERE datname = 'dott_main';"
```

## Troubleshooting

If you still experience memory issues after applying these fixes:

1. Check the logs for any errors
2. Restart the server manually
3. Consider reducing the maximum connections further
4. Consider increasing the server's memory allocation

## Additional Notes

- These fixes are designed to work with the current codebase without major architectural changes.
- For a more permanent solution, consider refactoring the multi-tenant architecture to use a more efficient approach.
- Consider implementing a connection monitoring system to detect and fix connection leaks automatically.
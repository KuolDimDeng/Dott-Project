# Row Level Security (RLS) Implementation in Next.js API Routes

This guide provides a complete overview of how to implement PostgreSQL Row Level Security (RLS) in Next.js API routes for multi-tenant applications.

## 1. Setting Up Middleware

First, create a middleware file for RLS implementation:

```javascript
// src/middleware/rls.js

import { logger } from '@/utils/logger';
import crypto from 'crypto';

/**
 * Gets the tenant ID from various sources
 * @param {Object} user - User object from authentication
 * @param {Object} request - Next.js request object
 * @returns {string|null} - Tenant ID or null if not found
 */
export function getTenantId(user, request) {
  // Development mode tenant ID extraction
  if (process.env.NODE_ENV === 'development') {
    // Check for development tenant ID in cookie or header
    const devTenantId = request.cookies.get('dev-tenant-id')?.value || 
                        request.headers.get('x-dev-tenant-id');
    
    if (devTenantId) {
      logger.debug('[RLS] Using development tenant ID', { tenantId: devTenantId });
      return devTenantId;
    }
  }
  
  // Extract tenant ID from authenticated user
  const tenantId = user?.['custom:businessid'] || 
                  user?.['custom:tenant_id'] || 
                  user?.tenantId;
  
  if (tenantId) {
    return tenantId;
  }
  
  // Check request headers as fallback
  return request.headers.get('x-tenant-id');
}

/**
 * Sets the RLS tenant ID in a database session
 * @param {Object} client - Database client
 * @param {string} tenantId - Tenant ID to set
 * @returns {Promise<void>}
 */
export async function setRlsTenantId(client, tenantId) {
  if (!tenantId) {
    throw new Error('No tenant ID provided for RLS context');
  }
  
  // Validate tenant ID format to prevent SQL injection
  if (!/^[0-9a-zA-Z_\-]+$/i.test(tenantId)) {
    throw new Error('Invalid tenant ID format');
  }
  
  await client.query(`SET LOCAL app.current_tenant_id TO '${tenantId}'`);
}

/**
 * Middleware for API routes to set RLS tenant ID
 * Use this in API routes that need RLS enforcement
 */
export const withRls = (handler) => {
  return async (request, context) => {
    const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
    const startTime = Date.now();
    
    try {
      // Get tenant ID from user or dev mode
      const { getServerUser } = await import('@/utils/getServerUser');
      const user = await getServerUser(request, context).catch(error => {
        logger.warn('[RLS] Error getting server user', {
          error: error.message,
          requestId
        });
        return null;
      });
      
      const tenantId = getTenantId(user, request);
      
      // No tenant ID - handle based on environment
      if (!tenantId) {
        if (process.env.NODE_ENV === 'development') {
          // In development, log warning but continue
          logger.warn('[RLS] No tenant ID available in development', { requestId });
        } else {
          // In production, reject the request
          logger.error('[RLS] No tenant ID available', { requestId });
          return new Response(JSON.stringify({
            error: 'Unauthorized',
            message: 'No tenant ID available',
            requestId
          }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
      
      // Add tenant ID to context for the handler
      context.tenantId = tenantId;
      
      // Call the handler with tenant ID in context
      const response = await handler(request, context);
      
      // Log timing
      const duration = Date.now() - startTime;
      logger.debug('[RLS] Request completed', { 
        requestId, 
        tenantId, 
        duration,
        url: request.url
      });
      
      return response;
    } catch (error) {
      logger.error('[RLS] Middleware error', {
        error: error.message,
        stack: error.stack,
        requestId,
        url: request.url
      });
      
      return new Response(JSON.stringify({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'An error occurred processing your request',
        requestId
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  };
};
```

## 2. Setting Up Database Utilities

Create utility functions for database operations with RLS:

```javascript
// src/utils/db/rls-database.js

import { Pool } from 'pg';

let pool;

/**
 * Get or create the database pool
 * @returns {Pool} Database pool
 */
function getPool() {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' 
        ? { rejectUnauthorized: false } 
        : false
    });
  }
  return pool;
}

/**
 * Set the current tenant ID for RLS in the database session
 * @param {Object} client - Database client
 * @param {string} tenantId - Tenant ID to set
 * @returns {Promise<void>}
 */
async function setTenantContext(client, tenantId) {
  if (!tenantId) {
    throw new Error('No tenant ID provided for RLS context');
  }
  
  // Validate tenant ID format to prevent SQL injection
  if (!/^[0-9a-zA-Z_\-]+$/i.test(tenantId)) {
    throw new Error('Invalid tenant ID format');
  }
  
  await client.query(`SET LOCAL app.current_tenant_id TO '${tenantId}'`);
}

/**
 * Execute a SQL query with automatic tenant context
 * @param {string} text - SQL query
 * @param {Array} params - Query parameters
 * @param {Object} options - Options including tenantId
 * @returns {Promise<Object>} Query result
 */
async function query(text, params = [], options = {}) {
  const pool = getPool();
  const client = options.client || pool;
  const tenantId = options.tenantId;
  
  try {
    // Set tenant context if provided and not in transaction
    if (tenantId && !options.client) {
      await setTenantContext(client, tenantId);
    }
    
    return await client.query(text, params);
  } catch (error) {
    console.error('Query error:', error);
    throw error;
  }
}

/**
 * Get a client from the pool
 * @returns {Promise<Object>} Database client
 */
async function getClient() {
  const pool = getPool();
  return await pool.connect();
}

/**
 * Execute a transaction with automatic tenant context
 * @param {Function} callback - Function to execute within transaction
 * @param {Object} options - Options including tenantId
 * @returns {Promise<any>} Result from callback
 */
async function transaction(callback, options = {}) {
  const client = await getClient();
  const tenantId = options.tenantId;
  
  try {
    await client.query('BEGIN');
    
    // Set tenant context for the transaction if provided
    if (tenantId) {
      await setTenantContext(client, tenantId);
    }
    
    const result = await callback(client, { ...options, client });
    
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export {
  getPool,
  getClient,
  query,
  transaction,
  setTenantContext
};
```

## 3. Using RLS in API Routes

Here's how to implement an API route with RLS:

```javascript
// src/app/api/products/route.js
import { NextResponse } from 'next/server';
import { withRls } from '@/middleware/rls';
import * as db from '@/utils/db/rls-database';

async function productsHandler(request, context) {
  try {
    // Get tenant ID from context (set by withRls middleware)
    const tenantId = context.tenantId;
    
    // Use tenant ID in database queries via RLS
    const result = await db.query(
      'SELECT * FROM products ORDER BY name',
      [],
      { tenantId }
    );
    
    return NextResponse.json({
      success: true,
      products: result.rows
    });
  } catch (error) {
    console.error('Error in products API:', error);
    
    return NextResponse.json(
      { error: 'Failed to fetch products', message: error.message },
      { status: 500 }
    );
  }
}

// Export the handler wrapped with RLS middleware
export const GET = withRls(productsHandler);
```

## 4. Database Setup for RLS

You'll need to set up your PostgreSQL database for RLS:

```sql
-- Initialize RLS in your database

-- Enable the UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create the parameter for tenant context
ALTER DATABASE your_database_name SET app.current_tenant_id TO '';

-- Create the current_tenant_id function
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS TEXT AS $$
BEGIN
  RETURN current_setting('app.current_tenant_id', TRUE);
END;
$$ LANGUAGE plpgsql;

-- Example: Create a product table with tenant_id
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  price NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on the table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Create an RLS policy
CREATE POLICY tenant_isolation_policy ON products
  USING (tenant_id = current_tenant_id());
```

## 5. Testing RLS Implementation

Create a route to verify RLS policies:

```javascript
// src/app/api/verify-rls/route.js
import { NextResponse } from 'next/server';
import { withRls } from '@/middleware/rls';
import * as db from '@/utils/db/rls-database';

async function verifyRlsHandler(request, context) {
  try {
    const tenantId = context.tenantId;
    
    if (!tenantId) {
      return NextResponse.json({
        success: false,
        error: 'No tenant ID available'
      }, { status: 400 });
    }
    
    // Test RLS by trying to access data
    const result = await db.query(
      'SELECT COUNT(*) as count FROM products',
      [],
      { tenantId }
    );
    
    return NextResponse.json({
      success: true,
      tenantId,
      rlsActive: true,
      recordCount: parseInt(result.rows[0].count, 10)
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'RLS verification failed',
      message: error.message
    }, { status: 500 });
  }
}

export const GET = withRls(verifyRlsHandler);
```

## 6. Development Mode Support

For local development, add helper functions:

```javascript
// src/utils/dev-helpers.js
import { cookies } from 'next/headers';

/**
 * Sets the development tenant ID for testing
 * @param {string} tenantId - Tenant ID to use for testing
 */
export function setDevTenantId(tenantId) {
  // Set cookie for development mode
  cookies().set('dev-tenant-id', tenantId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 30 // 30 days
  });
}

/**
 * Clears the development tenant ID
 */
export function clearDevTenantId() {
  cookies().delete('dev-tenant-id');
}
```

## Best Practices

1. **Always use the withRls middleware** for API routes that access tenant data
2. **Validate tenant IDs** before using them in database operations
3. **Handle missing tenant IDs** appropriately in both development and production
4. **Test RLS policies** to ensure they're correctly filtering data
5. **Use transactions** for operations that require multiple database queries with the same tenant context
6. **Include error handling** for cases where RLS might fail
7. **Log relevant information** for debugging RLS issues

By following this guide, you'll have a robust implementation of Row Level Security in your Next.js application with proper tenant isolation. 